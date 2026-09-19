# Cadence — shared task board

**Everyone edits this file. Tick your box the moment a thing works, then commit and push.**
This is how four people in parallel see each other's progress without a standup.

Conventions: `[ ]` not started · `[~]` in progress · `[x]` done and pushed · `[!]` blocked (say by what)
Only edit **your own** person's section, plus the shared gates at the top.

---

## Gates — everyone watches these

- [ ] **1:05 · CONTRACTS FROZEN** — `src/lib/contracts.ts` pushed, A announces in chat
- [ ] **1:20 · FIXTURES UP** — `data/fixtures/` has valid `evidence.json`, `pricing.json`, `battlecard.json`. B, C, D are idle until this lands.
- [ ] **2:00 · Checkpoint 1** — 5-min standup. Live Vercel URL exists. Contract problems surface now or never.
- [ ] **2:45 · Checkpoint 2** — first end-to-end run. It will break; that's why it's now.
- [ ] **3:15 · FEATURE FREEZE — HARD**
- [ ] **3:30 · Incognito repo check** + `git log -p | grep -i "sk-ant"` returns nothing
- [ ] **3:45 · Submit + freeze**

---

## Person A — Fetch, Evidence, Pricing, Fixtures

**Blocks everyone. Contracts and fixtures come before your own features.**

- [ ] `src/lib/contracts.ts` — all Zod schemas from §7 *(pre-seeded from the spec — review, correct, and announce the freeze; this file is yours alone from here)*
- [ ] `data/fixtures/evidence.json` — valid `Evidence[]`, realistically messy
- [ ] `data/fixtures/pricing.json` — valid `PriceTier[]`, include a `"Contact us"` tier with `price_amount: null`
- [ ] `data/fixtures/battlecard.json` — one complete `Deliverable`, one stale `fetched_at`
- [ ] `src/lib/anthropic.ts` — client, `callClaude()`, JSON-only enforcement, fence stripping, one retry, Zod validation
- [ ] **Verify the model ID resolves with one live call** (see CLAUDE.md — spec's `claude-sonnet-4-6` is unconfirmed)
- [ ] `src/lib/fetch-page.ts` — robots.txt check, identifying UA, cheerio extract, 1 req/sec, cache
- [ ] `src/lib/prompts/evidence.ts` — A2 evidence extractor → `Evidence[]`
- [ ] A3 pricing extractor → `PriceTier[]`
- [ ] `src/lib/pricing.ts` — deterministic comparison, **no model**
- [ ] Number verifier — regex every number out of generated narrative, assert membership in the pricing table
- [ ] `src/app/api/fetch/route.ts`
- [ ] `src/app/api/ingest/route.ts` (recipe 2)
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

- [x] `ReviewCanvas.tsx` against fixture `Deliverable` — zero dependency on B
- [x] `ProvenancePopover.tsx` — hover a sentence → verbatim `quote` + `source_url`. **Best five seconds of the demo. Make it instant.**
- [x] `RiskFlag.tsx` — inline highlight in the text, **not** a sidebar; click → category, why, suggested alternative, Approve / Redact
- [x] Unsourced sentences get a visible warning treatment
- [x] C1 de-robotify → `Deliverable`
- [x] C2 grounding auditor → `GroundingIssue[]`
- [x] C3 risk flagger → `RiskFlag[]`
- [!] `src/app/api/audit/route.ts` — run grounding + risk in parallel *(**blocked on A**: needs `src/lib/anthropic.ts` + `callClaude`. Prompts are done and pushed; the route is ~15 min once the client lands.)*
- [x] `src/app/review/page.tsx`
- [x] Inline editing on any sentence
- [ ] *(stretch, only if ahead at 2:45)* objection simulator

**C status — 2:22 PM · branch `ryan` · 27 unit tests green, typecheck clean, build clean.**

Canvas is live at `/review`. Verified end-to-end in a real browser, not just typechecked:
hover → verbatim quote + live source link · paste-sourced evidence renders no dead link ·
redact heals the sentence and the flag count drops · editing a sentence moves an orphaned
flag to a visible strip instead of deleting it · keyboard Tab+Enter opens provenance ·
**investor-update recipe renders with zero canvas changes** (tested with a real
`recipe: "investor_update"` deliverable; tables correctly disappear when empty).

Built against a C-owned edge-case sample. Swaps to `data/fixtures/battlecard.json`
automatically the moment A lands it — no code change, already tested against both.

**Three things the rest of you need:**
1. **A — `Deliverable` has no `evidence` field.** `Sentence.evidence_ids` points at records the object doesn't carry, so provenance cannot resolve from a `Deliverable` alone. This also means D's `?demo=cached` run would show **zero** provenance — the feature the demo is built on. Please add `evidence: z.array(Evidence)`. The loader already reads it when present.
2. **B — `FeatureMatrix.tsx` is yours**, but §11.4 #5 also assigns the matrix to C. The canvas leaves a `featureMatrix` slot; send me the prop signature so we don't both build a table. C renders `price_comparisons` (unassigned in the spec).
3. **Everyone — this repo is Next 16 + shadcn v4 on Base UI, not Radix.** Popover/Dialog APIs differ from what §6 assumes. Two shared-file changes, both additive and build-verified: `allowImportingTsExtensions` in `tsconfig.json`, and the agent-rules block `next dev` appends to `CLAUDE.md`.

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
