// Server-only. One swap point between Person A's fixtures and C's sample.
//
// When data/fixtures/battlecard.json lands this picks it up with no canvas
// changes. When `evidence` is added to the Deliverable contract (it is absent
// today — the canvas cannot resolve a quote without it), the evidence.json
// branch below becomes dead code and can be deleted.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Deliverable, EvidenceArray } from "../contracts.ts";
import type { Evidence } from "../contracts.ts";
import { SAMPLE_DELIVERABLE, SAMPLE_EVIDENCE } from "./sample-deliverable.ts";

export type LoadedDeliverable = {
  deliverable: Deliverable;
  evidence: Evidence[];
  /** Drives the honesty badge (spec 4). "sample" and "fixture" are both cached. */
  source: "fixture" | "sample";
  /** Newest fetched_at across the evidence, for the CACHED badge. */
  fetchedAt: string | null;
};

function readJson(...segments: string[]): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), ...segments), "utf8"));
}

function newestFetch(evidence: Evidence[]): string | null {
  const stamps = evidence
    .map((e) => e.fetched_at)
    .filter((s): s is string => s !== null)
    .sort();
  return stamps.at(-1) ?? null;
}

export function loadDeliverable(): LoadedDeliverable {
  try {
    const raw = readJson("data", "fixtures", "battlecard.json");
    const deliverable = Deliverable.parse(raw);

    // Prefer evidence embedded in the deliverable; fall back to the separate
    // fixture. A deliverable that carries its own evidence is portable, which
    // is what makes Person D's `?demo=cached` run show real provenance.
    const embedded = (raw as { evidence?: unknown }).evidence;
    const evidence = EvidenceArray.parse(
      embedded ?? readJson("data", "fixtures", "evidence.json"),
    );

    return {
      deliverable,
      evidence,
      source: "fixture",
      fetchedAt: newestFetch(evidence),
    };
  } catch {
    // Fixtures absent or invalid — fall back so the canvas always renders.
    return {
      deliverable: SAMPLE_DELIVERABLE,
      evidence: SAMPLE_EVIDENCE,
      source: "sample",
      fetchedAt: newestFetch(SAMPLE_EVIDENCE),
    };
  }
}
