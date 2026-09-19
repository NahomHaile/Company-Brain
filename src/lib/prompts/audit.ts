// C1 de-robotify, C2 grounding auditor, C3 risk flagger.
//
// Deliberately free of any import from `@/lib/anthropic`: this module is pure
// strings and schemas, so it lands and typechecks whether or not Person A's
// client exists yet. `api/audit/route.ts` is what depends on callClaude.
//
// Prompt text follows CADENCE-BUILD-SPEC.md 11.1-11.3. Where a rule below is
// not in the spec, it is marked and exists because the review canvas needs it.
import {
  Deliverable,
  GroundingIssueArray,
  RiskFlagArray,
} from "../contracts.ts";
import type { Evidence } from "../contracts.ts";

/** Spec 11.1. "Sound natural" does nothing; the banned constructions are the point. */
export const C1_DEROBOTIFY = `Rewrite this deliverable to remove machine-written tells while preserving meaning and every evidence ID.

Remove entirely: "delve", "it's worth noting", "that said", "at the end of the day", "navigate the landscape", "robust", "seamless", "leverage" as a verb, "in today's".
Remove three-item lists that exist only for rhythm.
Remove em-dash asides.
Remove "not just X, but Y".
Remove sentences that open by restating their section header.
Break any sentence over 30 words into shorter ones.

This is language a founder says out loud on a call: short, plain, specific.

Add no new facts and change no number. Every sentence keeps its id and its evidence_ids exactly as given. If you split a sentence, the new sentences carry the same evidence_ids and take ids of the form "<original_id>a", "<original_id>b".

Return the complete Deliverable as JSON only, no prose and no code fence.`;

/** Spec 11.2. Chain Person A's verifyNumbers() after this as a deterministic second pass. */
export const C2_GROUNDING = `For each sentence, verify every factual claim traces to one of its cited evidence items.

Flag only these issues:
- "unsourced": a claim with no supporting evidence.
- "number_not_in_table": a figure absent from the pricing comparison.
- "overstated": the evidence supports something weaker than claimed. Evidence says "offers integrations", the sentence says "integrates with everything".
- "stale_evidence": the claim rests on evidence fetched more than 30 days ago, which matters because competitor pricing pages change.

Return issues only. A sentence that is properly grounded produces no entry.
Each issue is {"sentence_id": string, "issue": one of the four above, "detail": one sentence naming the specific evidence id or figure}.

Return a JSON array only, no prose and no code fence. An empty array is a valid answer.`;

/** Spec 11.3. Flag, never rewrite — the founder decides. */
export const C3_RISK = `Identify spans that could expose the founder if said on a recorded call or forwarded to the competitor.

Categories:
- "unverified_competitor_claim": stated as fact about the competitor without evidence.
- "disparagement": attacks the competitor rather than comparing to them.
- "stale_pricing": a price claim resting on evidence older than 30 days. Being wrong on a call is worse than saying "last I checked".
- "absolute_superiority_claim": "the only", "the best", "nobody else" — comparative advertising exposure.
- "confidential_pricing": our internal discounting or margin.

Return one object per flag with EVERY one of these fields:
- "id": a unique string, "rf_001", "rf_002", and so on.
- "sentence_id": the id of the sentence the span appears in, copied from the input.
- "span": the exact text, see below.
- "category": one of the five above.
- "severity": "low", "medium" or "high".
- "why": one sentence.
- "suggested_alternative": phrasing that keeps the point while removing the exposure.

Omitting "id" or "sentence_id" fails validation and the whole audit is discarded.

The "span" MUST be copied character for character from the sentence text, including punctuation and casing. It is matched by exact substring search to highlight it in place; a paraphrased or re-punctuated span silently fails to match and the warning is demoted out of the text. Prefer the shortest span that carries the risk, and never let two spans on one sentence overlap.

Flag, never rewrite. The founder decides.

Return a JSON array only, no prose and no code fence. An empty array is a valid answer.`;

/**
 * C2 needs the price table to judge `number_not_in_table` and the evidence
 * timestamps to judge `stale_evidence`, so both travel with the sentences.
 */
export function buildAuditInput(deliverable: Deliverable, evidence: Evidence[]) {
  return JSON.stringify({
    sentences: deliverable.sections.flatMap((section) =>
      section.sentences.map((sentence) => ({
        id: sentence.id,
        section: section.key,
        text: sentence.text,
        evidence_ids: sentence.evidence_ids,
      })),
    ),
    evidence: evidence.map((item) => ({
      id: item.id,
      quote: item.quote,
      source_label: item.source_label,
      fetched_at: item.fetched_at,
    })),
    price_comparisons: deliverable.price_comparisons,
    today: new Date().toISOString(),
  });
}

/**
 * C1 rewrites prose and nothing else, and runAudit restores the pricing table
 * and feature matrix from the draft regardless of what comes back. Sending
 * them is paid for twice — once going in, once echoed back out — and on a real
 * six-section battlecard that echo is what pushes C1 past its token cap and
 * loses the whole audit. Blanking them also means C1 cannot alter a number
 * even if the prompt failed to stop it (CLAUDE.md rule 1).
 */
export function buildDerobotifyInput(deliverable: Deliverable) {
  return JSON.stringify({
    ...deliverable,
    price_comparisons: [],
    feature_matrix: [],
  });
}

// Validate every model response before use. Unvalidated JSON from a model is a
// runtime crash during the demo.
export const C1_SCHEMA = Deliverable;
export const C2_SCHEMA = GroundingIssueArray;
export const C3_SCHEMA = RiskFlagArray;
