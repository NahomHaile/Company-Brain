# Person D — session context

*Paste this into a fresh Claude Code chat to pick up where the last one left off.*
*Written for an agent reading cold. Last updated after commit `7eb8016`.*

---

## Who I am

**I am Person D** on Cadence — Chatathon 2026, Track 01 (Misneach), Northeastern.
I own the **shell, export, integration and the demo**. Read `CLAUDE.md` for the team rules and
`CADENCE-BUILD-SPEC.md` §12 for my section. Ignore the clock in those files; we are not
working to the original three-hour timeline.

Working branch: **`person-D`**. Feature branches are `person-D/<feature-name>`.

## What I own — and what I must not touch

| I own | I never touch |
|---|---|
| `src/app/page.tsx`, `src/app/update/page.tsx`, `src/app/layout.tsx` | `src/lib/contracts.ts` — **Person A only** |
| `UrlInputPanel`, `PasteInputPanel`, `ProgressStages`, `ExportBar`, `HonestyBadge`, `RunPanels`, `BattlecardWorkbench`, `UpdateWorkbench` | `ReviewCanvas`, `RiskFlag`, `ProvenancePopover`, `src/app/review/` — Person C |
| `src/lib/demo-config.ts`, `src/lib/pipeline-client.ts`, `src/lib/battlecard-markdown.ts` | `anthropic.ts`, `fetch-page.ts`, `pricing.ts`, `store.ts`, `prompts/` — A, B, C |
| print CSS in `globals.css`, `README.md`, `data/fixtures/demo-battlecard.json` | `api/fetch`, `api/ingest` (A) · `api/analyze`, `api/draft` (B) · `api/audit` (C) |

**If a task needs a file I don't own, stop and say so** rather than editing it.

## State right now

Six commits on `person-D`, working tree clean. `npx tsc --noEmit`, `npx eslint .` and
`npx next build` all pass.

**Done:** the two-URL input screen with the persona and bottleneck named on screen · the six named
progress stages · all §4 honesty badges · the investor-update paste box with simulated
Slack/CRM/calendar connectors · Markdown export with footnoted sources · a **verified one-page**
print sheet · `mailto:` with `SIMULATED SEND` · `?demo=cached` verified working with all network
blocked · the README.

**Not done, blocked on the human:** Vercel connection and the live deploy.

**Not done, blocked on teammates:** first end-to-end integration run — see below.

## Decisions already made — do not relitigate

- **Demo pair, chosen and verified by hand.** Prospect `https://www.smalldoorvet.com/membership`,
  competitor `https://www.digitail.com/pricing`. Both return static HTML, both are allowed by
  their site's `robots.txt`, both are content-rich. Digitail **publishes no prices at all**, so
  every price comparison honestly reports `cheaper: "unknown"` with a caveat instead of a number
  a judge could catch us on. This is a feature of the demo, not a gap to fix.
- **The shell orchestrates the pipeline from the browser**, so each named stage can light up as it
  lands. The route contract is documented at the top of `src/lib/pipeline-client.ts`.
- **A finished run reaches the review canvas through `sessionStorage`**, key `cadence:run`, shaped
  `{ deliverable, evidence, price_tiers, source }`. A `Deliverable` does not fit in a query string.
- **`ExportBar` renders the print sheet itself and portals it to `<body>`.** Printing whatever is
  on screen left the hidden page behind as height and produced a blank second page. Do not go back
  to the visibility-based approach.
- **A failed run never fabricates a card.** It names the failing route and offers the cached one.
- **Model policy is unchanged: Claude, via `@anthropic-ai/sdk`.** We briefly explored swapping to
  Gemini and reverted it completely. Do not reintroduce it.

## What I'm waiting on

1. **Every API route 404s.** `api/fetch`, `api/ingest` (A), `api/analyze`, `api/draft` (B),
   `api/audit` (C) do not exist, so only the cached path can produce a card. The shell already
   handles this honestly. Point teammates at the contract in `pipeline-client.ts`.
2. **`src/app/review/page.tsx` does not exist** (Person C), so "Open the review canvas" 404s.
3. **`data/fixtures/demo-battlecard.json` is hand-written** from real verbatim quotes off both demo
   pages — it is not yet the captured output of a real run. It renders a `SYNTHETIC FIXTURE` badge
   beside `CACHED` to say so. Once the pipeline works, capture a real run into that file and flip
   `captured_from_live_run` to `true`; the extra badge then disappears on its own.
4. **Spec §6 names `claude-sonnet-4-6` and that ID is unverified** — Person A's job to confirm with
   one live call. Known-good IDs: `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`.

## How I work

- **Outline the task before starting it**, in a short readable format.
- **Commit locally with understandable messages; never push without being told.** End commit
  messages with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Verify before claiming done.** `npx tsc --noEmit` · `npx eslint .` · `npx next build`. For
  anything visual, actually drive a browser — Playwright (Python) is installed and screenshots at
  900px and 400px widths have caught real bugs.
- Tick my own section of `TASKS.md` when something lands. Only my section, plus the shared gates.

## Gotchas that have already bitten

- **`git log -p | grep -i "sk-ant"` always matches.** `CLAUDE.md`, the spec and `TASKS.md` all
  contain that literal string. Use `git log -p --all | grep -E "sk-ant-[A-Za-z0-9_-]{20,}"`, which
  matches a real key and nothing else. History is clean under the strict check.
- **`next dev` appends an agent-rules block to `CLAUDE.md`** every run. It is committed once
  already so it stops dirtying everyone's tree. Leave it alone.
- **Next 16 + React 19.** `searchParams` is a `Promise` in server components. `shadcn` components
  here are Base UI based: a `Button` rendering an `<a>` needs `nativeButton={false}`.
- **`column-fill: auto` does not columnise** a multicol box of auto height — it fills one
  full-height column. The print sheet needs `balance`.
