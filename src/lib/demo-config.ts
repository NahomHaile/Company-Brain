// Demo configuration and the cached-run insurance path — CADENCE-BUILD-SPEC.md §12.5
//
// OWNER: Person D.
//
// The cached run is what `?demo=cached` renders. It is loaded by a static import,
// not a fetch, so it works with the wifi switched off.

import { z } from "zod";
import { Deliverable, Evidence, PriceTier, Recipe } from "@/lib/contracts";
import cachedRunJson from "../../data/fixtures/demo-battlecard.json";

/** Our synthetic company. Maya Okonkwo and Thicket are invented for this demo. */
export const OUR_COMPANY = {
  name: "Thicket",
  founder: "Maya Okonkwo",
  what: "scheduling software for independent veterinary clinics",
} as const;

/**
 * The demo pair. Both are real, public marketing pages, both static HTML, and
 * both allowed by their site's robots.txt (checked 19 Sep 2026). Named on screen
 * so a judge can see exactly what we fetched.
 */
export const DEMO_PAIR = {
  target: {
    url: "https://www.smalldoorvet.com/membership",
    label: "Small Door Veterinary",
    role: "The prospect — a sixteen-location veterinary practice Maya is pitching.",
  },
  competitor: {
    url: "https://www.digitail.com/pricing",
    label: "Digitail",
    role: "The competitor that comes up on the call — an all-in-one vet practice platform.",
  },
} as const;

/** The six named stages the UI walks through. Order matters; the labels are the demo. */
export const PIPELINE_STAGES = [
  { id: "fetch", label: "Fetching pages", detail: "robots.txt checked, one request per second" },
  { id: "evidence", label: "Reading evidence", detail: "verbatim quotes, with the URL they came from" },
  { id: "pricing", label: "Comparing pricing", detail: "computed in code — the model never does arithmetic" },
  { id: "ranking", label: "Ranking differences", detail: "what is material for this prospect specifically" },
  { id: "drafting", label: "Writing your card", detail: "six sections drafted in parallel" },
  { id: "audit", label: "Checking every claim", detail: "grounding audit and risk flags" },
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number]["id"];

/**
 * The envelope around a cached run. `deliverable` is a contract-valid Deliverable;
 * the evidence and price tiers ride along so the review canvas can resolve
 * provenance without a second request.
 */
export const CachedRun = z.object({
  schema: z.literal("cadence.cached_run.v1"),
  /**
   * False while the file is a hand-authored fixture rather than the output of a
   * real pipeline run. The UI shows an extra SYNTHETIC FIXTURE badge while it is
   * false — see §4, honesty contract.
   */
  captured_from_live_run: z.boolean(),
  captured_at: z.string(),
  inputs: z.object({
    recipe: Recipe,
    target_url: z.string(),
    competitor_url: z.string(),
  }),
  evidence: z.array(Evidence),
  price_tiers: z.array(PriceTier),
  deliverable: Deliverable,
});

export type CachedRun = z.infer<typeof CachedRun>;

let parsed: CachedRun | null = null;

/** The cached run, validated against the contracts. Throws loudly if it drifts. */
export function getCachedRun(): CachedRun {
  if (!parsed) parsed = CachedRun.parse(cachedRunJson);
  return parsed;
}

/**
 * Simulated connectors — CADENCE-BUILD-SPEC.md §4.
 *
 * These buttons load fixtures. There is no Slack app, no CRM integration and no
 * calendar OAuth behind them, and every one renders a SIMULATED CONNECTOR badge
 * next to it. All content below is synthetic Thicket data.
 */
export const SIMULATED_SOURCES = [
  {
    id: "slack",
    label: "Pull from Slack",
    source_label: "Slack #general — synthetic",
    text: `#general — Sep 2
Maya: closed Riverbend Vet (4 locations, 11 seats). Biggest logo yet.
Dev: reminders API was down ~40 min Tuesday, root cause was our retry queue. Fixed.

#general — Sep 9
Maya: Northgate churned. They went to an all-in-one PIMS. Second one this quarter that left for consolidation.
Priya: onboarding backlog is 6 practices deep, I'm the only one doing it.

#general — Sep 16
Maya: MRR crossed 41K. Net new 3.1K, churn 1.4K.
Maya: still no answer from the two intros Chen promised in July.`,
  },
  {
    id: "crm",
    label: "Pull from CRM",
    source_label: "CRM export — synthetic",
    text: `stage,count,notes
discovery,9,"6 inbound, 3 from vet conference list"
pilot,4,"Brookside, Riverbend, two unnamed"
closed_won,2,"Riverbend Vet, Cedar Park Animal"
closed_lost,3,"Northgate (consolidation), two on price"`,
  },
  {
    id: "calendar",
    label: "Pull from calendar",
    source_label: "Calendar — synthetic",
    text: `Sep: 31 discovery calls taken (6-9/wk), 4 investor 1:1s, 2 candidate screens for the ops hire.`,
  },
] as const;
