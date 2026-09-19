/**
 * Pricing engine assertions — Person A.
 *
 * lib/pricing.ts is the one place we promise a judge that the arithmetic is
 * ours and not the model's. That promise needs to be checkable in ten
 * seconds, especially after any change late in the sprint.
 *
 * Run: npm run test:pricing
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PriceTierArray } from "../src/lib/contracts";
import {
  buildComparisons,
  normalizeToMonthlyPerSeat,
  verifyNumbers,
} from "../src/lib/pricing";

const tiers = PriceTierArray.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "data/fixtures/pricing.json"), "utf8"),
  ),
);
const comparisons = buildComparisons(tiers, "Thicket");
const tier = (name: string) => tiers.find((t) => t.tier_name === name)!;
const pair = (ours: string, theirs: string) =>
  comparisons.find(
    (c) => c.our_tier === `Thicket ${ours}` && c.their_tier === `VetFlow ${theirs}`,
  )!;

let failed = 0;

function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failed++;
    console.log(`FAIL  ${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
  } else {
    console.log(`OK    ${label}`);
  }
}

function contains(label: string, haystack: string | null, needle: string) {
  if (!haystack?.includes(needle)) {
    failed++;
    console.log(`FAIL  ${label} — caveat missing "${needle}"`);
  } else {
    console.log(`OK    ${label}`);
  }
}

// ── Normalization ──────────────────────────────────────────────────────────
check("annual → monthly ($948/yr = $79/mo)", normalizeToMonthlyPerSeat(tier("Clinic")), 79);
check("monthly stays monthly", normalizeToMonthlyPerSeat(tier("Multi-Site")), 45);
check("quote-only tier normalizes to null", normalizeToMonthlyPerSeat(tier("Enterprise")), null);

// ── Comparison ─────────────────────────────────────────────────────────────
const msClinic = pair("Multi-Site", "Clinic");
check("delta_abs is theirs minus ours", msClinic.delta_abs, 34);
check("delta_pct is against THEIR price", msClinic.delta_pct, 43.04);
check("cheaper side identified", msClinic.cheaper, "ours");

const msEnterprise = pair("Multi-Site", "Enterprise");
check("no price → cheaper unknown", msEnterprise.cheaper, "unknown");
check("no price → no delta invented", msEnterprise.delta_abs, null);

// ── Caveats: the assumption must never be swallowed ────────────────────────
contains("annual commitment surfaced", msClinic.caveat, "12-month commitment");
contains("seat minimum surfaced", msClinic.caveat, "5-seat minimum");
contains("quote-only stated plainly", msEnterprise.caveat, "quote-only");

// ── verifyNumbers ──────────────────────────────────────────────────────────
check(
  "clean narrative passes",
  verifyNumbers(
    "Thicket Multi-Site is $45 per seat per month against VetFlow Clinic at $79 — $34 less, or 43%.",
    comparisons,
  ),
  [],
);
check(
  "prose numbers are not price claims",
  verifyNumbers("They run three locations with 14 staff; records take 1-2 days.", comparisons),
  [],
);
check(
  "a figure quoted from a caveat is allowed",
  verifyNumbers("Their Clinic tier is published at $948 per user per year.", comparisons),
  [],
);
check(
  "invented percentage and price are both caught",
  verifyNumbers("We are 60% cheaper and save you $200 a seat.", comparisons).length,
  2,
);

if (failed > 0) {
  console.log(`\n${failed} pricing assertion(s) failed.`);
  process.exit(1);
}
console.log("\nPricing engine OK — every number in a comparison is computed, not generated.");
