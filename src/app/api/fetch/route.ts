/**
 * POST /api/fetch — the ingest half of the battlecard pipeline.
 *
 * OWNER: Person A. Spec §5 [A1][A2][A3].
 *
 * Fetch both pages in parallel, extract evidence from each in parallel,
 * extract pricing, then compute every comparison in TypeScript. Hands Person
 * B a FetchResponse.
 *
 * Latency budget for this route is ~9s of the ~32s total (§5), which it only
 * hits because nothing here waits on anything it doesn't depend on.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { FetchResponse, type Evidence, type PriceTier } from "@/lib/contracts";
import { fetchPages } from "@/lib/fetch-page";
import { extractEvidence, extractPricing } from "@/lib/prompts/evidence";
import { buildComparisons } from "@/lib/pricing";
import { resetSession, patchSession } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestBody = z.object({
  target_url: z.string().min(1),
  competitor_url: z.string().min(1),
  /** Our own pricing page. Optional — falls back to the fixture tiers. */
  own_url: z.string().min(1).optional(),
  our_company: z.string().default("Thicket"),
  competitor_company: z.string().default("VetFlow"),
  /** Demo safety: skip the network and serve the cached pair. */
  cached: z.boolean().default(false),
});

export async function POST(request: Request) {
  let body: z.infer<typeof RequestBody>;
  try {
    body = RequestBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  await resetSession("battlecard");

  // ── [A1] Both pages at once. The rate limiter still serializes the wire.
  const pages = await fetchPages([
    { url: body.target_url, role: "target", forceCached: body.cached },
    { url: body.competitor_url, role: "competitor", forceCached: body.cached },
    ...(body.own_url
      ? [{ url: body.own_url, role: "own" as const, forceCached: body.cached }]
      : []),
  ]);

  const usable = pages.filter((p) => p.ok && p.text.length > 0);

  // Nothing readable. Stop rather than drafting a battlecard from nothing —
  // a confident card built on no evidence is the worst thing we could ship.
  if (usable.length === 0) {
    const reasons = pages
      .map((p) => `${p.source_label}: ${p.error_detail ?? p.error ?? "unknown"}`)
      .join(" ");
    const response = FetchResponse.parse({
      recipe: "battlecard",
      pages,
      evidence: [],
      price_tiers: [],
      price_comparisons: [],
      fatal: `Could not read any page. ${reasons}`,
    });
    await patchSession({ pages });
    return NextResponse.json(response, { status: 200 });
  }

  // ── [A2] Evidence from every usable page, in parallel.
  // Ids are pre-partitioned per page so parallel extraction can't collide.
  const results = await Promise.allSettled(
    usable.map((page, index) =>
      extractEvidence({
        page,
        role: page.role,
        startIndex: index * 100 + 1,
      }),
    ),
  );

  const evidence: Evidence[] = [];
  const dropped: string[] = [];
  const extractionErrors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      evidence.push(...result.value.evidence);
      dropped.push(...result.value.dropped);
    } else {
      extractionErrors.push(
        `${usable[index].source_label}: ${(result.reason as Error).message}`,
      );
    }
  });

  // ── [A3] Pricing from the pages that mention money, in parallel.
  const pricingTargets = usable
    .filter((p) => p.role === "competitor" || p.role === "own")
    .map((page) => ({
      page,
      company:
        page.role === "competitor" ? body.competitor_company : body.our_company,
      evidenceIds: evidence
        .filter((e) => e.source_label === page.source_label && e.type === "pricing")
        .map((e) => e.id),
    }));

  const pricingResults = await Promise.allSettled(
    pricingTargets.map((target) => extractPricing(target)),
  );

  const priceTiers: PriceTier[] = [];
  pricingResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      priceTiers.push(...result.value);
    } else {
      extractionErrors.push(
        `pricing/${pricingTargets[index].company}: ${(result.reason as Error).message}`,
      );
    }
  });

  // ── Deterministic. No model past this line. §3.1.
  const priceComparisons = buildComparisons(priceTiers, body.our_company);

  if (evidence.length === 0) {
    const response = FetchResponse.parse({
      recipe: "battlecard",
      pages,
      evidence: [],
      price_tiers: priceTiers,
      price_comparisons: priceComparisons,
      fatal:
        extractionErrors.length > 0
          ? `Evidence extraction failed. ${extractionErrors.join(" ")}`
          : "No evidence could be extracted from these pages.",
    });
    await patchSession({ pages, price_tiers: priceTiers, price_comparisons: priceComparisons });
    return NextResponse.json(response, { status: 200 });
  }

  const response = FetchResponse.parse({
    recipe: "battlecard",
    pages,
    evidence,
    price_tiers: priceTiers,
    price_comparisons: priceComparisons,
    fatal: null,
  });

  await patchSession({
    pages,
    evidence,
    price_tiers: priceTiers,
    price_comparisons: priceComparisons,
  });

  if (dropped.length > 0) {
    // Visible in the server log, not swallowed: these were paraphrases the
    // model presented as verbatim quotes, and the count is worth knowing.
    console.warn(
      `[api/fetch] dropped ${dropped.length} evidence item(s) whose quote was not found verbatim on the page`,
    );
  }
  if (extractionErrors.length > 0) {
    console.warn(`[api/fetch] partial extraction failure — ${extractionErrors.join(" | ")}`);
  }

  return NextResponse.json(response, { status: 200 });
}
