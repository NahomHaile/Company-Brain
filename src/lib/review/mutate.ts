// Immutable state transitions for the review canvas.
//
// These live outside the component because a redaction has to change two
// things atomically — the sentence text and the flag's status — and getting
// that half-right is how a "resolved" flag ends up still highlighted.
import type { Deliverable, RiskFlag, Sentence } from "../contracts.ts";
import { applyRedaction } from "./spans.ts";

export type RiskResolution = "approved" | "redacted";

function mapSentences(
  deliverable: Deliverable,
  fn: (sentence: Sentence) => Sentence,
): Deliverable["sections"] {
  return deliverable.sections.map((section) => ({
    ...section,
    sentences: section.sentences.map(fn),
  }));
}

/**
 * Approve keeps Maya's original wording; redact substitutes the model's
 * pre-written safer phrasing. Either way the flag stops being pending, so it
 * stops being highlighted.
 */
export function resolveFlag(
  deliverable: Deliverable,
  flagId: string,
  resolution: RiskResolution,
): Deliverable {
  const flag = deliverable.risk_flags.find((f) => f.id === flagId);
  if (!flag) return deliverable;

  const sections =
    resolution === "redacted"
      ? mapSentences(deliverable, (sentence) =>
          sentence.id === flag.sentence_id
            ? { ...sentence, text: applyRedaction(sentence.text, flag) }
            : sentence,
        )
      : deliverable.sections;

  return {
    ...deliverable,
    sections,
    risk_flags: deliverable.risk_flags.map((f) =>
      f.id === flagId ? { ...f, status: resolution } : f,
    ),
  };
}

export function editSentence(
  deliverable: Deliverable,
  sentenceId: string,
  text: string,
): Deliverable {
  return {
    ...deliverable,
    sections: mapSentences(deliverable, (sentence) =>
      sentence.id === sentenceId ? { ...sentence, text } : sentence,
    ),
  };
}

/** Only pending flags are highlighted or chased. Resolved means done. */
export function pendingFlagsFor(
  deliverable: Deliverable,
  sentenceId: string,
): RiskFlag[] {
  return deliverable.risk_flags.filter(
    (f) => f.sentence_id === sentenceId && f.status === "pending",
  );
}

export function openFlagCount(deliverable: Deliverable): number {
  return deliverable.risk_flags.filter((f) => f.status === "pending").length;
}

/** Live count from the current text — the fixture's word_count goes stale on first edit. */
export function wordCount(deliverable: Deliverable): number {
  return deliverable.sections
    .flatMap((section) => section.sentences)
    .reduce(
      (total, sentence) =>
        total + sentence.text.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
}
