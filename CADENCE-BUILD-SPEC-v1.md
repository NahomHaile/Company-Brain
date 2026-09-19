# Cadence — Build Spec

**Chatathon 2026 · Track 01 (Misneach) · AINU · Northeastern**
**Build sprint: Sat Sept 19, 12:45–3:45 PM ET. Repo freeze 3:45 PM ET sharp.**

> **How to use this file.** Paste it into Claude (or Claude Code) at the start of your session and say which Person you are (A/B/C/D). It contains the full product definition, data contracts, prompt library, stack, and hour-by-hour plan. You should not need to ask a teammate a question to start writing code.

---

## 0. Read this first — the constraints that shape everything

| Constraint | Value | Consequence |
|---|---|---|
| Build time | **3 hours** (12:45–3:45) | No OAuth. No real integrations. No auth system. No database migrations. |
| Team | 4 people, working in parallel | Contracts must be frozen in the first 20 minutes or people block each other. |
| Demo | **5 minutes, live** | The demo path must work offline-ish and fast. Target <20s end-to-end generation. |
| Submission | Public GitHub repo + Google Form by 3:45 | Repo must open **while signed out**. Test this in an incognito window at 3:30. |
| Track eligibility | Must name **founder persona AND bottleneck** | Both are stated in §2. Put them on screen in the demo and in the README. |
| Honesty rule | Guide requires labeling synthetic data, simulated actions, assumptions | §4 is the labeling contract. Every simulated surface renders a visible `SIMULATED` badge. |

**Hard rule:** at 3:15 PM everything stops except integration, demo rehearsal, and README. Whatever isn't wired at 3:15 gets cut and moved to the "Planned" section of the README. A working 70% demo beats a broken 100%.

---

## 1. Track fit

**Track 01 — Misneach: "Build the hire an early founder can't afford yet."**

The hire we're replacing is a **Chief of Staff / founder's associate** — the person who, at a slightly better-funded company, assembles the monthly investor update. That role costs $90–140K/yr fully loaded. A seed-stage solo founder cannot justify it, so the work falls on the founder, at the worst possible opportunity cost.

Track requirements and where we satisfy them:

- *Name the founder persona* → §2.1
- *Name the bottleneck* → §2.2
- *Show useful founder value* → §2.3
- *Credible time/cost savings* → §2.4 (with the methodology stated, not invented)
- *A workflow a non-technical founder can use* → paste-in box → answer 4 questions → review → send. No config, no schema, no setup.

---

## 2. Product definition

### 2.1 Founder persona (required for eligibility — do not change without telling the team)

> **Maya Okonkwo**, solo non-technical founder of **Thicket**, a seed-stage B2B SaaS selling scheduling software to independent veterinary clinics.
> - Raised a $1.8M seed 14 months ago. **11 investors** on the cap table (1 lead, 3 funds, 7 angels).
> - **~$41K MRR**, 6 employees, no finance hire, no chief of staff, no EA.
> - Background is veterinary operations, not engineering. Lives in Notion, Slack, Gmail, and Stripe's dashboard.
> - Committed to a monthly update in her seed docs. She has sent 9 of the last 14.

Maya is specific on purpose. Judges reward a named user. Say her name out loud in the demo.

### 2.2 The bottleneck (required for eligibility)

**The monthly investor update takes Maya 3–5 hours and she dreads it for a week beforehand.**

Break down where the hours actually go — this is the insight the whole product rests on:

| Phase | Time | What's happening |
|---|---|---|
| Recall | 60–90 min | Scrolling a month of Slack, Notion, and email trying to remember what happened. |
| Gathering | 30–45 min | Pulling MRR, churn, burn, headcount from four different places. |
| Deciding | 45–60 min | What's material? How honest do I get about the churn? |
| Writing | 45–60 min | Making it sound like a competent CEO, not a status report. |
| Second-guessing | 20–40 min | Re-reading, softening, worrying about what she shouldn't have disclosed. |

**The critical observation:** the expensive part is *recall and judgment*, not formatting. A tool that only formats notes solves the cheapest 20 minutes. Our agent has to attack recall (by ingesting raw mess), judgment (by ranking materiality and detecting gaps), and confidence (by flagging sensitive disclosures before send).

### 2.3 What Cadence does

Maya dumps everything she has — Slack copy-paste, voice-memo transcript, scratch bullets, a Stripe CSV — into one box. Cadence:

1. Shreds it into atomic, timestamped, sourced **signals**
2. Computes metrics **in code**, never in the model
3. Ranks what's material to an investor
4. Notices what's **missing** and asks her 4 pointed questions
5. Drafts headline / metrics / highlights / lowlights / asks in **her voice**
6. Flags every sensitive disclosure for her approval
7. Shows her which source line every sentence came from
8. Exports and sends

