/**
 * Person B — drafting.
 *
 * Battlecard sections (fanned out in parallel):
 *   B3 positioning · B4 pricing · we_win · B6 they_win · B5 pivots · B7 questions
 * Then B9 assembly → Deliverable.
 *
 * Investor-update recipe reuses the same runner and the same assembly pass.
 *
 * Spec: CADENCE-BUILD-SPEC.md §10.3 – §10.9.
 *
 * NOTE ON THE SIXTH SECTION. `contracts.ts` lists six battlecard section keys
 * (positioning | pricing | we_win | they_win | pivots | questions) and CLAUDE.md
 * says to fan out all six, but spec §10 only specifies five prompts — there is no
 * prompt for `we_win`. WE_WIN_SYSTEM below fills that gap in the same shape.
 */

import { z } from "zod";
import {
  Section as SectionSchema,
  Sentence as SentenceSchema,
  type Deliverable,
  type Differentiator,
  type Evidence,
  type FeatureRow,
  type PriceComparison,
  type Section,
  type Sentence,
} from "@/lib/contracts";
import { callClaude } from "./_dev/call-claude";
import { formatEvidence, formatPriceComparisons } from "./analyze";

const SentenceArray = z.array(SentenceSchema);
const SectionArray = z.array(SectionSchema);

const JSON_ONLY =
  "Return only the JSON described above. No preamble, no explanation, no markdown fences, no trailing commentary.";

/**
 * Every section prompt ends with this. Provenance is the product — a sentence
 * with no evidence behind it is a grounding flag, not a default.
 */
const CITATION_RULE = `Every sentence carries "evidence_ids": the ids of the evidence items it rests on. Cite the specific items you actually used, not every id you were shown. If a sentence genuinely rests on no evidence, return an empty array rather than inventing a citation — a downstream audit will flag it, which is the correct outcome. Never state a fact that no evidence supports just to fill the section.

"id" is a short slug, unique within the section.`;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface BattlecardContext {
  evidence: Evidence[];
  featureMatrix: FeatureRow[];
  differentiators: Differentiator[];
  priceComparisons: PriceComparison[];
  /** "Thicket vs. VetFlow — for Brookside Animal Hospital" */
  subjectLabel: string;
}

export interface InvestorUpdateContext {
  evidence: Evidence[];
  /** "Thicket — September 2026 investor update" */
  subjectLabel: string;
}

// ---------------------------------------------------------------------------
// Section runner
// ---------------------------------------------------------------------------

/**
 * Re-id sentences as `<section>_s1`, `<section>_s2`, ...
 *
 * Sections are drafted in parallel by independent calls, so left alone their ids
 * collide. C's risk flags and grounding issues both key off sentence_id, so a
 * duplicate id would silently attach a flag to the wrong sentence in the canvas.
 */
function withStableIds(key: string, sentences: Sentence[]): Sentence[] {
  return sentences.map((sentence, index) => ({
    ...sentence,
    id: `${key}_s${index + 1}`,
  }));
}

async function draftSection(
  key: string,
  title: string,
  system: string,
  user: string,
): Promise<Section> {
  const sentences = await callClaude({
    system,
    user,
    schema: SentenceArray,
  });
  return { key, title, sentences: withStableIds(key, sentences) };
}

