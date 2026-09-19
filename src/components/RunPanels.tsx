// Shared run states — CADENCE-BUILD-SPEC.md §12.2
//
// OWNER: Person D.
//
// Both recipes end the same way: an honest failure, or a finished deliverable
// with its flags counted and its exports attached. One engine, two recipes —
// that applies to the shell too.

"use client";

import { AlertTriangle, ArrowRight, FileWarning, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExportBar } from "@/components/ExportBar";
import { HonestyBadge } from "@/components/HonestyBadge";
import { PipelineError, type RunResult } from "@/lib/pipeline-client";

export function ErrorPanel({
  error,
  onRetry,
  onUseCached,
  onReset,
}: {
  error: PipelineError | Error;
  onRetry: () => void;
  /** Omitted when there is no cached run for this recipe — then we say so instead. */
  onUseCached?: () => void;
  onReset: () => void;
}) {
  const pipeline = error instanceof PipelineError ? error : null;

  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          {pipeline?.notBuiltYet ? "That step isn't wired up yet" : "That run didn't finish"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {pipeline ? (
          <p className="text-xs text-muted-foreground">
            Failed at the <b className="font-medium text-foreground">{pipeline.stage}</b> stage,
            calling <code className="font-mono">{pipeline.route}</code>.
          </p>
        ) : null}
        <p className="text-sm">
          Cadence would rather stop here than hand you a card it can&rsquo;t source. Nothing was
          invented to fill the gap.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
          {onUseCached ? (
            <>
              <Button size="sm" variant="outline" onClick={onUseCached}>
                Show the cached demo card
              </Button>
              <HonestyBadge kind="cached" />
            </>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onReset}>
            Start over
          </Button>
        </div>
        {onUseCached ? null : (
          <p className="text-xs text-muted-foreground">
            There is no cached run for this recipe, so there is nothing to fall back to. The
            battlecard has one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ResultPanel({
  run,
  cachedMeta,
  onOpenCanvas,
  onReset,
  resetLabel = "New card",
}: {
  run: RunResult;
  /** Present only when this result came from the cached fixture. */
  cachedMeta?: { capturedAt: string; syntheticFixture: boolean };
  onOpenCanvas: () => void;
  onReset: () => void;
  resetLabel?: string;
}) {
  const d = run.deliverable;
  const pendingFlags = d.risk_flags.filter((f) => f.status === "pending").length;
  const unsourced = d.grounding_issues.filter((g) => g.issue === "unsourced").length;

  return (
    <Card>
      <CardHeader>
        {run.source === "cached" && cachedMeta ? (
          <div className="flex flex-wrap items-center gap-2">
            <HonestyBadge kind="cached" suffix={`fetched ${cachedMeta.capturedAt}`} />
            {cachedMeta.syntheticFixture ? <HonestyBadge kind="synthetic" /> : null}
          </div>
        ) : null}
        <CardTitle className="text-xl">{d.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{d.subject_label}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Stat value={d.sections.length} label="sections" />
          <Stat value={d.word_count} label="words" />
          <Stat value={run.evidence.length} label="sourced quotes" />
          <Stat
            value={pendingFlags}
            label="claims flagged"
            tone={pendingFlags ? "warn" : undefined}
          />
          <Stat value={unsourced} label="unsourced" tone={unsourced ? "warn" : undefined} />
        </div>

        {pendingFlags || unsourced ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Cadence flagged {pendingFlags} claim{pendingFlags === 1 ? "" : "s"} and found{" "}
              {unsourced} sentence{unsourced === 1 ? "" : "s"} with no source behind{" "}
              {unsourced === 1 ? "it" : "them"}. Nothing was rewritten — approve or redact each one
              in the review canvas.
            </span>
          </div>
        ) : null}

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            What&rsquo;s in it
          </p>
          <ul className="flex flex-col gap-1">
            {d.sections.map((s) => {
              const flags = d.risk_flags.filter((f) =>
                s.sentences.some((sen) => sen.id === f.sentence_id),
              ).length;
              return (
                <li key={s.key} className="flex items-baseline justify-between gap-4 text-sm">
                  <span>{s.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.sentences.length} point{s.sentences.length === 1 ? "" : "s"}
                    {flags ? ` · ${flags} flagged` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenCanvas}>
            Open the review canvas <ArrowRight data-icon="inline-end" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            {resetLabel}
          </Button>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <FileWarning className="mt-0.5 size-3.5 shrink-0" />
          Hover-to-source, inline editing and approve/redact live in the review canvas. The export
          below carries the sources with it.
        </p>

        <Separator />
        <ExportBar run={run} />
      </CardContent>
    </Card>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "warn" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={
          tone === "warn"
            ? "text-2xl leading-none font-semibold text-amber-600 dark:text-amber-400"
            : "text-2xl leading-none font-semibold"
        }
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
