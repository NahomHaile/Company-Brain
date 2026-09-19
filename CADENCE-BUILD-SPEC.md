# Cadence — Build Spec v2

**Chatathon 2026 · Track 01 (Misneach) · AINU · Northeastern**
**Build sprint: Sat Sept 19, 12:45–3:45 PM ET. Repo freeze 3:45 PM ET sharp.**

> **How to use this file.** Paste it into Claude or Claude Code and say: *"I'm Person B."* Your section is self-contained — it has your files, your prompts, your inputs, your outputs, and what blocks you. You should be able to start writing code without asking a teammate anything.

---

## START HERE — 60 seconds

| You are | Read | Then go to |
|---|---|---|
| **Person A** | §0, §3, §7 | **§9** — fetch, evidence, pricing engine, fixtures |
| **Person B** | §0, §3, §7 | **§10** — competitive analysis + battlecard drafting |
| **Person C** | §0, §3, §7 | **§11** — grounding, risk flagging, review canvas |
| **Person D** | §0, §6, §7 | **§12** — repo, shell, export, integration, demo |

**Person D starts alone at 12:45** on the repo setup in §6.1 while A/B/C read §7 together. Nobody else clones until D posts the URL.

---

## 0. Constraints that shape everything

| Constraint | Value | Consequence |
|---|---|---|
| Build time | **3 hours** | No OAuth, no auth, no database, no migrations. |
| Team | 4 people **in parallel** | Contracts frozen by 1:05 or people block each other. Fixtures exist by 1:20 or three people idle. |
| Demo | **5 min live** | Hero path must finish in <35s and survive bad wifi. |
| Submission | Public repo + Google Form by 3:45 | Repo must open **signed out**. Verify in incognito at 3:30. |
| Track eligibility | Must name **persona AND bottleneck** | §1.1 and §1.2. Both on screen in the demo and in the README's first paragraph. |
| Honesty grading | Label synthetic data, simulated actions, assumptions | §4. Visible badges in the UI, not just the README. |

**Hard rule:** 3:15 PM is feature freeze. Anything unwired at 3:15 moves to the README's "Planned" section. A working 70% demo beats a broken 100% every time.

---

## 1. Track fit

Misneach judges want **raw utility, cost-efficiency, and a workflow a non-technical founder can use immediately** — a tool that legitimately replaces a specific junior hire.

### 1.1 Persona (required for eligibility — do not change)

> **Maya Okonkwo**, solo non-technical founder of **Thicket**, a seed-stage B2B SaaS selling scheduling software to independent veterinary clinics.
> - $1.8M seed 14 months ago, **~$41K MRR**, 6 employees.
> - **No SDR, no sales engineer, no chief of staff.** She runs her own pipeline.
> - Background is veterinary operations, not engineering. Lives in Notion, Slack, Gmail, and a browser with 40 tabs open.
> - Takes **6–9 discovery calls a week**.

Say her name out loud in the demo. Judges reward a named user.

### 1.2 Bottleneck — the hero (required for eligibility)

> **Maya spends 45–70 minutes preparing for every discovery call, and she takes 6–9 a week.**

Where the time actually goes:

| Phase | Time | What's happening |
|---|---|---|
| Prospect research | 15–20 min | Reading the clinic's site — how many locations, what software they mention, what they seem to care about. |
| Competitor refresh | 15–25 min | Re-reading the competitor's pricing page *again* because it changed, or because she can't remember which tier includes the API. |
| Positioning | 10–15 min | Working out what to say when they mention the competitor. Usually improvised on the call. |
| Writing it down | 5–10 min | A scratch doc she abandons halfway. |

**That's 5–9 hours a week on work an SDR would do.** An SDR costs $60–70K fully loaded. That is precisely "the hire she can't afford yet."

**The sharper observation:** the painful part isn't finding the information — it's *deciding what's material for this specific prospect* and *knowing what to say when the competitor comes up*. A scraper that dumps feature lists solves the easy 15 minutes. The pivot points are the job.

### 1.3 Second bottleneck — the breadth proof

Same founder, same missing hire, different artifact: the **monthly investor update** — 3–5 hours of recall, judgment, and second-guessing across 11 investors on her cap table.

This is the **second recipe on the same engine**, not a second product. It gets ~30 seconds at the end of the demo to prove the architecture generalizes. §2.1 explains why it's nearly free once the battlecard works.

---

## 2. One engine, two recipes

### 2.1 The shared pipeline

```
INGEST → EVIDENCE (with provenance) → RANK MATERIALITY → DRAFT SECTIONS
   → ASSEMBLE → DE-ROBOTIFY → GROUND AUDIT + RISK FLAG → REVIEW CANVAS → EXPORT
```

Every box is shared. Only two things differ between recipes:

| | **Battlecard (hero)** | **Investor update (breadth)** |
|---|---|---|
| **Ingest** | Fetch 2 URLs (target + competitor) | Paste raw notes / Slack / CSV |
| **Recipe** | positioning · pricing · we-win · they-win · pivots · discovery questions | headline · metrics · highlights · lowlights · asks |

