/**
 * Person B — competitive analysis.
 *
 * B1 feature matrix  → FeatureRow[]
 * B2 differentiator ranker → Differentiator[]
 *
 * Spec: CADENCE-BUILD-SPEC.md §10.1 and §10.2.
 *
 * The evidence/pricing formatters live here rather than in a new shared module
 * because CLAUDE.md assigns `prompts/analyze.ts` and `prompts/draft.ts` to B but
 * `prompts/evidence.ts` to A — a new unassigned file in this directory would blur
 * that line. `draft.ts` imports them from here.
 */

import {
  DifferentiatorArray,
  FeatureRowArray,
  type Differentiator,
  type Evidence,
  type FeatureRow,
  type PriceComparison,
} from "@/lib/contracts";
import { callClaude } from "./_dev/call-claude";

// ---------------------------------------------------------------------------
// Formatters — shared with draft.ts
// ---------------------------------------------------------------------------

/**
 * Render evidence for a prompt. Compact on purpose: the verbatim quote is the
 * part that matters, and padding the context with JSON punctuation costs tokens
 * on every one of the eight calls in a run.
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
 * Render the pricing table for B4. Every number the model is permitted to say
 * appears here and nowhere else.
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

/** Competitor pricing pages change. 30 days is the spec's staleness line (§11.2). */
function isStale(fetchedAt: string | null): boolean {
  if (!fetchedAt) return false;
  const fetched = Date.parse(fetchedAt);
  if (Number.isNaN(fetched)) return false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - fetched > thirtyDays;
}

/** Shared tail — the retry in callClaude is a backstop, not the first line of defence. */
const JSON_ONLY =
  "Return only the JSON described above. No preamble, no explanation, no markdown fences, no trailing commentary.";

// ---------------------------------------------------------------------------
// B1 — feature matrix
// ---------------------------------------------------------------------------

export const FEATURE_MATRIX_SYSTEM = `You align product capabilities across two companies into one comparison table for a sales battlecard.

You receive evidence extracted from three places: our own site (recipe_role "own"), a competitor's site (recipe_role "competitor"), and the prospect's site (recipe_role "target"). Every item carries a verbatim quote and an id.

The hard part is that the same capability is described in different words on each site. "Automated reminders" and "patient recall messaging" are very likely the same feature. Judge by function, not by label. Align them into a single row and name that row in plain language a founder would actually say out loud.

For each row set "ours" and "theirs" to one of:
- "yes" — the evidence states the capability exists
- "partial" — the evidence shows a limited or conditional version: gated behind a higher tier, sold as an add-on, or only part of the full capability
- "no" — the evidence positively states the capability is absent
- "unknown" — the page is silent on it

Use "unknown" whenever a page simply says nothing. Never infer "no" from silence. A false "they don't have that" is the worst failure this table can produce: the founder says it on a live call, the prospect corrects them, and the deal is gone. An admitted gap costs nothing by comparison.

Then use the prospect's own page to set "matters_to_target". Set it true only when something on the target's site suggests they would genuinely care — their size, a pain they state outright, their segment, or a capability they visibly lack today. "why" is one clause explaining that judgment, and it should point at what the prospect's page actually revealed rather than generic benefit language. A feature this prospect does not care about is noise on the card.

"evidence_ids" lists every evidence id the row rests on, from both companies.

Return 5 to 9 rows as a JSON array, ordered so that matters_to_target rows come first. Each object has exactly these keys: feature, ours, theirs, matters_to_target, why, evidence_ids.

${JSON_ONLY}`;

export async function buildFeatureMatrix(
  evidence: Evidence[],
): Promise<FeatureRow[]> {
  return callClaude({
    system: FEATURE_MATRIX_SYSTEM,
    user: `Evidence:\n\n${formatEvidence(evidence)}`,
    schema: FeatureRowArray,
  });
}

// ---------------------------------------------------------------------------
// B2 — differentiator ranker
// ---------------------------------------------------------------------------

export const DIFFERENTIATOR_SYSTEM = `You score competitive differences by how much each one should shape one specific sales conversation.

You receive a feature comparison table and the evidence behind it, including evidence from the prospect's own site. Produce a ranked list of differences.

Score "materiality" 1 to 5 against this rubric. Do not invent your own scale:
- 5 — likely to decide this deal, given what this prospect's page says about their segment, size, and priorities
- 4 — a strong talking point this specific prospect will care about
- 3 — worth a mention if the conversation goes there
- 2 — true but generic; any prospect would hear the same thing
- 1 — noise

Set "direction" to "we_win", "they_win", or "parity".

You must include the "they_win" items. A battlecard that lists only our strengths is how a founder gets ambushed on a call. If the evidence shows the competitor is genuinely better at something, score it honestly — a they_win item can absolutely be a 5.

"claim" is one plain sentence stating the difference, written so a founder could say it out loud. "materiality_reason" is one clause justifying the score, and it should reference this prospect rather than a generic buyer. "id" is "diff_001", "diff_002", and so on in the order you return them.

"evidence_ids" lists every evidence id the claim rests on. A claim you cannot tie to evidence does not belong in the list at all.

Return 5 to 8 differences as a JSON array, sorted by materiality descending. Each object has exactly these keys: id, claim, direction, materiality, materiality_reason, evidence_ids.

${JSON_ONLY}`;

export async function rankDifferentiators(
  evidence: Evidence[],
  matrix: FeatureRow[],
): Promise<Differentiator[]> {
  const user = [
    "Feature comparison table:",
    JSON.stringify(matrix, null, 2),
    "",
    "Evidence:",
    "",
    formatEvidence(evidence),
  ].join("\n");

  return callClaude({
    system: DIFFERENTIATOR_SYSTEM,
    user,
    schema: DifferentiatorArray,
  });
}
