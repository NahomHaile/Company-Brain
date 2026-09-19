// Request parsing and failure mapping for POST /api/audit.
//
// OWNER: Person C. Spec §11.
//
// Split out of the route so it can be tested under `node --test` — route.ts
// imports `next/server` and `@/` aliases, neither of which the test runner
// resolves. The route itself stays a shim: parse, call this, serialize.
import { z } from "zod";
import {
  Deliverable,
  EvidenceArray,
  PriceTierArray,
  Recipe,
} from "../contracts.ts";
import {
  runAudit,
  type ClaudeCaller,
  type NumberVerifier,
} from "./audit-pipeline.ts";

/**
 * The shape Person D's pipeline-client posts. `price_tiers` rides along for
 * symmetry with the other three routes but the audit never reads it — every
 * number is checked against `deliverable.price_comparisons`, which Person A's
 * pricing.ts computed. Accepting and ignoring it is cheaper than making D
 * special-case this one route.
 */
export const AuditRequest = z.object({
  recipe: Recipe.default("battlecard"),
  deliverable: Deliverable,
  evidence: EvidenceArray.default([]),
  price_tiers: PriceTierArray.optional(),
});

export type AuditRequest = z.infer<typeof AuditRequest>;

export type AuditResult =
  | { ok: true; deliverable: z.infer<typeof Deliverable> }
  | { ok: false; status: number; error: string; detail: string };

export async function auditRun(
  body: AuditRequest,
  deps: { callClaude: ClaudeCaller; verifyNumbers: NumberVerifier },
): Promise<AuditResult> {
  try {
    const deliverable = await runAudit({
      deliverable: body.deliverable,
      evidence: body.evidence,
      callClaude: deps.callClaude,
      verifyNumbers: deps.verifyNumbers,
    });
    return { ok: true, deliverable };
  } catch (err) {
    // Deliberately not falling back to the unaudited draft. A card with an
    // empty risk_flags array is indistinguishable from a clean one, and Maya
    // would read it as checked (CLAUDE.md rules 2 and 3). Fail where D's
    // client can light the audit stage red.
    return {
      ok: false,
      status: 502,
      error: "Audit failed",
      detail: (err as Error).message,
    };
  }
}
