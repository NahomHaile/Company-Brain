// The Person D → Person C handoff.
//
// D's pipeline finishes a run, writes it to sessionStorage, and navigates to
// /review. A Deliverable does not fit in a query string, which is why this is
// storage rather than a URL param.
//
// The shape is declared here rather than imported from D's pipeline-client so
// the canvas keeps working while that branch is unmerged. It is structurally
// D's `RunResult`; once person-D lands, this can delegate to their
// `readStoredRun()` and the schema below becomes the validation layer.
import { z } from "zod";
import { Deliverable, EvidenceArray, PriceTier } from "../contracts.ts";
import { withWordCount } from "./mutate.ts";

/** Must match RUN_STORAGE_KEY in lib/pipeline-client.ts. */
export const RUN_STORAGE_KEY = "cadence:run";

/**
 * `price_tiers` and `source` are optional on purpose. The canvas reads neither
 * to render provenance, so failing closed on a field it never uses would blank
 * the demo for no reason.
 */
export const StoredRun = z.object({
  deliverable: Deliverable,
  evidence: EvidenceArray,
  price_tiers: z.array(PriceTier).optional().default([]),
  source: z.enum(["live", "cached"]).optional().default("live"),
});

export type StoredRun = z.infer<typeof StoredRun>;

/** Returns null rather than throwing: a bad handoff falls back to fixtures. */
export function parseStoredRun(raw: string | null): StoredRun | null {
  if (!raw) return null;
  try {
    const run = StoredRun.parse(JSON.parse(raw));
    // Same rule as the fixture loader: the count is computed, never trusted.
    return { ...run, deliverable: withWordCount(run.deliverable) };
  } catch {
    return null;
  }
}

/** Browser-only. Safe to call during render on the client. */
export function readStoredRun(): StoredRun | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredRun(window.sessionStorage.getItem(RUN_STORAGE_KEY));
  } catch {
    // Private mode or a disabled store. The fixture fallback still renders.
    return null;
  }
}

// ── useSyncExternalStore adapter ───────────────────────────────────────────
// Reading the handoff is a subscription to an external store, not state
// synchronisation, so the canvas uses useSyncExternalStore rather than an
// effect. That avoids the cascading re-render an effect+setState would cause,
// and getServerSnapshot lets SSR render the fixture without a hydration
// mismatch.

let cachedRaw: string | null = null;
let cachedRun: StoredRun | null = null;

/**
 * Must be referentially stable between calls or React loops with "the result
 * of getSnapshot should be cached" — so the parse is memoised on the raw
 * string rather than rebuilt each render.
 */
export function getStoredRunSnapshot(): StoredRun | null {
  const raw =
    typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(RUN_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRun = parseStoredRun(raw);
  }
  return cachedRun;
}

/** The server has no sessionStorage; it renders the fixture. */
export function getServerStoredRunSnapshot(): StoredRun | null {
  return null;
}

export function subscribeToStoredRun(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
