<div align="center">

# Cadence

**The sales hire an early founder can't afford yet.**

Two URLs in. A competitor battlecard out — in a couple of minutes, with a verbatim
receipt behind every single sentence.

**▶ Live: [https://company-brain-git-ryan-nahomhaile.vercel.app/](https://company-brain-nahomhaile.vercel.app/)** If issues, use offline with own Claude API key

`Chatathon 2026` · `Track 01 — Misneach` · `Northeastern`

</div>

---

Maya takes six to nine discovery calls a week and spends **45–70 minutes preparing for each
one**. Cadence turns that into roughly six minutes — a couple of minutes of generation she
walks away from, then a few minutes of review — and hands her something she can defend on a
live call: every claim traceable to a quote, every risky phrase flagged before she says it
out loud.

The part that matters isn't the drafting. It's that **she stays in control of every word**.

---

## The problem

Our persona is **Maya Okonkwo**, the solo, non-technical founder of **Thicket** — a seed-stage
company selling scheduling software to independent veterinary clinics, at roughly $41K MRR with
six employees, no SDR and no sales engineer. Her bottleneck is specific and measurable: five to
nine hours a week reading the prospect's site, re-reading a competitor's pricing page, and
working out what to say when that competitor comes up. That is an SDR's job, and an SDR costs
$60–70K fully loaded.

> **Maya Okonkwo and Thicket are synthetic**, created for this demonstration, as is every price
> and product claim attributed to Thicket. The competitor and prospect pages used in the demo are
> real, public marketing pages, named on screen. Time-savings figures are persona-research
> estimates, not measured studies, and are labelled as such wherever they appear.

### The thing that actually takes the hour

The painful part of call prep is not finding information. It is *deciding what is material for
this specific prospect* and *knowing what to say when the competitor comes up*. A scraper that
dumps a feature list solves the easy fifteen minutes. So Cadence spends its effort on the pivot
points — the lines Maya says out loud when a prospect mentions a competitor — and on making every
one of them defensible.

---

## Persona, bottleneck, and what it's worth

Named explicitly, because naming both is an eligibility requirement for this track.

|  |  |
|---|---|
| **Founder persona** | **Maya Okonkwo** — the solo, non-technical founder of **Thicket**, a seed-stage company selling scheduling software to independent veterinary clinics. Roughly $41K MRR, six employees, **no SDR and no sales engineer**. She sells the product herself. |
| **The bottleneck** | **Competitive call prep.** Six to nine discovery calls a week, 45–70 minutes of preparation each — reading the prospect's site, re-reading a competitor's pricing page, and deciding what to say when that competitor comes up. **Five to nine hours a week**, every week, on work that is not building the product. |

### Why this bottleneck and not another

Maya's constraint is not that she lacks information. It is that the information is scattered
across two websites and her own memory, and the part that decides whether the call goes well —
*what do I say when they bring up VetFlow?* — is the part she has to rebuild from scratch every
time. It is the highest-frequency, lowest-leverage hour in her week, it is the exact job the
hire she can't afford would do, and it is repetitive enough to be worth automating and
consequential enough that she cannot accept an unverifiable answer.

### The arithmetic

|  | Before | With Cadence |
|---|---|---|
| Per call | 45–70 min of prep | ~2 min generating (she walks away) + ~4 min reviewing |
| Per week, 6–9 calls | **5–9 hours** | **under 1 hour** |
| Reclaimed | — | **≈ 4–8 hours a week** |
| Over a year (48 weeks) | — | **≈ 200–380 hours**, or 5–9 working weeks |
| The alternative | An SDR at **$60–70K** fully loaded | API tokens — an estimated **$0.30–0.60 per battlecard** |

At six to nine cards a week that is **well under $20 a month in model spend** against a
five-figure-a-quarter hire. Even at the pessimistic end, the thing Cadence replaces costs
roughly a thousand times what running Cadence does.

### How honest are these numbers

Stated plainly, because a number you can't source is worth less than no number:

- **Measured by us.** The audit stage — de-robotify, then grounding and risk in parallel, then
  the deterministic number check — runs **~134 seconds** against the six-section fixture
  battlecard. That is a real timing off a real run, and it is why we say "a couple of minutes"
  rather than the thirty seconds an earlier draft of this README claimed.
- **Estimated from observed token volumes**, not from a metered invoice: the $0.30–0.60 per
  card. A full run is roughly 60–120K tokens across five routes.
- **Persona research, not a measured study.** The 45–70 minutes per call and the 6–9 calls per
  week. These describe Maya, who is synthetic. We have not timed a real founder.
- **Public market data.** The $60–70K fully loaded SDR cost.

The reclaimed-hours figures follow arithmetically from the persona estimates, so they inherit
that uncertainty. We would rather show the derivation than quote a single confident number.

---

## The workflow, for a founder who never opens a terminal

Maya is non-technical. The entire path is a browser, and there is no install, no API key and no
config file anywhere in it.

1. **Open the link.** <https://company-brain-git-ryan-nahomhaile.vercel.app/> — nothing to set up.
2. **Paste two URLs.** The prospect's website and the competitor's pricing page. Press
   **Generate battlecard**. (No URLs handy? **Run the demo** loads a cached pair and says so
   on screen.)
3. **Walk away for two minutes.** Six named stages light up as they finish, so she can see
   it is working rather than guessing at a spinner.
4. **Review it — this is the actual product.** The card opens with every sentence clickable.
   Click any sentence to see the verbatim quote and the source URL it came from. Sentences with
   no evidence behind them are visibly marked rather than quietly shipped.
5. **Deal with the flags.** Anything risky — an absolute claim, a stale price, a swipe at the
   competitor — is highlighted in place with a plain-English reason and a suggested rewrite.
   She **approves or redacts each one**. Cadence never silently rewrites her words.
6. **Edit anything.** Click any sentence and type. It's her card.
7. **Print or save to PDF** and take it into the call.

Step 5 is the part that makes this defensible rather than merely fast. Maya walks into the call
knowing which claims are solid, which are soft, and which she decided to cut — and *why*.

---

## Four rules the whole product is built on

**1 · The model never computes a number.**
Price deltas, per-seat normalisation and tier comparisons are deterministic TypeScript in
`src/lib/pricing.ts`. The model extracts prices; code compares them. In our demo run this pays
off immediately: the competitor publishes no prices at all, so every comparison honestly reports
`cheaper: "unknown"` with a caveat instead of inventing a percentage. A judge who catches
"40% cheaper" when it's 28% has found a hole you cannot recover from in a five-minute demo.

**2 · Provenance on every sentence.**
Each sentence carries the `evidence_id`s it came from; each piece of evidence carries a verbatim
`quote` and a `source_url`. An empty `evidence_ids` array is a grounding flag, not a default.
Hover any sentence in the canvas and the receipt appears instantly.

**3 · Flag, never silently rewrite.**
Risky spans get a `RiskFlag` with a pre-written safer alternative. Maya approves or replaces it.
Auto-sanitising would mean she never learns what was risky — and owner control is the entire
argument for why this isn't a ChatGPT prompt.

**4 · Parallelise everything independent.**
The six section prompts, the two page fetches, and the grounding audit + risk flagger all run
concurrently. Sequential is ~50s and kills the demo; parallel is ~10s. This is enforced by a
test that fails if the audit stage stops running concurrently.

---

## One engine, two recipes

```
INGEST → EVIDENCE (with provenance) → RANK MATERIALITY → DRAFT SECTIONS
   → ASSEMBLE → DE-ROBOTIFY → GROUND AUDIT + RISK FLAG → REVIEW CANVAS → EXPORT
```

Every box is shared. The **battlecard** ingests two URLs and drafts positioning, pricing, where
we win, where they win, pivot points and discovery questions. The **investor update** ingests
pasted notes and drafts headline, metrics, highlights, lowlights and asks. Same evidence type,
same ranking, same grounding audit, same risk flagger, same canvas, same export — one `recipe`
parameter apart.

The review canvas never branches on `recipe`. It iterates sections generically, so the second
recipe cost no extra canvas code at all.

---

## Quickstart

```bash
git clone https://github.com/NahomHaile/Company-Brain.git
cd Company-Brain
npm install

cp .env.example .env.local     # then add your ANTHROPIC_API_KEY
npm run dev
```

Open **`http://localhost:3000`**. Both URL fields are prefilled with the demo pair, so the whole
workflow is one click.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | 57 unit tests — no test framework installed, runs on Node's built-in runner |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

**No key? It still runs.** `/review` falls back to a complete sample battlecard and badges itself
`CACHED — sample data`, so you can explore the product surface with no API access at all.

---

## Using it

### 1 · Generate a battlecard

`/` — two URL fields, one **Generate battlecard** button. That's the entire non-technical
workflow. Named progress stages light up as each one lands: *Fetching pages → Reading evidence →
Comparing pricing → Ranking differences → Writing your card → Checking every claim.*

### 2 · Review it — this is the product

`/review` is where Maya decides whether to stake her credibility on the draft.

| Action | What happens |
|---|---|
| **Hover any sentence** | Its verbatim source quote appears instantly, with a clickable source URL and the date it was fetched |
| **Sentence with no source** | Amber dotted underline and a gutter mark — visually distinct from a risk flag, because "no receipt" and "this could expose you" are different problems |
| **Click a highlighted span** | Category in plain English, why it's risky, and a pre-written safer phrasing |
| **Use safer wording** | The span is replaced in place — the sentence visibly heals and the flag count drops |
| **Keep as written** | The flag clears, the wording stands. Maya's call, not the model's |
| **Edit any sentence** | Click ✎, type, commit with ⌘/Ctrl+Enter or blur. Escape cancels |
| **Edit away a flagged span** | The flag moves to a "no longer matches this sentence" strip. **It is never silently deleted** |

Risk severity is carried by underline weight against a single hue — `low` dotted, `medium` solid,
`high` solid with a wash — rather than three different colours, so a card with several flags
doesn't read as a traffic light.

Everything is keyboard reachable: Tab to a sentence, Enter opens its receipt.

### 3 · Export it

Copy as Markdown (sources included), or **Print / Save as PDF** for a one-page pre-call sheet —
that's the format, because Maya opens it thirty seconds before a call. No PDF library:
`window.print()` plus a print stylesheet.

What you export is what you approved. The canvas holds the reviewed copy, so Maya's edits and
redactions travel into the Markdown and the PDF — not the original draft.

### 4 · The offline path

`http://localhost:3000/?demo=cached` renders a complete battlecard from
`data/fixtures/demo-battlecard.json` with **no API call and no network access at all**. It's there
because conference wifi fails and a five-minute demo has no room to recover. The card it renders
is badged `CACHED`, honestly.

---

## The five-minute demo

1. **The problem.** Maya, 45–70 minutes a call, six to nine calls a week.
2. **One click.** Paste two URLs, hit Generate, watch the named stages land.
3. **The receipt.** Hover a pricing sentence — the competitor's verbatim line appears with its
   URL. Every sentence has one.
4. **The catch.** A sentence says "the only platform that charges over $200 a seat." It's
   highlighted. Click it: *absolute superiority claim — comparative advertising exposure.*
   Hit **Use safer wording** and watch the sentence heal.
5. **The number.** Point at the price table: the competitor is quote-only above one tier, so
   Cadence says **"Not comparable"** rather than inventing a percentage. Code computed that, not
   the model.
6. **Breadth.** Same engine, `recipe: "investor_update"` — different document, zero new canvas code.

---

## How it works

```
 ┌── Target URL ──┐   ┌── Competitor URL ──┐      [investor recipe: paste box]
 └───────┬────────┘   └─────────┬──────────┘
         └──── Promise.all ─────┘
                    ▼
      fetch-page.ts  → robots check → text extract → cache
                    ▼
      Evidence Extractor  ──►  EVIDENCE STORE  ◄── provenance root
                    │                │            (verbatim quote + URL)
                    ▼                ▼
      Pricing Extractor     PRICING ENGINE (deterministic TypeScript)
                    └────────┬───────┘
                             ▼
            Feature Matrix  →  Differentiator Ranker
                             ▼
        ══════ PARALLEL FAN-OUT — Promise.all ══════
        Positioning · Pricing · Pivot points
        Where they win · Discovery questions
        ═════════════════════════════════════════════
                             ▼
                   Assembly & coherence
                             ▼
                    De-robotify pass
                             ▼
         ┌───────────────────┴──────────────────┐
         ▼                                      ▼
   Grounding audit                        Risk flagger
         └───────────────────┬──────────────────┘
                             ▼
               ╔═══════════════════════════╗
               ║      REVIEW CANVAS        ║ ← the product surface
               ║  edit · approve · replace ║
               ╚═══════════════════════════╝
                             ▼
                Export → Markdown / PDF / mailto
```

**Latency budget:** fetch 5s (parallel) → evidence 4s → matrix + rank 4s → fan-out 10s →
assemble + de-robotify 5s → audit + flag 4s (parallel) ≈ **32s**. The staged progress indicator
turns a hang into visible work.

**Every model response is validated** against its Zod schema from `src/lib/contracts.ts` before
anything downstream touches it. Unvalidated JSON from a model is a runtime crash during a demo.

---

## Honesty contract

### ✅ Working

Live URL fetch and text extraction · evidence extraction with verbatim quotes and source URLs ·
deterministic pricing comparison · differentiator ranking · battlecard drafting · grounding
audit · risk flagging with approve/replace · review canvas with hover-to-source, inline editing
and flag demotion · Markdown and PDF export · investor-update recipe on the same engine

### 🟡 Simulated — each renders a visible badge in the UI

- **Cached page fetches for the demo** — badge: `CACHED — fetched 1:50 PM`. Live fetch is real;
  we cache the demo pair for wifi safety.
- **CRM / calendar connectors** — the buttons on the investor-update page load fixtures. Badge:
  `SIMULATED CONNECTOR`. There is no Slack app, CRM integration or calendar behind them.
- **Send / share** — `mailto:` hands a draft to your own mail client. Badge: `SIMULATED SEND`.
  Cadence sends nothing itself.
- **All Maya/Thicket data is synthetic.**
- Competitor and prospect sites in the demo are **real public marketing pages**, named on screen.

One badge is ours rather than the spec's: while `data/fixtures/demo-battlecard.json` is a
hand-written fixture rather than the captured output of a real pipeline run, the cached card also
renders `SYNTHETIC FIXTURE` next to `CACHED`. It disappears on its own when the file is replaced
by a real run and its `captured_from_live_run` flag flips.

### ❌ Not building today

Real OAuth · accounts and auth · a persistent multi-tenant database · CRM writeback · scheduled
re-runs when a competitor changes pricing · JS-rendered SPA scraping (we handle static HTML and
return an honest error otherwise) · the edit-learning loop

---

## Fetching ethics

`src/lib/fetch-page.ts` checks `robots.txt` before fetching, sends an identifying user agent,
fetches **only public marketing and pricing pages**, rate-limits to one request per second, and
caches what it retrieves. No login walls, no paywalls, no personal data. HTML is stripped to text
with `cheerio` before anything reaches the model — partly for cost, partly because a navbar is not
evidence.

Both pages in the demo pair were checked by hand before we chose them: each returns static HTML,
and each site's `robots.txt` permits the path we fetch.

| | Page | Why it's here |
|---|---|---|
| Prospect | `https://www.smalldoorvet.com/membership` | A sixteen-location veterinary practice — the kind of account Maya sells to |
| Competitor | `https://www.digitail.com/pricing` | An all-in-one veterinary practice platform that comes up on her calls |

We have no affiliation with either company. Both pages are public marketing material, fetched the
way a person with a browser would fetch them.

---

## Testing

```bash
npm test     # 57 tests
```

No test framework is installed — Node 24 strips TypeScript natively, so the suite runs on the
built-in runner with zero added dependencies. Tests cover the logic where a silent bug would be
invisible and expensive:

| Area | What's pinned down |
|---|---|
| Span matching | Overlapping risk spans, spans orphaned by an edit, redaction in place |
| Grounding | The 30-day staleness line; evidence with no timestamp is explicitly *not* stale |
| Pricing display | Every value of the `cheaper` enum, negative deltas, quote-only tiers |
| State | Redacting two flags on one sentence in sequence; resolved flags leaving the UI |
| Audit pipeline | **That grounding and risk actually run concurrently** — the test fails if they go sequential |
| Handoff | Malformed or missing run data falls back instead of blanking the page |

---

## Security

`.env.local` is gitignored and no key has ever been committed. Verify with:

```bash
git log -p --all | grep -E "sk-ant-[A-Za-z0-9_-]{20,}"   # must return nothing
```

Note the pattern rather than a bare `grep -i "sk-ant"`: this repo's own docs contain that string
several times, so the loose check always "finds" something and teaches you to ignore it. The
pattern above matches a real key and nothing else.

---

## Repo layout

```
src/
  app/
    page.tsx                  # battlecard input — two URLs, one button
    update/page.tsx           # investor-update input (recipe 2)
    review/page.tsx           # review canvas, shared by both recipes
    api/{fetch,ingest}        # fetch + evidence + pricing extraction
    api/{analyze,draft}       # matrix, ranking, section fan-out, assembly
    api/audit                 # de-robotify, grounding audit, risk flags
  lib/
    contracts.ts              # every Zod schema — the interface between all four of us
    anthropic.ts              # client, callClaude(), retry, validation
    fetch-page.ts             # robots check, fetch, cheerio, rate limit, cache
    pricing.ts                # deterministic comparison — no model
    prompts/                  # evidence, analysis, drafting, audit
    review/                   # span matching, grounding, audit pipeline, handoff
    pipeline-client.ts        # drives the routes in order; documents the seam
    battlecard-markdown.ts    # Deliverable → Markdown, sources included
  components/                 # input panels, progress stages, canvas, export, badges
data/fixtures/                # evidence, pricing, battlecard, and the cached demo run
```

### The route contract

The shell orchestrates the pipeline from the browser so each named stage can light up as it
lands. `src/lib/pipeline-client.ts` is the seam, and it documents the request and response shape
of all five routes at the top of the file. Each step also accepts a bare payload instead of the
wrapper object, so a route returning `Evidence[]` directly still works.

A finished run is handed to the review canvas through `sessionStorage` under the key
`cadence:run`, shaped `{ deliverable, evidence, price_tiers, source }` — a `Deliverable` does not
fit in a query string.

---

## Stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui on Base UI · `@anthropic-ai/sdk` · Zod
for every model response · `cheerio` for HTML→text · React state and a JSON file store ·
`react-markdown` · deployed on Vercel.

No database, no ORM, no auth library, no PDF library — each of those costs more of a three-hour
build than it returns.

---

## AI agents used to build this

Cadence was built by four people in a three-hour sprint, each pairing with **Claude Code running
Claude Opus 5**. The build spec (`CADENCE-BUILD-SPEC.md`) and the always-on agent rules
(`CLAUDE.md`) were written first and given to every agent session, which is what let four people
work in parallel against frozen contracts without colliding: file ownership is assigned per person
in `CLAUDE.md`, and `src/lib/contracts.ts` has exactly one owner.

The application itself calls the Anthropic API for evidence extraction, drafting, grounding audit
and risk flagging — **never for arithmetic**.
