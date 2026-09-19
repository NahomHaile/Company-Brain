/**
 * TEMPORARY — Person B's local test data, standing in for Person A's
 * `data/fixtures/evidence.json` and the output of `src/lib/pricing.ts`.
 *
 * DELETE THIS FILE when A's fixtures land. `data/fixtures/*` is A's exclusively;
 * this lives under B's prompts directory precisely so it does not collide.
 *
 * Deliberately messy, per spec §7.1 — clean fixtures make the demo look fake and
 * hide the bugs you would rather find now than at 3:20:
 *   - VetFlow Enterprise is "Contact us" (price_amount: null)
 *   - The same capability is worded differently on each site
 *     ("automated reminders" vs "patient recall messaging")
 *   - ev_007 has a stale fetched_at (July) — should trip C's stale_evidence audit
 *   - Two items sit below 0.6 confidence because the page is marketing vapour
 *   - VetFlow's API is add-on-only above Pro, which is a real pivot point
 *   - VetFlow genuinely beats us on multi-location reporting — a real landmine
 */

import type { Evidence, PriceComparison, PriceTier } from "@/lib/contracts";

/** All synthetic. Thicket and Maya Okonkwo are demonstration data, per §4. */
export const SAMPLE_EVIDENCE: Evidence[] = [
  {
    id: "ev_001",
    recipe_role: "target",
    source: "url",
    source_label: "brooksideanimalhospital.com",
    source_url: "https://brooksideanimalhospital.com",
    quote:
      "Brookside Animal Hospital has served the Fairview community for over 20 years across our three neighborhood clinics.",
    summary: "Target runs three clinic locations",
    type: "segment",
    entities: ["Brookside Animal Hospital"],
    confidence: 0.95,
    fetched_at: "2026-09-19T17:12:00Z",
  },
  {
    id: "ev_002",
    recipe_role: "target",
    source: "url",
    source_label: "brooksideanimalhospital.com/about",
    source_url: "https://brooksideanimalhospital.com/about",
    quote:
      "Our front desk team handles over 400 appointment calls a week, and we know how frustrating phone tag can be.",
    summary: "High call volume; front desk is a stated pain point",
    type: "segment",
    entities: ["Brookside Animal Hospital"],
    confidence: 0.9,
    fetched_at: "2026-09-19T17:12:00Z",
  },
  {
    id: "ev_003",
    recipe_role: "target",
    source: "url",
    source_label: "brooksideanimalhospital.com/contact",
    source_url: "https://brooksideanimalhospital.com/contact",
    quote: "Request an appointment online and we will call you back to confirm.",
    summary: "No real-time online booking — requests are confirmed by phone",
    type: "feature",
    entities: ["Brookside Animal Hospital"],
    confidence: 0.85,
    fetched_at: "2026-09-19T17:12:00Z",
  },
  {
    id: "ev_004",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com/pricing",
    source_url: "https://vetflow.com/pricing",
    quote: "Starter — $89 per user/month, billed annually. Up to 5 users.",
    summary: "VetFlow Starter is $89/seat/month on annual billing, 5-seat cap",
    type: "pricing",
    entities: ["VetFlow"],
    confidence: 0.95,
    fetched_at: "2026-09-19T17:13:00Z",
  },
  {
    id: "ev_005",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com/pricing",
    source_url: "https://vetflow.com/pricing",
    quote:
      "Pro — $149 per user/month, billed annually. Minimum 3 users. Includes multi-location reporting.",
    summary: "VetFlow Pro is $149/seat/month annual, 3-seat minimum",
    type: "pricing",
    entities: ["VetFlow"],
    confidence: 0.95,
    fetched_at: "2026-09-19T17:13:00Z",
  },
  {
    id: "ev_006",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com/pricing",
    source_url: "https://vetflow.com/pricing",
    quote: "Enterprise — Contact us for custom pricing.",
    summary: "VetFlow Enterprise is quote-only; no published price",
    type: "pricing",
    entities: ["VetFlow"],
    confidence: 0.99,
    fetched_at: "2026-09-19T17:13:00Z",
  },
  {
    id: "ev_007",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com/features/integrations",
    source_url: "https://vetflow.com/features/integrations",
    // Stale on purpose — fetched in July. Competitor pricing and packaging pages
    // change; C's grounding audit should flag any claim resting on this.
    quote:
      "The VetFlow API is available as an add-on for Pro and Enterprise customers.",
    summary: "VetFlow API is a paid add-on, Pro tier and above only",
    type: "integration",
    entities: ["VetFlow"],
    confidence: 0.8,
    fetched_at: "2026-07-02T09:40:00Z",
  },
  {
    id: "ev_008",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com/features",
    source_url: "https://vetflow.com/features",
    // Worded differently from ev_012 — same capability, different label.
    // B1 must judge by function, not by matching strings.
    quote:
      "Patient recall messaging keeps your clients coming back for vaccinations and annual checkups.",
    summary: "VetFlow has automated recall/reminder messaging",
    type: "feature",
    entities: ["VetFlow"],
    confidence: 0.9,
    fetched_at: "2026-09-19T17:13:00Z",
  },
  {
    id: "ev_009",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com/features",
    source_url: "https://vetflow.com/features",
    quote:
      "Roll up appointment volume, revenue, and no-show rates across every location in a single dashboard.",
    summary: "VetFlow has cross-location reporting in one dashboard",
    type: "feature",
    entities: ["VetFlow"],
    confidence: 0.92,
    fetched_at: "2026-09-19T17:13:00Z",
  },
  {
    id: "ev_010",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.com",
    source_url: "https://vetflow.com",
    // Marketing vapour — no specifics. Low confidence on purpose.
    quote: "The industry-leading platform trusted by veterinary teams everywhere.",
    summary: "Generic leadership claim, no specifics",
    type: "positioning",
    entities: ["VetFlow"],
    confidence: 0.3,
    fetched_at: "2026-09-19T17:13:00Z",
  },
  {
    id: "ev_011",
    recipe_role: "own",
    source: "url",
    source_label: "thicket.app/pricing",
    source_url: "https://thicket.app/pricing",
    quote: "Every plan includes full API access. Standard — $79 per seat/month.",
    summary: "Thicket Standard is $79/seat/month with API included at every tier",
    type: "pricing",
    entities: ["Thicket"],
    confidence: 0.98,
    fetched_at: "2026-09-19T17:11:00Z",
  },
  {
    id: "ev_012",
    recipe_role: "own",
    source: "url",
    source_label: "thicket.app/features",
    source_url: "https://thicket.app/features",
    quote:
      "Automated reminders go out by SMS and email, and clients can confirm or reschedule without calling you.",
    summary: "Thicket has automated reminders with self-serve reschedule",
    type: "feature",
    entities: ["Thicket"],
    confidence: 0.94,
    fetched_at: "2026-09-19T17:11:00Z",
  },
  {
    id: "ev_013",
    recipe_role: "own",
    source: "url",
    source_label: "thicket.app/features",
    source_url: "https://thicket.app/features",
    quote:
      "Real-time online booking that writes straight into your practice calendar.",
    summary: "Thicket has real-time self-serve online booking",
    type: "feature",
    entities: ["Thicket"],
    confidence: 0.94,
    fetched_at: "2026-09-19T17:11:00Z",
  },
  {
    id: "ev_014",
    recipe_role: "own",
    source: "url",
    source_label: "thicket.app",
    source_url: "https://thicket.app",
    // Also vague — our own marketing is no more reliable than theirs.
    quote: "Built for independent clinics that want their front desk back.",
    summary: "Thicket positions around independent clinics and front-desk load",
    type: "positioning",
    entities: ["Thicket"],
    confidence: 0.55,
    fetched_at: "2026-09-19T17:11:00Z",
  },
];

