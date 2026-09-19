// Client-side pipeline orchestration — CADENCE-BUILD-SPEC.md §5, §12.2, §12.6
//
// OWNER: Person D. This file is the A→B→C handoff.
//
// The shell drives the pipeline from the browser so the six named stages in
// ProgressStages can light up as each one lands. Nothing here computes anything;
// it calls the four routes in order and validates what comes back.
//
// ── The route contract this file expects ───────────────────────────────────────
//
//   POST /api/fetch    { recipe, target_url, competitor_url }
//                   →  { evidence: Evidence[], price_tiers: PriceTier[] }
//
//   POST /api/ingest   { recipe, notes }                       (recipe 2)
//                   →  { evidence: Evidence[], price_tiers?: PriceTier[] }
//
//   POST /api/analyze  { recipe, evidence, price_tiers }
//                   →  { feature_matrix: FeatureRow[], differentiators: Differentiator[],
//                        price_comparisons: PriceComparison[] }
//
//   POST /api/draft    { recipe, evidence, price_tiers, feature_matrix,
//                        differentiators, price_comparisons }
//                   →  { deliverable: Deliverable }
//
//   POST /api/audit    { deliverable, evidence, price_tiers }
//                   →  { deliverable: Deliverable }   // risk_flags + grounding_issues filled
//
// Every step also accepts the bare payload instead of the wrapper object, so a
// route that returns `Evidence[]` directly still works. If your route's shape
// differs, tell Person D rather than changing it silently — this is the seam
// where four people's code meets.

"use client";

import {
  Deliverable,
  Evidence,
  EvidenceArray,
  PriceTier,
  PriceTierArray,
  Recipe,
} from "@/lib/contracts";
import { PIPELINE_STAGES, type StageId } from "@/lib/demo-config";

export type StageStatus = "pending" | "active" | "done" | "failed";

export type StageState = {
  id: StageId;
  status: StageStatus;
};

export const initialStages = (): StageState[] =>
  PIPELINE_STAGES.map((s) => ({ id: s.id, status: "pending" as StageStatus }));

/** A finished run — the deliverable plus everything the canvas needs to show provenance. */
export type RunResult = {
  deliverable: Deliverable;
  evidence: Evidence[];
  price_tiers: PriceTier[];
  source: "live" | "cached";
};

export class PipelineError extends Error {
  constructor(
    message: string,
    readonly stage: StageId,
    readonly route: string,
    readonly notBuiltYet: boolean = false,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

type StageReporter = (id: StageId, status: StageStatus) => void;

async function postJson(
  route: string,
  body: unknown,
  stage: StageId,
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new PipelineError(`Could not reach ${route}.`, stage, route);
  }

  if (res.status === 404 || res.status === 405) {
    throw new PipelineError(`${route} is not live yet.`, stage, route, true);
  }

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new PipelineError(`${route} returned something that isn't JSON.`, stage, route);
  }

  if (!res.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new PipelineError(`${route} failed — ${detail}`, stage, route);
  }

  return payload;
}

/** Pull `key` out of a wrapper object, or fall back to the payload itself. */
function unwrap(payload: unknown, key: string): unknown {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && key in payload) {
    return (payload as Record<string, unknown>)[key];
  }
  return payload;
}

export type RunInput = {
  recipe: Recipe;
  targetUrl?: string;
  competitorUrl?: string;
  notes?: string;
  onStage: StageReporter;
  signal?: AbortSignal;
};

/**
 * Walk the pipeline. Stages fetch/evidence/pricing all come out of the ingest
 * route — it does the fetching, the extraction and the deterministic pricing in
 * one call — so they are reported together as it returns.
 */
export async function runPipeline(input: RunInput): Promise<RunResult> {
  const { recipe, onStage, signal } = input;

  onStage("fetch", "active");
  onStage("evidence", "active");
  onStage("pricing", "active");

  const ingestRoute = recipe === "battlecard" ? "/api/fetch" : "/api/ingest";
  const ingestBody =
    recipe === "battlecard"
      ? { recipe, target_url: input.targetUrl, competitor_url: input.competitorUrl }
      : { recipe, notes: input.notes };

  let ingested: unknown;
  try {
    ingested = await postJson(ingestRoute, ingestBody, "fetch", signal);
  } catch (err) {
    onStage("fetch", "failed");
    onStage("evidence", "failed");
    onStage("pricing", "failed");
    throw err;
  }

  const evidence = EvidenceArray.parse(unwrap(ingested, "evidence"));
  const rawTiers = ingested && typeof ingested === "object" ? unwrap(ingested, "price_tiers") : [];
  const price_tiers = PriceTierArray.parse(Array.isArray(rawTiers) ? rawTiers : []);

  onStage("fetch", "done");
  onStage("evidence", "done");
  onStage("pricing", "done");

  onStage("ranking", "active");
  let analysis: Record<string, unknown>;
  try {
    const res = await postJson("/api/analyze", { recipe, evidence, price_tiers }, "ranking", signal);
    analysis = (res ?? {}) as Record<string, unknown>;
  } catch (err) {
    onStage("ranking", "failed");
    throw err;
  }
  onStage("ranking", "done");

  onStage("drafting", "active");
  let drafted: unknown;
  try {
    drafted = await postJson(
      "/api/draft",
      { recipe, evidence, price_tiers, ...analysis },
      "drafting",
      signal,
    );
  } catch (err) {
    onStage("drafting", "failed");
    throw err;
  }
  const draft = Deliverable.parse(unwrap(drafted, "deliverable"));
  onStage("drafting", "done");

  onStage("audit", "active");
  let audited: unknown;
  try {
    audited = await postJson(
      "/api/audit",
      { recipe, deliverable: draft, evidence, price_tiers },
      "audit",
      signal,
    );
  } catch (err) {
    onStage("audit", "failed");
    throw err;
  }
  const deliverable = Deliverable.parse(unwrap(audited, "deliverable"));
  onStage("audit", "done");

  return { deliverable, evidence, price_tiers, source: "live" };
}

// ── Handoff to the review canvas ──────────────────────────────────────────────
// The canvas lives on /review (Person C). We hand the run over in sessionStorage
// rather than a query string — a Deliverable does not fit in a URL.

export const RUN_STORAGE_KEY = "cadence:run";

export function storeRun(run: RunResult): void {
  try {
    sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
  } catch {
    // Private mode or a full quota. The card is still on screen; only the
    // handoff to /review is lost, and that is worth failing quietly for.
  }
}

export function readStoredRun(): RunResult | null {
  try {
    const raw = sessionStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunResult;
    return { ...parsed, deliverable: Deliverable.parse(parsed.deliverable) };
  } catch {
    return null;
  }
}
