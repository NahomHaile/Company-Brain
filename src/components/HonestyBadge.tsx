// Honesty badges — CADENCE-BUILD-SPEC.md §4
//
// OWNER: Person D. Free to use anywhere, including the review canvas.
//
// The rule from §4: every simulated or cached surface renders a visible badge in
// the UI, not just a note in the README. If you are about to show something that
// isn't what it appears to be, put one of these next to it.

import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

export type HonestyKind = "cached" | "simulated-connector" | "simulated-send" | "synthetic";

const KINDS: Record<HonestyKind, { label: string; title: string; tone: string }> = {
  cached: {
    label: "CACHED",
    title: "Served from a cached run. No live fetch, no API call.",
    tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  "simulated-connector": {
    label: "SIMULATED CONNECTOR",
    title: "This button loads a fixture. There is no real integration behind it.",
    tone: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
  "simulated-send": {
    label: "SIMULATED SEND",
    title: "Opens your mail client with a draft. Cadence sends nothing itself.",
    tone: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
  synthetic: {
    label: "SYNTHETIC FIXTURE",
    title: "Hand-written demo data, not the output of a real pipeline run.",
    tone: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
};

export function HonestyBadge({
  kind,
  suffix,
  className,
}: {
  kind: HonestyKind;
  /** e.g. "fetched 1:50 PM" — appended after an em dash. */
  suffix?: string;
  className?: string;
}) {
  const { label, title, tone } = KINDS[kind];
  return (
    <Badge
      variant="secondary"
      title={title}
      className={cn(
        "h-5 gap-1 rounded px-1.5 font-mono text-[10px] font-semibold tracking-wide uppercase",
        tone,
        className,
      )}
    >
      {label}
      {suffix ? <span className="font-normal normal-case opacity-80">— {suffix}</span> : null}
    </Badge>
  );
}
