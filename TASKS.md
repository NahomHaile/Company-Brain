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
- [x] `ProvenancePopover.tsx` — hover a sentence → verbatim `quote` + `source_url`
- [x] `RiskFlag.tsx` — inline highlight in the text, **not** a sidebar
- [x] Unsourced sentences get a visible warning treatment
- [x] C1 de-robotify → `Deliverable`
- [x] C2 grounding auditor → `GroundingIssue[]`
- [x] C3 risk flagger → `RiskFlag[]`
- [x] **Audit pipeline** — C1 → `Promise.all([C2, C3])` → `verifyNumbers`, fully tested
- [~] `src/app/api/audit/route.ts` — ~10-line shim, waiting on A's branch to be mergeable
- [x] `src/app/review/page.tsx`
- [x] Inline editing on any sentence
- [ ] *(stretch)* objection simulator

**C status — 2:41 PM · branch `ryan` · 47 tests, lint, typecheck, build all clean.**

Canvas live at `/review`, verified end-to-end in a browser. **Tested against A's real
fixtures on `origin/person-a`** — 6 sections, 25 sentences, 20 evidence, 4 flags,
3 price rows. Parses, renders, no dangling evidence ids, every flag span matches.

A's branch isn't mergeable yet, so the audit pipeline takes `callClaude` and
`verifyNumbers` as **injected parameters** typed against A's real signatures. It is
built and tested now; `route.ts` is a ten-line shim the moment `lib/anthropic` lands:

```ts
const audited = await runAudit({
  deliverable, evidence,
  callClaude,      // from @/lib/anthropic
  verifyNumbers,   // from @/lib/pricing
});
return NextResponse.json(audited);
```

**Still needed from the rest of you:**
1. **A — `Deliverable` still has no `evidence` field**, and `battlecard.json` doesn't embed it. Provenance works today because C falls back to `evidence.json`, but **D's `?demo=cached` single-file run will show zero receipts**. One line: `evidence: z.array(Evidence)`.
2. **A — `battlecard.json` says `word_count: 612`; the card has 599 words.** C now recomputes on load rather than trusting the field, so the UI is right either way, but the fixture literal is still wrong.
3. **B — send the `<FeatureMatrix />` prop signature.** Canvas has the slot. C renders `price_comparisons` (unassigned in the spec).
4. **D — read the reviewed deliverable from C's state, not the draft.** `RiskFlag.status` records the decision but not its effect on the text, so C holds the final copy. One shared CACHED badge component, please.
5. **Everyone — Next 16 + shadcn v4 on Base UI, not Radix.** A's `MODEL_MAIN` is `claude-sonnet-5`, so the spec's unverified `claude-sonnet-4-6` is settled.

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