Same `Evidence` type. Same ranking. Same drafting loop. Same grounding audit. Same risk flagger. Same canvas. Same export.

**Roughly 70% shared code.** Build them as two features and you will not finish. Build one engine with a `recipe` parameter and the second one costs about 35 minutes.

### 2.2 Value claim — state the methodology, don't inflate

Say exactly this:

> "Maya preps 6–9 discovery calls a week at roughly an hour each. Cadence produced a reviewable battlecard in 30 seconds; her remaining work was about 5 minutes of editing. We're claiming **4–6 hours saved per week**, against an SDR she can't hire at $60K+. The one-hour baseline is from our persona research and is labeled as an estimate, not a measured study."

Credible beats impressive. Naming the estimate as an estimate is what earns trust with judges.

---

## 3. Design decisions — don't relitigate mid-sprint

### 3.1 The model never computes a number

Price deltas, per-seat math, tier comparisons, annual-vs-monthly — **all deterministic TypeScript**. The model extracts prices; `lib/pricing.ts` computes every comparison. A judge who catches "40% cheaper" when it's 28% has found a hole you can't recover from in five minutes.

### 3.2 Provenance on every sentence — here it's existential

Every generated sentence carries the `evidence_id`s it came from, and every evidence item carries a **verbatim quote plus source URL**.

For an investor update, bad provenance is embarrassing. **For a battlecard it's a live-call disaster** — Maya says "your current vendor charges $200 a seat," the prospect says "no they don't," and the deal is gone. Hover-to-source is both your best demo moment and a genuine product requirement.

### 3.3 Flag, never silently rewrite

Competitor claims carry real legal exposure (comparative advertising). Cadence flags risky spans and proposes alternatives; **Maya approves or redacts**. Auto-sanitizing means she never learns what was risky. Owner control is the whole argument for why this isn't a ChatGPT prompt.

### 3.4 Run everything you can in parallel

Six section prompts have no dependency on each other. `Promise.all` them. Sequential is ~50s and kills the demo; parallel is ~10s. Same for the two page fetches, and for the grounding audit and risk flagger, which both run on the assembled draft independently.

---

## 4. Honesty contract

The guide explicitly grades *"distinguish working features from planned ones; label synthetic data, simulated actions and assumptions."* Free points.

**✅ Actually working**
Live URL fetch and text extraction · evidence extraction with verbatim quotes + source URLs · deterministic pricing comparison · differentiator ranking · full battlecard drafting · grounding audit · risk flagging with approve/redact · review canvas with hover-to-source · Markdown + PDF export · investor-update recipe on the same engine

**🟡 Simulated — must render a visible badge**
- **Cached page fetches for demo** — badge: `CACHED — fetched 1:50 PM`. Live fetch is real; we cache the demo pair for wifi safety.
- **CRM / calendar connectors** — buttons load fixtures. Badge: `SIMULATED CONNECTOR`.
- **Send / share** — `mailto:` or a confirmation modal. Badge: `SIMULATED SEND`.
- **All Maya/Thicket data is synthetic.** README says so in the first paragraph.
- Competitor and prospect sites in the demo are **real public marketing pages**; name them on screen.

**❌ Not building today** — say this out loud; it reads as judgment
Real OAuth · accounts/auth · persistent multi-tenant DB · CRM writeback · scheduled re-runs when a competitor changes pricing · JS-rendered SPA scraping (we handle static HTML) · the edit-learning loop

### 4.1 Fetching ethics — 3 lines of code, real credibility

`lib/fetch-page.ts` must: check `robots.txt` before fetching, send an identifying user agent, fetch **only public marketing and pricing pages**, rate-limit to one request per second, and cache. No login walls, no paywalls, no personal data. Put this in the README. When a judge asks about scraping — and one will — you have an answer instead of a shrug.

---

## 5. Architecture

```
 ┌── Target URL ──┐   ┌── Competitor URL ──┐        [investor recipe: paste box]
 └───────┬────────┘   └─────────┬──────────┘
         └──── Promise.all ─────┘
                    ▼
      [A1] fetch-page.ts  → robots check → text extract → cache
                    ▼
      [A2] Evidence Extractor  ──► EVIDENCE STORE ◄── provenance root
                    │                    │             (verbatim quote + URL)
                    ▼                    ▼
      [A3] Pricing Extractor    PRICING ENGINE (deterministic code)
                    └──────────┬─────────┘
                               ▼
              [B1] Feature Matrix  →  [B2] Differentiator Ranker
                               ▼
        ══════ PARALLEL FAN-OUT — Promise.all ══════
        [B3] Positioning   [B4] Pricing narrative
        [B5] Pivot points  [B6] Where they win
        [B7] Discovery questions
        ═════════════════════════════════════════════
                               ▼
                  [B9] Assembly & coherence
                               ▼
                  [C1] De-robotify pass
                               ▼
         ┌─────────────────────┴──────────────────┐
         ▼                                        ▼
  [C2] Grounding audit                   [C3] Risk flagger
         └─────────────────────┬──────────────────┘
                               ▼
                 ╔═══════════════════════════╗
                 ║      REVIEW CANVAS        ║ ← the product surface
                 ║ edit · approve · redact   ║
                 ╚═══════════════════════════╝
                               ▼
                  Export → Markdown / PDF / mailto
```

