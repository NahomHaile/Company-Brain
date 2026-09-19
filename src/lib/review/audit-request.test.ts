import { test } from "node:test";
import assert from "node:assert/strict";
import { AuditRequest, auditRun } from "./audit-request.ts";
import { SAMPLE_DELIVERABLE, SAMPLE_EVIDENCE } from "./sample-deliverable.ts";
import { C1_DEROBOTIFY } from "../prompts/audit.ts";
import type { ClaudeCaller } from "./audit-pipeline.ts";

/** D's exact payload — pipeline-client.ts posts this shape. */
const BODY = {
  recipe: "battlecard",
  deliverable: SAMPLE_DELIVERABLE,
  evidence: SAMPLE_EVIDENCE,
  price_tiers: [],
};

const caller: ClaudeCaller = async (opts) =>
  opts.schema.parse(opts.system === C1_DEROBOTIFY ? SAMPLE_DELIVERABLE : []);

const deps = { callClaude: caller, verifyNumbers: () => [] };

test("accepts the payload Person D's pipeline-client posts", () => {
  const parsed = AuditRequest.safeParse(BODY);
  assert.equal(parsed.success, true);
});

test("price_tiers is optional — the paste path does not send one", () => {
  const { recipe, deliverable, evidence } = BODY;
  assert.equal(
    AuditRequest.safeParse({ recipe, deliverable, evidence }).success,
    true,
  );
});

test("a body with no deliverable is rejected rather than audited", () => {
  const { recipe, evidence, price_tiers } = BODY;
  assert.equal(
    AuditRequest.safeParse({ recipe, evidence, price_tiers }).success,
    false,
  );
});

test("a valid run returns the audited deliverable", async () => {
  const result = await auditRun(AuditRequest.parse(BODY), deps);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.deliverable.sections.length, SAMPLE_DELIVERABLE.sections.length);
});

test("a model failure fails loudly instead of returning the unaudited draft", async () => {
  // Returning the draft with empty risk_flags would show Maya a card that
  // looks audited and never was — CLAUDE.md rules 2 and 3.
  const exploding: ClaudeCaller = async () => {
    throw new Error("model returned prose, not JSON");
  };
  const result = await auditRun(AuditRequest.parse(BODY), {
    ...deps,
    callClaude: exploding,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 502);
  assert.match(result.detail, /prose/);
});
