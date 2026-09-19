import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveFlag,
  editSentence,
  pendingFlagsFor,
  openFlagCount,
  wordCount,
} from "./mutate.ts";
import { SAMPLE_DELIVERABLE } from "./sample-deliverable.ts";

const find = (d: typeof SAMPLE_DELIVERABLE, id: string) =>
  d.sections.flatMap((s) => s.sentences).find((s) => s.id === id)!;
const flagOf = (d: typeof SAMPLE_DELIVERABLE, id: string) =>
  d.risk_flags.find((f) => f.id === id)!;

test("redacting swaps the span for the suggested alternative", () => {
  const next = resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "redacted");
  assert.match(find(next, "s_07").text, /one of the few platforms we have seen/);
  assert.doesNotMatch(find(next, "s_07").text, /the only platform in this category/);
});

test("redacting also marks the flag redacted", () => {
  const next = resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "redacted");
  assert.equal(flagOf(next, "rf_002").status, "redacted");
});

test("approving marks the flag but leaves the text alone", () => {
  const before = find(SAMPLE_DELIVERABLE, "s_07").text;
  const next = resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "approved");
  assert.equal(find(next, "s_07").text, before);
  assert.equal(flagOf(next, "rf_002").status, "approved");
});

test("resolving one flag leaves a second flag on the same sentence pending", () => {
  const next = resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "redacted");
  assert.equal(flagOf(next, "rf_003").status, "pending");
  // ...and the second span survives the first redaction intact.
  assert.match(find(next, "s_07").text, /their product is a mess/);
});

test("both flags on one sentence can be redacted in sequence", () => {
  const once = resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "redacted");
  const twice = resolveFlag(once, "rf_003", "redacted");
  const text = find(twice, "s_07").text;
  assert.match(text, /one of the few platforms we have seen/);
  assert.match(text, /built for a different kind of practice/);
});

test("mutations do not touch the original deliverable", () => {
  const before = find(SAMPLE_DELIVERABLE, "s_07").text;
  resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "redacted");
  assert.equal(find(SAMPLE_DELIVERABLE, "s_07").text, before);
  assert.equal(flagOf(SAMPLE_DELIVERABLE, "rf_002").status, "pending");
});

test("editing a sentence replaces only that sentence", () => {
  const next = editSentence(SAMPLE_DELIVERABLE, "s_01", "Rewritten by Maya.");
  assert.equal(find(next, "s_01").text, "Rewritten by Maya.");
  assert.equal(
    find(next, "s_02").text,
    find(SAMPLE_DELIVERABLE, "s_02").text,
  );
});

test("only pending flags are eligible for inline highlighting", () => {
  const next = resolveFlag(SAMPLE_DELIVERABLE, "rf_002", "approved");
  assert.deepEqual(
    pendingFlagsFor(next, "s_07").map((f) => f.id),
    ["rf_003"],
  );
});

test("a resolved flag never reappears in the unmatched strip", () => {
  // rf_005's span already fails to match s_09. Once approved it must drop out
  // of consideration entirely rather than nagging from the strip.
  const next = resolveFlag(SAMPLE_DELIVERABLE, "rf_005", "approved");
  assert.deepEqual(pendingFlagsFor(next, "s_09"), []);
});

test("open flag count falls as flags are resolved", () => {
  assert.equal(openFlagCount(SAMPLE_DELIVERABLE), 5);
  assert.equal(openFlagCount(resolveFlag(SAMPLE_DELIVERABLE, "rf_001", "approved")), 4);
});

test("word count tracks the current text, not the fixture field", () => {
  assert.equal(wordCount(SAMPLE_DELIVERABLE), 241);
  const next = editSentence(SAMPLE_DELIVERABLE, "s_01", "Three words here.");
  assert.equal(wordCount(next), 241 - 20 + 3);
});
