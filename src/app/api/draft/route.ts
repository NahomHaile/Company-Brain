/**
 * Person B — POST /api/draft
 *
 * Analysis in → assembled Deliverable out. Recipe-agnostic: the engine picks the
 * section list, so adding a recipe never touches this file.
 * Output goes to C's /api/audit and then the review canvas.
 */

import { z } from "zod";
import {
  DifferentiatorArray,
  EvidenceArray,
  FeatureRowArray,
  PriceComparison,
  Recipe,
} from "@/lib/contracts";
import { buildFeatureMatrix, rankDifferentiators } from "@/lib/prompts/analyze";
import { draftRecipe } from "@/lib/prompts/draft";
import { ModelOutputError } from "@/lib/prompts/_dev/call-claude";
import {
  SAMPLE_EVIDENCE,
  SAMPLE_PRICE_COMPARISONS,
} from "@/lib/prompts/_dev/sample-evidence";

// MEASURED, not guessed: a clean live run took 94.4s (fan-out 14.3s,
// assembly 80.1s). The previous 90s cap was BELOW the real runtime and would
// have 504'd on Vercel.
//
// D: verify this against the actual Vercel plan. Hobby caps serverless
// functions well below 300s, and if the cap cannot be raised the route needs
// to stream progress or the demo must run through §12.5's cached path.
export const maxDuration = 300;
export const runtime = "nodejs";

const RequestBody = z.object({
  recipe: Recipe.default("battlecard"),
  evidence: EvidenceArray,
  feature_matrix: FeatureRowArray.default([]),
  differentiators: DifferentiatorArray.default([]),
  price_comparisons: z.array(PriceComparison).default([]),
  subject_label: z.string().default("Untitled"),
});

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const raw = await request.text();

    // TEMPORARY dev path, behind an EXPLICIT ?dev=1. It must never be reachable
    // by accident: an empty or malformed POST from the UI silently returning
    // synthetic Thicket/VetFlow data as though it were a live result is the
    // worst failure available under the §4 honesty contract.
    const params = new URL(request.url).searchParams;
    if (params.get("dev") === "1") {
      // ?recipe= so the investor-update path is reachable too; without it the
      // second recipe has no route-level coverage at all.
      const devRecipe = Recipe.catch("battlecard").parse(params.get("recipe"));

      const analysis =
        devRecipe === "battlecard"
          ? await (async () => {
              const featureMatrix = await buildFeatureMatrix(SAMPLE_EVIDENCE);
              return {
                featureMatrix,
                differentiators: await rankDifferentiators(
                  SAMPLE_EVIDENCE,
                  featureMatrix,
                ),
                priceComparisons: SAMPLE_PRICE_COMPARISONS,
              };
            })()
          : {};

      const result = await draftRecipe(devRecipe, {
        evidence: SAMPLE_EVIDENCE,
        subjectLabel:
          devRecipe === "battlecard"
            ? "Thicket vs. VetFlow — for Brookside Animal Hospital"
            : "Thicket — September 2026 investor update",
        ...analysis,
      });

      return Response.json({
        ...result.deliverable,
        synthetic: true, // the UI must badge this — §4
        degraded: result.degraded,
        missing_sections: result.missingSections,
        warnings: result.warnings,
        timings: result.timings,
        elapsed_ms: Date.now() - started,
      });
    }

    if (!raw.trim()) {
      return Response.json(
        { error: "empty_request_body", detail: "POST a Deliverable request, or use ?dev=1 for sample data." },
        { status: 400 },
      );
    }

    const body = RequestBody.parse(JSON.parse(raw));

    const result = await draftRecipe(body.recipe, {
      evidence: body.evidence,
      subjectLabel: body.subject_label,
      featureMatrix: body.feature_matrix,
      differentiators: body.differentiators,
      priceComparisons: body.price_comparisons,
    });

    return Response.json({
      ...result.deliverable,
      degraded: result.degraded,
      missing_sections: result.missingSections,
      warnings: result.warnings,
      timings: result.timings,
      elapsed_ms: Date.now() - started,
    });
  } catch (error) {
    console.error("[api/draft]", error);

    // 502, not 422: the upstream model failed, the caller's request was fine.
    // Both surface as ZodError otherwise, which sends the caller debugging
    // their own payload for a problem they did not cause.
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
        error: "draft_failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
