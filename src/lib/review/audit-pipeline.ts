// The C-stage orchestration: de-robotify, then audit grounding and risk in
// parallel, then a deterministic number check.
//
// Person A's `callClaude` and `verifyNumbers` are injected rather than
// imported. That keeps this module buildable and testable while lib/anthropic
// is still in flight, and it makes the parallelism assertable — CLAUDE.md
// rule 4 is otherwise almost impossible to verify. api/audit/route.ts is a
// thin shim that passes the real implementations in.
import type { z } from "zod";
import type {
  Deliverable,
  Evidence,
  GroundingIssue,
  PriceComparison,
} from "../contracts.ts";
import {
  C1_DEROBOTIFY,
  C1_SCHEMA,
  C2_GROUNDING,
  C2_SCHEMA,
  C3_RISK,
  C3_SCHEMA,
  buildAuditInput,
  buildDerobotifyInput,
} from "../prompts/audit.ts";
import { withWordCount } from "./mutate.ts";

/** Structurally identical to lib/anthropic's callClaude. */
export type ClaudeCaller = <T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  model?: string;
  label?: string;
}) => Promise<T>;

/** Structurally identical to lib/pricing's verifyNumbers. */
export type NumberVerifier = (
  text: string,
  comparisons: PriceComparison[],
) => string[];

export async function runAudit({
  deliverable,
  evidence,
  callClaude,
  verifyNumbers,
}: {
  deliverable: Deliverable;
  evidence: Evidence[];
  callClaude: ClaudeCaller;
  verifyNumbers: NumberVerifier;
}): Promise<Deliverable> {
  // C1 first: everything downstream must audit the prose Maya will actually
  // read, not the draft it replaced.
  const rewritten = await callClaude({
    system: C1_DEROBOTIFY,
    user: buildDerobotifyInput(deliverable),
    schema: C1_SCHEMA,
    label: "C1 de-robotify",
  });

  const auditInput = buildAuditInput(rewritten, evidence);

  // Sequential here costs ~4s of a 32s budget (spec 3.4, CLAUDE.md rule 4).
  const [modelIssues, riskFlags] = await Promise.all([
    callClaude({
      system: C2_GROUNDING,
      user: auditInput,
      schema: C2_SCHEMA,
      label: "C2 grounding",
    }),
    callClaude({
      system: C3_RISK,
      user: auditInput,
      schema: C3_SCHEMA,
      label: "C3 risk",
    }),
  ]);

  return withWordCount({
    ...rewritten,
    grounding_issues: [
      ...modelIssues,
      ...checkNumbers(rewritten, modelIssues, verifyNumbers),
    ],
    risk_flags: riskFlags,
  });
}

/**
 * Deterministic second pass (spec 11.2). The model flags prose; code checks
 * arithmetic. A sentence the model already called out is left alone so the
 * canvas does not show the same problem twice.
 */
function checkNumbers(
  deliverable: Deliverable,
  modelIssues: GroundingIssue[],
  verifyNumbers: NumberVerifier,
): GroundingIssue[] {
  const alreadyFlagged = new Set(
    modelIssues
      .filter((issue) => issue.issue === "number_not_in_table")
      .map((issue) => issue.sentence_id),
  );

  const found: GroundingIssue[] = [];
  for (const section of deliverable.sections) {
    for (const sentence of section.sentences) {
      if (alreadyFlagged.has(sentence.id)) continue;
      for (const detail of verifyNumbers(
        sentence.text,
        deliverable.price_comparisons,
      )) {
        found.push({
          sentence_id: sentence.id,
          issue: "number_not_in_table",
          detail,
        });
      }
    }
  }
  return found;
}
