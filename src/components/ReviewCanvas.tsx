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
import { money, priceDeltaLabel } from "@/lib/review/format";
import {
  editSentence,
  pendingFlagsFor,
  resolveFlag,
  type RiskResolution,
} from "@/lib/review/mutate";
import { partitionFlags, segmentSentence } from "@/lib/review/spans";
import { spoken, ui } from "@/lib/review/theme";
import styles from "./review-canvas.module.css";

const ISSUE_LABEL: Record<GroundingIssue["issue"], string> = {
  unsourced: "No source",
  number_not_in_table: "Number not in the pricing table",
  overstated: "Stronger than the evidence",
  stale_evidence: "Source may be out of date",
};


/**
 * The reference column: dense, tabular, small — glanced at, not read aloud.
 *
 * Stacked per comparison rather than a wide five-column table, because at
 * reference-column width a table clips its own headers. Nothing here is
 * computed; every figure comes from Person A's pricing engine (spec 3.1).
 */
function PriceComparisons({ rows }: { rows: PriceComparison[] }) {
  if (rows.length === 0) return null;
  return (
    <section className={`${styles.reference} flex flex-col gap-3`}>
      <h3 className="text-[13px] font-semibold text-[#14171A]">
        Price comparison
      </h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const label = priceDeltaLabel(row);
          return (
            <div
              key={`${row.our_tier}:${row.their_tier}`}
              className="flex flex-col gap-1 border-t border-[#D7D3CA] pt-2"
            >
              <p className="text-[11px] text-[#6B7076]">
                {row.our_tier} vs {row.their_tier}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px] text-[#14171A]">
                <dt className="text-[#6B7076]">Ours</dt>
                <dd className="tabular-nums">
                  {money(row.normalized_monthly_per_seat_ours)}
                </dd>
                <dt className="text-[#6B7076]">Theirs</dt>
                <dd className="tabular-nums">
                  {money(row.normalized_monthly_per_seat_theirs)}
                </dd>
              </dl>
              <p
                className={`text-[13px] font-medium ${
                  label.kind === "incomparable"
                    ? "text-[#9E3320]"
                    : "tabular-nums text-[#14171A]"
                }`}
              >
                {label.text}
              </p>
              {row.caveat && (
                <p className="text-[11px] leading-snug text-[#6B7076]">
                  {row.caveat}
                </p>
              )}
            </div>
          );
        })}
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
  const cited = resolveEvidence(sentence.evidence_ids, evidence);
  // Judged on resolved evidence, not on the id count: a sentence citing an id
  // with no matching record would otherwise look fully sourced and show an
  // empty hover. A citation that resolves to nothing is not a source.
  const unsourced = cited.length === 0;

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

  // Provenance wraps each plain run and risk spans sit between them, as
  // siblings. Nesting a risk trigger inside a sentence-wide trigger produces a
  // button inside a button: invalid, and unreadable to a screen reader. With no
  // flags this is still a single trigger around the whole sentence.
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
      <ProvenancePopover key={`${sentence.id}:seg:${i}`} evidence={cited}>
        {segment.text}
      </ProvenancePopover>
    ),
  );

  return (
    <div
      className={`${styles.row} group -mx-2 grid grid-cols-[1fr_1.25rem] gap-x-2 rounded-sm px-2 py-0.5`}
    >
      {/* An unsourced line carries a proofreader's rule in the margin: the note
          is about the line, not about any word in it. */}
      <div
        className={`flex flex-col gap-1 ${unsourced ? styles.unsourced : ""}`}
      >
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
            className={`${spoken.className} min-h-[4.5rem] rounded-none border-[#D7D3CA] text-[20px] leading-[1.6]`}
          />
        ) : (
          <p
            className={`${spoken.className} text-[20px] leading-[1.6] text-[#14171A]`}
          >
            {body}
          </p>
        )}

        {issues.map((issue, i) => (
          <p
            key={`${sentence.id}:${issue.issue}:${i}`}
            className={`${ui.className} text-[11px] leading-snug text-[#9E3320]`}
          >
            {ISSUE_LABEL[issue.issue]} — {issue.detail}
          </p>
        ))}

        {/* Edits can orphan a span. Surface those flags; never drop them (spec 3.3). */}
        {unmatched.length > 0 && (
          <div className={`${ui.className} ${styles.noPrint} mt-1 flex flex-col gap-1 border-l-2 border-[#9E3320]/40 py-1 pl-3`}>
            <p className="text-[11px] text-[#6B7076]">
              No longer matches this sentence
            </p>
            {unmatched.map((flag) => (
              <div key={flag.id} className="flex flex-wrap items-baseline gap-2">
                <span className="text-[11px] text-[#9E3320]">
                  “{flag.span}” — {flag.why}
                </span>
                <button
                  type="button"
                  onClick={() => onResolve(flag.id, "approved")}
                  className="text-[11px] text-[#6B7076] underline underline-offset-2 hover:text-[#14171A]"
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
          className={`${styles.editAffordance} h-5 rounded-none text-[11px] leading-none text-transparent transition-colors group-hover:text-[#6B7076] hover:!text-[#14171A] focus-visible:text-[#14171A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B7076]`}
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

  const hasReference =
    deliverable.price_comparisons.length > 0 || featureMatrix !== undefined;

  return (
    // Asymmetry carries information: left is what Maya glances at, right is
    // what she says out loud. Different families and sizes, so mid-call the eye
    // never confuses the two. Print collapses this to one column.
    <div
      className={`${styles.layout} grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]`}
    >
      {hasReference && (
        <aside className={`${ui.className} flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start`}>
          <PriceComparisons rows={deliverable.price_comparisons} />
          {featureMatrix}
        </aside>
      )}

      {/* The spoken column. Recipe-agnostic: sections are iterated generically
          and never branched on, so the investor update renders here too. */}
      <div
        className={`flex flex-col gap-9 ${hasReference ? "" : "lg:col-span-2"}`}
      >
        {deliverable.sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-3">
            <h2
              className={`${ui.className} text-[13px] font-semibold tracking-tight text-[#14171A]`}
            >
              {section.title}
            </h2>
            <hr className="border-[#D7D3CA]" />
            <div className="flex flex-col gap-5">
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
      </div>
    </div>
  );
}
