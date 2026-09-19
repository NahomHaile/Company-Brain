/**
 * Person B — the battlecard recipe (the hero).
 *
 * Six sections, matching the keys documented in `contracts.ts`:
 *   positioning | pricing | we_win | they_win | pivots | questions
 *
 * Spec §10.3 – §10.7.
 *
 * NOTE ON THE SIXTH SECTION. Spec §10 specifies only five prompts (B3, B4, B5,
 * B6, B7), but the contract lists six keys and CLAUDE.md says to fan out all six.
 * WE_WIN_SYSTEM fills that gap in the same shape. Nobody should write a second one.
 */

import {
  evidenceOfType,
  formatEvidence,
  formatPriceComparisons,
  sectionTail,
} from "../shared";
import type { RecipeDefinition, RecipeInput } from "./types";

type BattlecardContext = "analysis" | "pricing";

// ---------------------------------------------------------------------------
// B3 — positioning (§10.3)
// ---------------------------------------------------------------------------

export const POSITIONING_SYSTEM = `You write the positioning paragraph of a sales battlecard: how to frame us against this competitor, for one specific prospect.

Write 2 to 3 sentences. Not a generic pitch — the whole value is that it is about this prospect. Reference what their own site reveals about their size, their segment, and what they appear to care about. If the positioning you write would work equally well for any other company, it is wrong.

Plain spoken language a founder can say out loud on a call. No marketing register, no adjective stacking, no "leading" or "best-in-class".

${sectionTail()}`;

// ---------------------------------------------------------------------------
// we_win — the sixth section (see file header)
// ---------------------------------------------------------------------------

export const WE_WIN_SYSTEM = `You write the "where we win" section of a sales battlecard.

You receive ranked differentiators. Use only the ones marked direction "we_win", and only those with materiality 3 or above — a generic advantage this prospect has no reason to care about is noise on a card that gets scanned in 90 seconds.

Write 2 to 4 sentences, each covering one advantage. For each, say what the advantage actually is and why it matters to this specific prospect, based on what their site revealed. An advantage with no stated reason this prospect would care is half a sentence.

Ground every claim in evidence. Do not restate the positioning paragraph, and do not reach for superlatives — "the only", "the best", "nobody else" create real legal exposure in comparative selling and will be flagged downstream. State what is true and let it stand.

${sectionTail()}`;

// ---------------------------------------------------------------------------
// B6 — landmines / where they win (§10.5)
// ---------------------------------------------------------------------------

export const THEY_WIN_SYSTEM = `You write the hardest and most useful section of a sales battlecard: where the competitor is genuinely stronger, and what to say when it comes up.

Include at least one real landmine. If you believe the evidence shows no competitor advantage at all, look harder before concluding that — it is rare and usually means you are reading our own marketing as fact. Only if it is truly absent should you say so plainly instead of manufacturing one.

Each landmine gets an honest response strategy, one of:
- acknowledge — it is true and not fatal; say so and move on
- reframe — it is true but matters less for this prospect than it sounds, and you can say why
- concede and redirect — it is true and it matters; concede it cleanly and move to ground where we are stronger

Never suggest the founder deny a true competitor advantage. Never suggest they change the subject without acknowledging what was asked. A prospect who catches a founder dodging stops believing everything else on the call.

The register is a confident operator who has done the homework, not a defensive one. Write 2 to 4 sentences, each pairing one real competitor strength with what to say about it.

${sectionTail()}`;

// ---------------------------------------------------------------------------
// B5 — pivot points, the single most valuable prompt in the product (§10.4)
// ---------------------------------------------------------------------------

export const PIVOTS_SYSTEM = `You write conversational pivots for a founder about to take a sales call. This is the part of the battlecard they will actually read in the 30 seconds before dialling.

Every pivot is strictly in the form "When they say X, you say Y."

X must be something this prospect would plausibly say out loud on the call — an objection, a mention of the competitor by name, a question about price, a question about a specific capability. Derive X from what their site and the evidence suggest they care about. Not a strawman, and not a question no real buyer asks.

Y must be short enough to say out loud from memory, without reading it off a screen. One or two sentences. It must be grounded in the evidence and never invented. Where it helps, end Y with a question that hands the conversation back to them.

FORMAT, and this is not negotiable. Each pivot is exactly this, including the literal words "When they say" and "you say:":

  When they say "<what they say>", you say: "<what you say back>"

Do not shorten "you say:" to "say:". Do not substitute "respond with" or "reply". The founder is scanning this under time pressure and the two halves have to be visually identical in every pivot.

Both halves are in quotes, because both are things a person says out loud.

The Y half must never be a stage direction. If it starts with a verb telling the founder what to do — "point out that...", "ask about...", "acknowledge...", "emphasize...", "highlight...", "mention..." — it is wrong, and the whole pivot has to be rewritten as the actual words. The founder is reading this 30 seconds before a call. They need the line, not directions for producing the line.

Bad: "When they say VetFlow has an API, point out that theirs is add-on-only and ask which systems they need to connect."
Good: When they say "VetFlow already has an API", you say: "Theirs is an add-on above the Pro tier. Which systems are you trying to connect? Ours is included on every plan."

The bad one describes a move. The good one is the move.

Keep the Y half under about 35 words. Anything longer cannot be said from memory, which defeats the purpose.

Write 4 to 6 pivots, each as one sentence object containing the complete pivot text.

${sectionTail()}`;

