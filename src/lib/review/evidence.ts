// Evidence lookup and staleness. Pure — no React, no I/O.
import type { Evidence } from "../contracts.ts";

/**
 * Competitor pricing pages change, so evidence older than this is called out
 * on the card rather than quoted flat (spec 11.2, 11.3).
 */
export const STALE_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isStale(fetchedAt: string | null, now: Date = new Date()): boolean {
  // Absence of a timestamp is not staleness — a pasted Slack message never had
  // one. Marking those stale would train Maya to ignore the badge.
  if (fetchedAt === null) return false;
  const fetched = Date.parse(fetchedAt);
  if (Number.isNaN(fetched)) return false;
  return now.getTime() - fetched > STALE_AFTER_DAYS * DAY_MS;
}

export function buildEvidenceIndex(evidence: Evidence[]): Map<string, Evidence> {
  return new Map(evidence.map((e) => [e.id, e]));
}

/** Resolves in citation order. Ids with no record are dropped, not faked. */
export function resolveEvidence(
  ids: string[],
  index: Map<string, Evidence>,
): Evidence[] {
  return ids
    .map((id) => index.get(id))
    .filter((e): e is Evidence => e !== undefined);
}
