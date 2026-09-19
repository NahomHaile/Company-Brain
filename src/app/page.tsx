// Battlecard input screen — CADENCE-BUILD-SPEC.md §12.2
//
// OWNER: Person D.
//
// Server component so ?demo=cached resolves before the first paint and the
// cached run is already in the payload. The persona and the bottleneck are named
// on screen, not just in the README — Track 01 eligibility depends on both.

import { BattlecardWorkbench } from "@/components/BattlecardWorkbench";
import { DEMO_PAIR, getCachedRun, OUR_COMPANY } from "@/lib/demo-config";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          The discovery-call prep {OUR_COMPANY.founder} does by hand, in thirty seconds.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <b className="font-medium text-foreground">{OUR_COMPANY.founder}</b> is the solo,
          non-technical founder of <b className="font-medium text-foreground">{OUR_COMPANY.name}</b>
          , seed-stage {OUR_COMPANY.what}. She takes six to nine discovery calls a week and spends{" "}
          <b className="font-medium text-foreground">45 to 70 minutes prepping each one</b> — five
          to nine hours a week of work an SDR would do, and an SDR costs $60K she does not have.
          That gap is what Cadence fills.
        </p>
      </header>

      <BattlecardWorkbench cached={getCachedRun()} startCached={demo === "cached"} />

      <section className="flex flex-col gap-2 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          <b className="font-medium text-foreground">What the demo actually fetches.</b>{" "}
          {DEMO_PAIR.target.label} (<span className="font-mono">{DEMO_PAIR.target.url}</span>) and{" "}
          {DEMO_PAIR.competitor.label} (
          <span className="font-mono">{DEMO_PAIR.competitor.url}</span>) — real, public marketing
          pages, named here so you can check them yourself.
        </p>
        <p>
          <b className="font-medium text-foreground">What is invented.</b> {OUR_COMPANY.founder},{" "}
          {OUR_COMPANY.name}, and every price and product claim attributed to{" "}
          {OUR_COMPANY.name} are synthetic, created for this demonstration.
        </p>
      </section>
    </main>
  );
}
