/**
 * Extraction prompts — A2 (evidence) and A3 (pricing).
 *
 * OWNER: Person A. Spec §9.5 / §9.6.
 *
 * Both of these extract. Neither infers, and neither calculates. The pricing
 * extractor in particular is under a hard no-arithmetic rule: lib/pricing.ts
 * does every comparison in TypeScript (§3.1), and a model that "helpfully"
 * normalizes an annual price here would put an uncomputed number into the
 * pipeline wearing a computed number's clothes.
 */
import { EvidenceArray, PriceTierArray } from "../contracts";
import type { Evidence, PageFetch, PriceTier } from "../contracts";
import { callClaude, MODEL_MAIN } from "../anthropic";

// ── A2 — Evidence extractor ────────────────────────────────────────────────

export const EVIDENCE_SYSTEM = `You extract atomic competitive evidence from a company's public web page. One discrete fact per item.

The \`quote\` field must be the VERBATIM span from the page — copy it character for character. Never paraphrase into it, never tidy up the grammar, never merge two sentences. A salesperson will read this quote back on a live call, and a quote that is not actually on the page loses the deal.

Classify each item's \`type\` as one of: pricing, feature, positioning, proof_point, segment, integration.

Set \`confidence\` below 0.6 when the page is vague, or when the claim is marketing language with no specifics behind it ("built for the modern practice" is not a feature). Reserve confidence above 0.9 for concrete, checkable statements.

Extract what is stated. Never infer what is not on the page. If the page does not say whether they have a feature, do not produce an item saying they lack it — say nothing.

\`entities\` lists the proper nouns in the item: company names, product names, integration partners, locations.

Populate \`summary\` with one clause describing the fact, in your own words. That field is for scanning; \`quote\` is the receipt.`;

export interface EvidenceExtractionInput {
  page: PageFetch;
  /** "target" | "competitor" | "own" — what this page is to us. */
  role: Evidence["recipe_role"];
  /** Continues numbering across pages so ids stay unique in one run. */
  startIndex: number;
}

function evidenceUser(input: EvidenceExtractionInput): string {
  const { page, role, startIndex } = input;

  const roleNote =
    role === "target"
      ? "This is the PROSPECT we are selling to. Pay attention to their size, locations, segment, the software they mention, and any operational problem they describe about themselves."
      : role === "competitor"
        ? "This is a COMPETITOR. Pay attention to pricing, tiers, named features, integrations and proof points."
        : "This is OUR OWN page. Extract our pricing, features and integrations as published.";

  return `${roleNote}

Source label: ${page.source_label}
Source URL: ${page.requested_url}
Fetched at: ${page.fetched_at ?? "unknown"}

Return a JSON array of Evidence objects. Each object has exactly these fields:
  id             — sequential, starting at "ev_${String(startIndex).padStart(3, "0")}"
  recipe_role    — "${role}"
  source         — "url"
  source_label   — "${page.source_label}"
  source_url     — "${page.requested_url}"
  quote          — the verbatim span from the page text below
  summary        — one clause, your own words
  type           — pricing | feature | positioning | proof_point | segment | integration
  entities       — array of proper nouns in this item
  confidence     — 0 to 1
  fetched_at     — ${page.fetched_at ? `"${page.fetched_at}"` : "null"}

Extract 6 to 12 items. Prefer fewer, sharper items over padding.

PAGE TEXT:
"""
${page.text}
"""`;
}

/**
 * Run A2 over one page.
 *
 * Post-validates that every quote actually appears in the page text. The
 * prompt says verbatim; this checks. Provenance is the product (§3.2), and a
 * quote the model smoothed out is a quote that isn't on the page when the
 * prospect goes looking.
 */
export async function extractEvidence(
  input: EvidenceExtractionInput,
): Promise<{ evidence: Evidence[]; dropped: string[] }> {
  const items = await callClaude({
    system: EVIDENCE_SYSTEM,
    user: evidenceUser(input),
    schema: EvidenceArray,
    maxTokens: 8000,
    model: MODEL_MAIN,
    label: `A2:evidence:${input.role}`,
  });

  const haystack = normalizeForMatch(input.page.text);
  const evidence: Evidence[] = [];
  const dropped: string[] = [];

  for (const item of items) {
    if (haystack.includes(normalizeForMatch(item.quote))) {
      evidence.push(item);
    } else {
      // Not a crash — a paraphrase that would have been presented as a quote.
      dropped.push(item.quote);
    }
  }

  return { evidence, dropped };
}

/** Whitespace and smart-quote differences shouldn't fail an honest quote. */
function normalizeForMatch(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ── A3 — Pricing extractor ─────────────────────────────────────────────────

export const PRICING_SYSTEM = `You extract published pricing tiers from a company's public pricing page, exactly as published.

For each tier: the tier name, the amount, the unit, the seat minimum, and the features listed as included.

Use null for \`price_amount\` on "Contact us", "Let's talk", "Custom pricing" or any quote-only tier. NEVER estimate a price. A null is a correct answer; a guess is not.

\`price_unit\` must be one of:
  per_seat_month — a per-user or per-seat rate quoted per month
  per_seat_year  — a per-user or per-seat rate quoted per year
  flat_month     — one price for the whole account, per month
  flat_year      — one price for the whole account, per year
  usage          — metered or consumption-based
  unknown        — quote-only, or the page does not say

Report the unit AS PUBLISHED. If the page says "$948 per user / year", that is per_seat_year with amount 948 — do not divide it by twelve. If the page says "$49 per user / month, billed annually", that is per_seat_month with amount 49 — the billing term is not the unit.

DO NOT CALCULATE ANYTHING. No comparisons between companies. No normalization between monthly and annual. No percentages. No totals. No per-seat math on a flat fee. Extraction only — every comparison in this product is computed in code, and a number you compute here would bypass that.

\`seat_minimum\` is a number only if the page states one; otherwise null.`;

export interface PricingExtractionInput {
  page: PageFetch;
  /** The company whose page this is, as it should appear in output. */
  company: string;
  /** Evidence ids already extracted from this page, for citation. */
  evidenceIds: string[];
}

function pricingUser(input: PricingExtractionInput): string {
  return `Company: ${input.company}
Source: ${input.page.source_label}

Return a JSON array of PriceTier objects. Each object has exactly these fields:
  company            — "${input.company}"
  tier_name          — as published
  price_amount       — number, or null for quote-only
  price_unit         — per_seat_month | per_seat_year | flat_month | flat_year | usage | unknown
  seat_minimum       — number, or null
  included_features  — array of strings, as the page describes them
  evidence_ids       — ids from this list that support the tier: ${
    input.evidenceIds.length ? input.evidenceIds.join(", ") : "(none available — use an empty array)"
  }

If the page lists no pricing at all, return an empty array.

PAGE TEXT:
"""
${input.page.text}
"""`;
}

/**
 * Run A3 over one page.
 *
 * The returned tiers feed lib/pricing.ts, which does every comparison. This
 * function deliberately returns raw published figures and nothing derived.
 */
export async function extractPricing(
  input: PricingExtractionInput,
): Promise<PriceTier[]> {
  return callClaude({
    system: PRICING_SYSTEM,
    user: pricingUser(input),
    schema: PriceTierArray,
    maxTokens: 4000,
    model: MODEL_MAIN,
    label: `A3:pricing:${input.company}`,
  });
}