### 2.4 Value claim (state the methodology, don't inflate the number)

Say this, exactly this, in the demo:

> "Maya's last update took her four hours. In our test with the same source material, Cadence produced a reviewable draft in 90 seconds, and the founder's remaining work was editing — about 20 minutes. We're claiming roughly **3 hours saved per month**. At a $150/hr opportunity cost for a founder, that's ~$5,400/year, against a chief-of-staff hire she can't make at $90K+. The four-hour baseline is from our persona research and is labeled as an estimate, not a measured study."

Judges reward credible over impressive. Naming the estimate as an estimate is the move.

---

## 3. Non-negotiable design decisions

These three exist because they're where hackathon versions of this product usually fail. Don't relitigate them mid-sprint.

### 3.1 The model never computes a number

Deltas, percentages, MoM, runway, burn multiple — **all deterministic TypeScript**. The LLM receives a finished `MetricsTable` and may only narrate values present in it. A judge who spots "$41K, up 12%" when it's actually 9% has found your credibility hole, and you cannot recover from it in a 5-minute demo.

Enforcement: the metrics-narrative prompt gets an explicit constraint, and Person A writes a post-check that regexes every number out of the narrative and asserts membership in the table.

### 3.2 Provenance on every sentence

Every generated sentence carries the `signal_id`s it came from. This is one field in the schema and it buys you three features free:

- **Hover-to-source** in the review canvas (the single best demo moment in this product)
- **Hallucination detection** — a sentence with no signal IDs is flagged
- **Targeted redaction** — kill a signal, and every sentence derived from it is flagged for rewrite

Build this into the contract on hour one. Retrofitting it at hour two is not possible.

### 3.3 The gap interview is the product

Formatting is a demo. Asking *"You mentioned losing Northwind Veterinary — was that price, a product gap, or did your champion leave?"* is a product. That question is the thing a chief of staff does that a template does not.

The interview loop must be able to run **twice** — answers become new signals, which can reveal new gaps. In practice, show one round in the demo and mention the loop.

---

## 4. Scope boundary — the honesty contract

The guide explicitly grades on *"distinguish working features from planned ones; label synthetic data, simulated actions and assumptions."* Free points. Take them.

### ✅ Actually built and working
- Paste-in multi-source ingestion
- Signal extraction with provenance
- Deterministic metrics engine
- Materiality ranking
- Gap detection + clarifying-question interview
- Voice/style card extraction from 2 past updates
- Full section drafting (headline, metrics, highlights, lowlights, asks)
- Sensitivity flagging with owner-controlled approve/redact
- Grounding audit (unsourced-claim detection)
- Review canvas with inline editing and hover-to-source
- Export: Markdown + copy-to-clipboard + print-to-PDF

### 🟡 Simulated — must render a visible `SIMULATED` badge in the UI
- **Slack / Notion / Gmail connectors** — buttons exist, they load fixture data. The badge reads `SIMULATED CONNECTOR — loads sample data`.
- **Stripe metrics feed** — a committed CSV, labeled `SAMPLE DATA`.
- **Send** — opens a `mailto:` draft or shows a confirmation modal. We do **not** send real email. Badge: `SIMULATED SEND`.
- **All of Maya's data** is synthetic. README says so in the first paragraph.

### ❌ Explicitly not building today (say so; it reads as judgment, not failure)
Real OAuth · user accounts/auth · persistent multi-tenant DB · scheduled monthly runs · investor-side read receipts · the edit-learning loop that updates the style card over time · multi-format adapters beyond Markdown/PDF · Slack bot delivery

---

## 5. Architecture

```
  ┌─ Paste box ──┬─ "Slack" (fixture) ─┬─ "Stripe CSV" (fixture) ─┐
  └──────────────┴─────────┬───────────┴──────────────────────────┘
                           ▼
              [P1] Signal Extractor  ──► SIGNAL STORE  ◄── provenance root
                           │                  │
                           ▼                  ▼
        [P2] Metric Sniffer      DETERMINISTIC METRICS ENGINE (code)
                           │                  │
                           └────────┬─────────┘
                                    ▼
           ┌──── [P3] Materiality ──┴── [P4] Gap Detector ────┐
           │                                                   ▼
           │                                    [P5] Question Generator
           │                                                   │
           │                              ┌─ INTERVIEW LOOP ◄──┘
           │                              │  (answers → new signals → re-rank)
           ▼                              ▼
    ═══════════ PARALLEL FAN-OUT — Promise.all ═══════════
    [P7] Headline   [P8] Metrics narrative   [P9] Highlights
    [P10] Lowlights   [P11] Asks
    ══════════════════════════════════════════════════════
                                    ▼
                      [P12] Assembly & coherence pass
                                    ▼
                      [P13] De-robotify pass
                                    ▼
        ┌───────────────────────────┴──────────────────────┐
        ▼                                                  ▼
 [P14] Grounding audit                        [P6] Sensitivity flagger
        └───────────────────────────┬──────────────────────┘
                                    ▼
                      ╔═════════════════════════╗
                      ║     REVIEW CANVAS       ║  ← the product surface
                      ║  edit · approve · redact ║
                      ╚═════════════════════════╝
                                    ▼
                         Export → Markdown / PDF / mailto
```

