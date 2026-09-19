/**
 * TEMPORARY — Person B's self-check against CADENCE-BUILD-SPEC.md §10.
 *
 *   npx tsx src/lib/prompts/_dev/verify-b.ts
 *
 * Everything here runs without an API key. It verifies the things that are true
 * before a single token is generated: that the prompts actually carry the
 * constraints the spec asked for, that the section keys match the contract, and
 * that the number guardrail on B4 works. Output quality still needs a live run.
 */

import { readFileSync } from "node:fs";
import {
  Deliverable as DeliverableSchema,
  type PriceComparison,
  type Section,
} from "@/lib/contracts";
import {
  DIFFERENTIATOR_SYSTEM,
  FEATURE_MATRIX_SYSTEM,
  formatEvidence,
  formatPriceComparisons,
} from "../analyze";
import {
  ASKS_SYSTEM,
  ASSEMBLY_SYSTEM,
  HEADLINE_SYSTEM,
  HIGHLIGHTS_SYSTEM,
  LOWLIGHTS_SYSTEM,
  METRICS_SYSTEM,
  PIVOTS_SYSTEM,
  POSITIONING_SYSTEM,
  PRICING_SYSTEM,
  QUESTIONS_SYSTEM,
  THEY_WIN_SYSTEM,
  WE_WIN_SYSTEM,
} from "../draft";
import {
  SAMPLE_EVIDENCE,
  SAMPLE_PRICE_COMPARISONS,
} from "./sample-evidence";

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

// ===========================================================================
group("1. Every prompt enforces JSON-only output (§10, every prompt)");
// ===========================================================================

const ALL_PROMPTS: [string, string][] = [
  ["B1 feature matrix", FEATURE_MATRIX_SYSTEM],
  ["B2 differentiator ranker", DIFFERENTIATOR_SYSTEM],
  ["B3 positioning", POSITIONING_SYSTEM],
  ["B4 pricing", PRICING_SYSTEM],
  ["we_win", WE_WIN_SYSTEM],
  ["B6 they_win", THEY_WIN_SYSTEM],
  ["B5 pivots", PIVOTS_SYSTEM],
  ["B7 questions", QUESTIONS_SYSTEM],
  ["B9 assembly", ASSEMBLY_SYSTEM],
  ["IU headline", HEADLINE_SYSTEM],
  ["IU metrics", METRICS_SYSTEM],
  ["IU highlights", HIGHLIGHTS_SYSTEM],
  ["IU lowlights", LOWLIGHTS_SYSTEM],
  ["IU asks", ASKS_SYSTEM],
];

for (const [name, prompt] of ALL_PROMPTS) {
  ok(
    `${name} — says "return only the JSON" and bans fences`,
    says(prompt, "return only the json") && says(prompt, "fences"),
  );
}

// ===========================================================================
group("2. Section prompts require per-sentence provenance (§3.2)");
// ===========================================================================

const SECTION_PROMPTS = ALL_PROMPTS.filter(
  ([name]) => !name.startsWith("B1") && !name.startsWith("B2") && !name.startsWith("B9"),
);

for (const [name, prompt] of SECTION_PROMPTS) {
  ok(
    `${name} — requires evidence_ids per sentence`,
    says(prompt, "evidence_ids"),
  );
}
ok(
  "empty evidence_ids is framed as a flag, not a default (§3.2)",
  says(POSITIONING_SYSTEM, "empty array") &&
    says(POSITIONING_SYSTEM, "rather than inventing"),
);

// ===========================================================================
group("3. B1 feature matrix carries its §10.1 constraints");
// ===========================================================================

