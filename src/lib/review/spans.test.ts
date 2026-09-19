import { test } from "node:test";
import assert from "node:assert/strict";
import { segmentSentence, partitionFlags, applyRedaction } from "./spans.ts";
import type { RiskFlag } from "../contracts.ts";

const flag = (span: string, over: Partial<RiskFlag> = {}): RiskFlag => ({
  id: "rf_1",
  sentence_id: "s_1",
  span,
  category: "absolute_superiority_claim",
  severity: "high",
  why: "Comparative advertising exposure.",
  suggested_alternative: "one of the few platforms",
  status: "pending",
  ...over,
});

test("returns one plain segment when there are no flags", () => {
  assert.deepEqual(segmentSentence("Thicket books in one screen.", []), [
    { kind: "plain", text: "Thicket books in one screen." },
  ]);
});

test("splits a sentence around a matched span", () => {
  const f = flag("the only platform");
  assert.deepEqual(
    segmentSentence("VetFlow is the only platform that charges $200.", [f]),
    [
      { kind: "plain", text: "VetFlow is " },
      { kind: "flag", text: "the only platform", flag: f },
      { kind: "plain", text: " that charges $200." },
    ],
  );
});

test("drops empty edge segments when the span starts the sentence", () => {
  const segs = segmentSentence("VetFlow charges $200.", [flag("VetFlow")]);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].kind, "flag");
});

test("handles two non-overlapping flags in document order", () => {
  const a = flag("the only", { id: "rf_a" });
  const b = flag("$200 a seat", { id: "rf_b" });
  const segs = segmentSentence("It is the only one at $200 a seat.", [b, a]);
  assert.deepEqual(
    segs.filter((s) => s.kind === "flag").map((s) => s.text),
    ["the only", "$200 a seat"],
  );
});

test("keeps the first flag when two spans overlap", () => {
  const a = flag("the only platform", { id: "rf_a" });
  const b = flag("only platform that", { id: "rf_b" });
  const segs = segmentSentence("It is the only platform that exists.", [a, b]);
  assert.equal(segs.filter((s) => s.kind === "flag").length, 1);
});

test("partitions flags whose spans no longer appear after an edit", () => {
  const kept = flag("$200 a seat", { id: "rf_keep" });
  const lost = flag("the only platform", { id: "rf_lost" });
  const { matched, unmatched } = partitionFlags(
    "VetFlow charges $200 a seat.",
    [kept, lost],
  );
  assert.deepEqual(matched.map((f) => f.id), ["rf_keep"]);
  assert.deepEqual(unmatched.map((f) => f.id), ["rf_lost"]);
});

test("redaction substitutes the suggested alternative in place", () => {
  assert.equal(
    applyRedaction(
      "VetFlow is the only platform today.",
      flag("the only platform"),
    ),
    "VetFlow is one of the few platforms today.",
  );
});

test("redaction leaves text untouched when the span is gone", () => {
  const text = "VetFlow charges $200.";
  assert.equal(applyRedaction(text, flag("the only platform")), text);
});

test("a nested span never duplicates text on screen", () => {
  // Regression: the overlap filter compared against the source array rather
  // than survivors, so a span overlapping an already-kept one was kept too and
  // its text was emitted twice ("chargescharges").
  const text = "It is the only platform that charges over $200 a seat.";
  const segs = segmentSentence(text, [
    flag("the only platform that charges", { id: "A" }),
    flag("only", { id: "B" }),
    flag("charges over $200", { id: "C" }),
  ]);
  assert.equal(segs.map((s) => s.text).join(""), text);
});

test("partitionFlags agrees with what is actually highlighted", () => {
  // Regression: partitionFlags used indexOf while segmentSentence dropped
  // overlaps, so a dropped flag was reported matched — highlighted nowhere and
  // absent from the unmatched strip, leaving no way to resolve it.
  const text = "It is the only platform that charges over $200 a seat.";
  const flags = [
    flag("the only platform that charges", { id: "A" }),
    flag("only", { id: "B" }),
    flag("charges over $200", { id: "C" }),
  ];
  const { matched, unmatched } = partitionFlags(text, flags);
  const highlighted = segmentSentence(text, matched)
    .filter((s) => s.kind === "flag")
    .map((s) => s.flag.id);

  assert.deepEqual(matched.map((f) => f.id).sort(), highlighted.sort());
  // Every flag is reachable: highlighted, or listed as no-longer-matching.
  assert.equal(matched.length + unmatched.length, flags.length);
});

test("an overlapped flag is surfaced rather than lost", () => {
  const text = "It is the only platform that charges over $200 a seat.";
  const { unmatched } = partitionFlags(text, [
    flag("the only platform that charges", { id: "A" }),
    flag("only", { id: "B" }),
  ]);
  assert.deepEqual(unmatched.map((f) => f.id), ["B"]);
});
