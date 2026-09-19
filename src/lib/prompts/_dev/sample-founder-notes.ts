/**
 * TEMPORARY — Person B's sample input for the investor-update recipe.
 *
 * DELETE with the rest of `_dev/`. Stands in for whatever A's `/api/ingest`
 * produces from a founder's pasted notes, Slack export, or metrics CSV.
 *
 * The battlecard fixture is all scraped web evidence (types pricing/feature/
 * positioning). The investor recipe drafts metrics, highlights, lowlights and
 * asks, which need types metric/win/loss/ask with recipe_role "founder_input" —
 * none of which exist there. Pointed at the battlecard fixture, recipe 2 would
 * invent an investor update out of a competitor's pricing page.
 *
 * Deliberately messy, per §7.1:
 *   - A lowlight with a genuinely unknown cause (fn_006)
 *   - A named churned customer — should trip C's `named_churned_customer`
 *   - An unannounced raise — should trip C's `unannounced_fundraise`
 *   - A named underperforming employee — should trip C's `personnel_detail`
 *   - A vague note with no number (fn_011), low confidence
 *   - A metric with no prior-period comparison, so nothing can be derived
 *
 * The three risk-tripping items are there on purpose: they give C's investor
 * risk categories something real to catch. All synthetic, per §4.
 */

import type { Evidence } from "@/lib/contracts";

