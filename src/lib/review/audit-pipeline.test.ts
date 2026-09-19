import { test } from "node:test";
import assert from "node:assert/strict";
import { runAudit, type ClaudeCaller } from "./audit-pipeline.ts";
import { SAMPLE_DELIVERABLE, SAMPLE_EVIDENCE } from "./sample-deliverable.ts";
import { wordCount } from "./mutate.ts";
import {
  C1_DEROBOTIFY,
  C2_GROUNDING,
  C3_RISK,
  buildDerobotifyInput,
} from "../prompts/audit.ts";
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

test("the model cannot replace the deterministic pricing table", () => {
  // C1 rewrites prose and echoes the tables back. An echoed table is a number
  // the model produced, which spec 3.1 forbids.
  const tampered: Deliverable = {
    ...SAMPLE_DELIVERABLE,
    price_comparisons: [{
      our_tier: "Practice", their_tier: "Professional",
      normalized_monthly_per_seat_ours: 1, normalized_monthly_per_seat_theirs: 999,
      delta_abs: 998, delta_pct: 99.9, cheaper: "ours", caveat: null,
    }],
    feature_matrix: [],
  };
  const fake = fakeCaller({ c1: tampered });
  return runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: fake.call,
    verifyNumbers: noVerifier,
  }).then((out) => {
    assert.deepEqual(out.price_comparisons, SAMPLE_DELIVERABLE.price_comparisons);
    assert.deepEqual(out.feature_matrix, SAMPLE_DELIVERABLE.feature_matrix);
  });
});

test("C1 is not asked to echo the pricing table or feature matrix back", () => {
  // It rewrites prose only, and runAudit restores both from the draft anyway.
  // Sending them costs input tokens, costs output tokens echoing them, and is
  // what truncated C1 at 8000 on a real six-section battlecard.
  const sent = JSON.parse(buildDerobotifyInput(SAMPLE_DELIVERABLE));
  assert.deepEqual(sent.price_comparisons, []);
  assert.deepEqual(sent.feature_matrix, []);
  assert.equal(sent.sections.length, SAMPLE_DELIVERABLE.sections.length);
});

test("C1 gets more room to answer than the 8000-token default", async () => {
  // A full Deliverable does not fit in the default budget; callClaude throws
  // ClaudeJsonError on truncation and the whole audit is lost.
  let c1MaxTokens: number | undefined;
  const call: ClaudeCaller = async (opts) => {
    if (opts.system === C1_DEROBOTIFY) c1MaxTokens = opts.maxTokens;
    return opts.schema.parse(opts.system === C1_DEROBOTIFY ? SAMPLE_DELIVERABLE : []);
  };
  await runAudit({
    deliverable: SAMPLE_DELIVERABLE,
    evidence: SAMPLE_EVIDENCE,
    callClaude: call,
    verifyNumbers: noVerifier,
  });
  assert.ok(
    c1MaxTokens !== undefined && c1MaxTokens >= 16000,
    `C1 maxTokens was ${c1MaxTokens}`,
  );
});
