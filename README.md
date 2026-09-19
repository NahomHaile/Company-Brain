# Cadence

**Cadence is the sales hire an early founder can't afford yet.**

Our persona is **Maya Okonkwo**, the solo, non-technical founder of **Thicket** — a seed-stage
company selling scheduling software to independent veterinary clinics, at roughly $41K MRR with
six employees, no SDR and no sales engineer. Her bottleneck is specific and measurable: **she
takes six to nine discovery calls a week and spends 45–70 minutes preparing for each one** — five
to nine hours a week reading the prospect's site, re-reading a competitor's pricing page, and
working out what to say when that competitor comes up. That is an SDR's job, and an SDR costs
$60–70K fully loaded. Cadence does the prep in about thirty seconds and hands her something she
can actually defend on a live call.

**Maya Okonkwo and Thicket are synthetic, created for this demonstration**, as is every price and
product claim attributed to Thicket. The competitor and prospect pages used in the demo are real,
public marketing pages, named on screen. Time-savings figures are persona-research estimates, not
measured studies, and are labelled as such wherever they appear.

Built for **Chatathon 2026 · Track 01 (Misneach) · Northeastern**.

---

## The thing that actually takes the hour

The painful part of call prep is not finding information. It is *deciding what is material for
this specific prospect* and *knowing what to say when the competitor comes up*. A scraper that
dumps a feature list solves the easy fifteen minutes. So Cadence spends its effort on the pivot
points — the lines Maya says out loud when a prospect mentions a competitor — and on making every
one of them defensible.

Three design decisions follow from that, and they are the whole product:

**The model never computes a number.** Price deltas, per-seat normalisation and tier comparisons
are deterministic TypeScript in `src/lib/pricing.ts`. The model extracts prices; code compares
them. In our demo run this pays off immediately: the competitor publishes no prices at all, so
every comparison honestly reports `cheaper: "unknown"` with a caveat, instead of inventing a
percentage. A judge who catches "40% cheaper" when it is 28% has found a hole you cannot recover
from in a five-minute demo.

**Every sentence carries its sources.** Each generated sentence holds the `evidence_id`s it came
from, and each piece of evidence holds a verbatim quote plus the URL it was taken from. An empty
evidence list is a grounding flag, not a default. On a battlecard this is existential: if Maya
says "they charge $200 a seat" and the prospect says "no they don't", the deal is gone.

**We flag, we never silently rewrite.** Risky spans — absolute superiority claims, disparagement,
stale pricing — get a category, an explanation and a pre-written safer alternative. Maya approves
or redacts. Auto-sanitising would mean she never learns what was risky, and owner control is the
entire argument for why this is not a ChatGPT prompt.

## One engine, two recipes

```
INGEST → EVIDENCE (with provenance) → RANK MATERIALITY → DRAFT SECTIONS
   → ASSEMBLE → DE-ROBOTIFY → GROUND AUDIT + RISK FLAG → REVIEW CANVAS → EXPORT
```

Every box is shared. The **battlecard** ingests two URLs and drafts positioning, pricing, where we
win, where they win, pivot points and discovery questions. The **investor update** ingests pasted
notes and drafts headline, metrics, highlights, lowlights and asks. Same evidence type, same
ranking, same grounding audit, same risk flagger, same canvas, same export — one `recipe`
parameter apart.

---

## Honesty contract

### ✅ Actually working

Live URL fetch and text extraction · evidence extraction with verbatim quotes and source URLs ·
deterministic pricing comparison · differentiator ranking · full battlecard drafting · grounding
audit · risk flagging with approve/redact · review canvas with hover-to-source · Markdown and PDF
export · investor-update recipe on the same engine

### 🟡 Simulated — each renders a visible badge in the UI

- **Cached page fetches for the demo** — badge: `CACHED — fetched 1:50 PM`. Live fetch is real; we
  cache the demo pair for wifi safety.
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

## Running it

```bash
npm install
cp .env.example .env.local     # then add your ANTHROPIC_API_KEY
npm run dev
```

Open `http://localhost:3000`. Both URL fields are prefilled with the demo pair, so the whole
workflow is one click.

`.env.local` is gitignored and no key has ever been committed. Verify with:

```bash
git log -p --all | grep -E "sk-ant-[A-Za-z0-9_-]{20,}"   # must return nothing
```

Note the pattern rather than a bare `grep -i "sk-ant"`: this repo's own docs
contain that string several times, so the loose check always "finds" something and
teaches you to ignore it. The pattern above matches a real key and nothing else.

### The offline path

`http://localhost:3000/?demo=cached` renders a complete battlecard from
`data/fixtures/demo-battlecard.json` with **no API call and no network access at all** — the
fixture is imported into the bundle, not fetched. It is there because conference wifi fails and a
five-minute demo has no room to recover. The card it renders is badged `CACHED`, honestly.

### Printing

The **Print / Save as PDF** button produces a one-page pre-call sheet — that is the format,
because Maya opens it thirty seconds before a call. `ExportBar` renders the print sheet itself and
portals it to `<body>`, so the PDF is byte-identical whichever screen you print from. No PDF
library: `window.print()` plus a print stylesheet.

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
    pipeline-client.ts        # drives the routes in order; documents the seam
    demo-config.ts            # demo pair, stage names, cached-run envelope
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

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · `@anthropic-ai/sdk` · Zod for every
model response · `cheerio` for HTML→text · React state and a JSON file store · `react-markdown` ·
deployed on Vercel. No database, no ORM, no auth library, no PDF library — each of those costs
more of a three-hour build than it returns.

## AI agents used to build this

Cadence was built by four people in a three-hour sprint, each pairing with **Claude Code running
Claude Opus 5**. The build spec (`CADENCE-BUILD-SPEC.md`) and the always-on agent rules
(`CLAUDE.md`) were written first and given to every agent session, which is what let four people
work in parallel against frozen contracts without colliding: file ownership is assigned per person
in `CLAUDE.md`, and `src/lib/contracts.ts` has exactly one owner. The application itself calls the
Anthropic API for evidence extraction, drafting, grounding audit and risk flagging — never for
arithmetic.
