import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RUN_STORAGE_KEY,
  parseStoredRun,
  getServerStoredRunSnapshot,
  subscribeToStoredRun,
} from "./stored-run.ts";
import { SAMPLE_DELIVERABLE, SAMPLE_EVIDENCE } from "./sample-deliverable.ts";
import { wordCount } from "./mutate.ts";

const validRun = {
  deliverable: SAMPLE_DELIVERABLE,
  evidence: SAMPLE_EVIDENCE,
  price_tiers: [],
  source: "live",
};

test("the storage key matches the one Person D writes", () => {
  assert.equal(RUN_STORAGE_KEY, "cadence:run");
});

test("reads a run handed over by the pipeline", () => {
  const run = parseStoredRun(JSON.stringify(validRun));
  assert.equal(run?.source, "live");
  assert.equal(run?.evidence.length, SAMPLE_EVIDENCE.length);
});

test("no stored run yields null rather than throwing", () => {
  assert.equal(parseStoredRun(null), null);
});

test("malformed JSON yields null rather than blanking the page", () => {
  assert.equal(parseStoredRun("{not json"), null);
});

test("a run missing its deliverable is rejected", () => {
  assert.equal(parseStoredRun(JSON.stringify({ evidence: [] })), null);
});

test("price_tiers and source are optional so a shape drift still renders", () => {
  // C only needs deliverable + evidence. Failing closed on a field the canvas
  // never reads would blank the demo for no reason.
  const run = parseStoredRun(
    JSON.stringify({ deliverable: SAMPLE_DELIVERABLE, evidence: SAMPLE_EVIDENCE }),
  );
  assert.ok(run);
  assert.equal(run.source, "live");
  assert.deepEqual(run.price_tiers, []);
});

test("word_count is recomputed on the way in", () => {
  const run = parseStoredRun(
    JSON.stringify({ ...validRun, deliverable: { ...SAMPLE_DELIVERABLE, word_count: 9999 } }),
  );
  assert.equal(run?.deliverable.word_count, wordCount(SAMPLE_DELIVERABLE));
});

test("a cached run is distinguishable from a live one", () => {
  const run = parseStoredRun(JSON.stringify({ ...validRun, source: "cached" }));
  assert.equal(run?.source, "cached");
});

test("the server snapshot is always null so SSR renders the fixture", () => {
  assert.equal(getServerStoredRunSnapshot(), null);
});

test("subscribing without a window is a no-op that still unsubscribes cleanly", () => {
  const unsubscribe = subscribeToStoredRun(() => {});
  assert.equal(typeof unsubscribe, "function");
  unsubscribe();
});