/** Stands in for `data/fixtures/pricing.json`. Extraction only — no math here. */
export const SAMPLE_PRICE_TIERS: PriceTier[] = [
  {
    company: "Thicket",
    tier_name: "Standard",
    price_amount: 79,
    price_unit: "per_seat_month",
    seat_minimum: null,
    included_features: ["API access", "Automated reminders", "Online booking"],
    evidence_ids: ["ev_011", "ev_012", "ev_013"],
  },
  {
    company: "VetFlow",
    tier_name: "Starter",
    price_amount: 89,
    price_unit: "per_seat_month",
    seat_minimum: null,
    included_features: ["Patient recall messaging"],
    evidence_ids: ["ev_004", "ev_008"],
  },
  {
    company: "VetFlow",
    tier_name: "Pro",
    price_amount: 149,
    price_unit: "per_seat_month",
    seat_minimum: 3,
    included_features: ["Multi-location reporting", "API (add-on)"],
    evidence_ids: ["ev_005", "ev_007", "ev_009"],
  },
  {
    company: "VetFlow",
    tier_name: "Enterprise",
    price_amount: null, // "Contact us" — never estimate a price
    price_unit: "unknown",
    seat_minimum: null,
    included_features: [],
    evidence_ids: ["ev_006"],
  },
];

/**
 * Stands in for the output of A's `src/lib/pricing.ts`.
 *
 * HAND-WRITTEN, NOT COMPUTED — these numbers exist so B4's prompt can be tested
 * against a table. They are NOT demo-safe. B4 narrates only what A's real engine
 * produces; swap this out before anything ships.
 */
export const SAMPLE_PRICE_COMPARISONS: PriceComparison[] = [
  {
    our_tier: "Standard",
    their_tier: "Starter",
    normalized_monthly_per_seat_ours: 79,
    normalized_monthly_per_seat_theirs: 89,
    delta_abs: 10,
    delta_pct: 11.24,
    cheaper: "ours",
    caveat: "VetFlow Starter is billed annually; monthly billing is not published.",
  },
  {
    our_tier: "Standard",
    their_tier: "Pro",
    normalized_monthly_per_seat_ours: 79,
    normalized_monthly_per_seat_theirs: 149,
    delta_abs: 70,
    delta_pct: 46.98,
    cheaper: "ours",
    caveat:
      "VetFlow Pro carries a 3-seat minimum, so their effective floor is $447/month.",
  },
  {
    our_tier: "Standard",
    their_tier: "Enterprise",
    normalized_monthly_per_seat_ours: 79,
    normalized_monthly_per_seat_theirs: null,
    delta_abs: null,
    delta_pct: null,
    cheaper: "unknown",
    caveat: "VetFlow Enterprise is quote-only; no comparison is possible.",
  },
];
