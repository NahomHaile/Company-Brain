/**
 * Fixture validator — Person A.
 *
 * Three people build against data/fixtures/. A fixture that doesn't satisfy its
 * Zod schema is a crash that shows up in someone else's component at 3:20.
 * Run: npm run fixtures
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  EvidenceArray,
  PriceTierArray,
  Deliverable,
} from "../src/lib/contracts";

const DIR = join(process.cwd(), "data", "fixtures");

const CHECKS: Array<[string, z.ZodType]> = [
  ["evidence.json", EvidenceArray],
  ["update-evidence.json", EvidenceArray],
  ["pricing.json", PriceTierArray],
  ["battlecard.json", Deliverable],
  ["update.json", Deliverable],
];

let failed = 0;

for (const [file, schema] of CHECKS) {
  const path = join(DIR, file);
  if (!existsSync(path)) {
    console.log(`SKIP  ${file} — not written yet`);
    continue;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    failed++;
    console.log(`FAIL  ${file} — not valid JSON: ${(err as Error).message}`);
    continue;
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    const count = Array.isArray(result.data) ? result.data.length : 1;
    console.log(`OK    ${file} — ${count} item${count === 1 ? "" : "s"}`);
  } else {
    failed++;
    console.log(`FAIL  ${file}`);
    for (const issue of result.error.issues) {
      console.log(`      ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  }
}

// ── Referential integrity ──────────────────────────────────────────────────
// Zod proves the shapes. It does not prove that evidence_ids point at evidence
// that exists, and a dangling id is exactly what makes a provenance popover
// render blank in the demo. Check the cross-file references too.

const load = <T,>(file: string): T[] => {
  const path = join(DIR, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
};

type Ev = { id: string };
const evidenceIds = new Set(
  [...load<Ev>("evidence.json"), ...load<Ev>("update-evidence.json")].map(
    (e) => e.id,
  ),
);

for (const file of ["battlecard.json", "update.json"]) {
  const path = join(DIR, file);
  if (!existsSync(path)) continue;
  // Re-parse through the schema so everything below is typed rather than any.
  // It already passed validation above; this just recovers the types.
  const parsed = Deliverable.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) continue; // already reported as a schema failure
  const d = parsed.data;

  const sentences = d.sections.flatMap((s) => s.sentences);
  const sentenceIds = new Set(sentences.map((s) => s.id));
  const problems: string[] = [];

  const checkEvidence = (ids: string[], where: string) => {
    for (const id of ids) {
      if (!evidenceIds.has(id)) problems.push(`${where} cites missing ${id}`);
    }
  };

  for (const s of sentences) checkEvidence(s.evidence_ids, s.id);
  for (const row of d.feature_matrix)
    checkEvidence(row.evidence_ids, `matrix "${row.feature}"`);

  for (const flag of d.risk_flags) {
    if (!sentenceIds.has(flag.sentence_id)) {
      problems.push(`${flag.id} targets missing sentence ${flag.sentence_id}`);
      continue;
    }
    // The canvas highlights the span by substring match. If it isn't in the
    // sentence, the flag silently renders nothing.
    const sentence = sentences.find((s) => s.id === flag.sentence_id)!;
    if (!sentence.text.includes(flag.span)) {
      problems.push(`${flag.id} span is not a substring of ${flag.sentence_id}`);
    }
  }

  for (const issue of d.grounding_issues) {
    if (!sentenceIds.has(issue.sentence_id)) {
      problems.push(`grounding issue targets missing ${issue.sentence_id}`);
    }
  }

  // The model never computes these — assert the arithmetic ourselves.
  for (const c of d.price_comparisons) {
    const { normalized_monthly_per_seat_ours: ours } = c;
    const { normalized_monthly_per_seat_theirs: theirs } = c;
    if (ours === null || theirs === null) continue;
    const abs = Math.round((theirs - ours) * 100) / 100;
    const pct = Math.round((abs / theirs) * 10000) / 100;
    if (abs !== c.delta_abs) {
      problems.push(`${c.our_tier} vs ${c.their_tier}: delta_abs should be ${abs}`);
    }
    if (pct !== c.delta_pct) {
      problems.push(`${c.our_tier} vs ${c.their_tier}: delta_pct should be ${pct}`);
    }
  }

  if (problems.length) {
    failed++;
    console.log(`FAIL  ${file} — referential integrity`);
    for (const p of problems) console.log(`      ${p}`);
  } else {
    console.log(`OK    ${file} — references and pricing math resolve`);
  }
}

if (failed > 0) {
  console.log(`\n${failed} fixture problem(s).`);
  process.exit(1);
}
console.log("\nAll fixtures valid.");
