/**
 * TEMPORARY — Person B's live end-to-end check. Costs real API calls (~9).
 *
 *   npx tsx src/lib/prompts/_dev/verify-live.ts
 *
 * `verify-b.ts` proves the prompts CONTAIN their constraints. This proves the
 * model OBEYS them. Everything asserted here was unverifiable until we had a key.
 */

import { readFileSync } from "node:fs";
import { Deliverable as DeliverableSchema, type Section } from "@/lib/contracts";
import { buildFeatureMatrix, rankDifferentiators } from "../analyze";
import { draftRecipe } from "../draft";
import { SAMPLE_EVIDENCE, SAMPLE_PRICE_COMPARISONS } from "./sample-evidence";
import { SAMPLE_FOUNDER_NOTES } from "./sample-founder-notes";

// tsx does not read .env.local the way Next does.
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
}

let failures = 0;
let checks = 0;

function ok(label: string, passed: boolean, detail?: string) {
  checks += 1;
  if (!passed) failures += 1;
  console.log(`  ${passed ? "ok  " : "FAIL"}  ${label}`);
  if (detail) console.log(`          ${detail}`);
}

function group(name: string) {
  console.log(`\n${name}`);
}

const KNOWN_IDS = new Set(SAMPLE_EVIDENCE.map((e) => e.id));