**On "we can run it at once":** the five section prompts (P7–P11) have no dependency on each other. Fan them out with `Promise.all`. Sequential is ~45s and kills the demo; parallel is ~8–12s. The same applies to P14 and P6, which both run on the assembled draft and are independent.

**Latency budget for the live demo:** extraction 4s → ranking+gaps 4s → [interview: human time] → fan-out 10s → assembly+de-robotify 6s → audit+sensitivity 4s. **~28s of machine time.** Show a staged progress indicator naming each step; it makes the wait feel like work rather than a hang.

---

## 6. Stack

Chosen for one repo, one deploy, one language, zero setup tax. If your team is materially stronger in Python, a FastAPI + Vite alternative is noted at the end — but **decide before 12:50 and don't switch after**.

| Layer | Choice | Why this and not the obvious alternative |
|---|---|---|
| Framework | **Next.js 14+, App Router, TypeScript** | API routes and UI in one deploy. No CORS, no two-server dev setup. |
| Styling | **Tailwind + shadcn/ui** | The review canvas needs real components (popovers, badges, dialogs) and you have no time to write them. |
| LLM | **`@anthropic-ai/sdk`**, `claude-sonnet-4-6` | Sonnet for everything on the critical path. |
| Cheap calls | `claude-haiku-4-5-20251001` | Use for P2 metric sniffing and P3 materiality only if latency becomes a problem. Don't optimize prematurely. |
| Validation | **Zod** | Non-negotiable with 4 people in parallel. Every contract in §7 is a Zod schema in `lib/contracts.ts`. It's the interface between people. |
| State | **React state + a single JSON file store** | No database. `lib/store.ts` reads/writes `data/session.json`. Setting up Prisma costs 40 minutes and buys nothing in 3 hours. |
| Charts | **Recharts** | Only if time permits. Metric sparklines are garnish. |
| Markdown | `react-markdown` | Rendering the draft preview. |
| PDF | **`window.print()` + a print stylesheet** | Do not install a PDF library. A print stylesheet is 15 minutes and looks identical in a demo. |
| Send | `mailto:` link | Labeled SIMULATED SEND per §4. |
| Deploy | **Vercel** | Connect the repo, push, done. Have it deploying by 2:00 so you find env-var problems early, not at 3:40. |

```bash
npx create-next-app@latest cadence --typescript --tailwind --app --src-dir
cd cadence
npm i @anthropic-ai/sdk zod react-markdown recharts
npx shadcn@latest init
npx shadcn@latest add button card badge textarea popover dialog tabs separator skeleton
```

```
ANTHROPIC_API_KEY=sk-ant-...    # .env.local — and confirm .env.local is in .gitignore
```

> **Do this at 12:50, not at 3:40:** commit a `.env.example`, add `.env.local` to `.gitignore`, and verify no key is in git history. A leaked key in a public repo is the one mistake that's genuinely bad beyond the hackathon.

### Repo layout — agree on this before writing a line

```
src/
  app/
    page.tsx                    # D — ingest screen
    review/page.tsx             # C — review canvas
    api/
      extract/route.ts          # A — P1, P2 → signals + metrics
      analyze/route.ts          # B — P3, P4, P5 → ranking + questions
      draft/route.ts            # B — P7–P11 fan-out, P12, P13
      audit/route.ts            # C — P14, P6
      voice/route.ts            # C — P0 style card
  lib/
    contracts.ts                # ALL — Zod schemas. Frozen at 1:05.
    anthropic.ts                # A — client + callClaude() wrapper + retry
    metrics.ts                  # A — deterministic engine
    prompts/
      extract.ts  analyze.ts  draft.ts  voice.ts  audit.ts
  components/
    IngestPanel.tsx             # D
    InterviewModal.tsx          # B
    ReviewCanvas.tsx            # C
    SensitivityFlag.tsx         # C
    ProvenancePopover.tsx       # C
    ExportBar.tsx               # D
data/
  fixtures/
    maya-slack.json  maya-notes.txt  maya-stripe.csv
    maya-past-update-1.md  maya-past-update-2.md
```

---

## 7. Data contracts — freeze these by 1:05 PM

