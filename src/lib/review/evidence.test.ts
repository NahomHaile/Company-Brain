import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STALE_AFTER_DAYS,
  isStale,
  buildEvidenceIndex,
  resolveEvidence,
} from "./evidence.ts";
import { SAMPLE_EVIDENCE } from "./sample-deliverable.ts";

const NOW = new Date("2026-09-19T12:00:00.000Z");

test("evidence fetched today is not stale", () => {
  assert.equal(isStale("2026-09-19T09:00:00.000Z", NOW), false);
});

test("evidence fetched one day inside the window is not stale", () => {
  assert.equal(isStale("2026-08-21T12:00:00.000Z", NOW), false);
});

test("evidence fetched one day past the window is stale", () => {
  assert.equal(isStale("2026-08-19T11:00:00.000Z", NOW), true);
});

test("the staleness line is 30 days, per spec 11.2", () => {
  assert.equal(STALE_AFTER_DAYS, 30);
});

test("evidence with no fetch timestamp is never stale", () => {
  // A pasted Slack message has no fetched_at. Absence is not staleness —
  // marking it stale would train Maya to ignore the badge.
  assert.equal(isStale(null, NOW), false);
});

test("resolves ids to evidence records in the order cited", () => {
  const index = buildEvidenceIndex(SAMPLE_EVIDENCE);
  assert.deepEqual(
    resolveEvidence(["ev_003", "ev_001"], index).map((e) => e.id),
    ["ev_003", "ev_001"],
  );
});

test("drops ids that have no matching evidence record", () => {
  const index = buildEvidenceIndex(SAMPLE_EVIDENCE);
  assert.deepEqual(
    resolveEvidence(["ev_001", "ev_nope"], index).map((e) => e.id),
    ["ev_001"],
  );
});

test("resolving an empty citation list yields nothing", () => {
  assert.deepEqual(resolveEvidence([], buildEvidenceIndex(SAMPLE_EVIDENCE)), []);
});
