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
import {
  SAMPLE_EVIDENCE,
  SAMPLE_PRICE_COMPARISONS,
} from "@/lib/prompts/_dev/sample-evidence";

// Parallel section calls plus an assembly pass. Well past Vercel's default.
export const maxDuration = 90;
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
    if (new URL(request.url).searchParams.get("dev") === "1") {
      const featureMatrix = await buildFeatureMatrix(SAMPLE_EVIDENCE);
      const differentiators = await rankDifferentiators(
        SAMPLE_EVIDENCE,
        featureMatrix,
      );
      const result = await draftRecipe("battlecard", {
        evidence: SAMPLE_EVIDENCE,
        featureMatrix,
        differentiators,
        priceComparisons: SAMPLE_PRICE_COMPARISONS,
        subjectLabel: "Thicket vs. VetFlow — for Brookside Animal Hospital",
      });
      return Response.json({
        ...result.deliverable,
        synthetic: true, // the UI must badge this — §4
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
      warnings: result.warnings,
      timings: result.timings,
      elapsed_ms: Date.now() - started,
    });
  } catch (error) {
    console.error("[api/draft]", error);

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