**This section is the reason four people can work at once.** Everyone codes against these shapes with fixture data and nobody waits. Person A owns the file; changes after 1:05 require announcing in the group chat.

```ts
// lib/contracts.ts
import { z } from "zod";

export const Signal = z.object({
  id: z.string(),                    // "sig_001"
  source: z.enum(["paste","slack","notion","email","voice","metrics","interview"]),
  source_label: z.string(),          // "Slack #general, Mar 12" — shown in provenance popover
  timestamp: z.string().nullable(),  // ISO, null if undateable
  raw_text: z.string(),              // VERBATIM source span. Never paraphrase here.
  summary: z.string(),               // one clause
  type: z.enum(["metric","win","loss","product","hiring","customer","risk","ask","admin"]),
  entities: z.array(z.string()),     // ["Northwind Veterinary"]
  in_period: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const Metric = z.object({
  key: z.string(),                   // "mrr"
  label: z.string(),                 // "MRR"
  value: z.number(),
  unit: z.enum(["usd","count","percent","months","ratio"]),
  prior_value: z.number().nullable(),
  delta_abs: z.number().nullable(),  // computed in code
  delta_pct: z.number().nullable(),  // computed in code
  direction: z.enum(["up","down","flat"]).nullable(),
  is_estimate: z.boolean(),          // true when founder hedged ("around 42k")
  signal_ids: z.array(z.string()),
});

export const RankedSignal = Signal.extend({
  materiality: z.number().int().min(1).max(5),
  materiality_reason: z.string(),
  bucket: z.enum(["highlight","lowlight","context","ask","drop"]),
});

export const Gap = z.object({
  id: z.string(),
  topic: z.string(),                 // "churn_reason"
  why_it_matters: z.string(),
  question: z.string(),              // the exact text shown to the founder
  priority: z.number().int().min(1).max(3),
});

export const StyleCard = z.object({
  avg_sentence_words: z.number(),
  formality: z.enum(["casual","conversational","professional","formal"]),
  uses_contractions: z.boolean(),
  uses_bullets: z.boolean(),
  hedging: z.enum(["low","medium","high"]),
  signature_phrases: z.array(z.string()),
  opener_pattern: z.string(),
  closer_pattern: z.string(),
  emoji: z.boolean(),
  notes: z.string(),
});

export const Sentence = z.object({
  id: z.string(),
  text: z.string(),
  signal_ids: z.array(z.string()),   // [] means unsourced → grounding flag
});

export const Section = z.object({
  key: z.enum(["headline","metrics","highlights","lowlights","asks"]),
  title: z.string(),
  sentences: z.array(Sentence),
});

export const SensitivityFlag_ = z.object({
  id: z.string(),
  sentence_id: z.string(),
  span: z.string(),                  // exact substring to highlight
  category: z.enum([
    "unannounced_fundraise","named_churned_customer","personnel_detail",
    "legal_exposure","nda_customer_info","competitor_disparagement",
    "unverified_forward_claim","financial_precision",
  ]),
  severity: z.enum(["low","medium","high"]),
  why: z.string(),
  suggested_alternative: z.string(),  // the redacted phrasing, pre-written
  status: z.enum(["pending","approved","redacted"]).default("pending"),
});

export const GroundingIssue = z.object({
  sentence_id: z.string(),
  issue: z.enum(["unsourced","number_not_in_table","overstated"]),
  detail: z.string(),
});

export const Draft = z.object({
  period: z.string(),                 // "March 2026"
  sections: z.array(Section),
  metrics: z.array(Metric),
  sensitivity_flags: z.array(SensitivityFlag_),
  grounding_issues: z.array(GroundingIssue),
  word_count: z.number(),
});
```

**Fixture-first rule:** before any API route works, commit `data/fixtures/` containing a hand-written valid `Signal[]`, `Metric[]`, `StyleCard`, and `Draft`. Person C builds the entire review canvas against a fixture `Draft` and never waits for Person B. This is the single highest-leverage thing you do in the first 20 minutes.

---

## 8. Prompt library

14 core + 4 stretch. Each is a separate function in `lib/prompts/`. Conventions that apply to all of them:

- System prompt carries the role and rules; user message carries the data as JSON.
- **Ask for JSON only.** "Respond with JSON only. No preamble, no markdown fences." Then strip fences defensively anyway before `JSON.parse`.
- Wrap every parse in try/catch with one retry that appends *"Your previous response was not valid JSON. Return only the JSON object."*
- Every prompt that produces prose gets the provenance rule: **every sentence must list the signal IDs it came from.**

---

### P0 · Voice profile extractor → `StyleCard`
**Owner: C · Input:** 2 past updates · **Output:** `StyleCard`

