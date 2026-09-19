"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RiskFlag } from "@/lib/contracts";
import { prose, riskUnderline } from "@/lib/review/theme";

/**
 * Enum values are for the model; Maya reads English. Covers both recipes so
 * the canvas stays recipe-agnostic (spec 11.4 #6).
 */
const CATEGORY_LABEL: Record<RiskFlag["category"], string> = {
  unverified_competitor_claim: "Unverified claim about a competitor",
  disparagement: "Disparagement",
  stale_pricing: "Pricing that may be out of date",
  absolute_superiority_claim: "Absolute superiority claim",
  confidential_pricing: "Confidential pricing",
  unannounced_fundraise: "Unannounced fundraise",
  named_churned_customer: "Named churned customer",
  personnel_detail: "Personnel detail",
  legal_exposure: "Legal exposure",
  unverified_forward_claim: "Unverified forward-looking claim",
};

const SEVERITY_LABEL: Record<RiskFlag["severity"], string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export type RiskResolution = "approved" | "redacted";

/**
 * A risky span, highlighted inline in the prose rather than listed in a
 * sidebar (spec 11.4 #2). Click opens the detail; hover is left to the
 * provenance popover that wraps the sentence.
 *
 * Severity is carried by underline weight, not by colour — one hue throughout,
 * so the card does not turn into a traffic light.
 */
export function RiskFlagSpan({
  flag,
  onResolve,
  children,
}: {
  flag: RiskFlag;
  onResolve: (id: string, resolution: RiskResolution) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function resolve(resolution: RiskResolution) {
    setOpen(false);
    onResolve(flag.id, resolution);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={<span />}
        aria-label={`${SEVERITY_LABEL[flag.severity]}: ${CATEGORY_LABEL[flag.category]}`}
        // The sentence around this is a hover-provenance trigger. Without
        // this, one click would open both popovers.
        onClick={(event) => event.stopPropagation()}
        className={`cursor-pointer rounded-xs ${riskUnderline[flag.severity]} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33A4A]`}
      >
        {children}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] gap-3 border-t-2 border-t-[#A33A4A] bg-[#FCFCFA] p-4"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-[#1A1A17]">
            {CATEGORY_LABEL[flag.category]}
          </p>
          <p className="text-xs text-[#A33A4A]">
            {SEVERITY_LABEL[flag.severity]}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-[#1A1A17]/75">{flag.why}</p>

        <div className="flex flex-col gap-1.5 border-l-2 border-[#E3E2DC] pl-3">
          <p className="text-xs text-[#1A1A17]/55">Safer wording</p>
          <p
            className={`${prose.className} text-[15px] leading-relaxed text-[#1A1A17]`}
          >
            {flag.suggested_alternative}
          </p>
        </div>

        {/* Flag, never silently rewrite — Maya decides (spec 3.3). */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => resolve("redacted")}>
            Use safer wording
          </Button>
          <Button size="sm" variant="outline" onClick={() => resolve("approved")}>
            Keep as written
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
