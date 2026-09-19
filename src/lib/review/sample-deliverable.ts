// A complete Deliverable for building the review canvas against.
//
// Person A's data/fixtures/battlecard.json is the real target; this exists so
// the canvas can be built and demoed against every edge case at once. A's
// fixture is realistic, this one is exhaustive. Each item below is here to
// drive a specific rendering path — see the comments.
//
// All Thicket / Brookside data is synthetic (see README). VetFlow stands in
// for a competitor's public pricing page.
// Relative, not the @/ alias, so this folder stays runnable under `node --test`.
import { Deliverable, EvidenceArray } from "../contracts.ts";

/** Fetched today — fresh. */
const FRESH = "2026-09-19T12:40:00.000Z";
/** Fetched 11 weeks ago — past the 30-day staleness line in spec 11.2. */
const STALE = "2026-07-02T09:15:00.000Z";

export const SAMPLE_EVIDENCE = EvidenceArray.parse([
  {
    id: "ev_001",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.example.com/pricing",
    source_url: "https://vetflow.example.com/pricing",
    quote: "Professional — $200 per seat / month, billed annually.",
    summary: "VetFlow Professional is $200 per seat per month",
    type: "pricing",
    entities: ["VetFlow", "Professional"],
    confidence: 0.94,
    fetched_at: STALE, // drives the stale treatment + stale_pricing flag
  },
  {
    id: "ev_002",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.example.com/pricing",
    source_url: "https://vetflow.example.com/pricing",
    quote: "Enterprise — Contact us for pricing.",
    summary: "VetFlow Enterprise is quote-only",
    type: "pricing",
    entities: ["VetFlow", "Enterprise"],
    confidence: 0.91,
    fetched_at: STALE,
  },
  {
    id: "ev_003",
    recipe_role: "own",
    source: "url",
    source_label: "thicket.example.com/pricing",
    source_url: "https://thicket.example.com/pricing",
    quote: "Practice — $145 per seat / month. No minimum.",
    summary: "Thicket Practice is $145 per seat per month",
    type: "pricing",
    entities: ["Thicket", "Practice"],
    confidence: 0.97,
    fetched_at: FRESH,
  },
  {
    id: "ev_004",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.example.com/integrations",
    source_url: "https://vetflow.example.com/integrations",
    quote: "VetFlow offers integrations with leading lab providers.",
    summary: "VetFlow integrates with some lab providers",
    type: "integration",
    entities: ["VetFlow"],
    confidence: 0.88,
    fetched_at: FRESH, // the sentence citing this overstates it
  },
  {
    id: "ev_005",
    recipe_role: "target",
    source: "url",
    source_label: "brooksideanimalhospital.example.com/about",
    source_url: "https://brooksideanimalhospital.example.com/about",
    quote:
      "Brookside Animal Hospital is a six-veterinarian practice with two locations in Portland.",
    summary: "Brookside has six vets across two Portland locations",
    type: "segment",
    entities: ["Brookside Animal Hospital", "Portland"],
    confidence: 0.96,
    fetched_at: FRESH,
  },
  {
    id: "ev_006",
    recipe_role: "own",
    source: "slack",
    source_label: "Slack #wins — 12 March",
    source_url: null, // no URL: the popover must not render a dead link
    quote:
      "Riverbend switched the week their VetFlow renewal came up. Asking about renewal timing is what opened it.",
    summary: "Renewal timing was the opening at Riverbend",
    type: "win",
    entities: ["Riverbend", "VetFlow"],
    confidence: 0.72,
    fetched_at: null,
  },
  {
    id: "ev_007",
    recipe_role: "own",
    source: "csv",
    source_label: "Onboarding tracker export",
    source_url: null,
    quote: "Mean time to first live appointment: 4.1 days (n=38 practices).",
    summary: "Onboarding averages about four days across 38 practices",
    type: "metric",
    entities: ["Thicket"],
    confidence: 0.89,
    fetched_at: FRESH,
  },
  {
    id: "ev_008",
    recipe_role: "competitor",
    source: "url",
    source_label: "vetflow.example.com",
    source_url: "https://vetflow.example.com",
    quote: "Built for multi-location referral hospitals.",
    summary: "VetFlow positions around multi-location referral hospitals",
    type: "positioning",
    entities: ["VetFlow"],
    confidence: 0.93,
    fetched_at: FRESH,
  },
  {
    id: "ev_009",
    recipe_role: "own",
    source: "url",
    source_label: "thicket.example.com/integrations",
    source_url: "https://thicket.example.com/integrations",
    quote:
      "Results from IDEXX post straight into the patient record. No manual upload.",
    summary: "Thicket has a direct IDEXX lab integration",
    type: "proof_point",
    entities: ["Thicket", "IDEXX"],
    confidence: 0.95,
    fetched_at: FRESH,
  },
]);