export const SAMPLE_FOUNDER_NOTES: Evidence[] = [
  {
    id: "fn_001",
    recipe_role: "founder_input",
    source: "csv",
    source_label: "metrics.csv — September 2026",
    source_url: null,
    quote: "MRR: $41,200. Prior month: $38,600.",
    summary: "MRR is $41,200, up from $38,600 in August",
    type: "metric",
    entities: ["Thicket"],
    confidence: 0.99,
    fetched_at: "2026-09-18T09:00:00Z",
  },
  {
    id: "fn_002",
    recipe_role: "founder_input",
    source: "csv",
    source_label: "metrics.csv — September 2026",
    source_url: null,
    // No prior-period figure on purpose: nothing can be derived from this alone.
    quote: "New clinics signed: 7.",
    summary: "Seven new clinics signed in September",
    type: "metric",
    entities: ["Thicket"],
    confidence: 0.98,
    fetched_at: "2026-09-18T09:00:00Z",
  },
  {
    id: "fn_003",
    recipe_role: "founder_input",
    source: "csv",
    source_label: "metrics.csv — September 2026",
    source_url: null,
    quote: "Logo churn: 2 clinics. Net revenue retention: 104%.",
    summary: "Two clinics churned; NRR 104%",
    type: "loss",
    entities: ["Thicket"],
    confidence: 0.97,
    fetched_at: "2026-09-18T09:00:00Z",
  },
  {
    id: "fn_004",
    recipe_role: "founder_input",
    source: "paste",
    source_label: "Maya's notes — 17 Sept",
    source_url: null,
    quote:
      "Shipped the new onboarding flow. Time from signup to first booked appointment went from about 4 days to under an hour.",
    summary: "New onboarding cut time-to-first-booking from ~4 days to under an hour",
    type: "win",
    entities: ["Thicket"],
    confidence: 0.92,
    fetched_at: "2026-09-17T14:30:00Z",
  },
  {
    id: "fn_005",
    recipe_role: "founder_input",
    source: "slack",
    source_label: "Slack #wins — 11 Sept",
    source_url: null,
    quote:
      "Brookside Animal Hospital signed for all three of their locations. Biggest account to date.",
    summary: "Brookside signed across three locations — largest account so far",
    type: "win",
    entities: ["Thicket", "Brookside Animal Hospital"],
    confidence: 0.95,
    fetched_at: "2026-09-11T16:05:00Z",
  },
  {
    id: "fn_006",
    recipe_role: "founder_input",
    source: "paste",
    source_label: "Maya's notes — 17 Sept",
    source_url: null,
    // Cause genuinely unknown. The prompt must be allowed to say so rather
    // than manufacturing a tidy explanation.
    quote:
      "Trial-to-paid conversion dropped from 31% to 22% this month and I genuinely don't know why yet. Nothing changed in the funnel that I'm aware of.",
    summary: "Trial-to-paid fell 31% → 22%, cause unknown",
    type: "loss",
    entities: ["Thicket"],
    confidence: 0.9,
    fetched_at: "2026-09-17T14:30:00Z",
  },
  {
    id: "fn_007",
    recipe_role: "founder_input",
    source: "paste",
    source_label: "Maya's notes — 17 Sept",
    source_url: null,
    // Should trip C's `named_churned_customer`.
    quote:
      "Lost Cedar Vet Group after eight months. They told me flat out they left for VetFlow's multi-location reporting.",
    summary: "Cedar Vet Group churned to VetFlow over multi-location reporting",
    type: "loss",
    entities: ["Thicket", "Cedar Vet Group", "VetFlow"],
    confidence: 0.94,
    fetched_at: "2026-09-17T14:30:00Z",
  },
  {
    id: "fn_008",
    recipe_role: "founder_input",
    source: "interview",
    source_label: "Maya — planning call, 16 Sept",
    source_url: null,
    // Should trip C's `unannounced_fundraise`.
    quote:
      "We're starting to put a Series A deck together for Q1 but nothing is public and I don't want it getting out yet.",
    summary: "Series A planned for Q1, not yet public",
    type: "admin",
    entities: ["Thicket"],
    confidence: 0.85,
    fetched_at: "2026-09-16T11:00:00Z",
  },
  {
    id: "fn_009",
    recipe_role: "founder_input",
    source: "interview",
    source_label: "Maya — planning call, 16 Sept",
    source_url: null,
    // Should trip C's `personnel_detail`.
    quote:
      "Our second engineer, Dan, hasn't worked out and I'll probably have to let him go next month.",
    summary: "An engineer is likely to be let go next month",
    type: "admin",
    entities: ["Thicket"],
    confidence: 0.8,
    fetched_at: "2026-09-16T11:00:00Z",
  },
  {
    id: "fn_010",
    recipe_role: "founder_input",
    source: "paste",
    source_label: "Maya's notes — 17 Sept",
    source_url: null,
    quote:
      "Need warm intros to practice managers at groups running three to ten clinics, ideally Midwest. Those close about twice as fast as single-site practices.",
    summary: "Wants intros to practice managers at 3-10 location groups in the Midwest",
    type: "ask",
    entities: ["Thicket"],
    confidence: 0.93,
    fetched_at: "2026-09-17T14:30:00Z",
  },
  {
    id: "fn_011",
    recipe_role: "founder_input",
    source: "paste",
    source_label: "Maya's notes — 17 Sept",
    source_url: null,
    // Vague on purpose. Low confidence; there is no "so what" to extract.
    quote: "Team morale feels good. Busy month overall.",
    summary: "General positive sentiment, no specifics",
    type: "admin",
    entities: ["Thicket"],
    confidence: 0.35,
    fetched_at: "2026-09-17T14:30:00Z",
  },
  {
    id: "fn_012",
    recipe_role: "founder_input",
    source: "paste",
    source_label: "Maya's notes — 17 Sept",
    source_url: null,
    quote:
      "Runway is 16 months at current burn. Hiring a second engineer would take that to about 12.",
    summary: "16 months runway; a second engineer would reduce it to ~12",
    type: "risk",
    entities: ["Thicket"],
    confidence: 0.91,
    fetched_at: "2026-09-17T14:30:00Z",
  },
  {
    id: "fn_013",
    recipe_role: "founder_input",
    source: "slack",
    source_label: "Slack #product — 8 Sept",
    source_url: null,
    quote:
      "Three clinics this week asked whether we can roll up reporting across locations. That's the second month running.",
    summary: "Repeated inbound demand for cross-location reporting",
    type: "ask",
    entities: ["Thicket"],
    confidence: 0.88,
    fetched_at: "2026-09-08T10:20:00Z",
  },
];
