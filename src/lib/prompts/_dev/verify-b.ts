/**
 * TEMPORARY — Person B's self-check against CADENCE-BUILD-SPEC.md §10.
 *
 *   npx tsx src/lib/prompts/_dev/verify-b.ts
 *
 * Runs with no API key. Verifies what is true before a token is generated: that
 * the prompts carry the constraints the spec asked for, that recipe wiring is
 * sound, and that the engine's pure functions behave.
 *
 * What it cannot verify is whether the model OBEYS any of it. "B5 says 4 to 6
 * pivots" is a different claim from "B5 returns 4 to 6 pivots". That needs a key.
 */

import {
  Deliverable as DeliverableSchema,
  type Evidence,
  type PriceComparison,
  type Section,
} from "@/lib/contracts";
import { DIFFERENTIATOR_SYSTEM, FEATURE_MATRIX_SYSTEM } from "../analyze";
import {
  ASSEMBLY_SYSTEM,
  assemblyViolations,
  countWords,
  REGISTRY,
  stripDanglingCitations,
  withStableIds,
} from "../draft";
import {
  BATTLECARD,
  PIVOTS_SYSTEM,
  POSITIONING_SYSTEM,
  PRICING_SYSTEM,
  QUESTIONS_SYSTEM,
  THEY_WIN_SYSTEM,
  WE_WIN_SYSTEM,
} from "../recipes/battlecard";
import {
  ASKS_SYSTEM,
  HEADLINE_SYSTEM,
  HIGHLIGHTS_SYSTEM,
  INVESTOR_UPDATE,
  LOWLIGHTS_SYSTEM,
  METRICS_SYSTEM,
} from "../recipes/investor-update";
import { evidenceOfType, formatEvidence, formatPriceComparisons } from "../shared";
import { SAMPLE_EVIDENCE, SAMPLE_PRICE_COMPARISONS } from "./sample-evidence";

let failures = 0;
let checks = 0;

function group(name: string) {
  console.log(`\n${name}`);
}

function ok(label: string, passed: boolean, detail?: string) {
  checks += 1;
  if (!passed) failures += 1;
  console.log(`  ${passed ? "ok  " : "FAIL"}  ${label}`);
  if (!passed && detail) console.log(`          ${detail}`);
}

/** Case-insensitive substring, so wording tweaks don't produce false failures. */
function says(prompt: string, needle: string): boolean {
  return prompt.toLowerCase().includes(needle.toLowerCase());
}

const SECTION_PROMPTS: [string, string][] = [
  ["B3 positioning", POSITIONING_SYSTEM],
  ["B4 pricing", PRICING_SYSTEM],
  ["we_win", WE_WIN_SYSTEM],
  ["B6 they_win", THEY_WIN_SYSTEM],
  ["B5 pivots", PIVOTS_SYSTEM],
  ["B7 questions", QUESTIONS_SYSTEM],
  ["IU headline", HEADLINE_SYSTEM],
  ["IU metrics", METRICS_SYSTEM],
  ["IU highlights", HIGHLIGHTS_SYSTEM],
  ["IU lowlights", LOWLIGHTS_SYSTEM],
  ["IU asks", ASKS_SYSTEM],
];

const ALL_PROMPTS: [string, string][] = [
  ["B1 feature matrix", FEATURE_MATRIX_SYSTEM],
  ["B2 differentiator ranker", DIFFERENTIATOR_SYSTEM],
  ...SECTION_PROMPTS,
  ["B9 assembly", ASSEMBLY_SYSTEM],
];

// ===========================================================================
group("1. Every prompt enforces JSON-only output (§10)");
// ===========================================================================

for (const [name, prompt] of ALL_PROMPTS) {
  ok(
    `${name} — says "return only the JSON" and bans fences`,
    says(prompt, "return only the json") && says(prompt, "fences"),
  );
}

// ===========================================================================
group("2. Section prompts require per-sentence provenance (§3.2)");
// ===========================================================================

for (const [name, prompt] of SECTION_PROMPTS) {
  ok(`${name} — requires evidence_ids per sentence`, says(prompt, "evidence_ids"));
}
ok(
  "empty evidence_ids is framed as a flag, not a default",
  says(POSITIONING_SYSTEM, "empty array") &&
    says(POSITIONING_SYSTEM, "rather than inventing"),
);
ok(
  "the citation rule is shared, not copy-pasted per prompt",
  SECTION_PROMPTS.every(([, p]) => says(p, "Cite the specific items you actually used")),
);

