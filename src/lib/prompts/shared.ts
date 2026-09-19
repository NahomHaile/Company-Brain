/**
 * Person B — shared prompt fragments and context formatters.
 *
 * Used by `analyze.ts` (B1/B2) and by every recipe under `recipes/`.
 * `prompts/evidence.ts` is Person A's; everything else in this directory is B's.
 */

import type { Evidence, PriceComparison } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Prompt fragments — one definition, appended by every prompt that needs it
// ---------------------------------------------------------------------------

/** The retry in callClaude is a backstop, not the first line of defence. */
export const JSON_ONLY =
  "Return only the JSON described above. No preamble, no explanation, no markdown fences, no trailing commentary.";

/**
 * Provenance is the product. A sentence with no evidence behind it is a
 * grounding flag, not a default (§3.2).
 */
export const CITATION_RULE = `Every sentence carries "evidence_ids": the ids of the evidence items it rests on. Cite the specific items you actually used, not every id you were shown. If a sentence genuinely rests on no evidence, return an empty array rather than inventing a citation — a downstream audit will flag it, which is the correct outcome. Never state a fact that no evidence supports just to fill the section.

"id" is a short slug, unique within the section.`;

/** Every section prompt returns the same shape. */
export const SENTENCE_ARRAY_SHAPE =
  "Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.";

/** Composes the tail every section prompt ends with. */
export function sectionTail(): string {
  return `${CITATION_RULE}\n\n${SENTENCE_ARRAY_SHAPE}\n\n${JSON_ONLY}`;
}

// ---------------------------------------------------------------------------
// Staleness
// ---------------------------------------------------------------------------

/** Competitor pricing pages change. 30 days is the spec's line (§11.2). */
export function isStale(fetchedAt: string | null): boolean {
  if (!fetchedAt) return false;
  const fetched = Date.parse(fetchedAt);
  if (Number.isNaN(fetched)) return false;
  return Date.now() - fetched > 30 * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Render evidence for a prompt. Compact on purpose: the verbatim quote is the
 * part that matters, and JSON punctuation costs tokens on every one of the
 * parallel calls in a run.
 */
export function formatEvidence(evidence: Evidence[]): string {
  if (evidence.length === 0) return "(no evidence available)";

  return evidence
    .map((item) => {
      const stale = isStale(item.fetched_at) ? " [STALE]" : "";
      const weak = item.confidence < 0.6 ? " [LOW CONFIDENCE]" : "";
      return [
        `${item.id} (${item.recipe_role}, ${item.type})${stale}${weak}`,
        `  source: ${item.source_label}`,
        `  quote: "${item.quote}"`,
        `  summary: ${item.summary}`,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Narrow evidence to the types a section actually reasons over.
 *
 * Six sections each receiving the full evidence set is the single biggest
 * avoidable token cost in a run. Filtering is conservative by design: a section
 * can only cite evidence it was shown, so dropping an item it needed would show
 * up as a missing citation rather than a visibly wrong answer.
 */
export function evidenceOfType(
  evidence: Evidence[],
  types: Evidence["type"][],
): Evidence[] {
  const wanted = new Set(types);
  const filtered = evidence.filter((item) => wanted.has(item.type));
  // Never hand a prompt an empty block because the filter was too aggressive.
  return filtered.length > 0 ? filtered : evidence;
}

/**
 * Render the pricing table. Every number the model is permitted to say appears
 * here and nowhere else.
 */
export function formatPriceComparisons(comparisons: PriceComparison[]): string {
  if (comparisons.length === 0) {
    return "(no pricing comparison available — do not state any price)";
  }

  return comparisons
    .map((row) => {
      const ours = row.normalized_monthly_per_seat_ours;
      const theirs = row.normalized_monthly_per_seat_theirs;
      return [
        `${row.our_tier} vs ${row.their_tier}`,
        `  ours: ${ours === null ? "unknown" : `$${ours}/seat/month`}`,
        `  theirs: ${theirs === null ? "unknown" : `$${theirs}/seat/month`}`,
        `  delta_abs: ${row.delta_abs === null ? "unknown" : `$${row.delta_abs}`}`,
        `  delta_pct: ${row.delta_pct === null ? "unknown" : `${row.delta_pct}%`}`,
        `  cheaper: ${row.cheaper}`,
        `  caveat: ${row.caveat ?? "none"}`,
      ].join("\n");
    })
    .join("\n\n");
}
