"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ReviewCanvas } from "@/components/ReviewCanvas";
import type { Deliverable, Evidence, PriceTier } from "@/lib/contracts";
import { openFlagCount, wordCount } from "@/lib/review/mutate";
import { timeOfDay } from "@/lib/review/format";
import {
  getServerStoredRunSnapshot,
  getStoredRunSnapshot,
  subscribeToStoredRun,
} from "@/lib/review/stored-run";
import { prose } from "@/lib/review/theme";

/** Where the deliverable on screen came from. Drives the honesty badge (spec 4). */
type Origin = "live" | "cached" | "fixture";

/** Structurally Person D's RunResult, with Maya's edits applied. */
export type ReviewedRun = {
  deliverable: Deliverable;
  evidence: Evidence[];
  price_tiers: PriceTier[];
  source: "live" | "cached";
};

function Stat({ children }: { children: ReactNode }) {
  return <span className="text-xs text-[#1A1A17]/55">{children}</span>;
}

export function ReviewClient({
  initialDeliverable,
  evidence: initialEvidence,
  draftedAt,
  cachedLabel,
  exportBar,
}: {
  initialDeliverable: Deliverable;
  evidence: Evidence[];
  /** Pre-formatted on the server so SSR and hydration agree on the timezone. */
  draftedAt: string;
  cachedLabel: string | null;
  /**
   * Person D's ExportBar goes here. It is a render prop, not a node, because
   * the export must carry Maya's approvals and edits — not the draft.
   */
  exportBar?: (run: ReviewedRun) => ReactNode;
}) {
  // Person D's pipeline writes the finished run to sessionStorage and then
  // navigates here. This is a subscription to an external store, not state to
  // synchronise, so the server snapshot renders the fixture and the client
  // swaps the real run in without a hydration mismatch.
  const stored = useSyncExternalStore(
    subscribeToStoredRun,
    getStoredRunSnapshot,
    getServerStoredRunSnapshot,
  );

  // Maya's edits layer over whichever run is underneath.
  const [edits, setEdits] = useState<Deliverable | null>(null);

  const deliverable = edits ?? stored?.deliverable ?? initialDeliverable;
  const evidence = stored?.evidence ?? initialEvidence;
  const priceTiers: PriceTier[] = stored?.price_tiers ?? [];
  const origin: Origin = stored?.source ?? "fixture";
  const draftedLabel = stored
    ? timeOfDay(stored.deliverable.generated_at)
    : draftedAt;

  const openFlags = openFlagCount(deliverable);
  const gaps = deliverable.grounding_issues.length;

  // A live run is the only thing that earns no badge.
  const badge =
    origin === "live"
      ? null
      : origin === "cached"
        ? "CACHED — recorded demo run"
        : cachedLabel;

  return (
    <div className="min-h-full bg-[#FCFCFA]">
      <div className="mx-auto flex max-w-[76ch] flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          {badge && (
            <Badge
              variant="outline"
              className="w-fit border-[#B3701A]/40 bg-[#B3701A]/10 text-[#B3701A]"
            >
              {badge}
            </Badge>
          )}
          <h1
            className={`${prose.className} text-3xl leading-tight text-[#1A1A17]`}
          >
            {deliverable.subject_label}
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <Stat>Drafted {draftedLabel}</Stat>
            <Stat>{wordCount(deliverable)} words</Stat>
            <span
              className={`text-xs ${openFlags > 0 ? "text-[#A33A4A]" : "text-[#1A1A17]/55"}`}
            >
              {openFlags === 0
                ? "No open flags"
                : `${openFlags} ${openFlags === 1 ? "flag" : "flags"} to review`}
            </span>
            <span
              className={`text-xs ${gaps > 0 ? "text-[#B3701A]" : "text-[#1A1A17]/55"}`}
            >
              {gaps === 0
                ? "Every claim sourced"
                : `${gaps} ${gaps === 1 ? "claim" : "claims"} to check`}
            </span>
          </div>
        </header>

        <ReviewCanvas
          deliverable={deliverable}
          evidence={evidence}
          onChange={setEdits}
          // Person B's FeatureMatrix slots in here.
        />

        {exportBar?.({
          deliverable,
          evidence,
          price_tiers: priceTiers,
          source: origin === "live" ? "live" : "cached",
        })}
      </div>
    </div>
  );
}
