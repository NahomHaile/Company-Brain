# Cadence — shared task board

**Everyone edits this file. Tick your box the moment a thing works, then commit and push.**
This is how four people in parallel see each other's progress without a standup.

Conventions: `[ ]` not started · `[~]` in progress · `[x]` done and pushed · `[!]` blocked (say by what)
Only edit **your own** person's section, plus the shared gates at the top.

---

## Gates — everyone watches these

- [x] **1:05 · CONTRACTS FROZEN** — `src/lib/contracts.ts` pushed, A announces in chat
- [x] **1:20 · FIXTURES UP** — `data/fixtures/` has valid `evidence.json`, `pricing.json`, `battlecard.json`. B, C, D are idle until this lands.
- [ ] **2:00 · Checkpoint 1** — 5-min standup. Live Vercel URL exists. Contract problems surface now or never.
- [ ] **2:45 · Checkpoint 2** — first end-to-end run. It will break; that's why it's now.
- [ ] **3:15 · FEATURE FREEZE — HARD**
- [ ] **3:30 · Incognito repo check** + `git log -p | grep -i "sk-ant"` returns nothing
- [ ] **3:45 · Submit + freeze**

---

## Person A — Fetch, Evidence, Pricing, Fixtures

**Blocks everyone. Contracts and fixtures come before your own features.**

- [x] `src/lib/contracts.ts` — all Zod schemas from §7 *(pre-seeded from the spec — review, correct, and announce the freeze; this file is yours alone from here)*
- [x] `data/fixtures/evidence.json` — valid `Evidence[]`, realistically messy
- [x] `data/fixtures/pricing.json` — valid `PriceTier[]`, include a `"Contact us"` tier with `price_amount: null`
- [x] `data/fixtures/battlecard.json` — one complete `Deliverable`, one stale `fetched_at`
- [x] `src/lib/anthropic.ts` — client, `callClaude()`, JSON-only enforcement, fence stripping, one retry, Zod validation
- [ ] **Verify the model ID resolves with one live call** (see CLAUDE.md — spec's `claude-sonnet-4-6` is unconfirmed)
- [x] `src/lib/fetch-page.ts` — robots.txt check, identifying UA, cheerio extract, 1 req/sec, cache
- [x] `src/lib/prompts/evidence.ts` — A2 evidence extractor → `Evidence[]`
- [x] A3 pricing extractor → `PriceTier[]`
- [x] `src/lib/pricing.ts` — deterministic comparison, **no model**
- [x] Number verifier — regex every number out of generated narrative, assert membership in the pricing table
- [x] `src/app/api/fetch/route.ts`
- [x] `src/app/api/ingest/route.ts` (recipe 2)
- [ ] *(stretch, only if ahead at 2:30)*

## Person B — Competitive Analysis & Drafting

**Work against A's fixtures. Do not wait for live routes.**

- [ ] B1 feature matrix → `FeatureRow[]`
- [ ] B2 differentiator ranker → `Differentiator[]`
- [ ] B3 positioning → `Section`
- [ ] B5 pivot points → `Section` *(the differentiator — give it your best hour)*
- [ ] B6 landmines / where they win → `Section`
- [ ] B4 pricing narrative → `Section` *(narrate only values already in the table)*
- [ ] B7 discovery questions → `Section`
- [ ] B9 assembly → `Deliverable` — **preserve evidence_ids through merges**
- [ ] Fan out all six section prompts with `Promise.all` — sequential is a demo-killer
- [ ] `FeatureMatrix.tsx`
- [ ] *(2:30)* investor-update recipe on the same engine

## Person C — Grounding, Risk, Review Canvas

**The canvas is the product surface. Build it entirely against `battlecard.json`.**

- [ ] `ReviewCanvas.tsx` against fixture `Deliverable` — zero dependency on B
- [ ] `ProvenancePopover.tsx` — hover a sentence → verbatim `quote` + `source_url`. **Best five seconds of the demo. Make it instant.**
- [ ] `RiskFlag.tsx` — inline highlight in the text, **not** a sidebar; click → category, why, suggested alternative, Approve / Redact
- [ ] Unsourced sentences get a visible warning treatment
- [ ] C1 de-robotify → `Deliverable`
- [ ] C2 grounding auditor → `GroundingIssue[]`
- [ ] C3 risk flagger → `RiskFlag[]`
- [ ] `src/app/api/audit/route.ts` — run grounding + risk in parallel
- [ ] `src/app/review/page.tsx`
- [ ] Inline editing on any sentence
- [ ] *(stretch, only if ahead at 2:45)*

## Person D — Shell, Export, Integration, Demo

**You own the outcome. If integration fails, the project fails, and nobody else is watching for it.**

- [x] `create-next-app`, deps, shadcn components installed
- [x] Directory tree created so nobody invents a different one
- [x] `.env.local` gitignored · `.env.example` committed
- [ ] Public GitHub repo · **all four added as collaborators** · clone URL posted in chat
- [ ] Vercel connected, placeholder deploys
- [ ] `page.tsx` — two URL inputs + one **Generate battlecard** button, prefilled with the demo pair
- [ ] `ProgressStages.tsx` — named stages: Fetching pages → Reading evidence → Comparing pricing → Ranking differences → Writing your card → Checking every claim
- [ ] Badges from §4 on every simulated/cached surface
- [ ] `update/page.tsx` paste box *(2:30; skip if behind)*
- [ ] Export: copy-to-clipboard Markdown
- [ ] Print stylesheet — **must fit one page**
- [ ] `mailto:` with `SIMULATED SEND` badge
- [ ] **(by 2:00) Vercel deploy live**
- [ ] **(3:00) Cached demo run → `data/fixtures/demo-battlecard.json` + `?demo=cached`** — wifi insurance, non-negotiable
- [ ] README: persona, bottleneck, §4 verbatim, §4.1 fetching ethics, setup, AI agents used
- [ ] *(2:45 onward)* stop building, drive integration, own the A→B and B→C handoffs