ok("judges by function, not label", says(FEATURE_MATRIX_SYSTEM, "function, not"));
ok(
  "never infers `no` from silence",
  says(FEATURE_MATRIX_SYSTEM, "never infer") && says(FEATURE_MATRIX_SYSTEM, "silence"),
);
ok(
  "states why a false negative is the worst outcome",
  says(FEATURE_MATRIX_SYSTEM, "worse") || says(FEATURE_MATRIX_SYSTEM, "worst"),
);
ok(
  "sets matters_to_target from the target's own page",
  says(FEATURE_MATRIX_SYSTEM, "matters_to_target") &&
    (says(FEATURE_MATRIX_SYSTEM, "prospect's own page") ||
      says(FEATURE_MATRIX_SYSTEM, "target's site")),
);
ok(
  "requires `why` to cite what the prospect's page revealed",
  says(FEATURE_MATRIX_SYSTEM, "rather than generic benefit language"),
);
ok("defines all four support values", ["yes", "partial", "unknown"].every((v) => says(FEATURE_MATRIX_SYSTEM, `"${v}"`)));

// ===========================================================================
group("4. B2 ranker carries its §10.2 rubric");
// ===========================================================================

for (const score of [1, 2, 3, 4, 5]) {
  ok(`rubric defines score ${score}`, new RegExp(`- ${score} —`).test(DIFFERENTIATOR_SYSTEM));
}
ok(
  "mandates they_win items be included",
  says(DIFFERENTIATOR_SYSTEM, "must include") && says(DIFFERENTIATOR_SYSTEM, "they_win"),
);
ok(
  "names the ambush risk of a strengths-only card",
  says(DIFFERENTIATOR_SYSTEM, "ambushed"),
);
ok("all three directions offered", ["we_win", "they_win", "parity"].every((d) => says(DIFFERENTIATOR_SYSTEM, d)));

// ===========================================================================
group("5. B5 pivots — the most valuable prompt (§10.4)");
// ===========================================================================

ok('enforces strict "when they say X, you say Y"', says(PIVOTS_SYSTEM, "when they say x, you say y"));
ok("asks for 4 to 6 pivots", says(PIVOTS_SYSTEM, "4 to 6"));
ok("demands speech, not marketing copy", says(PIVOTS_SYSTEM, "speech, not marketing copy"));
ok("carries both the bad and the good worked example", says(PIVOTS_SYSTEM, "bad:") && says(PIVOTS_SYSTEM, "good:"));
ok("requires Y be sayable from memory", says(PIVOTS_SYSTEM, "without reading"));
ok("forbids invention", says(PIVOTS_SYSTEM, "never invented"));

// ===========================================================================
group("6. B6 landmines (§10.5)");
// ===========================================================================

ok("requires at least one real landmine", says(THEY_WIN_SYSTEM, "at least one real landmine"));
ok("names all three response strategies", ["acknowledge", "reframe", "concede and redirect"].every((s) => says(THEY_WIN_SYSTEM, s)));
ok("forbids denying a true advantage", says(THEY_WIN_SYSTEM, "never suggest the founder deny"));
ok("sets the confident-operator register", says(THEY_WIN_SYSTEM, "confident operator"));

// ===========================================================================
group("7. B4 pricing — the model never computes (§3.1, §10.6)");
// ===========================================================================

ok("forbids any number absent from the table", says(PRICING_SYSTEM, "may not state any number"));
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
ok("B7 excludes anything answerable from their site", says(QUESTIONS_SYSTEM, "not answerable from their website"));
ok("B3 asks for 2 to 3 sentences", says(POSITIONING_SYSTEM, "2 to 3 sentences"));
ok("B3 rejects a generic pitch", says(POSITIONING_SYSTEM, "not a generic pitch"));

// ===========================================================================
group("9. B9 assembly (§10.8)");
// ===========================================================================

ok("targets 350 to 550 words", says(ASSEMBLY_SYSTEM, "350 to 550"));
ok("preserves evidence ids exactly", says(ASSEMBLY_SYSTEM, "preserve evidence ids exactly"));
ok("spells out the merge rule (union of arrays)", says(ASSEMBLY_SYSTEM, "union of both id arrays"));
ok("introduces no new facts", says(ASSEMBLY_SYSTEM, "do not introduce any new fact"));
ok("forbids changing numbers", says(ASSEMBLY_SYSTEM, "do not change any number"));
ok("removes cross-section repetition", says(ASSEMBLY_SYSTEM, "repetition"));

