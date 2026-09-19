/**
 * Person B — POST /api/draft
 *
 * Analysis in → assembled Deliverable out. Handles both recipes.
 * Output goes straight to C's /api/audit and then the review canvas.
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
import { draftBattlecard, draftInvestorUpdate } from "@/lib/prompts/draft";
import {
  SAMPLE_EVIDENCE,
  SAMPLE_PRICE_COMPARISONS,
} from "@/lib/prompts/_dev/sample-evidence";

// Six parallel section calls plus an assembly pass. Well past Vercel's default.
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

    // TEMPORARY dev path: with no body, run the whole pipeline off B's samples.
    // One curl exercises analyze → fan-out → assembly. Remove when A's routes land.
    if (!raw.trim()) {
      const featureMatrix = await buildFeatureMatrix(SAMPLE_EVIDENCE);
      const differentiators = await rankDifferentiators(
        SAMPLE_EVIDENCE,
        featureMatrix,
      );
      const deliverable = await draftBattlecard({
        evidence: SAMPLE_EVIDENCE,
        featureMatrix,
        differentiators,
        priceComparisons: SAMPLE_PRICE_COMPARISONS,
        subjectLabel: "Thicket vs. VetFlow — for Brookside Animal Hospital",
      });
      return Response.json({ ...deliverable, elapsed_ms: Date.now() - started });
    }

    const body = RequestBody.parse(JSON.parse(raw));

    const deliverable =
      body.recipe === "investor_update"
        ? await draftInvestorUpdate({
            evidence: body.evidence,
            subjectLabel: body.subject_label,
          })
        : await draftBattlecard({
            evidence: body.evidence,
            featureMatrix: body.feature_matrix,
            differentiators: body.differentiators,
            priceComparisons: body.price_comparisons,
            subjectLabel: body.subject_label,
          });

    return Response.json({ ...deliverable, elapsed_ms: Date.now() - started });
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
