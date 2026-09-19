/**
 * Person B — POST /api/analyze
 *
 * Evidence in → feature matrix + ranked differentiators out.
 * Runs before /api/draft; its output is that route's input.
 */

import { z } from "zod";
import { EvidenceArray } from "@/lib/contracts";
import { buildFeatureMatrix, rankDifferentiators } from "@/lib/prompts/analyze";
import { SAMPLE_EVIDENCE } from "@/lib/prompts/_dev/sample-evidence";

// The matrix and ranker are two sequential model calls. Vercel's default
// function timeout will cut that off; the demo needs the headroom.
export const maxDuration = 60;
export const runtime = "nodejs";

const RequestBody = z.object({
  evidence: EvidenceArray,
});

export async function POST(request: Request) {
  const started = Date.now();

  try {
    // TEMPORARY: with no body, fall back to B's sample evidence so the route is
    // testable before A's fixtures land. Remove once /api/fetch is wired.
    const raw = await request.text();
    const evidence = raw.trim()
      ? RequestBody.parse(JSON.parse(raw)).evidence
      : SAMPLE_EVIDENCE;

    // Ranking reads the matrix, so these cannot be parallelised.
    const featureMatrix = await buildFeatureMatrix(evidence);
    const differentiators = await rankDifferentiators(evidence, featureMatrix);

    return Response.json({
      feature_matrix: featureMatrix,
      differentiators,
      elapsed_ms: Date.now() - started,
    });
  } catch (error) {
    console.error("[api/analyze]", error);

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
