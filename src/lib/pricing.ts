/**
 * Deterministic pricing comparison. No model, ever.
 *
 * OWNER: Person A. Spec §3.1 / §9.7.
 *
 * The model extracts prices; this file compares them. A judge who catches
 * "40% cheaper" when it's 28% has found a hole you cannot recover from in a
 * five-minute demo, and an LLM doing arithmetic will eventually produce that
 * number. Every field of PriceComparison is computed here.
 *
 * Where normalization required an assumption — annualized rate, seat floor,
 * quote-only tier — it goes in `caveat` rather than being swallowed. An
 * unqualified price claim that turns out to depend on a 12-month commitment
 * is worse on a live call than no claim at all.
 */
import type { PriceComparison, PriceTier } from "./contracts";

/** Round to cents. Floating-point drift in a price is a credibility problem. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Everything becomes monthly-per-seat, or null.
 *
 * null is a real answer, not a failure: "Contact us" tiers and usage-based
 * pricing have no per-seat monthly rate, and inventing one is the exact
 * mistake this file exists to prevent.
 */
export function normalizeToMonthlyPerSeat(tier: PriceTier): number | null {
  if (tier.price_amount === null) return null;

  switch (tier.price_unit) {
    case "per_seat_month":
      return round2(tier.price_amount);
    case "per_seat_year":
      return round2(tier.price_amount / 12);
    case "flat_month":
    case "flat_year":
      // A flat fee has no per-seat rate without knowing the seat count, and
      // the seat minimum is a floor rather than an actual headcount. Dividing
      // by it would invent a number.
      return null;
    case "usage":
    case "unknown":
      return null;
  }
}

/** Human-readable assumptions behind a normalized figure. */
function caveatsFor(tier: PriceTier, label: "ours" | "theirs"): string[] {
  const out: string[] = [];
  const who = label === "ours" ? "Our" : "Their";

  if (tier.price_amount === null) {
    out.push(
      `${tier.company} ${tier.tier_name} is quote-only — no published price, so no comparison should be stated.`,
    );
    return out;
  }

  if (tier.price_unit === "per_seat_year") {
    const monthly = round2(tier.price_amount / 12);
    out.push(
      `${tier.company} ${tier.tier_name} is published at $${tier.price_amount} per seat per year; normalized to $${monthly.toFixed(2)}/seat/month. Assumes a 12-month commitment.`,
    );
  }

  if (tier.price_unit === "flat_month" || tier.price_unit === "flat_year") {
    out.push(
      `${tier.company} ${tier.tier_name} is a flat fee, not per-seat. The per-seat figure depends on headcount and is not stated here.`,
    );
  }

  if (tier.price_unit === "usage") {
    out.push(
      `${tier.company} ${tier.tier_name} is usage-based; there is no per-seat monthly rate to compare.`,
    );
  }

  if (tier.seat_minimum !== null && tier.seat_minimum > 1) {
    out.push(
      `${who} ${tier.tier_name} tier requires a ${tier.seat_minimum}-seat minimum.`,
    );
  }

  return out;
}

/**
 * Compare one of our tiers against one of theirs.
 *
 * `delta_pct` is expressed against THEIR price — "43% cheaper than VetFlow"
 * means we cost 43% less than they do. Computing it against our own price
 * would give 75.6% for the same pair, which is the kind of quietly wrong
 * number that ends a demo.
 */
export function compareTiers(
  ours: PriceTier,
  theirs: PriceTier,
): PriceComparison {
  const normOurs = normalizeToMonthlyPerSeat(ours);
  const normTheirs = normalizeToMonthlyPerSeat(theirs);

  const caveats = [...caveatsFor(ours, "ours"), ...caveatsFor(theirs, "theirs")];

  const base: PriceComparison = {
    our_tier: `${ours.company} ${ours.tier_name}`,
    their_tier: `${theirs.company} ${theirs.tier_name}`,
    normalized_monthly_per_seat_ours: normOurs,
    normalized_monthly_per_seat_theirs: normTheirs,
    delta_abs: null,
    delta_pct: null,
    cheaper: "unknown",
    caveat: caveats.length ? caveats.join(" ") : null,
  };

  if (normOurs === null || normTheirs === null) return base;

  const deltaAbs = round2(normTheirs - normOurs);

  let cheaper: PriceComparison["cheaper"];
  if (deltaAbs > 0) cheaper = "ours";
  else if (deltaAbs < 0) cheaper = "theirs";
  else cheaper = "equal";

  // Percentage against their price. Guard the divide — a free competitor tier
  // is rare but a division by zero on stage is unrecoverable.
  const deltaPct =
    normTheirs === 0 ? null : round2((deltaAbs / normTheirs) * 100);

  return { ...base, delta_abs: deltaAbs, delta_pct: deltaPct, cheaper };
}

