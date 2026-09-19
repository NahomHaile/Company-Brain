/**
 * TEMPORARY — validates B's sample data against the real contracts.
 * Dies with the rest of `_dev/` when A's fixtures land.
 *
 *   npx tsx src/lib/prompts/_dev/verify-fixtures.ts
 *
 * Catches the failure mode that actually bites: hand-written fixtures that drift
 * from the schema, so a prompt is tested against a shape the pipeline never sees.
 */

import {
  EvidenceArray,
  PriceComparison,
  PriceTierArray,
} from "@/lib/contracts";
import { z } from "zod";
import {
  SAMPLE_EVIDENCE,
  SAMPLE_PRICE_COMPARISONS,
  SAMPLE_PRICE_TIERS,
} from "./sample-evidence";

let failed = false;

function check(label: string, schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) {
    console.log(`  ok    ${label}`);
  } else {
    failed = true;
    console.log(`  FAIL  ${label}`);
    for (const issue of result.error.issues) {
      console.log(`          ${issue.path.join(".")}: ${issue.message}`);
    }
  }
}

console.log("\nSchema validation");
check("SAMPLE_EVIDENCE", EvidenceArray, SAMPLE_EVIDENCE);
check("SAMPLE_PRICE_TIERS", PriceTierArray, SAMPLE_PRICE_TIERS);
check("SAMPLE_PRICE_COMPARISONS", z.array(PriceComparison), SAMPLE_PRICE_COMPARISONS);

// The fixtures are supposed to be messy (§7.1). Clean ones hide bugs, so assert
// the mess is actually present rather than trusting it stayed.
console.log("\nMessiness (spec §7.1)");

const assertions: [string, boolean][] = [
  [
    "a quote-only tier with price_amount null",
    SAMPLE_PRICE_TIERS.some((tier) => tier.price_amount === null),
  ],
  [
    "at least one stale fetched_at (>30 days)",
    SAMPLE_EVIDENCE.some((item) => {
      if (!item.fetched_at) return false;
      const age = Date.now() - Date.parse(item.fetched_at);
      return age > 30 * 24 * 60 * 60 * 1000;
    }),
  ],
  [
    "at least one low-confidence item (<0.6)",
    SAMPLE_EVIDENCE.some((item) => item.confidence < 0.6),
  ],
  [
    "evidence from all three roles (own/competitor/target)",
    ["own", "competitor", "target"].every((role) =>
      SAMPLE_EVIDENCE.some((item) => item.recipe_role === role),
    ),
  ],
  [
    "a comparison with an unknown side",
    SAMPLE_PRICE_COMPARISONS.some((row) => row.cheaper === "unknown"),
  ],
  [
    "every evidence id is unique",
    new Set(SAMPLE_EVIDENCE.map((item) => item.id)).size ===
      SAMPLE_EVIDENCE.length,
  ],
  [
    "every price tier cites evidence that exists",
    SAMPLE_PRICE_TIERS.every((tier) =>
      tier.evidence_ids.every((id) =>
        SAMPLE_EVIDENCE.some((item) => item.id === id),
      ),
    ),
  ],
];

for (const [label, passed] of assertions) {
  if (!passed) failed = true;
  console.log(`  ${passed ? "ok  " : "FAIL"}  ${label}`);
}

console.log(failed ? "\nFAILED\n" : "\nAll checks passed\n");
process.exit(failed ? 1 : 0);
