// Investor-update input screen — CADENCE-BUILD-SPEC.md §12.2, recipe 2
//
// OWNER: Person D.
//
// The breadth proof: same founder, same missing hire, different artifact.

import { UpdateWorkbench } from "@/components/UpdateWorkbench";
import { OUR_COMPANY } from "@/lib/demo-config";

export default function UpdatePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          The other hire {OUR_COMPANY.founder} is missing.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The monthly investor update costs her{" "}
          <b className="font-medium text-foreground">three to five hours</b> of recall and
          second-guessing across eleven investors — not because the facts are hard to find, but
          because deciding what to say about a bad month is. It is the same bottleneck as the
          battlecard wearing different clothes, so it runs on the same engine: one ingest step
          swapped, one recipe parameter changed.
        </p>
      </header>

      <UpdateWorkbench />

      <section className="border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          Every figure, Slack thread and CRM row on this page is synthetic Thicket data created for
          this demonstration. The connector buttons load fixtures and are badged as such — there is
          no Slack app, CRM integration or calendar behind them.
        </p>
      </section>
    </main>
  );
}