// ===========================================================================
group("3. B1 feature matrix (§10.1)");
// ===========================================================================

ok("judges by function, not label", says(FEATURE_MATRIX_SYSTEM, "function, not"));
ok(
  "never infers `no` from silence",
  says(FEATURE_MATRIX_SYSTEM, "never infer") && says(FEATURE_MATRIX_SYSTEM, "silence"),
);
ok("names the false-negative failure mode", says(FEATURE_MATRIX_SYSTEM, "worst failure"));
ok(
  "sets matters_to_target from the prospect's own page",
  says(FEATURE_MATRIX_SYSTEM, "matters_to_target") &&
    says(FEATURE_MATRIX_SYSTEM, "prospect's own page"),
);
ok(
  "requires `why` to cite what that page revealed",
  says(FEATURE_MATRIX_SYSTEM, "rather than generic benefit language"),
);
ok(
  "defines all four support values",
  ["yes", "no", "partial", "unknown"].every((v) => says(FEATURE_MATRIX_SYSTEM, `"${v}"`)),
);

// ===========================================================================
group("4. B2 ranker rubric (§10.2)");
// ===========================================================================

for (const score of [1, 2, 3, 4, 5]) {
  ok(`rubric defines score ${score}`, new RegExp(`- ${score} —`).test(DIFFERENTIATOR_SYSTEM));
}
ok(
  "mandates they_win items",
  says(DIFFERENTIATOR_SYSTEM, "must include") && says(DIFFERENTIATOR_SYSTEM, "they_win"),
);
ok("names the ambush risk", says(DIFFERENTIATOR_SYSTEM, "ambushed"));
ok(
  "offers all three directions",
  ["we_win", "they_win", "parity"].every((d) => says(DIFFERENTIATOR_SYSTEM, d)),
);

// ===========================================================================
group("5. B5 pivots — the most valuable prompt (§10.4)");
// ===========================================================================

ok('enforces "when they say X, you say Y"', says(PIVOTS_SYSTEM, "when they say x, you say y"));
ok("asks for 4 to 6 pivots", says(PIVOTS_SYSTEM, "4 to 6"));
ok("demands speech, not marketing copy", says(PIVOTS_SYSTEM, "speech, not marketing copy"));
ok("carries both worked examples", says(PIVOTS_SYSTEM, "bad:") && says(PIVOTS_SYSTEM, "good:"));
ok("requires Y be sayable from memory", says(PIVOTS_SYSTEM, "without reading"));
ok("forbids invention", says(PIVOTS_SYSTEM, "never invented"));

// ===========================================================================
group("6. B6 landmines (§10.5)");
// ===========================================================================

ok("requires at least one real landmine", says(THEY_WIN_SYSTEM, "at least one real landmine"));
ok(
  "names all three response strategies",
  ["acknowledge", "reframe", "concede and redirect"].every((s) => says(THEY_WIN_SYSTEM, s)),
);
ok("forbids denying a true advantage", says(THEY_WIN_SYSTEM, "never suggest the founder deny"));
ok("sets the confident-operator register", says(THEY_WIN_SYSTEM, "confident operator"));

// ===========================================================================
group("7. B4 pricing — the model never computes (§3.1, §10.6)");
// ===========================================================================

ok("forbids numbers absent from the table", says(PRICING_SYSTEM, "may not state any number"));
ok("forbids computing", says(PRICING_SYSTEM, "do not compute"));
ok("forbids annual/monthly conversion", says(PRICING_SYSTEM, "convert"));
ok("forbids estimating and deriving", says(PRICING_SYSTEM, "estimate") && says(PRICING_SYSTEM, "derive"));
ok("requires caveats be surfaced", says(PRICING_SYSTEM, "caveat"));
ok("requires unknowns be stated plainly", says(PRICING_SYSTEM, "unknown"));
ok("asks for 2 to 3 sentences", says(PRICING_SYSTEM, "2 to 3 sentences"));

// ===========================================================================
group("8. B7 questions (§10.7) and B3 positioning (§10.3)");
// ===========================================================================