Extract a reusable style card, not a summary. A structured card beats stuffing raw past updates into every call — cheaper, more stable, and you can *render it in the UI*, which is a strong demo beat ("here's what it learned about how Maya writes").

> You analyze writing samples to build a reusable style profile. Given these past investor updates by one founder, produce a StyleCard describing HOW they write, not what they wrote. Measure average sentence length. Note formality, contraction use, whether they hedge, whether they use bullets or prose, any recurring phrases, and how they open and close. Be concrete and specific — "opens with a one-line state-of-the-business, no greeting" is useful; "professional tone" is not. JSON only.

---

### P1 · Signal extractor → `Signal[]`
**Owner: A · Input:** raw multi-source blob · **Output:** `Signal[]`

The foundation. If this is sloppy, everything downstream is.

> You shred a founder's messy raw material into atomic signals. One discrete fact per signal — never combine two facts. `raw_text` must be the VERBATIM span from the source; never paraphrase into that field. Infer timestamps where possible, null where not. Set `in_period` false for anything clearly outside the reporting month or purely forward-looking. Set `confidence` below 0.6 when the founder hedged ("I think", "around", "maybe"). Preserve the founder's own wording in `raw_text` even when it's informal or profane — a later stage handles tone. JSON only.

---

### P2 · Metric sniffer → partial `Metric[]`
**Owner: A · Input:** `Signal[]` + CSV · **Output:** raw metric claims

> Extract quantitative claims. Return metric key, value, unit, period, and whether it was stated approximately. "we're around 42k now" → `{key:"mrr", value:42000, unit:"usd", is_estimate:true}`. **Do not calculate anything** — no deltas, no percentages, no derived figures. Extraction only. JSON only.

Person A's `lib/metrics.ts` computes every delta afterward in TypeScript. See §3.1.

---

### P3 · Materiality ranker → `RankedSignal[]`
**Owner: B · Input:** `Signal[]` · **Output:** ranked + bucketed

Give it the rubric explicitly. "Rank by importance" produces noise.

> Score each signal 1–5 for investor relevance using this rubric: **5** — changes the trajectory or the risk profile (churn of a major account, a pivot, a key departure, a step-change in growth). **4** — meaningful evidence for or against the thesis. **3** — solid progress worth a line. **2** — routine operations. **1** — internal noise with no investor relevance. Then bucket: highlight / lowlight / context / ask / drop. Give a one-clause reason for each score. JSON only.

---

### P4 · Gap detector → `Gap[]`
**Owner: B · Input:** `RankedSignal[]` + last month's update · **Output:** `Gap[]`

The highest-value prompt in the product. Two jobs: coverage gaps and dropped threads.

> Compare what the founder provided against what a seed investor expects in a monthly update: revenue, burn and runway, headcount, pipeline, churn, product shipped, and the single biggest current risk. Flag anything absent or mentioned without the detail that makes it meaningful. **Then read last month's update and find commitments** — things the founder said they would do. Flag any commitment with no corresponding signal this month. Investors notice a dropped thread more than a bad number. Rank gaps 1–3 by how much the update suffers without them. JSON only.

---

### P5 · Clarifying-question generator → `Gap[]` with `question`
**Owner: B · Input:** `Gap[]` · **Output:** 3–6 questions

> Turn each gap into one question the founder can answer in a single sentence from memory. Be specific and offer the likely options. Bad: "Tell me about churn." Good: "You mentioned losing Northwind Veterinary — was that price, a missing feature, or did your champion leave?" Never ask for something already in the signals. Never ask two things in one question. Maximum six; prefer four. JSON only.

---

### P6 · Sensitivity flagger → `SensitivityFlag_[]`
**Owner: C · Input:** assembled `Draft` · **Output:** flags with spans

**Flags spans, does not rewrite.** Auto-redaction is the wrong default — the founder has to see what was caught to trust the tool. This is also the prompt that most directly answers "why can't I just use ChatGPT."

> Identify spans a founder might regret sending to eleven investors. Categories: unannounced fundraise plans; named churned or at-risk customers; personnel or performance detail about a named employee; legal exposure; customer information plausibly under NDA; disparagement of a competitor; forward-looking claims stated as fact; financial figures more precise than the founder likely intends to commit to. For each: the exact span, category, severity, a one-sentence why, and a `suggested_alternative` that preserves the meaning while removing the exposure. **Flag, never rewrite.** The owner decides. JSON only.

---

### P7 · Headline generator → 3 candidates
**Owner: B**

> Write three candidate headlines for this month's update. One line each, under 15 words. Each should state the single most important thing this month, not summarize everything. Give a one-clause rationale for each so the founder can choose. Use the founder's voice per the StyleCard. Cite signal IDs. JSON only.

