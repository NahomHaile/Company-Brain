"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ProvenancePopover } from "@/components/ProvenancePopover";
import { RiskFlagSpan } from "@/components/RiskFlag";
import type {
  Deliverable,
  Evidence,
  GroundingIssue,
  PriceComparison,
  RiskFlag,
  Sentence,
} from "@/lib/contracts";
import { buildEvidenceIndex, resolveEvidence } from "@/lib/review/evidence";
import {
  editSentence,
  pendingFlagsFor,
  resolveFlag,
  type RiskResolution,
} from "@/lib/review/mutate";
import { partitionFlags, segmentSentence } from "@/lib/review/spans";
import { prose } from "@/lib/review/theme";

const ISSUE_LABEL: Record<GroundingIssue["issue"], string> = {
  unsourced: "No source",
  number_not_in_table: "Number not in the pricing table",
  overstated: "Stronger than the evidence",
  stale_evidence: "Source may be out of date",
};

function money(value: number | null): string {
  return value === null ? "—" : `$${value}`;
}

/** Nothing is computed here. Every number is read from Person A's pricing engine (spec 3.1). */
function PriceComparisons({ rows }: { rows: PriceComparison[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-[#1A1A17]">Price comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E3E2DC] text-left text-xs text-[#1A1A17]/55">
              <th className="py-2 pr-4 font-normal">Our tier</th>
              <th className="py-2 pr-4 font-normal">Their tier</th>
              <th className="py-2 pr-4 font-normal">Ours / seat</th>
              <th className="py-2 pr-4 font-normal">Theirs / seat</th>
              <th className="py-2 font-normal">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.our_tier}:${row.their_tier}`}
                className="border-b border-[#E3E2DC]/60 align-top text-[#1A1A17]"
              >
                <td className="py-2.5 pr-4">{row.our_tier}</td>
                <td className="py-2.5 pr-4">{row.their_tier}</td>
                <td className="py-2.5 pr-4 tabular-nums">
                  {money(row.normalized_monthly_per_seat_ours)}
                </td>
                <td className="py-2.5 pr-4 tabular-nums">
                  {money(row.normalized_monthly_per_seat_theirs)}
                </td>
                <td className="py-2.5">
                  {row.delta_abs === null || row.delta_pct === null ? (
                    <span className="text-[#B3701A]">Not comparable</span>
                  ) : (
                    <span className="tabular-nums">
                      {money(row.delta_abs)} ({row.delta_pct}%
                      {row.cheaper === "ours" ? " cheaper" : " more"})
                    </span>
                  )}
                  {row.caveat && (
                    <span className="mt-1 block text-xs text-[#1A1A17]/55">
                      {row.caveat}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SentenceRow({
  sentence,
  flags,
  issues,
  evidence,
  onResolve,
  onEdit,
}: {
  sentence: Sentence;
  flags: RiskFlag[];
  issues: GroundingIssue[];
  evidence: Map<string, Evidence>;
  onResolve: (flagId: string, resolution: RiskResolution) => void;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sentence.text);
  const cancelled = useRef(false);

  const { matched, unmatched } = partitionFlags(sentence.text, flags);
  const segments = segmentSentence(sentence.text, matched);
  const unsourced = sentence.evidence_ids.length === 0;

  function startEditing() {
    cancelled.current = false;
    setDraft(sentence.text);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (!cancelled.current && next.length > 0 && next !== sentence.text) {
      onEdit(next);
    }
  }

  const body: ReactNode = segments.map((segment, i) =>
    segment.kind === "flag" ? (
      <RiskFlagSpan
        key={`${sentence.id}:seg:${i}`}
        flag={segment.flag}
        onResolve={(_id, resolution) => onResolve(segment.flag.id, resolution)}
      >
        {segment.text}
      </RiskFlagSpan>
    ) : (
      <span key={`${sentence.id}:seg:${i}`}>{segment.text}</span>
    ),
  );

  return (
    <div className="group grid grid-cols-[1.25rem_1fr_1.5rem] gap-x-2">
      {/* Manuscript gutter: problems are visible here without touching the prose. */}
      <div aria-hidden className="pt-1 text-right text-xs leading-none">
        {flags.some((f) => f.severity === "high") && (
          <span className="text-[#A33A4A]">⚑</span>
        )}
        {flags.length > 0 && !flags.some((f) => f.severity === "high") && (
          <span className="text-[#A33A4A]/60">⚑</span>
        )}
        {flags.length === 0 && issues.length > 0 && (
          <span className="text-[#B3701A]">?</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {editing ? (
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                cancelled.current = true;
                setEditing(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            }}
            className={`${prose.className} min-h-[4.5rem] text-[17px] leading-[1.7]`}
          />
        ) : (
          <p
            className={`${prose.className} text-[17px] leading-[1.7] text-[#1A1A17] ${
              unsourced
                ? "underline decoration-dotted decoration-1 underline-offset-4 decoration-[#B3701A]"
                : ""
            }`}
          >
            <ProvenancePopover
              evidence={resolveEvidence(sentence.evidence_ids, evidence)}
            >
              {body}
            </ProvenancePopover>
          </p>
        )}

        {issues.map((issue, i) => (
          <p
            key={`${sentence.id}:${issue.issue}:${i}`}
            className="text-xs leading-snug text-[#B3701A]"
          >
            {ISSUE_LABEL[issue.issue]} — {issue.detail}
          </p>
        ))}

        {/* Edits can orphan a span. Surface those flags; never drop them (spec 3.3). */}
        {unmatched.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-l-2 border-[#A33A4A]/40 py-1 pl-3">
            <p className="text-xs text-[#1A1A17]/55">
              No longer matches this sentence
            </p>
            {unmatched.map((flag) => (
              <div key={flag.id} className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs text-[#A33A4A]">
                  “{flag.span}” — {flag.why}
                </span>
                <button
                  type="button"
                  onClick={() => onResolve(flag.id, "approved")}
                  className="text-xs text-[#1A1A17]/55 underline underline-offset-2 hover:text-[#1A1A17]"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!editing && (
        <button
          type="button"
          onClick={startEditing}
          aria-label="Edit this sentence"
          className="h-5 rounded-xs text-xs leading-none text-[#1A1A17]/0 transition-colors group-hover:text-[#1A1A17]/40 hover:!text-[#1A1A17] focus-visible:text-[#1A1A17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F5E]"
        >
          ✎
        </button>
      )}
    </div>
  );
}

/**
 * Renders any Deliverable — battlecard or investor update — by iterating
 * sections generically and never branching on `recipe` (spec 11.4 #6).
 *
 * Holds no copy of the deliverable: it renders what it is given and emits the
 * next one upward, so whatever Maya exports is exactly what is on screen.
 */
export function ReviewCanvas({
  deliverable,
  evidence,
  onChange,
  featureMatrix,
}: {
  deliverable: Deliverable;
  evidence: Evidence[];
  onChange: (next: Deliverable) => void;
  /** Person B owns FeatureMatrix.tsx; the canvas only gives it a place to sit. */
  featureMatrix?: ReactNode;
}) {
  const evidenceIndex = useMemo(() => buildEvidenceIndex(evidence), [evidence]);

  const issuesBySentence = useMemo(() => {
    const map = new Map<string, GroundingIssue[]>();
    for (const issue of deliverable.grounding_issues) {
      map.set(issue.sentence_id, [
        ...(map.get(issue.sentence_id) ?? []),
        issue,
      ]);
    }
    return map;
  }, [deliverable.grounding_issues]);

  return (
    <div className="flex flex-col gap-10">
      {deliverable.sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-[#1A1A17]">
            {section.title}
          </h2>
          <hr className="border-[#E3E2DC]" />
          <div className="flex flex-col gap-4">
            {section.sentences.map((sentence) => (
              <SentenceRow
                key={sentence.id}
                sentence={sentence}
                flags={pendingFlagsFor(deliverable, sentence.id)}
                issues={issuesBySentence.get(sentence.id) ?? []}
                evidence={evidenceIndex}
                onResolve={(flagId, resolution) =>
                  onChange(resolveFlag(deliverable, flagId, resolution))
                }
                onEdit={(text) =>
                  onChange(editSentence(deliverable, sentence.id, text))
                }
              />
            ))}
          </div>
        </section>
      ))}

      <PriceComparisons rows={deliverable.price_comparisons} />
      {featureMatrix}
    </div>
  );
}
