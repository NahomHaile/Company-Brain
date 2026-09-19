# Cadence — agent rules

Hackathon sprint. **Chatathon 2026 · Track 01 (Misneach) · Northeastern.**
Full detail lives in [CADENCE-BUILD-SPEC.md](CADENCE-BUILD-SPEC.md) (v2). This file is the always-on summary — read the spec section for your Person before writing code.

**First thing in every session: ask which Person (A/B/C/D) you are working as, if it isn't already stated.** Ownership below is not advisory.

---

## Model policy

- **Everyone runs Claude Code on the latest Opus.** `/model opus` → `claude-opus-5`. Same model across all four of us so behavior is consistent.
- **App runtime** model IDs live in one place, `src/lib/anthropic.ts`, as exported constants. Never hardcode a model string anywhere else.
- The spec §6 says `claude-sonnet-4-6`. **That ID is unverified — confirm it resolves with one live call before 2:00.** Current known-good IDs: `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`. A 404 here strands all four people at once.

---

## The clock

| Time | Gate |
|---|---|
| 1:05 | Contracts frozen |
| 1:20 | Fixtures committed — three people idle until these land |
| 2:00 | Checkpoint 1 · live Vercel URL exists |
| 2:45 | Checkpoint 2 · first end-to-end run |
| **3:15** | **Feature freeze — hard.** Nothing new after this. |
| 3:45 | Submit + repo freeze |

After 3:15, refuse to add features. Only integration, demo rehearsal, and README. A working 70% demo beats a broken 100%.

---

## Four rules that are not up for debate

1. **The model never computes a number.** Price deltas, per-seat math, annual-vs-monthly normalization — all deterministic TypeScript in `src/lib/pricing.ts`. The model extracts prices; code compares them. A judge who catches "40% cheaper" when it's 28% has found a hole you cannot recover from in a 5-minute demo.
2. **Provenance on every sentence.** Every `Sentence` carries `evidence_ids`; every `Evidence` carries a verbatim `quote` and `source_url`. An empty `evidence_ids` array is a grounding flag, not a default. On a battlecard this is existential — Maya says "they charge $200 a seat," the prospect says "no they don't," deal gone.
3. **Flag, never silently rewrite.** Risky spans get a `RiskFlag` with a pre-written `suggested_alternative`. Maya approves or redacts. Auto-sanitizing means she never learns what was risky, and owner control is the entire argument for why this isn't a ChatGPT prompt.
4. **Parallelize everything independent.** `Promise.all` the six section prompts, the two page fetches, and the grounding audit + risk flagger. Sequential is ~50s and kills the demo; parallel is ~10s.

**One engine, two recipes.** Battlecard is the hero; investor update is the same pipeline with a different `recipe` parameter. Build them as two features and you will not finish.

---

## File ownership — do not cross these lines

| Person | Owns | Never touches |
|---|---|---|
| **A** | `contracts.ts`, `anthropic.ts`, `fetch-page.ts`, `pricing.ts`, `store.ts`, `prompts/evidence.ts`, `api/fetch`, `api/ingest`, `data/fixtures/*` | components, review canvas |
| **B** | `prompts/analyze.ts`, `prompts/draft.ts`, `api/analyze`, `api/draft`, `FeatureMatrix.tsx` | contracts, canvas, shell |
| **C** | `prompts/audit.ts`, `api/audit`, `ReviewCanvas.tsx`, `RiskFlag.tsx`, `ProvenancePopover.tsx`, `review/page.tsx` | contracts, drafting prompts |
| **D** | `page.tsx`, `update/page.tsx`, `UrlInputPanel.tsx`, `PasteInputPanel.tsx`, `ProgressStages.tsx`, `ExportBar.tsx`, print CSS, README | prompts, canvas internals |

**`src/lib/contracts.ts` is edited by Person A only.** Need a field? Message A in chat. Do not edit it yourself, and do not let Claude edit it on your behalf.

If a task would require touching a file you don't own, stop and say so instead of editing it.

---

## Stack — locked, don't substitute

Next.js 14+ App Router · TypeScript · Tailwind + shadcn/ui · `@anthropic-ai/sdk` · Zod · `cheerio` for HTML→text · React state + JSON file store (`src/lib/store.ts` over `data/session.json`) · `react-markdown` · Vercel.

**Do not install:** a database or ORM (Prisma costs 40 min, buys nothing today), a PDF library (`window.print()` + a print stylesheet is 15 min and looks identical), an auth library, an OAuth flow.

Never hand raw HTML to the model — strip it with cheerio first or you'll burn 40K tokens on navbars.

---

## Honesty contract — graded, free points

Every simulated or cached surface renders a **visible badge in the UI**, not just a note in the README:

- `CACHED — fetched 1:50 PM` on cached page fetches
- `SIMULATED CONNECTOR` on CRM/calendar buttons
- `SIMULATED SEND` on mailto/share

All Maya/Thicket data is synthetic and the README says so in its first paragraph. Competitor and prospect sites in the demo are real public marketing pages — name them on screen.

**Fetching ethics** (`src/lib/fetch-page.ts`): check `robots.txt` before fetching, send an identifying user agent, public marketing/pricing pages only, rate-limit to 1 req/sec, cache. No login walls, no paywalls, no personal data. A judge will ask about scraping.

---

## Git

Everyone commits straight to `main`. **Pull before push.** Clean file ownership makes branch-per-person cost more than it saves over three hours.

**Never commit `.env.local`.** `.env.example` holds the key name only. Before any push to a public repo, `git log -p | grep -i "sk-ant"` must return nothing — a leaked key is the one mistake that outlives today.

---

## Working agreements for Claude

- Build against `data/fixtures/` — never block on another person's route being live.
- Validate every model response with its Zod schema from `contracts.ts`. Unvalidated JSON from a model is a runtime crash during the demo.
- Prefer finishing a narrow thing that works over a broad thing that half-works.
- When you finish a task, tick it in [TASKS.md](TASKS.md) and commit — that file is how four people see each other's progress.