Let the founder pick from three. Cheap to build, excellent demo moment.

---

### P8 · Metrics narrative → `Section`
**Owner: B**

> Write 2–3 sentences interpreting these metrics. **Hard constraint: you may not state any number that does not appear in the provided metrics table.** Do not compute new figures. Do not estimate. If a metric moved for a reason present in the signals, say the reason. If you don't know why it moved, say the movement and stop. Cite signal IDs per sentence. JSON only.

---

### P9 · Highlights writer → `Section`
**Owner: B**

> Write the highlights from signals bucketed as highlights, ranked by materiality. Each gets a "so what" — why it matters to an investor, not just that it happened. "Shipped the reminders feature" is a changelog entry; "Shipped reminders, the top request from churned accounts" is a highlight. Founder's voice per the StyleCard. No more than five. Cite signal IDs per sentence. JSON only.

---

### P10 · Lowlights writer → `Section`
**Owner: B**

The hardest prompt in the set. Models sandbag negatives, and sandbagging is exactly what destroys investor trust.

> Write the lowlights candidly. **Include at least one real lowlight** — if the signals contain nothing negative, say plainly that nothing material went wrong this month rather than manufacturing a problem. Every lowlight needs either a mitigation or an explicit "we don't know the cause yet." Do not hedge into meaninglessness; do not spiral either. The register is a competent operator stating a fact, not an apology. Founder's voice per the StyleCard. Cite signal IDs per sentence. JSON only.

---

### P11 · Asks generator → `Section`
**Owner: B**

> Mine the signals for things investors could actually help with: hiring, intros, pricing pressure, a domain question. Write 2–4 asks. **Specificity determines reply rate** — "intros to veterinary practice-management SaaS founders who've sold into corporate groups" gets replies; "intros would be helpful" gets none. Each ask names a role, a company type, or a decision. Make each one answerable in a single reply. Founder's voice. Cite signal IDs. JSON only.

---

### P12 · Assembly & coherence → `Draft`
**Owner: B**

> You have five independently drafted sections. Remove repetition across them — a fact stated in highlights should not reappear in the metrics narrative. Fix transitions so it reads as one document by one person. Enforce a 400–600 word target. **Preserve every sentence's signal IDs exactly**; if you merge two sentences, merge their ID arrays. Do not introduce new facts. JSON only.

---

### P13 · De-robotify pass → `Draft`
**Owner: C**

"Make it sound natural" does nothing. Ban specific constructions.

> Rewrite to remove machine-written tells while preserving meaning and every signal ID. Remove entirely: "delve", "it's worth noting", "that said", "at the end of the day", "navigate the landscape", "in today's fast-paced", "excited to share". Remove three-item lists that exist only for rhythm. Remove em-dash asides. Remove "not just X, but Y" constructions. Remove sentences that open by restating the section header. Break up any sentence over 30 words. Match the StyleCard's sentence length and contraction habits. **Do not add new facts and do not change any number.** JSON only.

---

### P14 · Grounding auditor → `GroundingIssue[]`
**Owner: C**

Your credibility feature. Build it early; it takes 20 minutes and it's the thing a sharp judge will probe.

> For each sentence in the draft, verify every factual claim traces to one of its cited signals. Flag: `unsourced` (claim with no supporting signal), `number_not_in_table` (a figure absent from the metrics table), `overstated` (the signal supports something weaker than the sentence claims — signal says "a few users asked", sentence says "strong demand"). Return issues only, not the whole draft. JSON only.

---

### Stretch prompts — only if you're ahead at 2:30

- **S1 · Entity resolver** — "the Acme deal" / "Acme Corp" / "that enterprise pilot" → one canonical entity. Improves sensitivity flagging.
- **S2 · Redaction rewriter** — when the founder redacts, rewrite the sentence to read naturally rather than leaving a hole.
- **S3 · Inline rewrite** — "shorter" / "more confident" / "less defensive" on a selected span, StyleCard-aware.
- **S4 · Investor-lens critic** — "You're a seed investor reading this. What three questions do you ask? What's conspicuously missing?" Renders as a pre-send checklist.

S4 is the best demo value of the four if you have 20 spare minutes.

---

## 9. Work split — 4 people in parallel

Split by **pipeline seam**, not by frontend/backend. Frontend/backend splits create one bottleneck and three people waiting.

### Person A — Ingest, signals, metrics
**Owns:** `lib/contracts.ts`, `lib/anthropic.ts`, `lib/metrics.ts`, `api/extract`, prompts P1–P2, all fixture data.