**Latency budget:** fetch 5s (parallel) → evidence 4s → matrix+rank 4s → fan-out 10s → assemble+de-robotify 5s → audit+flag 4s (parallel) ≈ **32s**. Show a staged progress indicator naming each step. It turns a hang into visible work.

---

## 6. Stack

One repo, one language, one deploy, zero setup tax.

| Layer | Choice | Why not the alternative |
|---|---|---|
| Framework | **Next.js 14+, App Router, TypeScript** | Server-side fetch without CORS pain. API routes and UI in one deploy. |
| Styling | **Tailwind + shadcn/ui** | The canvas needs popovers, badges, dialogs. No time to write them. |
| LLM | **`@anthropic-ai/sdk`**, `claude-sonnet-4-6` | Sonnet everywhere on the critical path. |
| Cheap calls | `claude-haiku-4-5-20251001` | Only for A2 evidence extraction if latency bites. Don't optimize early. |
| Validation | **Zod** | Non-negotiable with 4 people. §7 schemas *are* the interface between you. |
| HTML → text | **`cheerio`** | Strip nav/script/style, keep main content. Never hand raw HTML to the model — you'll burn 40K tokens on navbars. |
| State | **React state + JSON file store** | No DB. `lib/store.ts` over `data/session.json`. Prisma costs 40 min and buys nothing today. |
| Markdown | `react-markdown` | Draft preview. |
| PDF | **`window.print()` + print stylesheet** | Do not install a PDF library. 15 minutes, looks identical in a demo. |
| Deploy | **Vercel** | Deploying by 2:00, not 3:30. |

```bash
npx create-next-app@latest cadence --typescript --tailwind --app --src-dir
cd cadence
npm i @anthropic-ai/sdk zod cheerio react-markdown
npx shadcn@latest init
npx shadcn@latest add button card badge textarea popover dialog tabs separator skeleton input
```

### 6.1 Repo setup — Person D, alone, 12:45–12:55

**One person does this.** Four people running `create-next-app` against one origin is a merge disaster.

1. `create-next-app` locally
2. Create the **public** GitHub repo, add all four as collaborators
3. Verify `.env.local` is gitignored; commit `.env.example` with `ANTHROPIC_API_KEY=`
4. Run **all** installs and shadcn adds above — before anyone clones, or four people resolve the same `package-lock.json`
5. Create the empty directory tree below so nobody invents a different one
6. Push to `main`, connect Vercel, confirm the placeholder deploys
7. **Post the clone URL in the group chat**

**Branching:** everyone commits straight to `main`. Pull before push. With 3 hours and clean file ownership (§8), branch-per-person costs more in merge overhead than it saves. One exception: `lib/contracts.ts` is edited by **Person A only**.

```
src/
  app/
    page.tsx                      # D — battlecard input screen
    update/page.tsx               # D — investor update input (recipe 2)
    review/page.tsx               # C — review canvas (shared by both recipes)
    api/
      fetch/route.ts              # A — URL fetch + evidence + pricing
      ingest/route.ts             # A — paste ingest (recipe 2)
      analyze/route.ts            # B — matrix + differentiator ranking
      draft/route.ts              # B — fan-out, assembly
      audit/route.ts              # C — de-robotify, grounding, risk
  lib/
    contracts.ts                  # A ONLY — frozen 1:05
    anthropic.ts                  # A — client + callClaude() + retry
    fetch-page.ts                 # A — robots, fetch, cheerio, cache
    pricing.ts                    # A — deterministic comparison
    store.ts                      # A
    prompts/
      evidence.ts                 # A
      analyze.ts  draft.ts        # B
      audit.ts                    # C
  components/
    UrlInputPanel.tsx             # D
    PasteInputPanel.tsx           # D
    ProgressStages.tsx            # D
    ExportBar.tsx                 # D
    ReviewCanvas.tsx              # C
    RiskFlag.tsx                  # C
    ProvenancePopover.tsx         # C
    FeatureMatrix.tsx             # B
data/
  fixtures/
    evidence.json  pricing.json  battlecard.json  update.json
    cached-target.html  cached-competitor.html
    maya-notes.txt  maya-past-update.md
```

**At 12:50, before anything else:** `git log -p | grep -i "sk-ant"` must return nothing. A leaked key in a public repo is the one mistake that's genuinely bad beyond today.

---

## 7. Contracts — frozen at 1:05

**This section is why four people can work at once.** Everyone codes against these shapes using fixture data. Nobody waits. Person A owns the file; changes after 1:05 get announced in chat.

