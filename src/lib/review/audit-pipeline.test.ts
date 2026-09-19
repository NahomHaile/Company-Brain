import { test } from "node:test";
import assert from "node:assert/strict";
import { runAudit, type ClaudeCaller } from "./audit-pipeline.ts";
import { SAMPLE_DELIVERABLE, SAMPLE_EVIDENCE } from "./sample-deliverable.ts";
import { wordCount } from "./mutate.ts";
import { C1_DEROBOTIFY, C2_GROUNDING, C3_RISK } from "../prompts/audit.ts";
import type { Deliverable } from "../contracts.ts";

/** Stands in for Person A's callClaude, recording how it was driven. */
function fakeCaller(overrides: {
  c1?: Deliverable;
  c2?: unknown[];
  c3?: unknown[];
  onCall?: (label: string) => void;
} = {}) {
  const calls: string[] = [];
  let active = 0;
  let maxConcurrent = 0;

  const call: ClaudeCaller = async (opts) => {
    const which =
      opts.system === C1_DEROBOTIFY
        ? "C1"
        : opts.system === C2_GROUNDING
          ? "C2"
          : opts.system === C3_RISK
            ? "C3"
            : "unknown";
    calls.push(which);
    overrides.onCall?.(which);

    active += 1;
    maxConcurrent = Math.max(maxConcurrent, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;

    const payload =
      which === "C1"
        ? (overrides.c1 ?? SAMPLE_DELIVERABLE)
        : which === "C2"
          ? (overrides.c2 ?? [])
          : (overrides.c3 ?? []);
    return opts.schema.parse(payload);
  };

  return {
    call,
    calls,
    get maxConcurrent() {
      return maxConcurrent;
    },
  };
}

const noVerifier = () => [];

test("de-robotify runs first, before the audit pair", async () => {
  const fake = fakeCaller();
  await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: noVerifier,
  });
  assert.equal(fake.calls[0], "C1");
  assert.deepEqual(fake.calls.slice(1).sort(), ["C2", "C3"]);
});

test("grounding and risk run in parallel, not in sequence", async () => {
  // Sequential is ~4s on a 32s budget and CLAUDE.md rule 4 forbids it.
  const fake = fakeCaller();
  await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: noVerifier,
  });
  assert.equal(fake.maxConcurrent, 2);
});

test("returns the de-robotified deliverable with both audits merged in", async () => {
  const flag = {
    id: "rf_x", sentence_id: "s_01", span: "Thicket",
    category: "unverified_competitor_claim", severity: "low",
    why: "Test.", suggested_alternative: "The product", status: "pending",
  };
  const issue = { sentence_id: "s_02", issue: "unsourced", detail: "Test." };
  const fake = fakeCaller({ c2: [issue], c3: [flag] });

  const out = await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: noVerifier,
  });

  assert.deepEqual(out.risk_flags.map((f) => f.id), ["rf_x"]);
  assert.deepEqual(out.grounding_issues.map((g) => g.sentence_id), ["s_02"]);
});

test("the deterministic number check appends issues the model missed", async () => {
  const fake = fakeCaller();
  const out = await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    // Person A's verifyNumbers flags any sentence mentioning $60.
    verifyNumbers: (text) =>
      text.includes("$60") ? ['"$60" is not in the pricing table.'] : [],
  });

  const numeric = out.grounding_issues.filter(
    (g) => g.issue === "number_not_in_table",
  );
  assert.equal(numeric.length, 1);
  assert.equal(numeric[0].sentence_id, "s_03");
});

test("the deterministic pass does not duplicate what the model already flagged", async () => {
  const fake = fakeCaller({
    c2: [{ sentence_id: "s_03", issue: "number_not_in_table", detail: "Model found it." }],
  });
  const out = await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: (text) =>
      text.includes("$60") ? ['"$60" is not in the pricing table.'] : [],
  });

  const forS03 = out.grounding_issues.filter(
    (g) => g.sentence_id === "s_03" && g.issue === "number_not_in_table",
  );
  assert.equal(forS03.length, 1);
  assert.equal(forS03[0].detail, "Model found it.");
});

test("numbers are checked against the rewritten text, not the original draft", async () => {
  const rewritten: Deliverable = {
    ...SAMPLE_DELIVERABLE,
    sections: [
      {
        key: "positioning",
        title: "Positioning",
        sentences: [{ id: "s_99", text: "They charge $999 a seat.", evidence_ids: [] }],
      },
    ],
  };
  const seen: string[] = [];
  const fake = fakeCaller({ c1: rewritten });
  await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: (text) => {
      seen.push(text);
      return [];
    },
  });
  assert.deepEqual(seen, ["They charge $999 a seat."]);
});

test("word_count reflects the rewritten prose", async () => {
  const fake = fakeCaller();
  const out = await runAudit({
    deliverable: { ...SAMPLE_DELIVERABLE, word_count: 1 },
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: noVerifier,
  });
  assert.equal(out.word_count, wordCount(out));
});

test("a malformed model response is rejected by its schema", async () => {
  const fake = fakeCaller({ c3: [{ id: "rf_bad" }] });
  await assert.rejects(() =>
    runAudit({
      deliverable: SAMPLE_DELIVERABLE,
      evidence: SAMPLE_EVIDENCE,
      callClaude: fake.call,
      verifyNumbers: noVerifier,
    }),
  );
});