1. Write `contracts.ts` first and announce when frozen (target 1:05).
2. Hand-write `data/fixtures/` — a valid `Signal[]`, `Metric[]`, `StyleCard`, `Draft`. **Everyone else is blocked until these exist. Do them before anything else.**
3. `callClaude()` wrapper: JSON-only enforcement, fence stripping, one retry, Zod validation.
4. `lib/metrics.ts` — all deltas in TypeScript. Plus the verifier: extract every number from generated narrative text, assert each appears in the metrics table.
5. Maya's synthetic source material: a Slack export, a messy notes file, a Stripe CSV, and two past updates in a consistent voice. **Make the material realistically messy** — contradictions, hedges, a fact mentioned three ways. Clean fixtures make the demo look fake and hide the bugs.

### Person B — Intelligence and drafting
**Owns:** `api/analyze`, `api/draft`, prompts P3–P5 and P7–P12, `InterviewModal.tsx`.

1. P3 materiality against Person A's fixture signals — don't wait for the real extractor.
2. P4/P5 gap detection and the interview loop. **This is the product's differentiator; give it your best hour.**
3. Fan out P7–P11 with `Promise.all`. Sequential is a demo-killer.
4. P12 assembly. Preserve signal IDs through merges — easy to lose, painful to debug.
5. Interview modal: questions in, answers become `source:"interview"` signals, re-run ranking.

### Person C — Voice, safety, review canvas
**Owns:** `api/voice`, `api/audit`, prompts P0, P6, P13, P14, `ReviewCanvas.tsx`, `SensitivityFlag.tsx`, `ProvenancePopover.tsx`.

**The highest-leverage seat.** The review canvas *is* the product surface and it carries the whole "the founder stays in control" argument that separates you from a prompt wrapper.

1. Build the entire canvas against the fixture `Draft`. Zero dependency on B.
2. Sensitivity flags render **inline, highlighted in the text** — not in a sidebar. Click → popover with category, why, suggested alternative, and Approve / Redact buttons.
3. Hover any sentence → provenance popover showing the verbatim `raw_text` of its source signals. **This is your best five seconds of demo. Make it feel instant.**
4. Unsourced sentences get a visible warning treatment.
5. Style card rendered somewhere visible — "here's what Cadence learned about how Maya writes."
6. Inline editing on any sentence.

### Person D — Shell, export, integration, demo
**Owns:** `page.tsx`, `IngestPanel.tsx`, `ExportBar.tsx`, print stylesheet, Vercel deploy, README, demo script.

**D also owns integration** — the person who makes sure A's output actually enters B and B's actually enters C. Without a named owner this falls through and you discover it at 3:20.

1. Ingest screen: big paste box, three simulated-connector buttons with `SIMULATED` badges, file drop for CSV.
2. Staged progress indicator naming each pipeline step. Makes 28 seconds feel like work instead of a hang.
3. Export: copy-to-clipboard Markdown, print stylesheet for PDF, `mailto:` with `SIMULATED SEND` badge.
4. **Deploy to Vercel by 2:00.** Not 3:30. Env-var problems surface early or they surface fatally.
5. README: persona, bottleneck, what's real vs. simulated (copy §4 verbatim), setup instructions, AI agents used to build. Judges and the Google Form both want this.
6. From 2:45, D stops building and runs integration + rehearsal.

---

## 10. Timeline

| Time | All four | Milestone |
|---|---|---|
| **12:45–1:05** | **Together, no code.** Agree stack, read §7 aloud, A writes contracts live while others watch. | Contracts frozen |
| 1:05–1:15 | A writes fixtures. B/C/D scaffold repo, install, first commit, Vercel connected. | Everyone unblocked |
| 1:15–2:00 | Heads-down parallel against fixtures. | A: extract+metrics · B: P3–P5 · C: canvas · D: shell+deploy |
| **2:00** | **Checkpoint 1 — 5 min standup.** Anything broken in the contracts? Fix now or never. | Live URL exists |
| 2:00–2:45 | A: verifier + messier fixtures · B: fan-out drafting + assembly · C: P6/P13/P14 + flags wired · D: export + README | |
| **2:45** | **Checkpoint 2 — first end-to-end run.** It will break. That's the point of doing it now. | E2E attempted |
| 2:45–3:15 | D drives integration. A/B/C fix whatever E2E surfaced. No new features. | E2E green |
| **3:15** | **Feature freeze. Hard.** | |
| 3:15–3:30 | Rehearse the demo twice, out loud, on the deployed URL. README final. | |
| 3:30–3:40 | Open the repo in an **incognito window** and confirm it loads signed out. Confirm no API key in git history. Fill the Google Form. | |
| **3:45** | **Submit + freeze.** | |
| 4:00–4:45 | Track judging, 5-min live demo | |

Two things this timeline protects: the contract freeze before anyone codes, and a deliberately early first integration. First integration always breaks; you want it breaking with an hour left.

