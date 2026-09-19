/**
 * Person B — competitive analysis.
 *
 * B1 feature matrix        → FeatureRow[]
 * B2 differentiator ranker → Differentiator[]
 *
 * Spec §10.1 and §10.2. Both run before drafting; their output is the engine's
 * input. Formatters and shared prompt fragments live in `shared.ts`.
 */

import {
  DifferentiatorArray,
  FeatureRowArray,
  type Differentiator,
  type Evidence,
  type FeatureRow,
} from "@/lib/contracts";
import { callClaude } from "./_dev/call-claude";
import { formatEvidence, JSON_ONLY } from "./shared";

// ---------------------------------------------------------------------------
// B1 — feature matrix (§10.1)
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
// B2 — differentiator ranker (§10.2)
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

  const ranked = await callClaude({
    system: DIFFERENTIATOR_SYSTEM,
    user,
    schema: DifferentiatorArray,
  });

  // Sort here rather than trusting the prompt. A live run returned these out of
  // order despite the instruction, and ordering is a deterministic operation —
  // the same reason §3.1 keeps arithmetic out of the model. The downstream
  // sections read "the top differentiators", so the order is load-bearing.
  // Ties keep the model's original sequence, which carries its own judgment.
  return [...ranked].sort((a, b) => b.materiality - a.materiality);
}