/**
 * Pair up every tier we sell against every tier they sell.
 *
 * Deliberately exhaustive rather than clever: a wrong "equivalent tier" guess
 * is a worse failure than showing an extra row, and Person B's pricing
 * narrative reads the whole table anyway.
 */
export function buildComparisons(tiers: PriceTier[], ourCompany: string): PriceComparison[] {
  const ours = tiers.filter(
    (t) => t.company.toLowerCase() === ourCompany.toLowerCase(),
  );
  const theirs = tiers.filter(
    (t) => t.company.toLowerCase() !== ourCompany.toLowerCase(),
  );

  const out: PriceComparison[] = [];
  for (const o of ours) {
    for (const t of theirs) out.push(compareTiers(o, t));
  }
  return out;
}

// ── Number verifier ────────────────────────────────────────────────────────

/**
 * Numbers that are safe in narrative text without appearing in the pricing
 * table. Small integers are ordinary prose ("three locations", "1-2 days")
 * and flagging them would bury the one flag that matters.
 */
const PROSE_NUMBER_CEILING = 100;

/** Matches $1,234.56 / 1234 / 43% / 43.04% */
const NUMBER_PATTERN = /\$?\d[\d,]*(?:\.\d+)?%?/g;

function parseNumeric(token: string): number | null {
  const cleaned = token.replace(/[$,%]/g, "").replace(/,/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Every number the pricing table legitimately supports: the normalized rates,
 * the deltas, and the percentages — plus each figure quoted inside a caveat,
 * since those are the published annual prices the narrative may cite.
 */
function allowedNumbers(comparisons: PriceComparison[]): Set<number> {
  const allowed = new Set<number>();

  const add = (n: number | null) => {
    if (n === null) return;
    allowed.add(round2(n));
    // A narrative saying "$79" for a stored 79.00 is correct; so is "43" for
    // 43.04 when rounded for speech. Accept both roundings.
    allowed.add(Math.round(n));
    allowed.add(round2(Math.round(n * 10) / 10));
  };

  for (const c of comparisons) {
    add(c.normalized_monthly_per_seat_ours);
    add(c.normalized_monthly_per_seat_theirs);
    add(c.delta_abs);
    add(c.delta_pct);

    if (c.caveat) {
      for (const token of c.caveat.match(NUMBER_PATTERN) ?? []) {
        const value = parseNumeric(token);
        if (value !== null) add(value);
      }
    }
  }

  return allowed;
}

/**
 * Deterministic second pass over generated narrative — spec §9.7.
 *
 * Regex every number out of the text and assert each one is supported by the
 * PriceComparison set. Person C chains this after the model-based grounding
 * audit: the model can be talked out of a judgment, but this cannot.
 *
 * @returns one human-readable problem per unsupported number; empty means clean.
 */
export function verifyNumbers(
  text: string,
  comparisons: PriceComparison[],
): string[] {
  const allowed = allowedNumbers(comparisons);
  const problems: string[] = [];
  const alreadyReported = new Set<string>();

  for (const token of text.match(NUMBER_PATTERN) ?? []) {
    const value = parseNumeric(token);
    if (value === null) continue;

    const isCurrency = token.includes("$");
    const isPercent = token.includes("%");

    // Plain small integers are prose, not price claims. A currency or percent
    // sign means it IS a price claim regardless of size.
    if (!isCurrency && !isPercent && value < PROSE_NUMBER_CEILING) continue;

    if (allowed.has(round2(value))) continue;
    if (alreadyReported.has(token)) continue;

    alreadyReported.add(token);
    problems.push(
      `"${token}" does not appear in the pricing comparison table. Every number in a price claim must come from the computed comparison, not from the model.`,
    );
  }

  return problems;
}