```ts
// lib/contracts.ts
import { z } from "zod";

export const Recipe = z.enum(["battlecard", "investor_update"]);

/** One atomic fact, from anywhere, with a verbatim receipt. Shared by both recipes. */
export const Evidence = z.object({
  id: z.string(),                       // "ev_001"
  recipe_role: z.enum(["target","competitor","own","founder_input"]),
  source: z.enum(["url","paste","slack","csv","interview"]),
  source_label: z.string(),             // "acmevet.com/pricing" | "Slack #general Mar 12"
  source_url: z.string().nullable(),
  quote: z.string(),                    // VERBATIM span. Never paraphrase into this field.
  summary: z.string(),                  // one clause
  type: z.enum([
    "pricing","feature","positioning","proof_point","segment","integration",
    "metric","win","loss","risk","ask","admin",
  ]),
  entities: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  fetched_at: z.string().nullable(),    // ISO — staleness matters for competitor pages
});

export const PriceTier = z.object({
  company: z.string(),
  tier_name: z.string(),
  price_amount: z.number().nullable(),  // null = "Contact us"
  price_unit: z.enum(["per_seat_month","per_seat_year","flat_month","flat_year","usage","unknown"]),
  seat_minimum: z.number().nullable(),
  included_features: z.array(z.string()),
  evidence_ids: z.array(z.string()),
});

/** Every field below is computed in TypeScript. The model never fills these. */
export const PriceComparison = z.object({
  our_tier: z.string(),
  their_tier: z.string(),
  normalized_monthly_per_seat_ours: z.number().nullable(),
  normalized_monthly_per_seat_theirs: z.number().nullable(),
  delta_abs: z.number().nullable(),
  delta_pct: z.number().nullable(),
  cheaper: z.enum(["ours","theirs","equal","unknown"]),
  caveat: z.string().nullable(),        // "their pricing is quote-only above 10 seats"
});

export const FeatureRow = z.object({
  feature: z.string(),
  ours: z.enum(["yes","no","partial","unknown"]),
  theirs: z.enum(["yes","no","partial","unknown"]),
  matters_to_target: z.boolean(),
  why: z.string(),
  evidence_ids: z.array(z.string()),
});

export const Differentiator = z.object({
  id: z.string(),
  claim: z.string(),
  direction: z.enum(["we_win","they_win","parity"]),
  materiality: z.number().int().min(1).max(5),
  materiality_reason: z.string(),
  evidence_ids: z.array(z.string()),
});

export const Sentence = z.object({
  id: z.string(),
  text: z.string(),
  evidence_ids: z.array(z.string()),    // [] → grounding flag
});

export const Section = z.object({
  key: z.string(),                      // battlecard: positioning|pricing|we_win|they_win|pivots|questions
  title: z.string(),                    // update: headline|metrics|highlights|lowlights|asks
  sentences: z.array(Sentence),
});

export const RiskFlag = z.object({
  id: z.string(),
  sentence_id: z.string(),
  span: z.string(),                     // exact substring to highlight
  category: z.enum([
    // battlecard
    "unverified_competitor_claim","disparagement","stale_pricing",
    "absolute_superiority_claim","confidential_pricing",
    // investor update
    "unannounced_fundraise","named_churned_customer","personnel_detail",
    "legal_exposure","unverified_forward_claim",
  ]),
  severity: z.enum(["low","medium","high"]),
  why: z.string(),
  suggested_alternative: z.string(),    // pre-written safe phrasing
  status: z.enum(["pending","approved","redacted"]).default("pending"),
});

export const GroundingIssue = z.object({
  sentence_id: z.string(),
  issue: z.enum(["unsourced","number_not_in_table","overstated","stale_evidence"]),
  detail: z.string(),
});

export const Deliverable = z.object({
  recipe: Recipe,
  title: z.string(),
  subject_label: z.string(),            // "Thicket vs. VetFlow — for Brookside Animal Hospital"
  sections: z.array(Section),
  price_comparisons: z.array(PriceComparison),
  feature_matrix: z.array(FeatureRow),
  risk_flags: z.array(RiskFlag),
  grounding_issues: z.array(GroundingIssue),
  generated_at: z.string(),
  word_count: z.number(),
});
```

### 7.1 Fixture-first — the highest-leverage 15 minutes of the day

Before any API route works, Person A commits hand-written **valid** `Evidence[]`, `PriceTier[]`, and a complete `Deliverable` to `data/fixtures/`.

Person C then builds the entire review canvas against fixture `battlecard.json` and never waits for Person B. Person D builds export against the same file. This is what makes four-way parallelism real instead of theoretical.

**Make the fixtures realistically messy** — a "Contact us" tier with no price, a feature the competitor describes in different words than you do, one stale `fetched_at`. Clean fixtures make the demo look fake and hide the bugs you'd rather find at 1:30 than 3:20.

---

## 8. File ownership — zero collisions

