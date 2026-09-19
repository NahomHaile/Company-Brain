/**
 * POST /api/audit — de-robotify, grounding audit, risk flags.
 *
 * OWNER: Person C. Spec §11 / §9.8.
 *
 * A shim by design. The orchestration lives in lib/review/audit-pipeline
 * (C1 → Promise.all([C2, C3]) → deterministic number check) with Person A's
 * callClaude and verifyNumbers injected, so the parallelism CLAUDE.md rule 4
 * demands is asserted in tests rather than hoped for. This file's only job is
 * to supply the real implementations and turn the result into a Response.
 */
import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { verifyNumbers } from "@/lib/pricing";
import { AuditRequest, auditRun } from "@/lib/review/audit-request";

export const runtime = "nodejs";

/** Three model calls, two of them concurrent. Matches A's routes. */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: AuditRequest;
  try {
    body = AuditRequest.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const result = await auditRun(body, { callClaude, verifyNumbers });

  if (!result.ok) {
    console.error(`[api/audit] ${result.detail}`);
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: result.status },
    );
  }

  return NextResponse.json({ deliverable: result.deliverable }, { status: 200 });
}