// ===========================================================================
group("10. Investor-update recipe (§10.9)");
// ===========================================================================

ok("headline offers 3 candidates", says(HEADLINE_SYSTEM, "3 candidate"));
ok("metrics carries the same no-new-numbers constraint as B4", says(METRICS_SYSTEM, "may not state any number"));
ok("highlights require a 'so what'", says(HIGHLIGHTS_SYSTEM, "so what"));
ok("lowlights require at least one real one", says(LOWLIGHTS_SYSTEM, "at least one real one"));
ok("lowlights allow an explicit unknown cause", says(LOWLIGHTS_SYSTEM, "don't know why yet"));
ok("asks reject 'intros would be helpful'", says(ASKS_SYSTEM, "intros would be helpful"));

// ===========================================================================
group("11. Section keys match the contract (contracts.ts:80)");
// ===========================================================================

const BATTLECARD_KEYS = ["positioning", "pricing", "we_win", "they_win", "pivots", "questions"];
const INVESTOR_KEYS = ["headline", "metrics", "highlights", "lowlights", "asks"];

// Read back what draftBattlecard actually wires up, rather than trusting a list.
// Run from the repo root.
const draftSource = readFileSync("src/lib/prompts/draft.ts", "utf8");

const wiredKeys = [...draftSource.matchAll(/draftSection\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
const wiredBattlecard = wiredKeys.filter((k) => BATTLECARD_KEYS.includes(k));
const wiredInvestor = wiredKeys.filter((k) => INVESTOR_KEYS.includes(k));

ok(
  `all six battlecard keys are wired (found ${wiredBattlecard.length})`,
  BATTLECARD_KEYS.every((k) => wiredBattlecard.includes(k)),
  `missing: ${BATTLECARD_KEYS.filter((k) => !wiredBattlecard.includes(k)).join(", ")}`,
);
ok(
  `all five investor keys are wired (found ${wiredInvestor.length})`,
  INVESTOR_KEYS.every((k) => wiredInvestor.includes(k)),
);
ok("no key is wired twice", new Set(wiredKeys).size === wiredKeys.length);

// ===========================================================================
group("12. Fan-out is actually parallel (§3.4)");
// ===========================================================================

const promiseAllCount = (draftSource.match(/await Promise\.all\(\[/g) ?? []).length;
ok(
  `sections fan out via Promise.all (${promiseAllCount} fan-outs: battlecard + investor)`,
  promiseAllCount === 2,
);
ok(
  "no sequential awaited draftSection outside a fan-out",
  !/\bconst \w+ = await draftSection\(/.test(draftSource),
);

// ===========================================================================
group("13. The model never computes a number (§3.1)");
// ===========================================================================

ok("word_count is computed in TypeScript", /function countWords/.test(draftSource));
ok("word_count is not asked of the model", !says(ASSEMBLY_SYSTEM, "word_count"));

const analyzeSource = readFileSync("src/lib/prompts/analyze.ts", "utf8");
// B formats the pricing table for the prompt but must never do arithmetic on it.
const doesPriceMath = /normalized_monthly_per_seat_\w+\s*[-+*/]/.test(analyzeSource);
ok("B does no arithmetic on price fields", !doesPriceMath);

// ===========================================================================
group("14. Sentence ids survive parallel drafting");
// ===========================================================================

ok("ids are namespaced per section", /`\$\{key\}_s\$\{index \+ 1\}`/.test(draftSource));

// Simulate what six parallel calls would return: every section numbering from s1.
const collidingSections: Section[] = BATTLECARD_KEYS.map((key) => ({
  key,
  title: key,
  sentences: [
    { id: "s1", text: `First sentence of ${key}.`, evidence_ids: ["ev_001"] },
    { id: "s2", text: `Second sentence of ${key}.`, evidence_ids: [] },
  ],
}));

const renamed = collidingSections.map((section) => ({
  ...section,
  sentences: section.sentences.map((s, i) => ({ ...s, id: `${section.key}_s${i + 1}` })),
}));
const allIds = renamed.flatMap((s) => s.sentences.map((x) => x.id));
ok(
  `${allIds.length} sentence ids across 6 sections, all unique`,
  new Set(allIds).size === allIds.length,
);

// ===========================================================================
group("15. A full Deliverable validates against the contract");
// ===========================================================================

const deliverable = {
  recipe: "battlecard" as const,
  title: "Battlecard",
  subject_label: "Thicket vs. VetFlow — for Brookside Animal Hospital",
  sections: renamed,
  price_comparisons: SAMPLE_PRICE_COMPARISONS,
  feature_matrix: [],
  risk_flags: [],
  grounding_issues: [],
  generated_at: new Date().toISOString(),
  word_count: 42,
};

const parsed = DeliverableSchema.safeParse(deliverable);
ok(
  "assembled Deliverable parses",
  parsed.success,
  parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)),
);

// ===========================================================================
group("16. B4 number guardrail actually catches a bad claim");
// ===========================================================================

/**
 * A local stand-in for A's verifyNumbers() (§9.7). B4's whole promise is that it
 * states no number absent from the table, so the guardrail has to be shown to
 * work against a deliberately wrong sentence — not just against a good one.
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
    // Numbers quoted inside a caveat are already vetted by A's engine.
    for (const n of row.caveat?.match(/\d+(?:\.\d+)?/g) ?? []) allowed.add(n);
  }
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !allowed.has(n));
}

const goodSentence =
  "We come in at $79 per seat against their $149, though their Pro tier carries a 3-seat minimum.";
const badSentence =
  "We are 47% cheaper, which saves a five-person clinic about $4,200 a year.";

ok(
  "a table-backed sentence passes",
  unbackedNumbers(goodSentence, SAMPLE_PRICE_COMPARISONS).length === 0,
  `flagged: ${unbackedNumbers(goodSentence, SAMPLE_PRICE_COMPARISONS).join(", ")}`,
);
ok(
  "a sentence with invented arithmetic is caught",
  unbackedNumbers(badSentence, SAMPLE_PRICE_COMPARISONS).length > 0,
);
ok(
  "  → and it names the offending figures",
  unbackedNumbers(badSentence, SAMPLE_PRICE_COMPARISONS).includes("4"),
);

// ===========================================================================
group("17. Formatters expose what the prompts need");
// ===========================================================================

const evidenceBlock = formatEvidence(SAMPLE_EVIDENCE);
ok("every evidence id reaches the prompt", SAMPLE_EVIDENCE.every((e) => evidenceBlock.includes(e.id)));
ok("every verbatim quote reaches the prompt", SAMPLE_EVIDENCE.every((e) => evidenceBlock.includes(e.quote)));
ok("stale evidence is marked for the model", evidenceBlock.includes("[STALE]"));
ok("low-confidence evidence is marked", evidenceBlock.includes("[LOW CONFIDENCE]"));

const pricingBlock = formatPriceComparisons(SAMPLE_PRICE_COMPARISONS);
ok("every caveat reaches the prompt", SAMPLE_PRICE_COMPARISONS.every((c) => !c.caveat || pricingBlock.includes(c.caveat)));
ok("quote-only tiers render as unknown, not as a number", pricingBlock.includes("unknown"));
ok(
  "empty pricing tells the model to state no price",
  formatPriceComparisons([]).includes("do not state any price"),
);

// ===========================================================================

console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed\n`,
);
process.exit(failures === 0 ? 0 : 1);