| Person | Owns exclusively | Never touches |
|---|---|---|
| **A** | `contracts.ts`, `anthropic.ts`, `fetch-page.ts`, `pricing.ts`, `store.ts`, `prompts/evidence.ts`, `api/fetch`, `api/ingest`, `data/fixtures/*` | components, review canvas |
| **B** | `prompts/analyze.ts`, `prompts/draft.ts`, `api/analyze`, `api/draft`, `FeatureMatrix.tsx` | contracts, canvas, shell |
| **C** | `prompts/audit.ts`, `api/audit`, `ReviewCanvas.tsx`, `RiskFlag.tsx`, `ProvenancePopover.tsx`, `review/page.tsx` | contracts, drafting prompts |
| **D** | `page.tsx`, `update/page.tsx`, `UrlInputPanel.tsx`, `PasteInputPanel.tsx`, `ProgressStages.tsx`, `ExportBar.tsx`, print CSS, README | prompts, canvas internals |

`lib/contracts.ts` is edited by **A only**. Need a field? Message A. Don't edit it yourself.

---

## 9. PERSON A — Fetch, Evidence, Pricing, Fixtures

**Blocked by:** nothing. **You block:** everyone. Do §9.1 and §9.2 before anything else.

### 9.1 (12:55–1:05) Write `lib/contracts.ts`
Copy §7 verbatim. Post **"CONTRACTS FROZEN"** in chat.

### 9.2 (1:05–1:20) Write the fixtures — three people are idle until these land
`evidence.json`, `pricing.json`, `battlecard.json`, `update.json`, plus two cached HTML pages. Hand-write them. Make them messy per §7.1. Post **"FIXTURES UP"** in chat.

### 9.3 `lib/anthropic.ts`

```ts
export async function callClaude<T>(opts: {
  system: string; user: string; schema: z.ZodType<T>; maxTokens?: number;
}): Promise<T>
```

