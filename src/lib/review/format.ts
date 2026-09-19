// Display formatting for figures the pricing engine produced.
//
// Nothing here computes a price. Person A's pricing.ts owns the arithmetic
// (spec 3.1); this only decides how an already-computed figure reads. It is
// tested because getting the direction wrong — telling Maya a same-price tier
// is more expensive — is exactly the error the deterministic pipeline exists
// to prevent.
import type { PriceComparison } from "../contracts.ts";

export function money(value: number | null): string {
  return value === null ? "—" : `$${value}`;
}

export type PriceDeltaLabel = {
  kind: "delta" | "equal" | "incomparable";
  text: string;
};

export function priceDeltaLabel(row: PriceComparison): PriceDeltaLabel {
  if (row.cheaper === "equal") {
    return { kind: "equal", text: "Same price" };
  }

  // Quote-only tiers, and any case where the engine could not pick a side.
  if (
    row.delta_abs === null ||
    row.delta_pct === null ||
    row.cheaper === "unknown"
  ) {
    return { kind: "incomparable", text: "Not comparable" };
  }

  // Direction comes from the enum, magnitude from the figure. pricing.ts may
  // emit `ours - theirs`, so a raw negative must never reach the card.
  const amount = Math.abs(row.delta_abs);
  const percent = Math.abs(row.delta_pct);
  const direction = row.cheaper === "ours" ? "cheaper" : "more expensive";

  return { kind: "delta", text: `$${amount} (${percent}%) ${direction}` };
}