ok("B7 asks for 5 to 7 questions", says(QUESTIONS_SYSTEM, "5 to 7"));
ok("B7 requires open-ended", says(QUESTIONS_SYSTEM, "open-ended"));
ok("B7 requires diagnostic", says(QUESTIONS_SYSTEM, "diagnostic"));
ok("B7 excludes anything on their site", says(QUESTIONS_SYSTEM, "not answerable from their website"));
ok("B3 asks for 2 to 3 sentences", says(POSITIONING_SYSTEM, "2 to 3 sentences"));
ok("B3 rejects a generic pitch", says(POSITIONING_SYSTEM, "not a generic pitch"));

// ===========================================================================
group("9. B9 assembly (§10.8)");
// ===========================================================================

ok("targets 350 to 550 words", says(ASSEMBLY_SYSTEM, "350 to 550"));
ok("preserves evidence ids exactly", says(ASSEMBLY_SYSTEM, "preserve evidence ids exactly"));
ok("spells out the merge rule", says(ASSEMBLY_SYSTEM, "union of both id arrays"));
ok("introduces no new facts", says(ASSEMBLY_SYSTEM, "do not introduce any new fact"));
ok("forbids changing numbers", says(ASSEMBLY_SYSTEM, "do not change any number"));
ok("removes cross-section repetition", says(ASSEMBLY_SYSTEM, "repetition"));

// ===========================================================================
group("10. Investor-update recipe (§10.9)");
// ===========================================================================

ok("headline offers 3 candidates", says(HEADLINE_SYSTEM, "3 candidate"));
ok("metrics carries B4's no-new-numbers constraint", says(METRICS_SYSTEM, "may not state any number"));
ok("highlights require a 'so what'", says(HIGHLIGHTS_SYSTEM, "so what"));
ok("lowlights require at least one real one", says(LOWLIGHTS_SYSTEM, "at least one real one"));
ok("lowlights allow an explicit unknown cause", says(LOWLIGHTS_SYSTEM, "don't know why yet"));
ok("asks reject 'intros would be helpful'", says(ASKS_SYSTEM, "intros would be helpful"));

// ===========================================================================
group("11. Recipe wiring — asserted against the definitions, not source text");
// ===========================================================================

const CONTRACT_BATTLECARD_KEYS = [
  "positioning", "pricing", "we_win", "they_win", "pivots", "questions",
];
const CONTRACT_INVESTOR_KEYS = ["headline", "metrics", "highlights", "lowlights", "asks"];

const bcKeys = BATTLECARD.sections.map((s) => s.key);
const iuKeys = INVESTOR_UPDATE.sections.map((s) => s.key);

ok(
  `battlecard wires exactly the 6 contract keys (${bcKeys.length})`,
  CONTRACT_BATTLECARD_KEYS.every((k) => bcKeys.includes(k)) &&
    bcKeys.length === CONTRACT_BATTLECARD_KEYS.length,
  `got: ${bcKeys.join(", ")}`,
);
ok(
  `investor update wires exactly the 5 contract keys (${iuKeys.length})`,
  CONTRACT_INVESTOR_KEYS.every((k) => iuKeys.includes(k)) &&
    iuKeys.length === CONTRACT_INVESTOR_KEYS.length,
  `got: ${iuKeys.join(", ")}`,
);
ok("no duplicate keys in either recipe", new Set([...bcKeys, ...iuKeys]).size === bcKeys.length + iuKeys.length);
ok("every registry entry declares its own recipe name", Object.entries(REGISTRY).every(([name, def]) => def.recipe === name));
ok("every section has a non-empty system prompt", [...BATTLECARD.sections, ...INVESTOR_UPDATE.sections].every((s) => s.system.length > 200));
ok("every section has a human title", [...BATTLECARD.sections, ...INVESTOR_UPDATE.sections].every((s) => s.title.trim().length > 0));

// ===========================================================================
group("12. Every section's context key resolves to a real block");
// ===========================================================================

// The bug this catches: a typo in `context` silently sends the string
// "undefined" to the model as the entire user message.
const input = {
  evidence: SAMPLE_EVIDENCE,
  subjectLabel: "Thicket vs. VetFlow — for Brookside Animal Hospital",
  featureMatrix: [],
  differentiators: [],
  priceComparisons: SAMPLE_PRICE_COMPARISONS,
};

for (const [name, def] of Object.entries(REGISTRY)) {
  const blocks = def.prepare(input) as Record<string, string>;
  for (const section of def.sections) {
    const block = blocks[section.context];
    ok(
      `${name}/${section.key} → context "${section.context}" is a non-empty block`,
      typeof block === "string" && block.length > 50,
    );
  }
}

