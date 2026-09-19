import { test } from "node:test";
import assert from "node:assert/strict";
import { money, priceDeltaLabel } from "./format.ts";
import type { PriceComparison } from "../contracts.ts";

const row = (over: Partial<PriceComparison> = {}): PriceComparison => ({
  our_tier: "Practice",
  their_tier: "Professional",
  normalized_monthly_per_seat_ours: 145,
  normalized_monthly_per_seat_theirs: 200,
  delta_abs: 55,
  delta_pct: 27.5,
  cheaper: "ours",
  caveat: null,
  ...over,
});

test("a quote-only tier is not comparable", () => {
  const label = priceDeltaLabel(
    row({ normalized_monthly_per_seat_theirs: null, delta_abs: null, delta_pct: null, cheaper: "unknown" }),
  );
  assert.deepEqual(label, { kind: "incomparable", text: "Not comparable" });
});

test("our cheaper tier reads as cheaper", () => {
  assert.deepEqual(priceDeltaLabel(row()), {
    kind: "delta",
    text: "$55 (27.5%) cheaper",
  });
});

test("their cheaper tier reads as more expensive, not cheaper", () => {
  assert.deepEqual(priceDeltaLabel(row({ cheaper: "theirs" })), {
    kind: "delta",
    text: "$55 (27.5%) more expensive",
  });
});

test("equal pricing never claims a direction", () => {
  // The binary ternary this replaces rendered "equal" as "more expensive".
  const label = priceDeltaLabel(row({ delta_abs: 0, delta_pct: 0, cheaper: "equal" }));
  assert.equal(label.kind, "equal");
  assert.equal(label.text, "Same price");
});

test("a known delta with unknown direction states the gap without a direction", () => {
  assert.deepEqual(priceDeltaLabel(row({ cheaper: "unknown" })), {
    kind: "incomparable",
    text: "Not comparable",
  });
});

test("a negative delta is displayed by magnitude, direction coming from the enum", () => {
  // pricing.ts may emit ours - theirs. Never render "$-55 cheaper".
  assert.deepEqual(priceDeltaLabel(row({ delta_abs: -55 })), {
    kind: "delta",
    text: "$55 (27.5%) cheaper",
  });
});

test("a whole-number percentage keeps no trailing decimal", () => {
  assert.equal(
    priceDeltaLabel(row({ delta_abs: 50, delta_pct: 25 })).text,
    "$50 (25%) cheaper",
  );
});

test("money renders an em dash for an absent figure", () => {
  assert.equal(money(null), "—");
  assert.equal(money(145), "$145");
});

test("a repeating percentage is rounded, not dumped raw", () => {
  // 29/174 = 16.666666666666664 — raw, this reads as a bug on a battlecard.
  assert.equal(
    priceDeltaLabel(row({ delta_abs: 29, delta_pct: 16.666666666666664 })).text,
    "$29 (16.7%) cheaper",
  );
});