/** Deterministic — the model never counts anything. */
function countWords(sections: Section[]): number {
  return sections
    .flatMap((section) => section.sentences)
    .reduce(
      (total, sentence) =>
        total + sentence.text.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
}

// ---------------------------------------------------------------------------
// B3 — positioning
// ---------------------------------------------------------------------------

export const POSITIONING_SYSTEM = `You write the positioning paragraph of a sales battlecard: how to frame us against this competitor, for one specific prospect.

Write 2 to 3 sentences. Not a generic pitch — the whole value is that it is about this prospect. Reference what their own site reveals about their size, their segment, and what they appear to care about. If the positioning you write would work equally well for any other company, it is wrong.

Plain spoken language a founder can say out loud on a call. No marketing register, no adjective stacking, no "leading" or "best-in-class".

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// we_win — the sixth section (not in spec §10; see file header)
// ---------------------------------------------------------------------------

export const WE_WIN_SYSTEM = `You write the "where we win" section of a sales battlecard.

You receive ranked differentiators. Use only the ones marked direction "we_win", and only those with materiality 3 or above — a generic advantage this prospect has no reason to care about is noise on a card that gets scanned in 90 seconds.

Write 2 to 4 sentences, each covering one advantage. For each, say what the advantage actually is and why it matters to this specific prospect, based on what their site revealed. An advantage with no stated reason this prospect would care is half a sentence.

Ground every claim in evidence. Do not restate the positioning paragraph, and do not reach for superlatives — "the only", "the best", "nobody else" create real legal exposure in comparative selling and will be flagged downstream. State what is true and let it stand.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// B6 — landmines / where they win
// ---------------------------------------------------------------------------

export const THEY_WIN_SYSTEM = `You write the hardest and most useful section of a sales battlecard: where the competitor is genuinely stronger, and what to say when it comes up.

Include at least one real landmine. If you believe the evidence shows no competitor advantage at all, look harder before concluding that — it is rare and usually means you are reading our own marketing as fact. Only if it is truly absent should you say so plainly instead of manufacturing one.

Each landmine gets an honest response strategy, one of:
- acknowledge — it is true and not fatal; say so and move on
- reframe — it is true but matters less for this prospect than it sounds, and you can say why
- concede and redirect — it is true and it matters; concede it cleanly and move to ground where we are stronger

Never suggest the founder deny a true competitor advantage. Never suggest they change the subject without acknowledging what was asked. A prospect who catches a founder dodging stops believing everything else on the call.

The register is a confident operator who has done the homework, not a defensive one. Write 2 to 4 sentences, each pairing one real competitor strength with what to say about it.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// B5 — pivot points (the single most valuable prompt in the product)
// ---------------------------------------------------------------------------

export const PIVOTS_SYSTEM = `You write conversational pivots for a founder about to take a sales call. This is the part of the battlecard they will actually read in the 30 seconds before dialling.

Every pivot is strictly in the form "When they say X, you say Y."

X must be something this prospect would plausibly say out loud on the call — an objection, a mention of the competitor by name, a question about price, a question about a specific capability. Derive X from what their site and the evidence suggest they care about. Not a strawman, and not a question no real buyer asks.

Y must be short enough to say out loud from memory, without reading it off a screen. One or two sentences. It must be grounded in the evidence and never invented. Where it helps, end Y with a question that hands the conversation back to them.

Write speech, not marketing copy. The test: could a person say this sentence to another person without sounding like a brochure?

Bad: "Emphasize our superior integration ecosystem and seamless onboarding experience."
Good: "If they mention VetFlow's API — theirs is add-on-only above the Pro tier. Ask which systems they need to connect, then show them ours is included at every tier."

The bad one is a stage direction. The good one is a thing you say, and it ends by asking them something.

Write 4 to 6 pivots, each as one sentence object containing the full "When they say X, you say Y" text.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// B4 — pricing narrative
// ---------------------------------------------------------------------------

export const PRICING_SYSTEM = `You write the pricing paragraph of a sales battlecard, interpreting a comparison table that has already been computed for you.

HARD CONSTRAINT, and the most important instruction here: you may not state any number that does not appear verbatim in the provided pricing comparison table. Do not compute. Do not convert annual to monthly or monthly to annual. Do not estimate, round, average, or derive. Do not multiply a per-seat price by a seat count. If a number is not in the table, it does not go in your text.

This is not a style preference. Every number you write is checked against the table by code, and a number that fails the check blocks the card.

Where a row carries a caveat, surface it in the sentence that uses that row. An unqualified price claim that turns out to depend on an annual commitment or a seat minimum is worse than making no claim at all — the founder says it on a call, the prospect reads their own contract, and the founder looks careless.

Where the table says "unknown" — a quote-only tier, an unpublished price — say that plainly. "They don't publish pricing above their Pro tier" is a useful, true sentence. Inventing a comparison is not.

Write 2 to 3 sentences in plain spoken language.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// B7 — discovery questions
// ---------------------------------------------------------------------------

export const QUESTIONS_SYSTEM = `You write the discovery questions a founder will ask on this call.

Write 5 to 7 questions. Every one must meet all four of these:
- Open-ended. Nothing answerable with yes or no.
- Answerable in one breath. If it needs a preamble to make sense, it is too complicated to ask.
- Diagnostic — the answer should change how the founder pitches. A question whose answer changes nothing is small talk.
- Not answerable from their website. If their own page already tells you, asking makes the founder look like they did not prepare.

Prefer questions that surface which differentiator actually matters to this prospect. The founder does not yet know whether they care most about price, integrations, or getting their front desk back; the right question tells them within the first five minutes.

Derive the questions from what the prospect's page revealed and from the gaps in what the evidence does not tell you.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// B9 — assembly
// ---------------------------------------------------------------------------

export const ASSEMBLY_SYSTEM = `You are given several sections of a document, each drafted independently and therefore without knowledge of the others. Assemble them into one coherent piece.

Do this:
- Remove cross-section repetition. A point made in the pivots should not restate the positioning paragraph. When two sections make the same point, keep it where it lands hardest and cut the other.
- Fix transitions so the sections read as one document rather than six.
- Tighten. Target 350 to 550 words total. This gets scanned in 90 seconds before a call, not read.

Do not do this:
- Do not introduce any new fact, claim, number, or example that was not already in the text you were given.
- Do not change any number.
- Do not add, remove, or reorder sections. Return exactly the sections you were given, with the same "key" and "title" values.

PRESERVE EVIDENCE IDS EXACTLY. This is the constraint most likely to be violated and the one that matters most. Every sentence keeps the evidence_ids it arrived with. If you merge two sentences, the merged sentence carries the union of both id arrays — never just the first one. If you split a sentence, both halves carry the original array. If you cut a sentence entirely, its ids disappear with it, which is fine. What is not fine is a surviving sentence that has quietly lost a citation.

Keep each sentence's "id" as it arrived.

Return a JSON array of section objects with exactly these keys: key, title, sentences. Each sentence has exactly: id, text, evidence_ids.

${JSON_ONLY}`;

async function assemble(sections: Section[]): Promise<Section[]> {
  return callClaude({
    system: ASSEMBLY_SYSTEM,
    user: JSON.stringify(sections, null, 2),
    schema: SectionArray,
    maxTokens: 16000,
  });
}

// ---------------------------------------------------------------------------
// Battlecard recipe
// ---------------------------------------------------------------------------

/**
 * Fan out all six sections, then assemble.
 *
 * The six calls are independent, so they run in one Promise.all. Sequential is
 * roughly 50s and kills the demo; parallel is roughly 10s (spec §3.4).
 */
export async function draftBattlecard(
  ctx: BattlecardContext,
): Promise<Deliverable> {
  const evidenceBlock = formatEvidence(ctx.evidence);
  const matrixBlock = JSON.stringify(ctx.featureMatrix, null, 2);
  const diffBlock = JSON.stringify(ctx.differentiators, null, 2);

  const analysisContext = [
    `Prospect and competitor: ${ctx.subjectLabel}`,
    "",
    "Ranked differentiators:",
    diffBlock,
    "",
    "Feature comparison:",
    matrixBlock,
    "",
    "Evidence:",
    "",
    evidenceBlock,
  ].join("\n");

  const pricingContext = [
    `Prospect and competitor: ${ctx.subjectLabel}`,
    "",
    "Pricing comparison table — the only numbers you may state:",
    "",
    formatPriceComparisons(ctx.priceComparisons),
    "",
    "Evidence:",
    "",
    evidenceBlock,
  ].join("\n");

  const drafted = await Promise.all([
    draftSection("positioning", "Positioning", POSITIONING_SYSTEM, analysisContext),
    draftSection("pricing", "Pricing", PRICING_SYSTEM, pricingContext),
    draftSection("we_win", "Where we win", WE_WIN_SYSTEM, analysisContext),
    draftSection("they_win", "Where they win", THEY_WIN_SYSTEM, analysisContext),
    draftSection("pivots", "Pivot points", PIVOTS_SYSTEM, analysisContext),
    draftSection("questions", "Discovery questions", QUESTIONS_SYSTEM, analysisContext),
  ]);

  const sections = await assemble(drafted);

  return {
    recipe: "battlecard",
    title: "Battlecard",
    subject_label: ctx.subjectLabel,
    sections,
    price_comparisons: ctx.priceComparisons,
    feature_matrix: ctx.featureMatrix,
    // C's audit route fills these in; B never writes them.
    risk_flags: [],
    grounding_issues: [],
    generated_at: new Date().toISOString(),
    word_count: countWords(sections),
  };
}

// ---------------------------------------------------------------------------
// Investor-update recipe — same engine, different sections (§10.9)
// ---------------------------------------------------------------------------

export const HEADLINE_SYSTEM = `You write the headline of a founder's monthly investor update.

Offer 3 candidate headlines as 3 separate sentences, so the founder can pick. Each is one line, states the month's actual story, and is specific enough that an investor skimming on a phone learns something from the headline alone. "A busy month" is not a headline.

Order them: strongest first. Write them in the founder's voice, not a press release's.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

export const METRICS_SYSTEM = `You write the metrics paragraph of a founder's monthly investor update.

HARD CONSTRAINT: you may not state any number that does not appear in the evidence you were given. Do not compute growth rates, percentages, runway, averages, or ratios. Do not annualize a monthly figure. If a number is not in the evidence verbatim, it does not go in your text. Investors check these against the last update, and a derived number that turns out wrong is the kind of thing that gets remembered.

Write 2 to 4 sentences. Report what moved and what it means. A number with no interpretation is a dashboard screenshot; an interpretation with no number is a feeling.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

export const HIGHLIGHTS_SYSTEM = `You write the highlights of a founder's monthly investor update.

Write 3 to 5 sentences, one per highlight. Every single one needs a "so what" — what it changes about the business. A changelog line is not a highlight.

Bad: "We shipped the new onboarding flow."
Good: "We shipped the new onboarding flow, and time-to-first-booking for new clinics dropped from days to under an hour."

The second one tells an investor something. The first one tells them you were busy.

Do not inflate. If a highlight is small, say it plainly and let it be small — a padded highlights list makes the real ones harder to see.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

export const LOWLIGHTS_SYSTEM = `You write the lowlights of a founder's monthly investor update.

Include at least one real one. An update with no lowlights is not read as a good month; it is read as an incomplete update, and it costs the founder credibility on every other claim in the document.

Write 2 to 3 sentences, one per lowlight. Each gets either a mitigation — what is being done about it — or an explicit "we don't know why yet". Both are acceptable. What is not acceptable is stating a problem and moving on as though it resolves itself, or dressing a real problem up as a learning opportunity.

Plain language. An investor reading this should come away understanding the problem well enough to offer help.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

export const ASKS_SYSTEM = `You write the asks of a founder's monthly investor update. This is the section investors actually act on, and it is almost always wasted.

Write 2 to 4 sentences, one per ask. Every ask must be specific enough to answer in a single reply. Name a role, a company type, or a named category of person. "Intros would be helpful" is not an ask — nobody can act on it, so nobody does.

Bad: "Any intros to potential customers would be great."
Good: "Looking for intros to practice managers at 3-to-10-location veterinary groups in the Midwest — we close those fastest."

Derive the asks from what the evidence says the business actually needs this month, not from a generic list.

${CITATION_RULE}

Return a JSON array of sentence objects with exactly these keys: id, text, evidence_ids.

${JSON_ONLY}`;

/**
 * Recipe 2. Same runner, same assembly pass, same Deliverable shape — so C's
 * canvas renders it with no extra code.
 */
export async function draftInvestorUpdate(
  ctx: InvestorUpdateContext,
): Promise<Deliverable> {
  const context = [
    `Update subject: ${ctx.subjectLabel}`,
    "",
    "Evidence — founder notes, metrics, and source material:",
    "",
    formatEvidence(ctx.evidence),
  ].join("\n");

  const drafted = await Promise.all([
    draftSection("headline", "Headline", HEADLINE_SYSTEM, context),
    draftSection("metrics", "Metrics", METRICS_SYSTEM, context),
    draftSection("highlights", "Highlights", HIGHLIGHTS_SYSTEM, context),
    draftSection("lowlights", "Lowlights", LOWLIGHTS_SYSTEM, context),
    draftSection("asks", "Asks", ASKS_SYSTEM, context),
  ]);

  const sections = await assemble(drafted);

  return {
    recipe: "investor_update",
    title: "Investor update",
    subject_label: ctx.subjectLabel,
    sections,
    price_comparisons: [],
    feature_matrix: [],
    risk_flags: [],
    grounding_issues: [],
    generated_at: new Date().toISOString(),
    word_count: countWords(sections),
  };
}
