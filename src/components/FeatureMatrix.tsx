/**
 * Person B — the feature comparison table.
 *
 * Rows where `matters_to_target` is true are visually promoted: this prospect's
 * page gave a reason to care, and those are the rows a founder should scan first.
 * Everything else is context.
 *
 * `unknown` deliberately reads as "their page doesn't say" rather than as a no.
 * The analysis prompt refuses to infer absence from silence, and the table has to
 * carry that distinction through to the screen or the honesty is lost on the way.
 */

import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { FeatureRow } from "@/lib/contracts";

type Support = FeatureRow["ours"];

const SUPPORT_LABEL: Record<Support, string> = {
  yes: "Yes",
  no: "No",
  partial: "Partial",
  unknown: "Not stated",
};

const SUPPORT_TITLE: Record<Support, string> = {
  yes: "Stated on their page",
  no: "Their page says this is not available",
  partial: "Limited — gated behind a tier, sold as an add-on, or only part of it",
  unknown: "Their page is silent on this. Not the same as a no.",
};

/**
 * Warm, low-contrast palette. "Not stated" is deliberately the quietest cell on
 * the table — dashed and muted — because it is an admission, not a claim, and
 * it must never read as a confident "no".
 */
const SUPPORT_TONE: Record<Support, string> = {
  yes: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  partial:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  no: "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400",
  unknown:
    "border-dashed border-stone-300 bg-transparent text-stone-500 dark:border-stone-700 dark:text-stone-400",
};

function SupportCell({ value }: { value: Support }) {
  return (
    <Badge
      variant="outline"
      title={SUPPORT_TITLE[value]}
      className={cn("font-normal", SUPPORT_TONE[value])}
    >
      {SUPPORT_LABEL[value]}
    </Badge>
  );
}

export interface FeatureMatrixProps {
  rows: FeatureRow[];
  /** Defaults keep the component usable before the real company names are wired. */
  ourLabel?: string;
  theirLabel?: string;
  className?: string;
}

export function FeatureMatrix({
  rows,
  ourLabel = "Us",
  theirLabel = "Them",
  className,
}: FeatureMatrixProps) {
  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No feature comparison available.
      </p>
    );
  }

  // Promoted rows first. The prompt already sorts this way; re-sorting here means
  // the component is still correct if it's handed rows from anywhere else.
  const ordered = [...rows].sort(
    (a, b) => Number(b.matters_to_target) - Number(a.matters_to_target),
  );

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-stone-200/80 bg-stone-50/60 shadow-sm",
        "dark:border-stone-800 dark:bg-stone-950/40",
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Feature comparison between {ourLabel} and {theirLabel}. Rows that matter to
          this prospect are listed first.
        </caption>
        <thead>
          <tr className="border-b border-stone-200/80 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40">
            <th
              scope="col"
              className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400"
            >
              Feature
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400"
            >
              {ourLabel}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400"
            >
              {theirLabel}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400"
            >
              Why it matters here
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row, index) => (
            <tr
              key={`${row.feature}-${index}`}
              className={cn(
                "border-b border-stone-200/60 transition-colors last:border-b-0 dark:border-stone-800/60",
                // Promoted rows sit on a faint warm wash and keep full-contrast
                // text; everything else recedes. The prospect's own page gave a
                // reason to care about these, so they should be what the eye finds.
                row.matters_to_target
                  ? "bg-amber-50/40 dark:bg-amber-950/10"
                  : "text-stone-500 dark:text-stone-400",
              )}
            >
              <th
                scope="row"
                className={cn(
                  "px-4 py-3 text-left align-top font-normal text-foreground",
                  row.matters_to_target && "font-medium",
                )}
              >
                <span className="flex flex-col gap-1">
                  {row.feature}
                  {row.matters_to_target && (
                    <Badge
                      variant="outline"
                      className="w-fit border-amber-200 bg-amber-50 text-[11px] font-normal text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    >
                      Matters to this prospect
                    </Badge>
                  )}
                </span>
              </th>
              <td className="px-4 py-3 align-top">
                <SupportCell value={row.ours} />
              </td>
              <td className="px-4 py-3 align-top">
                <SupportCell value={row.theirs} />
              </td>
              <td className="max-w-md px-4 py-3 align-top">
                {row.why}
                {row.evidence_ids.length === 0 && (
                  <span
                    className="ml-1.5 rounded border border-dashed border-amber-300 px-1 py-px text-[11px] text-amber-700 dark:border-amber-800 dark:text-amber-400"
                    title="No evidence cited for this row"
                  >
                    unsourced
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FeatureMatrix;
