// The battlecard screen — CADENCE-BUILD-SPEC.md §12.2
//
// OWNER: Person D.
//
// Four states: the two fields, the stages while it runs, an honest error, or a
// finished card. The cached run is handed in from the server on every load, so
// the wifi-insurance path is one click away even when the API is face down.

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProgressStages } from "@/components/ProgressStages";
import { ErrorPanel, ResultPanel } from "@/components/RunPanels";
import { UrlInputPanel, type UrlInputValues } from "@/components/UrlInputPanel";
import { DEMO_PAIR, type CachedRun } from "@/lib/demo-config";
import {
  initialStages,
  PipelineError,
  runPipeline,
  storeRun,
  type RunResult,
  type StageState,
} from "@/lib/pipeline-client";

type Phase = "idle" | "running" | "error" | "done";

export function BattlecardWorkbench({
  cached,
  startCached,
}: {
  cached: CachedRun;
  startCached: boolean;
}) {
  const router = useRouter();

  const cachedResult = useCallback(
    (): RunResult => ({
      deliverable: cached.deliverable,
      evidence: cached.evidence,
      price_tiers: cached.price_tiers,
      pages: [],
      source: "cached",
    }),
    [cached],
  );

  const [values, setValues] = useState<UrlInputValues>({
    targetUrl: DEMO_PAIR.target.url,
    competitorUrl: DEMO_PAIR.competitor.url,
  });
  const [phase, setPhase] = useState<Phase>(startCached ? "done" : "idle");
  const [stages, setStages] = useState<StageState[]>(initialStages);
  const [result, setResult] = useState<RunResult | null>(startCached ? cachedResult() : null);
  const [error, setError] = useState<PipelineError | Error | null>(null);

  const generate = async () => {
    setPhase("running");
    setError(null);
    setResult(null);
    setStages(initialStages());

    try {
      const run = await runPipeline({
        recipe: "battlecard",
        targetUrl: values.targetUrl,
        competitorUrl: values.competitorUrl,
        onStage: (id, status) =>
          setStages((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s))),
      });
      setResult(run);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setPhase("error");
    }
  };

  const useCached = () => {
    setResult(cachedResult());
    setError(null);
    setPhase("done");
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setError(null);
    setStages(initialStages());
  };

  const openCanvas = () => {
    if (!result) return;
    storeRun(result);
    router.push("/review");
  };

  return (
    <div className="flex flex-col gap-6">
      {phase === "idle" || phase === "running" ? (
        <Card>
          <CardHeader>
            <CardTitle>Prep a discovery call</CardTitle>
            <p className="text-sm text-muted-foreground">
              Two links and one button. That is the whole interface.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <UrlInputPanel
              values={values}
              onChange={setValues}
              onSubmit={generate}
              busy={phase === "running"}
            />
            {phase === "running" ? (
              <>
                <Separator />
                <ProgressStages stages={stages} />
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {phase === "error" && error ? (
        <ErrorPanel error={error} onRetry={generate} onUseCached={useCached} onReset={reset} />
      ) : null}

      {phase === "done" && result ? (
        <ResultPanel
          run={result}
          cachedMeta={{
            capturedAt: new Date(cached.captured_at).toLocaleTimeString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "2-digit",
            }),
            syntheticFixture: !cached.captured_from_live_run,
          }}
          onOpenCanvas={openCanvas}
          onReset={reset}
        />
      ) : null}
    </div>
  );
}