export const SAMPLE_DELIVERABLE = Deliverable.parse({
  recipe: "battlecard",
  title: "Thicket vs. VetFlow",
  subject_label: "Thicket vs. VetFlow — for Brookside Animal Hospital",
  generated_at: "2026-09-19T13:14:00.000Z",
  word_count: 241,
  sections: [
    {
      key: "positioning",
      title: "Positioning",
      sentences: [
        {
          id: "s_01",
          text: "Thicket puts scheduling, records, and billing on one screen, so a six-vet practice runs the front desk without switching tools.",
          evidence_ids: ["ev_005", "ev_009"],
        },
        {
          id: "s_02",
          text: "VetFlow is built for multi-location referral hospitals, which is a different shape of practice than Brookside.",
          evidence_ids: ["ev_008"],
        },
        {
          // No evidence at all, and invents a number. Two grounding issues.
          id: "s_03",
          text: "Most clinics that switch are fully live within a week, and they save about $60 a seat doing it.",
          evidence_ids: [],
        },
      ],
    },
    {
      key: "pricing",
      title: "Pricing",
      sentences: [
        {
          id: "s_04",
          text: "VetFlow lists Professional at $200 per seat per month, billed annually.",
          evidence_ids: ["ev_001"],
        },
        {
          id: "s_05",
          text: "Thicket's Practice tier is $145 per seat per month, with no seat minimum.",
          evidence_ids: ["ev_003"],
        },
        {
          id: "s_06",
          text: "Above their Professional tier VetFlow moves to quote-only pricing, so the comparison stops being apples to apples.",
          evidence_ids: ["ev_002"],
        },
      ],
    },
    {
      key: "we_win",
      title: "Where we win",
      sentences: [
        {
          // Two non-overlapping flags at different severities.
          id: "s_07",
          text: "VetFlow is the only platform in this category that charges over $200 a seat, and their product is a mess for single-location practices.",
          evidence_ids: ["ev_001"],
        },
        {
          id: "s_08",
          text: "Thicket connects to IDEXX directly, so lab results land in the record without a manual upload.",
          evidence_ids: ["ev_009"],
        },
      ],
    },
    {
      key: "they_win",
      title: "Where they win",
      sentences: [
        {
          // Evidence supports something weaker than the claim.
          id: "s_09",
          text: "VetFlow integrates with everything a referral hospital already uses.",
          evidence_ids: ["ev_004"],
        },
        {
          id: "s_10",
          text: "If Brookside plans to add a referral arm this year, VetFlow's multi-location tooling is ahead of ours.",
          evidence_ids: ["ev_008"],
        },
      ],
    },
    {
      key: "pivots",
      title: "Pivot points",
      sentences: [
        {
          id: "s_11",
          text: "When they push on price, move to onboarding: we average four days to first live appointment across 38 practices.",
          evidence_ids: ["ev_007"],
        },
        {
          // Cites paste-sourced evidence with no URL.
          id: "s_12",
          text: "If they mention their current contract, ask when it renews rather than pushing on features.",
          evidence_ids: ["ev_006"],
        },
      ],
    },
    {
      key: "questions",
      title: "Discovery questions",
      sentences: [
        {
          id: "s_13",
          text: "How many of your six vets enter records themselves versus handing them to a tech?",
          evidence_ids: ["ev_005"],
        },
        {
          id: "s_14",
          text: "What happens today when a lab result comes back while the vet is already in another appointment?",
          evidence_ids: ["ev_009"],
        },
        {
          // Internal discounting — should never be said on a recorded call.
          id: "s_15",
          text: "We can go to $120 a seat if they sign before the quarter ends.",
          evidence_ids: [],
        },
      ],
    },
  ],
  price_comparisons: [
    {
      our_tier: "Practice",
      their_tier: "Professional",
      normalized_monthly_per_seat_ours: 145,
      normalized_monthly_per_seat_theirs: 200,
      delta_abs: 55,
      delta_pct: 27.5,
      cheaper: "ours",
      caveat: null,
    },
    {
      // "Contact us" tier — nothing to compare against.
      our_tier: "Practice",
      their_tier: "Enterprise",
      normalized_monthly_per_seat_ours: 145,
      normalized_monthly_per_seat_theirs: null,
      delta_abs: null,
      delta_pct: null,
      cheaper: "unknown",
      caveat:
        "VetFlow's Enterprise tier is quote-only, so there is no published number to compare.",
    },
  ],
  feature_matrix: [
    {
      feature: "Single-screen scheduling",
      ours: "yes",
      theirs: "partial",
      matters_to_target: true,
      why: "Brookside's front desk covers six vets across two locations.",
      evidence_ids: ["ev_005", "ev_009"],
    },
    {
      feature: "IDEXX lab integration",
      ours: "yes",
      theirs: "yes",
      matters_to_target: true,
      why: "Both sides have it; not a wedge, but do not concede it either.",
      evidence_ids: ["ev_009", "ev_004"],
    },
    {
      feature: "Multi-location referral routing",
      ours: "no",
      theirs: "yes",
      matters_to_target: false,
      why: "Brookside has two general-practice locations, not a referral arm.",
      evidence_ids: ["ev_008"],
    },
    {
      feature: "Published per-seat pricing",
      ours: "yes",
      theirs: "partial",
      matters_to_target: true,
      why: "VetFlow stops publishing above Professional.",
      evidence_ids: ["ev_002", "ev_003"],
    },
  ],
  risk_flags: [
    {
      id: "rf_001",
      sentence_id: "s_04",
      span: "$200 per seat per month",
      category: "stale_pricing",
      severity: "medium",
      why: "This price comes from a page fetched on 2 July. Pricing pages change.",
      suggested_alternative:
        "$200 per seat per month when we last checked their pricing page in July",
      status: "pending",
    },
    {
      id: "rf_002",
      sentence_id: "s_07",
      span: "the only platform in this category",
      category: "absolute_superiority_claim",
      severity: "high",
      why: "An absolute claim about a competitor is comparative-advertising exposure.",
      suggested_alternative: "one of the few platforms we have seen",
      status: "pending",
    },
    {
      id: "rf_003",
      sentence_id: "s_07",
      span: "their product is a mess",
      category: "disparagement",
      severity: "medium",
      why: "This attacks the competitor rather than comparing to them.",
      suggested_alternative: "their product is built for a different kind of practice",
      status: "pending",
    },
    {
      id: "rf_004",
      sentence_id: "s_15",
      span: "We can go to $120 a seat",
      category: "confidential_pricing",
      severity: "high",
      why: "Internal discount floor. Forwarded to the competitor, this sets your price for them.",
      suggested_alternative: "There may be room on price for a decision this quarter",
      status: "pending",
    },
    {
      // Span does not appear in s_09 ("already uses", not "uses") — the model
      // paraphrased slightly. Drives the demoted "no longer matches" strip.
      id: "rf_005",
      sentence_id: "s_09",
      span: "integrates with everything a referral hospital uses",
      category: "unverified_competitor_claim",
      severity: "high",
      why: "Stated as fact about a competitor without evidence that supports it.",
      suggested_alternative: "integrates with several of the systems a referral hospital uses",
      status: "pending",
    },
  ],
  grounding_issues: [
    {
      sentence_id: "s_03",
      issue: "unsourced",
      detail: "No evidence is attached to this sentence.",
    },
    {
      sentence_id: "s_03",
      issue: "number_not_in_table",
      detail: "$60 does not appear in the pricing comparison.",
    },
    {
      sentence_id: "s_04",
      issue: "stale_evidence",
      detail: "ev_001 was fetched on 2 July 2026, more than 30 days ago.",
    },
    {
      sentence_id: "s_09",
      issue: "overstated",
      detail:
        "ev_004 says VetFlow offers integrations with leading lab providers. This sentence claims it integrates with everything.",
    },
    {
      sentence_id: "s_15",
      issue: "unsourced",
      detail: "No evidence is attached to this sentence.",
    },
  ],
});
