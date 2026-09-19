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

function SupportCell({ value }: { value: Support }) {
  const variant = value === "yes" ? "default" : value === "partial" ? "secondary" : "outline";

  return (
    <Badge
      variant={variant}
      title={SUPPORT_TITLE[value]}
      className={cn(
        value === "unknown" && "border-dashed text-muted-foreground",
        value === "no" && "text-muted-foreground",
      )}
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
    <div className={cn("overflow-x-auto rounded-xl ring-1 ring-foreground/10", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Feature comparison between {ourLabel} and {theirLabel}. Rows that matter to
          this prospect are listed first.
        </caption>
        <thead>
          <tr className="border-b border-foreground/10 bg-muted/40">
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Feature
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              {ourLabel}
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              {theirLabel}
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Why it matters here
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row, index) => (
            <tr
              key={`${row.feature}-${index}`}
              className={cn(
                "border-b border-foreground/5 last:border-b-0",
                row.matters_to_target
                  ? "bg-primary/[0.04]"
                  : "text-muted-foreground",
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
                    <Badge variant="secondary" className="w-fit">
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
                    className="ml-1.5 text-xs text-destructive"
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