---

## 11. Demo script — 5 minutes

Rehearse it twice. Out loud. On the deployed URL, not localhost.

| Time | Beat |
|---|---|
| **0:00–0:35** | **Name the persona and the bottleneck.** "Maya Okonkwo runs Thicket, seed-stage, 11 investors, no chief of staff. Her monthly investor update takes four hours. Track 01 is the hire she can't afford — this is that hire." |
| 0:35–1:05 | **Show the mess.** Paste the real Slack dump and scratch notes. Let them see how ugly the input is. Click the simulated connectors, name them as simulated. |
| 1:05–1:35 | **Signals + metrics.** Signals appear with sources. "Every number here was computed in code. The model isn't allowed to do arithmetic — that's a deliberate design choice." |
| **1:35–2:20** | **The interview. Your strongest 45 seconds.** "It read everything and noticed what's *missing*." Show the Northwind churn question. Answer one live. "That's the thing a chief of staff does that a template doesn't." |
| 2:20–3:05 | **The draft.** Headline options → pick one. Scroll the update. "This is in her voice — here's the style card it built from two past updates." |
| **3:05–3:50** | **Control. The close.** Hover a sentence → provenance popover, verbatim source. Then the sensitivity flag on the named churned customer: category, why, suggested alternative, Approve / Redact. "She decides. We flag, we never silently rewrite." |
| 3:50–4:20 | Export → PDF preview → simulated send, badge visible. |
| 4:20–5:00 | **The claim, stated honestly.** §2.4 verbatim. Then: "Working today: ingestion, gap interview, drafting, flagging, grounding audit, export. Simulated and labeled: connectors and send. Not built: real OAuth, scheduling, the learning loop." |

**Anticipated judge questions:**

- *"How is this different from pasting into ChatGPT?"* → Three things ChatGPT doesn't do: it doesn't know what's *missing*, it computes numbers wrong, and it won't tell you which sentence will get you in trouble with eleven investors. Show the gap interview and a sensitivity flag as the answer.
- *"How do you know it's not hallucinating?"* → Hover a sentence. That's the grounding audit. Unsourced claims get flagged before the founder ever sees them as fact.
- *"Does it actually sound like her?"* → Show the style card, then the two source updates.
- *"What breaks at scale?"* → Honest answer: the signal store is a JSON file and there's no auth. Both are day-two problems, and we chose the three hours differently on purpose.

---

## 12. Pre-submission checklist

- [ ] Repo is **public** and opens in an **incognito window**
- [ ] **No API key in git history** — `git log -p | grep -i "sk-ant"` returns nothing
- [ ] `.env.example` committed, `.env.local` gitignored
- [ ] README states persona + bottleneck in the first paragraph
- [ ] README has the Working / Simulated / Not Built table from §4
- [ ] All synthetic data labeled as synthetic
- [ ] `SIMULATED` badges visible in the UI, not just the README
- [ ] Deployed URL works on someone else's laptop and on conference wifi
- [ ] Demo rehearsed twice end-to-end
- [ ] Google Form: team name, all four full names + Northeastern emails, track (Misneach), project title, summary, **AI agents used to build**, repo URL
- [ ] Form submitted and confirmation received
- [ ] Repo frozen by 3:45

---

## 13. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live API call fails during demo | Medium | Cache a successful full run to `data/fixtures/demo-draft.json` and add a `?demo=cached` flag. Build this at 3:00. Non-negotiable insurance. |
| Conference wifi dies | Medium | Same cached path. Have localhost working too. |
| Model returns malformed JSON | High | Retry-with-correction in `callClaude()`, Zod validation, fixture fallback. Person A, hour one. |
| Contracts drift between people | High if unmanaged | Freeze at 1:05, one owner, announce every change. |
| Fan-out rate limits | Low | Five parallel calls is fine. If it bites, serialize P10 and P11. |
| Integration discovered broken at 3:30 | **High if no owner** | Person D owns it, first E2E at 2:45. |
| Scope creep into the stretch prompts | High | 3:15 freeze. The stretch list in §8 is for the README's "Planned" section, not for today. |

---

## 14. If you'd rather use Python

Only if the team is materially stronger there, and only if decided by 12:50.

FastAPI + `anthropic` + Pydantic (mirroring §7's Zod schemas exactly) + Vite/React + Tailwind. Same contracts, same split, same timeline. Cost: two servers, CORS config, two deploys — roughly 30 minutes of overhead you don't get back. Pydantic-vs-Zod is a wash; the deployment tax is the real difference.

---

*Everything about Maya Okonkwo and Thicket in this document is synthetic and created for demonstration. The four-hour baseline is a persona-research estimate, not a measured study, and is labeled as such wherever it's claimed.*
