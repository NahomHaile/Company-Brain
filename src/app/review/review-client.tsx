"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ReviewCanvas } from "@/components/ReviewCanvas";
import type { Deliverable, Evidence } from "@/lib/contracts";
import { openFlagCount, wordCount } from "@/lib/review/mutate";
import { prose } from "@/lib/review/theme";

function Stat({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-[#1A1A17]/55">{children}</span>;
}

export function ReviewClient({
  initialDeliverable,
  evidence,
  draftedAt,
  cachedLabel,
}: {
  initialDeliverable: Deliverable;
  evidence: Evidence[];
  /** Pre-formatted on the server so SSR and hydration agree on the timezone. */
  draftedAt: string;
  cachedLabel: string | null;
}) {
  const [deliverable, setDeliverable] = useState(initialDeliverable);

  const openFlags = openFlagCount(deliverable);
  const gaps = deliverable.grounding_issues.length;

  return (
    <div className="min-h-full bg-[#FCFCFA]">
      <div className="mx-auto flex max-w-[76ch] flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          {cachedLabel && (
            // Honesty contract (spec 4): every cached surface says so on screen.
            <Badge
              variant="outline"
              className="w-fit border-[#B3701A]/40 bg-[#B3701A]/10 text-[#B3701A]"
            >
              {cachedLabel}
            </Badge>
          )}
          <h1
            className={`${prose.className} text-3xl leading-tight text-[#1A1A17]`}
          >
            {deliverable.subject_label}
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <Stat>Drafted {draftedAt}</Stat>
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
          onChange={setDeliverable}
          // Person B's FeatureMatrix and Person D's ExportBar slot in here.
          // Both read `deliverable`, so they see Maya's edits, not the draft.
        />
      </div>
    </div>
  );
}