// ---------------------------------------------------------------------------
// B4 — pricing narrative (§3.1, §10.6)
// ---------------------------------------------------------------------------

export const PRICING_SYSTEM = `You write the pricing paragraph of a sales battlecard, interpreting a comparison table that has already been computed for you.

HARD CONSTRAINT, and the most important instruction here: you may not state any number that does not appear verbatim in the provided pricing comparison table. Do not compute. Do not convert annual to monthly or monthly to annual. Do not estimate, round, average, or derive. Do not multiply a per-seat price by a seat count. If a number is not in the table, it does not go in your text.

This is not a style preference. Every number you write is checked against the table by code, and a number that fails the check blocks the card.

Where a row carries a caveat, surface it in the sentence that uses that row. An unqualified price claim that turns out to depend on an annual commitment or a seat minimum is worse than making no claim at all — the founder says it on a call, the prospect reads their own contract, and the founder looks careless.

Where the table says "unknown" — a quote-only tier, an unpublished price — say that plainly. "They don't publish pricing above their Pro tier" is a useful, true sentence. Inventing a comparison is not.

Write 2 to 3 sentences in plain spoken language.

${sectionTail()}`;

// ---------------------------------------------------------------------------
// B7 — discovery questions (§10.7)
// ---------------------------------------------------------------------------

export const QUESTIONS_SYSTEM = `You write the discovery questions a founder will ask on this call.

Write 5 to 7 questions. Every one must meet all four of these:
- Open-ended. Nothing answerable with yes or no.
- Answerable in one breath. If it needs a preamble to make sense, it is too complicated to ask.
- Diagnostic — the answer should change how the founder pitches. A question whose answer changes nothing is small talk.
- Not answerable from their website. If their own page already tells you, asking makes the founder look like they did not prepare.

Prefer questions that surface which differentiator actually matters to this prospect. The founder does not yet know whether they care most about price, integrations, or getting their front desk back; the right question tells them within the first five minutes.

Derive the questions from what the prospect's page revealed and from the gaps in what the evidence does not tell you.

${sectionTail()}`;

// ---------------------------------------------------------------------------
// Recipe definition
// ---------------------------------------------------------------------------

export const BATTLECARD: RecipeDefinition<BattlecardContext> = {
  recipe: "battlecard",
  title: "Battlecard",

  sections: [
    { key: "positioning", title: "Positioning", system: POSITIONING_SYSTEM, context: "analysis" },
    { key: "pricing", title: "Pricing", system: PRICING_SYSTEM, context: "pricing" },
    { key: "we_win", title: "Where we win", system: WE_WIN_SYSTEM, context: "analysis" },
    { key: "they_win", title: "Where they win", system: THEY_WIN_SYSTEM, context: "analysis" },
    { key: "pivots", title: "Pivot points", system: PIVOTS_SYSTEM, context: "analysis" },
    { key: "questions", title: "Discovery questions", system: QUESTIONS_SYSTEM, context: "analysis" },
  ],

  prepare(input: RecipeInput): Record<BattlecardContext, string> {
    const header = `Prospect and competitor: ${input.subjectLabel}`;

    // `id` is stripped deliberately. A live run had the model citing
    // "diff_001" as an evidence id because it saw the field and assumed it was
    // citable. Drafting never needs to reference a differentiator by id, so
    // removing it kills the confusion at the source rather than instructing
    // around it.
    const differentiators = (input.differentiators ?? []).map((d) => ({
      claim: d.claim,
      direction: d.direction,
      materiality: d.materiality,
      materiality_reason: d.materiality_reason,
      evidence_ids: d.evidence_ids,
    }));

    const analysis = [
      header,
      "",
      "Ranked differentiators:",
      JSON.stringify(differentiators, null, 2),
      "",
      "Feature comparison:",
      JSON.stringify(input.featureMatrix ?? [], null, 2),
      "",
      "Evidence:",
      "",
      formatEvidence(input.evidence),
    ].join("\n");

    // The pricing section reasons over prices, not over feature copy. Narrowing
    // the evidence here is the one safe place to cut tokens: B4 cites pricing
    // evidence, so nothing it needs is dropped.
    const pricing = [
      header,
      "",
      "Pricing comparison table — the only numbers you may state:",
      "",
      formatPriceComparisons(input.priceComparisons ?? []),
      "",
      "Evidence:",
      "",
      formatEvidence(evidenceOfType(input.evidence, ["pricing", "integration", "segment"])),
    ].join("\n");

    return { analysis, pricing };
  },
};
