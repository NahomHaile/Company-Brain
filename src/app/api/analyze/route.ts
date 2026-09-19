/**
 * Person B — POST /api/analyze
 *
 * Evidence in → feature matrix + ranked differentiators out.
 * Runs before /api/draft; its output is that route's input.
 */

import { z } from "zod";
import { EvidenceArray } from "@/lib/contracts";
import { buildFeatureMatrix, rankDifferentiators } from "@/lib/prompts/analyze";
import { ModelOutputError } from "@/lib/prompts/_dev/call-claude";
import { SAMPLE_EVIDENCE } from "@/lib/prompts/_dev/sample-evidence";

// 60 is Vercel Hobby's hard ceiling — above it the deployment fails rather
// than being clamped. Measured ~44s live (matrix 18.7s, ranker 24.9s), so this
// fits, but with little margin on a slow day.
export const maxDuration = 60;
export const runtime = "nodejs";

const RequestBody = z.object({
  evidence: EvidenceArray,
});

export async function POST(request: Request) {
  const started = Date.now();

  try {
    // TEMPORARY dev path, behind an EXPLICIT ?dev=1 — never on an empty body.
    // Synthetic data returned as though it were live is the worst failure
    // available under the §4 honesty contract.
    const raw = await request.text();
    const isDev = new URL(request.url).searchParams.get("dev") === "1";

    if (!isDev && !raw.trim()) {
      return Response.json(
        { error: "empty_request_body", detail: "POST { evidence }, or use ?dev=1 for sample data." },
        { status: 400 },
      );
    }

    const evidence = isDev
      ? SAMPLE_EVIDENCE
      : RequestBody.parse(JSON.parse(raw)).evidence;

    // Ranking reads the matrix, so these cannot be parallelised.
    const featureMatrix = await buildFeatureMatrix(evidence);
    const differentiators = await rankDifferentiators(evidence, featureMatrix);

    return Response.json({
      feature_matrix: featureMatrix,
      differentiators,
      ...(isDev ? { synthetic: true } : {}), // the UI must badge this — §4
      elapsed_ms: Date.now() - started,
    });
  } catch (error) {
    console.error("[api/analyze]", error);

    // 502, not 422: the upstream model failed, the caller's request was fine.
    if (error instanceof ModelOutputError) {
      return Response.json(
        { error: "model_output_invalid", detail: error.message, issues: error.issues },
        { status: 502 },
      );
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "schema_validation_failed", issues: error.issues },
        { status: 422 },
      );
    }

    return Response.json(
      {
        error: "analyze_failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
