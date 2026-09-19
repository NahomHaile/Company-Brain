// Named progress stages — CADENCE-BUILD-SPEC.md §12.2
//
// OWNER: Person D.
//
// Thirty-two seconds of silence reads as a hang. Thirty-two seconds with named
// stages reads as work. The labels are also the demo narration: they say out
// loud that pricing is compared in code and that every claim gets checked.

"use client";

import { Check, CircleDashed, Loader2, X } from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/demo-config";
import type { StageState } from "@/lib/pipeline-client";
import { cn } from "cn";

export function ProgressStages({ stages }: { stages: StageState[] }) {
  const byId = new Map(stages.map((s) => [s.id, s.status]));

  return (
    <ol className="flex flex-col gap-0.5">
      {PIPELINE_STAGES.map((stage) => {
        const status = byId.get(stage.id) ?? "pending";
        return (
          <li
            key={stage.id}
            className={cn(
              "flex items-start gap-3 rounded-lg px-2 py-2 transition-colors",
              status === "active" && "bg-muted",
            )}
          >
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
              {status === "done" ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : status === "active" ? (
                <Loader2 className="size-4 animate-spin text-foreground" />
              ) : status === "failed" ? (
                <X className="size-4 text-destructive" />
              ) : (
                <CircleDashed className="size-4 text-muted-foreground/50" />
              )}
            </span>

            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm leading-none font-medium",
                  status === "pending" && "text-muted-foreground/60",
                  status === "failed" && "text-destructive",
                )}
              >
                {stage.label}
              </span>
              <span
                className={cn(
                  "text-xs leading-snug text-muted-foreground",
                  status === "pending" && "text-muted-foreground/50",
                )}
              >
                {stage.detail}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