// ===========================================================================
group("13. Context blocks are prepared once, not per section");
// ===========================================================================

let prepareCalls = 0;
const counting = {
  ...BATTLECARD,
  prepare(i: typeof input) {
    prepareCalls += 1;
    return BATTLECARD.prepare(i);
  },
};
counting.prepare(input);
ok("prepare() is cheap to call and returns both blocks", prepareCalls === 1 && Object.keys(counting.prepare(input)).length === 2);

const bcBlocks = BATTLECARD.prepare(input);
ok("analysis block carries the full evidence set", SAMPLE_EVIDENCE.every((e) => bcBlocks.analysis.includes(e.id)));
ok("pricing block carries the comparison table", bcBlocks.pricing.includes("delta_pct"));
ok(
  "pricing block is narrower than the analysis block (token saving)",
  bcBlocks.pricing.length < bcBlocks.analysis.length,
  `pricing ${bcBlocks.pricing.length} vs analysis ${bcBlocks.analysis.length}`,
);

// ===========================================================================
group("14. Engine pure functions");
// ===========================================================================

const colliding = CONTRACT_BATTLECARD_KEYS.map((key) => ({
  key,
  title: key,
  sentences: [
    { id: "s1", text: `First sentence of ${key}.`, evidence_ids: ["ev_001"] },
    { id: "s2", text: `Second sentence of ${key}.`, evidence_ids: [] },
  ],
}));

const renamed: Section[] = colliding.map((s) => ({
  ...s,
  sentences: withStableIds(s.key, s.sentences),
}));
const allIds = renamed.flatMap((s) => s.sentences.map((x) => x.id));

ok(`withStableIds: ${allIds.length} ids across 6 sections, all unique`, new Set(allIds).size === allIds.length);
ok("withStableIds namespaces by section key", allIds[0] === "positioning_s1");
ok("withStableIds preserves evidence_ids", renamed[0].sentences[0].evidence_ids[0] === "ev_001");
ok("withStableIds preserves text", renamed[0].sentences[0].text.startsWith("First sentence"));

// 6 sections x 2 sentences x 4 words ("First sentence of positioning.")
const expectedWords = renamed.length * 2 * 4;
ok(
  `countWords counts across sections (expects ${expectedWords})`,
  countWords(renamed) === expectedWords,
  `got ${countWords(renamed)}`,
);
ok("countWords handles empty input", countWords([]) === 0);
ok(
  "countWords is not fooled by double spaces",
  countWords([{ key: "k", title: "t", sentences: [{ id: "a", text: "  two   words  ", evidence_ids: [] }] }]) === 2,
);

// ===========================================================================
group("14b. Degradation guards — the fallbacks must actually fire");
// ===========================================================================

// Assembly is instructed to preserve evidence ids. An instruction is not an
// enforcement mechanism, so each way it can lie must be caught.
ok("clean assembly reports no violations", assemblyViolations(renamed, renamed).length === 0);

const droppedSection = renamed.slice(0, 5);
ok("a dropped section is caught", assemblyViolations(renamed, droppedSection).length > 0);

const lostCitation = renamed.map((s, i) =>
  i === 0
    ? { ...s, sentences: s.sentences.map((x) => ({ ...x, evidence_ids: [] })) }
    : s,
);
ok(
  "a silently dropped citation is caught",
  assemblyViolations(renamed, lostCitation).some((p) => p.includes("lost citations")),
);

const inventedCitation = renamed.map((s, i) =>
  i === 0
    ? { ...s, sentences: s.sentences.map((x) => ({ ...x, evidence_ids: [...x.evidence_ids, "ev_999"] })) }
    : s,
);
ok(
  "an invented citation is caught",
  assemblyViolations(renamed, inventedCitation).some((p) => p.includes("invented")),
);

const allRenamed = renamed.map((s) => ({
  ...s,
  sentences: s.sentences.map((x, i) => ({ ...x, id: `zz_${i}` })),
}));
ok(
  "wholesale id renaming is caught (would orphan C's flags)",
  assemblyViolations(renamed, allRenamed).some((p) => p.includes("no sentence ids survived")),
);

