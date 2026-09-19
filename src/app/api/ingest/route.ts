/**
 * POST /api/ingest — the paste path, recipe 2 (investor update).
 *
 * OWNER: Person A. Spec §2.1 / §9.
 *
 * Same Evidence type and the same verbatim guarantee as /api/fetch. The only
 * difference is where the text came from: a founder's scratch notes instead
 * of a public page. Everything downstream — ranking, drafting, grounding
 * audit, risk flagging, canvas, export — is shared (§2.1), which is why the
 * second recipe costs 35 minutes and not a second product.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { IngestResponse } from "@/lib/contracts";
import { extractPasteEvidence } from "@/lib/prompts/evidence";
import { resetSession, patchSession } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Below this there isn't enough to build an update from. */
const MIN_PASTE_CHARS = 120;

/** Matches the page-text cap — keeps one paste from blowing the budget. */
const MAX_PASTE_CHARS = 15_000;

const RequestBody = z.object({
  text: z.string(),
  source_label: z.string().default("Founder notes"),
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

  const text = body.text.trim().slice(0, MAX_PASTE_CHARS);

  if (text.length < MIN_PASTE_CHARS) {
    return NextResponse.json(
      IngestResponse.parse({
        recipe: "investor_update",
        evidence: [],
        fatal: `Paste at least ${MIN_PASTE_CHARS} characters of notes — there is not enough here to build an update from.`,
      }),
      { status: 200 },
    );
  }

  await resetSession("investor_update");

  let evidence, dropped;
  try {
    ({ evidence, dropped } = await extractPasteEvidence({
      text,
      sourceLabel: body.source_label,
    }));
  } catch (err) {
    return NextResponse.json(
      IngestResponse.parse({
        recipe: "investor_update",
        evidence: [],
        fatal: `Could not read these notes: ${(err as Error).message}`,
      }),
      { status: 200 },
    );
  }

  if (evidence.length === 0) {
    return NextResponse.json(
      IngestResponse.parse({
        recipe: "investor_update",
        evidence: [],
        fatal: "No facts could be extracted from these notes.",
      }),
      { status: 200 },
    );
  }

  await patchSession({ recipe: "investor_update", evidence });

  if (dropped.length > 0) {
    console.warn(
      `[api/ingest] dropped ${dropped.length} item(s) whose quote was not found verbatim in the notes`,
    );
  }

  return NextResponse.json(
    IngestResponse.parse({
      recipe: "investor_update",
      evidence,
      fatal: null,
    }),
    { status: 200 },
  );
}
