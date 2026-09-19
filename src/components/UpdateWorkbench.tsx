// The investor-update screen — CADENCE-BUILD-SPEC.md §12.2, recipe 2
//
// OWNER: Person D.
//
// Deliberately thin. This is the same engine with a different ingest and a
// different recipe parameter — if this file starts growing its own drafting or
// review logic, the "one engine, two recipes" claim has quietly stopped being
// true and the demo's breadth beat falls apart.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PasteInputPanel } from "@/components/PasteInputPanel";
import { ProgressStages } from "@/components/ProgressStages";
import { ErrorPanel, ResultPanel } from "@/components/RunPanels";
import {
  initialStages,
  PipelineError,
  runPipeline,
  storeRun,
  type RunResult,
  type StageState,
} from "@/lib/pipeline-client";

type Phase = "idle" | "running" | "error" | "done";

export function UpdateWorkbench() {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stages, setStages] = useState<StageState[]>(initialStages);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<PipelineError | Error | null>(null);

  const generate = async () => {
    setPhase("running");
    setError(null);
    setResult(null);
    setStages(initialStages());

    try {
      const run = await runPipeline({
        recipe: "investor_update",
        notes,
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
            <CardTitle>Draft this month&rsquo;s investor update</CardTitle>
            <p className="text-sm text-muted-foreground">
              Same pipeline as the battlecard — same extraction, same grounding audit, same review
              canvas. Only the ingest and the section list change.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <PasteInputPanel
              value={notes}
              onChange={setNotes}
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
        <ErrorPanel error={error} onRetry={generate} onReset={reset} />
      ) : null}

      {phase === "done" && result ? (
        <ResultPanel
          run={result}
          onOpenCanvas={openCanvas}
          onReset={reset}
          resetLabel="New update"
        />
      ) : null}
    </div>
  );
}