JSON-only enforcement, strip ```` ```json ```` fences defensively, `JSON.parse`, Zod validate. On failure, **one** retry appending *"Your previous response was not valid JSON. Return only the JSON object."* Then throw. Everyone depends on this being solid.

### 9.4 `lib/fetch-page.ts`

1. Check `robots.txt`; if disallowed, return a clean refusal object the UI can render
2. Fetch with identifying user agent, 10s timeout
3. `cheerio`: strip `script`, `style`, `nav`, `footer`, `svg`; keep `main`/`article`/body text
4. Collapse whitespace, cap at ~15K chars
5. Cache to `data/cache/<hash>.json` with `fetched_at`
6. On any failure, fall back to cached demo HTML and set a `cached: true` flag the UI badges

Handle the SPA case: if extracted text is under 200 chars, return `{ error: "js_rendered" }` and let the UI say so honestly. Do not fake it.

### 9.5 Prompt A2 — Evidence extractor → `Evidence[]`

> You extract atomic competitive evidence from a company's public web page. One discrete fact per item. The `quote` field must be the VERBATIM span from the page — never paraphrase into it; a salesperson will rely on this on a live call and a wrong quote loses the deal. Classify each as pricing, feature, positioning, proof_point, segment, or integration. Set `confidence` below 0.6 when the page is vague or the claim is marketing language without specifics. Extract what is stated; never infer what is not on the page. JSON only, no preamble, no fences.

### 9.6 Prompt A3 — Pricing extractor → `PriceTier[]`

> Extract the pricing tiers exactly as published. For each: tier name, amount, unit, seat minimum, included features. Use null for "Contact us" or quote-only tiers — **never estimate a price**. **Do not calculate anything**: no comparisons, no normalization, no annual-to-monthly conversion, no percentages. Extraction only. JSON only.

### 9.7 `lib/pricing.ts` — deterministic, no model

Normalize everything to monthly-per-seat in TypeScript. Compute `delta_abs`, `delta_pct`, `cheaper`. Emit a `caveat` string whenever normalization required an assumption (annualized, seat minimum applied, quote-only tier).

**Also write the verifier** — your credibility feature: regex every number out of generated narrative text and assert each appears in the `PriceComparison` set. Export `verifyNumbers(text, comparisons): string[]` for Person C's audit route.

### 9.8 Stretch if ahead at 2:30
Entity resolver — "the Acme deal" / "Acme Corp" / "that pilot" → one canonical entity. Improves risk-flagging accuracy.

---

## 10. PERSON B — Competitive Analysis & Drafting

**Blocked by:** fixtures (1:20). Start writing prompts at 1:05 against the §7 shapes.
**You block:** nothing critical — C and D work off fixtures.

**Deepest prompt seat.** §10.4 (pivots) and §10.5 (landmines) are what separate this from a scraper. Give them your best hour.

### 10.1 Prompt B1 — Feature matrix → `FeatureRow[]`

> Align features across two companies into one comparison. The hard part: the same capability is described in different words on each site — "automated reminders" and "patient recall messaging" may be the same thing. Judge by function, not label. Mark `unknown` when a page is silent rather than guessing `no` — a false "they don't have it" is worse than an admitted gap. **Then, using the target prospect's own page**, set `matters_to_target` and say why. A feature this prospect doesn't care about is noise. JSON only.

### 10.2 Prompt B2 — Differentiator ranker → `Differentiator[]`

Give the rubric explicitly; "rank by importance" produces mush.

> Score each difference 1–5 for how much it should shape this specific sales conversation. **5** — likely decides the deal for this prospect given their stated segment and priorities. **4** — a strong talking point they'll care about. **3** — worth a mention. **2** — true but generic. **1** — noise. Mark direction: we_win, they_win, parity. **Include the they_win items** — a battlecard listing only strengths gets a founder ambushed on a call. One-clause reason each. JSON only.

### 10.3 Prompt B3 — Positioning → `Section`

> Write 2–3 sentences on how to position against this competitor **for this specific prospect**. Not a generic pitch — reference what the prospect's own site reveals about their size, segment, and priorities. Plain spoken language a founder can say out loud on a call. Cite evidence IDs per sentence. JSON only.

### 10.4 Prompt B5 — Pivot points → `Section`

**The single most valuable prompt in the product.**

> Write conversational pivots in strict "when they say X, you say Y" form. X must be something the prospect would plausibly say on a call — an objection, a mention of the competitor, a feature question. Y must be short enough to say out loud without reading, and **grounded in the evidence**, never invented. Write speech, not marketing copy. Bad: "emphasize our superior integration ecosystem." Good: "If they mention VetFlow's API — theirs is add-on-only above the Pro tier. Ask which systems they need to connect, then show ours is included at every tier." 4–6 pivots. Cite evidence IDs. JSON only.

### 10.5 Prompt B6 — Landmines / where they win → `Section`

> Write where the competitor is genuinely stronger and what to say when it comes up. **Include at least one real landmine** — if the evidence genuinely shows no competitor advantage, say so plainly rather than manufacturing one, but that's rare and you should look harder first. Each gets an honest response strategy: acknowledge, reframe, or concede and redirect. Never suggest the founder deny a true competitor advantage. The register is a confident operator who's done the homework, not a defensive one. Cite evidence IDs. JSON only.

### 10.6 Prompt B4 — Pricing narrative → `Section`

> Write 2–3 sentences interpreting the pricing comparison. **Hard constraint: you may not state any number that does not appear in the provided PriceComparison table.** Do not compute, convert, or estimate. Where a `caveat` exists, surface it — an unqualified price claim that turns out to depend on an annual commitment is worse than no claim. Cite evidence IDs. JSON only.

### 10.7 Prompt B7 — Discovery questions → `Section`

> Write 5–7 questions for the call, derived from what this prospect's page reveals and from gaps in what we know. Each must be open-ended, answerable in one breath, and **diagnostic** — the answer should change how the founder pitches. Prefer questions that surface which differentiator matters. Avoid anything answerable from their website. Cite evidence IDs where a question is prompted by specific evidence. JSON only.

### 10.8 Prompt B9 — Assembly → `Deliverable`

> You have several independently drafted sections. Remove cross-section repetition — a point made in pivots shouldn't restate the positioning paragraph. Fix transitions. Target 350–550 words; a battlecard is scanned in 90 seconds before a call, not read. **Preserve every sentence's evidence IDs exactly**; merging two sentences means merging their ID arrays. Introduce no new facts. JSON only.

### 10.9 (2:30) Investor-update recipe

Once battlecard drafting works, the second recipe is a new section list and five prompts of the same shape:

- **Headline** — 3 candidates with rationale, founder picks
- **Metrics narrative** — same no-new-numbers constraint as B4
- **Highlights** — each needs a "so what," not a changelog line
- **Lowlights** — at least one real one, each with a mitigation or an explicit "cause unknown"
- **Asks** — specific enough to answer in one reply; name a role or company type, never "intros would be helpful"

Reuse B9 for assembly. **If you're behind at 2:30, skip this entirely.** The battlecard is the hero; breadth is a bonus.

---

## 11. PERSON C — Grounding, Risk, Review Canvas

**Blocked by:** fixtures (1:20) — then nothing, ever. Build everything against `battlecard.json`.

**Highest-leverage seat.** The canvas *is* the product surface and it carries the entire "the founder stays in control" argument that separates you from a prompt wrapper. §11.4 is your best five seconds of demo.

### 11.1 Prompt C1 — De-robotify → `Deliverable`

"Sound natural" does nothing. Ban specific constructions.

> Rewrite to remove machine-written tells while preserving meaning and every evidence ID. Remove entirely: "delve", "it's worth noting", "that said", "at the end of the day", "navigate the landscape", "robust", "seamless", "leverage" as a verb, "in today's". Remove three-item lists that exist only for rhythm. Remove em-dash asides. Remove "not just X, but Y". Remove sentences that open by restating their section header. Break any sentence over 30 words. This is language a founder says out loud on a call — short, plain, specific. **Add no new facts and change no number.** JSON only.

### 11.2 Prompt C2 — Grounding auditor → `GroundingIssue[]`

Build this early. 25 minutes, and it's what a sharp judge will probe.

> For each sentence, verify every factual claim traces to one of its cited evidence items. Flag: `unsourced` — a claim with no supporting evidence. `number_not_in_table` — a figure absent from the pricing comparison. `overstated` — evidence supports something weaker than claimed (evidence says "offers integrations", sentence says "integrates with everything"). `stale_evidence` — the claim rests on evidence fetched more than 30 days ago, which matters because competitor pricing pages change. Return issues only. JSON only.

Chain Person A's `verifyNumbers()` after this as a deterministic second pass.

### 11.3 Prompt C3 — Risk flagger → `RiskFlag[]`

> Identify spans that could expose the founder if said on a recorded call or forwarded to the competitor. Categories: `unverified_competitor_claim` (stated as fact without evidence); `disparagement` (attacks the competitor rather than comparing); `stale_pricing` (a price claim from evidence older than 30 days — being wrong on a call is worse than saying "last I checked"); `absolute_superiority_claim` ("the only", "the best", "nobody else" — comparative advertising exposure); `confidential_pricing` (our internal discounting or margin). For each: exact span, category, severity, one-sentence why, and a `suggested_alternative` that keeps the point while removing the exposure. **Flag, never rewrite. The founder decides.** JSON only.

### 11.4 Review canvas — spend your time here

1. **Hover any sentence → provenance popover** with the verbatim `quote` and a clickable `source_url`. Make it feel instant. This is the demo moment.
2. **Risk flags render inline, highlighted in the text** — not in a sidebar. Click → popover with category, why, suggested alternative, and **Approve / Redact**.
3. Unsourced sentences get a visible warning treatment, distinct from risk flags.
4. Inline editing on any sentence.
5. Feature matrix as a real table, with `matters_to_target` rows visually promoted.
6. **Recipe-agnostic** — it renders any `Deliverable`, so the investor update works with zero extra canvas code.

### 11.5 Stretch if ahead at 2:45
**Objection simulator.** "You are this prospect. Push back on the pitch." One prompt, one dialog, demos beautifully. Best stretch item on the board.

---

## 12. PERSON D — Shell, Export, Integration, Demo

**Blocked by:** nothing. **You own the outcome.** If integration fails, the project fails, and nobody else is watching for it.

### 12.1 (12:45–12:55) Repo setup per §6.1, alone

### 12.2 (12:55–1:45) Shell
- `page.tsx`: two URL inputs (target, competitor), one **Generate battlecard** button. That's the entire non-technical workflow — say that in the demo.
- Prefill both fields with the demo pair so a judge can hit Generate instantly.
- `ProgressStages.tsx`: named stages — *Fetching pages → Reading evidence → Comparing pricing → Ranking differences → Writing your card → Checking every claim*. Makes 32 seconds feel like work.
- `update/page.tsx`: paste box for recipe 2 (build at 2:30; skip if behind).
- Badges from §4 wherever a simulated or cached surface appears.

### 12.3 (1:45–2:30) Export
Copy-to-clipboard Markdown, print stylesheet for PDF (**must fit one page** — it's read before a call), `mailto:` with `SIMULATED SEND` badge.

### 12.4 (by 2:00) Vercel deploy
Not 3:30. Env-var problems surface early or they surface fatally.

### 12.5 (3:00) The insurance — do not skip
Cache one successful full run to `data/fixtures/demo-battlecard.json`. Add `?demo=cached` that renders it with no API call. **This is your defense against conference wifi.** Non-negotiable.

### 12.6 (2:45 onward) Stop building. Integrate.
Drive the first end-to-end run. Own the handoffs A→B and B→C. Write the README: persona, bottleneck, §4 verbatim, §4.1 fetching ethics, setup, AI agents used to build.

---

## 13. Timeline

| Time | What | Gate |
|---|---|---|
| **12:45–12:55** | D: repo setup alone. A/B/C: read §7 together, out loud. | |
| 12:55–1:05 | A writes `contracts.ts` live. B/C/D clone, install, first commit. | **CONTRACTS FROZEN** |
| 1:05–1:20 | **A writes fixtures.** B drafts prompts on paper. C scaffolds canvas. D builds shell. | **FIXTURES UP** |
| 1:20–2:00 | Full parallel. Everyone against fixtures. | Live Vercel URL |
| **2:00** | **Checkpoint 1 — 5 min standup.** Contract problems surface now or never. | |
| 2:00–2:45 | A: verifier + messier fixtures · B: fan-out + assembly · C: audit + flags wired · D: export + README | |
| **2:45** | **Checkpoint 2 — first end-to-end run. It will break. That's why it's now.** | E2E attempted |
| 2:45–3:15 | D drives integration. A/B/C fix what E2E surfaced. **No new features.** | E2E green |
| **3:15** | **Feature freeze. Hard.** | |
| 3:15–3:30 | Rehearse twice, out loud, on the deployed URL. README final. Cached demo verified. | |
| 3:30–3:40 | **Incognito repo check.** Key-in-history check. Google Form. | |
| **3:45** | **Submit + freeze.** | |
| 4:00–4:45 | Track judging — 5-min live demo | |

Two things this protects: contracts frozen before anyone codes, and a deliberately early first integration. First integration always breaks; you want it breaking with an hour left.

---

## 14. Demo script — 5 minutes

Rehearse twice, out loud, on the deployed URL. Not localhost.

| Time | Beat |
|---|---|
| **0:00–0:35** | **Persona and bottleneck, by name.** "Maya Okonkwo runs Thicket, seed-stage, solo. She takes 6–9 discovery calls a week and spends about an hour prepping each. An SDR costs $60K. Track 01 is the hire she can't afford — this is that hire." |
| 0:35–1:00 | **The whole workflow, on screen.** Two URL fields. One button. "That's the entire interface. She's non-technical; there's nothing to configure." Hit Generate. |
| 1:00–1:30 | **Narrate the stages while it runs.** "It's fetching both pages, extracting claims with verbatim quotes, and comparing pricing **in code** — the model isn't allowed to do arithmetic. That's deliberate." |
| **1:30–2:30** | **The card. Go straight to pivot points.** Read one aloud. "This is the part that actually takes her an hour — knowing what to say when the competitor comes up. Not the feature list." Then a **landmine**: "It also tells her where she loses. That's what gets a founder ambushed on a call." |
| **2:30–3:20** | **Control — the close.** Hover a sentence → verbatim quote + source URL. "Every claim traces to a line on their actual page. If she says a wrong number on a live call, she loses the deal." Then a risk flag on an absolute-superiority claim: category, why, suggested alternative, **Approve / Redact**. "We flag. She decides. We never silently rewrite." |
| 3:20–3:50 | Export → one-page PDF. "This is what she opens 30 seconds before the call." |
| **3:50–4:20** | **Breadth, briefly.** Switch to the investor update. "Same engine, different recipe — her other missing hire. Same extraction, same grounding, same canvas." Don't linger. |
| 4:20–5:00 | **The claim, honestly.** §2.2 verbatim. Then: "Working: fetch, extraction, pricing engine, drafting, grounding audit, risk flagging, export, both recipes. Simulated and labeled: cached fetches for wifi safety, send. Not built: OAuth, CRM writeback, JS-rendered sites." |

**Expected questions:**

- *"Why not paste both URLs into ChatGPT?"* → Three things it won't do: it gets the price math wrong, it can't show the source line for a claim she's about to say on a live call, and it won't warn her that "we're the only platform that…" is a legal exposure. Show a provenance hover and a risk flag as the answer.
- *"How do you know it's not hallucinating competitor features?"* → Hover. Grounding audit. `unknown` over guessed `no` — we'd rather admit a gap than hand her a false claim.
- *"What about sites that block scraping?"* → §4.1: robots.txt, identifying agent, public marketing pages only, rate limited. JS-rendered SPAs return an honest error rather than a fabricated card.
- *"What breaks at scale?"* → Honest: JSON file store, no auth, no re-run when a competitor changes pricing. All day-two. We spent three hours on the part that decides whether a founder trusts it on a live call.

---

## 15. Pre-submission checklist

- [ ] Repo **public** and opens in an **incognito window**
- [ ] `git log -p | grep -i "sk-ant"` returns nothing
- [ ] `.env.example` committed, `.env.local` gitignored
- [ ] README opens with persona + bottleneck
- [ ] README has the Working / Simulated / Not Built table from §4
- [ ] README has the fetching-ethics paragraph from §4.1
- [ ] `SIMULATED` and `CACHED` badges visible in the UI, not just the README
- [ ] `?demo=cached` verified working with wifi off
- [ ] Deployed URL works on someone else's laptop
- [ ] Demo rehearsed twice end-to-end, out loud
- [ ] Google Form: team name, four full names + Northeastern emails, track (**Misneach**), project title, summary, **AI agents used to build**, repo URL
- [ ] Form submitted, confirmation received
- [ ] Repo frozen by 3:45

---

## 16. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Target site blocks fetch or is JS-rendered** | **High** | Pick and verify the demo URL pair **by 1:30**. Test the actual fetch early. Cached fallback + honest error state. |
| Live API fails during demo | Medium | `?demo=cached` (§12.5). Build it at 3:00. |
| Conference wifi dies | Medium | Same cached path. Keep localhost running as backup. |
| Malformed JSON from model | High | Retry-with-correction in `callClaude()`, Zod validation, fixture fallback. Person A, hour one. |
| Contracts drift | High if unmanaged | Frozen 1:05, A owns the file, announce every change. |
| Integration broken at 3:30 | **High with no owner** | Person D owns it. First E2E at 2:45. |
| Scope creep into recipe 2 | **High — your real risk** | Battlecard is the hero. If it isn't green at 2:30, drop the investor update entirely and say so in the README. |
| Fan-out rate limits | Low | Five parallel calls is fine. If it bites, serialize B6 and B7. |

**Choose the demo URL pair by 1:30 and verify the fetch works.** A blocked or JS-rendered competitor site discovered at 3:00 is the failure mode most likely to actually happen to you.

---

*Maya Okonkwo and Thicket are synthetic and created for demonstration. Time-savings baselines are persona-research estimates, not measured studies, and are labeled as such wherever claimed. Any real company pages used in the demo are public marketing pages, fetched per §4.1.*