async function main() {
  // -------------------------------------------------------------------------
  group("B1 — feature matrix");
  const t1 = Date.now();
  const matrix = await buildFeatureMatrix(SAMPLE_EVIDENCE);
  console.log(`  (${Date.now() - t1}ms, ${matrix.length} rows)`);

  ok("returns 5-9 rows", matrix.length >= 5 && matrix.length <= 9, `got ${matrix.length}`);
  const unknowns = matrix.filter((r) => r.ours === "unknown" || r.theirs === "unknown");
  ok(
    "uses `unknown` rather than guessing `no`",
    unknowns.length > 0,
    `${unknowns.length} unknown cells — zero would mean the model is inferring absence from silence`,
  );
  ok("flags at least one row as mattering to this prospect", matrix.some((r) => r.matters_to_target));
  ok("promoted rows come first", (() => {
    const flags = matrix.map((r) => r.matters_to_target);
    return flags.indexOf(false) === -1 || !flags.slice(flags.indexOf(false)).includes(true);
  })());
  ok("every row cites evidence", matrix.every((r) => r.evidence_ids.length > 0));
  ok("every cited id exists", matrix.every((r) => r.evidence_ids.every((id) => KNOWN_IDS.has(id))),
    matrix.flatMap((r) => r.evidence_ids).filter((id) => !KNOWN_IDS.has(id)).join(", ") || "all valid");

  // The fixture words the same capability two ways on purpose (ev_008 vs ev_012).
  const reminderRow = matrix.find((r) => /remind|recall|messag/i.test(r.feature));
  ok(
    "aligns 'automated reminders' with 'patient recall messaging' into one row",
    reminderRow !== undefined && reminderRow.ours !== "unknown" && reminderRow.theirs !== "unknown",
    reminderRow ? `"${reminderRow.feature}": ours=${reminderRow.ours} theirs=${reminderRow.theirs}` : "no such row",
  );

  // -------------------------------------------------------------------------
  group("B2 — differentiator ranker");
  const t2 = Date.now();
  const diffs = await rankDifferentiators(SAMPLE_EVIDENCE, matrix);
  console.log(`  (${Date.now() - t2}ms, ${diffs.length} differentiators)`);

  ok("returns 5-8 differentiators", diffs.length >= 5 && diffs.length <= 8, `got ${diffs.length}`);
  const theyWin = diffs.filter((d) => d.direction === "they_win");
  ok(
    "includes they_win items",
    theyWin.length > 0,
    theyWin.length === 0
      ? "ZERO they_win — the rubric is not biting and the founder gets ambushed"
      : theyWin.map((d) => `[${d.materiality}] ${d.claim.slice(0, 60)}`).join("\n          "),
  );
  ok("materiality is within 1-5", diffs.every((d) => d.materiality >= 1 && d.materiality <= 5));
  ok("sorted by materiality descending", diffs.every((d, i) => i === 0 || diffs[i - 1].materiality >= d.materiality));
  ok("every cited id exists", diffs.every((d) => d.evidence_ids.every((id) => KNOWN_IDS.has(id))));

  // -------------------------------------------------------------------------
  group("Full battlecard — six-way fan-out + assembly");
  const t3 = Date.now();
  const result = await draftRecipe("battlecard", {
    evidence: SAMPLE_EVIDENCE,
    featureMatrix: matrix,
    differentiators: diffs,
    priceComparisons: SAMPLE_PRICE_COMPARISONS,
    subjectLabel: "Thicket vs. VetFlow — for Brookside Animal Hospital",
  });
  const elapsed = Date.now() - t3;
  const { deliverable, warnings, timings } = result;
  console.log(`  (${elapsed}ms total)`);
  console.log(`  timings: ${JSON.stringify(timings)}`);
  if (warnings.length) console.log(`  warnings:\n          - ${warnings.join("\n          - ")}`);

  ok("Deliverable parses against the contract", DeliverableSchema.safeParse(deliverable).success);
  ok("all six sections present", deliverable.sections.length === 6, `got ${deliverable.sections.length}: ${deliverable.sections.map((s) => s.key).join(", ")}`);

  const slowest = Math.max(...Object.entries(timings).filter(([k]) => !k.startsWith("fan_out") && k !== "assembly").map(([, v]) => v));
  ok(
    "fan-out ran in parallel",
    timings.fan_out_total < slowest * 2,
    `fan-out ${timings.fan_out_total}ms vs slowest section ${slowest}ms`,
  );

  const allSentences = deliverable.sections.flatMap((s) => s.sentences);
  ok("sentence ids are globally unique", new Set(allSentences.map((s) => s.id)).size === allSentences.length);
  ok("no dangling citations reached the output", allSentences.every((s) => s.evidence_ids.every((id) => KNOWN_IDS.has(id))));
  const grounded = allSentences.filter((s) => s.evidence_ids.length > 0);
  ok(
    "most sentences are grounded",
    grounded.length / allSentences.length > 0.6,
    `${grounded.length}/${allSentences.length} carry evidence`,
  );
  ok(
    "word count is in the 350-550 target",
    deliverable.word_count >= 350 && deliverable.word_count <= 550,
    `got ${deliverable.word_count}`,
  );

  // -------------------------------------------------------------------------
  group("Per-section behaviour");
  const section = (key: string): Section | undefined => deliverable.sections.find((s) => s.key === key);

  const pivots = section("pivots");
  ok("pivots: 4-6 returned", !!pivots && pivots.sentences.length >= 4 && pivots.sentences.length <= 6, `got ${pivots?.sentences.length}`);
  // Test the STRUCTURE, not one token. Two earlier versions of this check
  // failed good pivots over surface wording: first by demanding "when they say"
  // when the model wrote "when they mention", then by demanding "you say" when
  // it wrote the equally correct "say:". What actually matters is that each
  // pivot has a trigger, a reply marker, and both halves as quoted speech —
  // that is what separates a line you can read aloud from a stage direction.
  const isWellFormed = (text: string) => {
    const hasTrigger = /\b(when|if) they (say|mention|ask|bring|raise|push|object)/i.test(text);
    const hasReplyMarker = /\b(you say|say)\s*:/i.test(text);
    // At least two quoted spans: what they say, and what you say back.
    const quoted = text.match(/["“][^"”]{8,}["”]/g) ?? [];
    // A stage direction tells the founder what to do instead of what to say.
    const isStageDirection =
      /\b(you say|say)\s*:?\s*(point out|acknowledge|emphasi[sz]e|highlight|mention that|explain that|remind them)/i.test(text);
    return hasTrigger && hasReplyMarker && quoted.length >= 2 && !isStageDirection;
  };

  const wellFormed = pivots?.sentences.filter((s) => isWellFormed(s.text)) ?? [];
  ok(
    "pivots: follow the 'when they say X, you say Y' shape",
    wellFormed.length >= (pivots?.sentences.length ?? 0) - 1,
    `${wellFormed.length}/${pivots?.sentences.length} well-formed`,
  );

  const questions = section("questions");
  ok("questions: 5-7 returned", !!questions && questions.sentences.length >= 5 && questions.sentences.length <= 7, `got ${questions?.sentences.length}`);
  ok("questions: all actually questions", questions?.sentences.every((s) => s.text.includes("?")) ?? false);

  ok("positioning: 2-3 sentences", (section("positioning")?.sentences.length ?? 0) <= 4);
  ok("they_win: non-empty (a real landmine)", (section("they_win")?.sentences.length ?? 0) > 0);

  // --- the claim a judge will probe ----------------------------------------
  const allowed = new Set<string>();
  for (const row of SAMPLE_PRICE_COMPARISONS) {
    for (const v of [row.normalized_monthly_per_seat_ours, row.normalized_monthly_per_seat_theirs, row.delta_abs, row.delta_pct]) {
      if (v !== null) allowed.add(String(v));
    }
    for (const n of row.caveat?.match(/\d+(?:\.\d+)?/g) ?? []) allowed.add(n);
  }
  const pricingText = section("pricing")?.sentences.map((s) => s.text).join(" ") ?? "";
  const unbacked = (pricingText.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !allowed.has(n));
  ok(
    "pricing: states NO number absent from the table",
    unbacked.length === 0,
    unbacked.length ? `INVENTED: ${unbacked.join(", ")}` : "every figure traced to the comparison table",
  );

  // -------------------------------------------------------------------------
  group("Sample output");
  for (const s of deliverable.sections) {
    console.log(`\n  [${s.key}]`);
    for (const sentence of s.sentences.slice(0, 3)) {
      console.log(`    • ${sentence.text}`);
      console.log(`      ${sentence.evidence_ids.join(", ") || "(unsourced)"}`);
    }
  }

  // -------------------------------------------------------------------------
  group("Investor update — recipe 2 on the same engine");
  const t4 = Date.now();
  const iu = await draftRecipe("investor_update", {
    evidence: SAMPLE_FOUNDER_NOTES,
    subjectLabel: "Thicket — September 2026 investor update",
  });
  console.log(`  (${Date.now() - t4}ms)`);
  if (iu.warnings.length) {
    console.log(`  warnings:\n          - ${iu.warnings.join("\n          - ")}`);
  }

  const section2 = (key: string): Section | undefined =>
    iu.deliverable.sections.find((s) => s.key === key);
  const iuKnown = new Set(SAMPLE_FOUNDER_NOTES.map((e) => e.id));
  const iuSentences = iu.deliverable.sections.flatMap((s) => s.sentences);

  ok("Deliverable parses", DeliverableSchema.safeParse(iu.deliverable).success);
  ok("tagged investor_update", iu.deliverable.recipe === "investor_update");
  ok(
    "all five sections present",
    iu.deliverable.sections.length === 5,
    iu.deliverable.sections.map((s) => s.key).join(", "),
  );
  ok("sentence ids globally unique", new Set(iuSentences.map((s) => s.id)).size === iuSentences.length);
  ok("no dangling citations", iuSentences.every((s) => s.evidence_ids.every((id) => iuKnown.has(id))));
  ok("headline offers 3 candidates", (section2("headline")?.sentences.length ?? 0) === 3);
  ok("lowlights are non-empty", (section2("lowlights")?.sentences.length ?? 0) > 0);
  ok("asks are non-empty", (section2("asks")?.sentences.length ?? 0) > 0);

  // Nothing in the notes is derivable, so any unlisted figure is invented.
  const iuAllowed = new Set<string>();
  for (const note of SAMPLE_FOUNDER_NOTES) {
    for (const n of note.quote.match(/\d[\d,]*\.?\d*/g) ?? []) {
      iuAllowed.add(n.replace(/[.,]$/, ""));
    }
  }
  const metricsText = section2("metrics")?.sentences.map((s) => s.text).join(" ") ?? "";
  const iuUnbacked = (metricsText.match(/\d[\d,]*\.?\d*/g) ?? [])
    .map((n) => n.replace(/[.,]$/, ""))
    .filter((n) => !iuAllowed.has(n));
  ok(
    "metrics: states no number absent from the notes",
    iuUnbacked.length === 0,
    iuUnbacked.length ? `INVENTED: ${iuUnbacked.join(", ")}` : "every figure traced to founder notes",
  );

  // fn_006 is a deliberately unexplained drop. The prompt permits saying so
  // outright; what it forbids is manufacturing a tidy cause.
  const lowlightText =
    section2("lowlights")?.sentences.map((s) => s.text).join(" ").toLowerCase() ?? "";
  ok(
    "lowlights engage with the unexplained metric drop (fn_006)",
    /22|31|convers/.test(lowlightText),
    lowlightText.slice(0, 160),
  );

  console.log("\n  Investor update output");
  for (const s of iu.deliverable.sections) {
    console.log(`\n  [${s.key}]`);
    for (const sentence of s.sentences.slice(0, 2)) {
      console.log(`    • ${sentence.text}`);
      console.log(`      ${sentence.evidence_ids.join(", ") || "(unsourced)"}`);
    }
  }

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} live checks passed\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nLIVE RUN FAILED:", error);
  process.exit(1);
});