// Dangling citations must never reach the canvas — a hover that resolves to
// nothing is worse than an admitted gap.
const withGhost: Section[] = [
  {
    key: "positioning",
    title: "Positioning",
    sentences: [
      { id: "positioning_s1", text: "Real.", evidence_ids: ["ev_001", "ev_999"] },
      { id: "positioning_s2", text: "Also real.", evidence_ids: ["ev_004"] },
    ],
  },
];
const stripped = stripDanglingCitations(withGhost, SAMPLE_EVIDENCE);
ok("dangling citation is removed", !stripped.sections[0].sentences[0].evidence_ids.includes("ev_999"));
ok("real citation survives stripping", stripped.sections[0].sentences[0].evidence_ids.includes("ev_001"));
ok("the dropped id is reported, not swallowed", stripped.dropped.includes("ev_999"));
ok("untouched sentences keep their citations", stripped.sections[0].sentences[1].evidence_ids.length === 1);

// ===========================================================================
group("15. A full Deliverable validates against the contract");
// ===========================================================================

const parsed = DeliverableSchema.safeParse({
  recipe: "battlecard",
  title: "Battlecard",
  subject_label: "Thicket vs. VetFlow — for Brookside Animal Hospital",
  sections: renamed,
  price_comparisons: SAMPLE_PRICE_COMPARISONS,
  feature_matrix: [],
  risk_flags: [],
  grounding_issues: [],
  generated_at: new Date().toISOString(),
  word_count: countWords(renamed),
});
ok("assembled Deliverable parses", parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));

// ===========================================================================
group("16. B4 number guardrail catches a bad claim");
// ===========================================================================

/**
 * Local stand-in for A's verifyNumbers() (§9.7). B4's whole promise is that it
 * states no number absent from the table, so the guardrail has to be shown to
 * catch a deliberately wrong sentence — not just to pass a good one.
 */
function unbackedNumbers(text: string, comparisons: PriceComparison[]): string[] {
  const allowed = new Set<string>();
  for (const row of comparisons) {
    for (const value of [
      row.normalized_monthly_per_seat_ours,
      row.normalized_monthly_per_seat_theirs,
      row.delta_abs,
      row.delta_pct,
    ]) {
      if (value !== null) allowed.add(String(value));
    }
    for (const n of row.caveat?.match(/\d+(?:\.\d+)?/g) ?? []) allowed.add(n);
  }
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !allowed.has(n));
}

const good = "We come in at $79 per seat against their $149, though their Pro tier carries a 3-seat minimum.";
const bad = "We are 47% cheaper, which saves a five-person clinic about $4,200 a year.";

ok("a table-backed sentence passes", unbackedNumbers(good, SAMPLE_PRICE_COMPARISONS).length === 0, unbackedNumbers(good, SAMPLE_PRICE_COMPARISONS).join(", "));
ok("invented arithmetic is caught", unbackedNumbers(bad, SAMPLE_PRICE_COMPARISONS).length > 0);
ok("  → and the offending figures are named", unbackedNumbers(bad, SAMPLE_PRICE_COMPARISONS).includes("47"));

// ===========================================================================
group("17. Formatters");
// ===========================================================================

const evidenceBlock = formatEvidence(SAMPLE_EVIDENCE);
ok("every evidence id reaches the prompt", SAMPLE_EVIDENCE.every((e) => evidenceBlock.includes(e.id)));
ok("every verbatim quote reaches the prompt", SAMPLE_EVIDENCE.every((e) => evidenceBlock.includes(e.quote)));
ok("stale evidence is marked", evidenceBlock.includes("[STALE]"));
ok("low-confidence evidence is marked", evidenceBlock.includes("[LOW CONFIDENCE]"));
ok("empty evidence degrades gracefully", formatEvidence([]).includes("no evidence"));

const pricingBlock = formatPriceComparisons(SAMPLE_PRICE_COMPARISONS);
ok("every caveat reaches the prompt", SAMPLE_PRICE_COMPARISONS.every((c) => !c.caveat || pricingBlock.includes(c.caveat)));
ok("quote-only tiers render as unknown", pricingBlock.includes("unknown"));
ok("empty pricing tells the model to state no price", formatPriceComparisons([]).includes("do not state any price"));

ok("evidenceOfType narrows when it can", evidenceOfType(SAMPLE_EVIDENCE, ["pricing"]).length < SAMPLE_EVIDENCE.length);
ok(
  "evidenceOfType never starves a prompt",
  evidenceOfType(SAMPLE_EVIDENCE, ["ask"] as Evidence["type"][]).length === SAMPLE_EVIDENCE.length,
);

// ===========================================================================

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed\n`);
process.exit(failures === 0 ? 0 : 1);
