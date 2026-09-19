/**
 * Person B — the drafting engine.
 *
 * One engine, N recipes (§2.1). This file knows how to fan out sections, keep
 * their ids from colliding, verify what came back, and assemble the result. It
 * knows nothing about what a battlecard or an investor update contains — that
 * lives in `recipes/`.
 *
 * Degradation policy: a run should lose the smallest possible piece. One bad
 * section must not discard its five siblings, and a failed assembly must not
 * discard six good sections. Every fallback is recorded in `warnings` so the
 * failure is visible rather than silent.
 */

import { z } from "zod";
import {
  Section as SectionSchema,
  Sentence as SentenceSchema,
  type Deliverable,
  type Evidence,
  type Recipe,
  type Section,
  type Sentence,
} from "@/lib/contracts";
import { callClaude } from "./_dev/call-claude";
import { JSON_ONLY } from "./shared";
import { BATTLECARD } from "./recipes/battlecard";
import { INVESTOR_UPDATE } from "./recipes/investor-update";
import type { RecipeDefinition, RecipeInput, SectionSpec } from "./recipes/types";

export type { RecipeInput } from "./recipes/types";

const SentenceArray = z.array(SentenceSchema);
const SectionArray = z.array(SectionSchema);

/** Sections are short. The cap is a runaway guard, not a budget. */
const DEFAULT_SECTION_TOKENS = 4096;

/** §10.8 target. Exceeding it is a warning, not a failure. */
const WORD_TARGET = { min: 350, max: 550 };

/**
 * A Deliverable plus whatever degraded on the way. The contract has no field
 * for this, so it rides alongside rather than inside — `runRecipe` returns the
 * pair and the route decides what to surface.
 */
export interface DraftResult {
  deliverable: Deliverable;
  warnings: string[];
  timings: Record<string, number>;
  /**
   * Section keys the recipe defines but the run failed to produce.
   *
   * The Deliverable contract has no field for this, and a short `sections`
   * array is indistinguishable from a complete one — so a degraded card would
   * render as a whole card. §4 requires degraded output be labelled, not
   * quietly smaller, so this rides alongside for the UI to badge.
   */
  missingSections: string[];
  /** True when anything degraded. The UI must show something when this is set. */
  degraded: boolean;
}

// ---------------------------------------------------------------------------
// B9 — assembly (§10.8)
// ---------------------------------------------------------------------------

export const ASSEMBLY_SYSTEM = `You are given several sections of a document, each drafted independently and therefore without knowledge of the others. Assemble them into one coherent piece.

Do this:
- Remove cross-section repetition. A point made in the pivots should not restate the positioning paragraph. When two sections make the same point, keep it where it lands hardest and cut the other.
- Fix transitions so the sections read as one document rather than six.
- Tighten. Target 350 to 550 words total. This gets scanned in 90 seconds before a call, not read.

Do not do this:
- Do not introduce any new fact, claim, number, or example that was not already in the text you were given.
- Do not change any number.
- Do not add, remove, or reorder sections. Return exactly the sections you were given, with the same "key" and "title" values.

PRESERVE EVIDENCE IDS EXACTLY. This is the constraint most likely to be violated and the one that matters most. Every sentence keeps the evidence_ids it arrived with. If you merge two sentences, the merged sentence carries the union of both id arrays — never just the first one. If you split a sentence, both halves carry the original array. If you cut a sentence entirely, its ids disappear with it, which is fine. What is not fine is a surviving sentence that has quietly lost a citation.

Keep each sentence's "id" as it arrived.

Return a JSON array of section objects with exactly these keys: key, title, sentences. Each sentence has exactly: id, text, evidence_ids.

${JSON_ONLY}`;

// ---------------------------------------------------------------------------
// Pure helpers — exported so the verifier can exercise them without an API key
// ---------------------------------------------------------------------------

/**
 * Re-id sentences as `<section>_s1`, `<section>_s2`, ...
 *
 * Sections are drafted by independent parallel calls, so left alone every
 * section numbers from s1 and the ids collide. C's risk flags and grounding
 * issues both key off sentence_id, so a duplicate would silently attach a flag
 * to the wrong sentence in the canvas.
 */
export function withStableIds(key: string, sentences: Sentence[]): Sentence[] {
  return sentences.map((sentence, index) => ({
    ...sentence,
    id: `${key}_s${index + 1}`,
  }));
}

/** Deterministic — the model never counts anything (§3.1). */
export function countWords(sections: Section[]): number {
  return sections
    .flatMap((section) => section.sentences)
    .reduce(
      (total, sentence) =>
        total + sentence.text.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
}

/**
 * Drop citations pointing at evidence that does not exist.
 *
 * Provenance is the product: a hover that resolves to nothing is worse than an
 * admitted gap. Stripping a dangling id leaves the sentence with a shorter (and
 * possibly empty) array, which is already how the pipeline represents "not
 * grounded" — so C's audit picks it up through the normal path.
 */
export function stripDanglingCitations(
  sections: Section[],
  evidence: Evidence[],
): { sections: Section[]; dropped: string[] } {
  const known = new Set(evidence.map((item) => item.id));
  const dropped: string[] = [];

  const cleaned = sections.map((section) => ({
    ...section,
    sentences: section.sentences.map((sentence) => {
      const kept = sentence.evidence_ids.filter((id) => {
        if (known.has(id)) return true;
        dropped.push(id);
        return false;
      });
      return kept.length === sentence.evidence_ids.length
        ? sentence
        : { ...sentence, evidence_ids: kept };
    }),
  }));

  return { sections: cleaned, dropped: [...new Set(dropped)] };
}

/**
 * Verify assembly honoured its own contract.
 *
 * The assembly prompt's longest paragraph is about preserving evidence ids, and
 * a prompt instruction is not an enforcement mechanism. Zod validates shape, not
 * preservation — so this checks the three things the prompt actually promised.
 * A violation means we keep the unassembled draft, which is wordier but honest.
 */
export function assemblyViolations(
  before: Section[],
  after: Section[],
): string[] {
  const problems: string[] = [];

  const beforeKeys = before.map((s) => s.key);
  const afterKeys = after.map((s) => s.key);

  if (afterKeys.length !== beforeKeys.length) {
    problems.push(
      `section count changed: ${beforeKeys.length} → ${afterKeys.length}`,
    );
  }
  const missing = beforeKeys.filter((k) => !afterKeys.includes(k));
  if (missing.length > 0) problems.push(`sections dropped: ${missing.join(", ")}`);

  const added = afterKeys.filter((k) => !beforeKeys.includes(k));
  if (added.length > 0) problems.push(`sections invented: ${added.join(", ")}`);

  // A surviving sentence must not have lost citations.
  const beforeSentences = new Map(
    before.flatMap((s) => s.sentences).map((s) => [s.id, s]),
  );
  let survivors = 0;
  for (const sentence of after.flatMap((s) => s.sentences)) {
    const original = beforeSentences.get(sentence.id);
    if (!original) continue;
    survivors += 1;
    const kept = new Set(sentence.evidence_ids);
    const lost = original.evidence_ids.filter((id) => !kept.has(id));
    if (lost.length > 0) {
      problems.push(`${sentence.id} lost citations: ${lost.join(", ")}`);
    }
  }

  // Zero survivors means every id was renamed — C's flags would attach to nothing.
  if (survivors === 0 && beforeSentences.size > 0) {
    problems.push("no sentence ids survived assembly (all renamed)");
  }

  // No citation may appear that was not in the input.
  const knownIds = new Set(
    before.flatMap((s) => s.sentences).flatMap((s) => s.evidence_ids),
  );
  const invented = [
    ...new Set(
      after
        .flatMap((s) => s.sentences)
        .flatMap((s) => s.evidence_ids)
        .filter((id) => !knownIds.has(id)),
    ),
  ];
  if (invented.length > 0) {
    problems.push(`citations invented during assembly: ${invented.join(", ")}`);
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Model calls
// ---------------------------------------------------------------------------

async function draftSection(
  spec: SectionSpec,
  context: string,
): Promise<Section> {
  const sentences = await callClaude({
    system: spec.system,
    user: context,
    schema: SentenceArray,
    maxTokens: spec.maxTokens ?? DEFAULT_SECTION_TOKENS,
  });

  return {
    key: spec.key,
    title: spec.title,
    sentences: withStableIds(spec.key, sentences),
  };
}

async function assemble(sections: Section[]): Promise<Section[]> {
  return callClaude({
    system: ASSEMBLY_SYSTEM,
    user: JSON.stringify(sections, null, 2),
    schema: SectionArray,
    maxTokens: 16000,
  });
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

/**
 * Prepare context once, fan every section out, verify, assemble.
 *
 * The section calls are independent. Sequential is roughly 50s and kills the
 * demo; parallel is roughly 10s (§3.4). `allSettled` rather than `all` because
 * with `all` a single malformed response discards every sibling — and §16 rates
 * malformed model JSON as High likelihood.
 */
export async function runRecipe<K extends string>(
  def: RecipeDefinition<K>,
  input: RecipeInput,
): Promise<DraftResult> {
  const warnings: string[] = [];
  const timings: Record<string, number> = {};

  const blocks = def.prepare(input);

  const fanOutStarted = Date.now();
  const settled = await Promise.allSettled(
    def.sections.map(async (spec) => {
      const started = Date.now();
      const section = await draftSection(spec, blocks[spec.context]);
      timings[spec.key] = Date.now() - started;
      return section;
    }),
  );
  timings.fan_out_total = Date.now() - fanOutStarted;

  const drafted: Section[] = [];
  const missingSections: string[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      drafted.push(result.value);
      return;
    }
    const key = def.sections[index].key;
    const reason =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`[draft] section "${key}" failed:`, result.reason);
    missingSections.push(key);
    warnings.push(`section "${key}" failed and was omitted: ${reason}`);
  });

  if (drafted.length === 0) {
    throw new Error(
      `every section failed for recipe "${def.recipe}" — nothing to assemble`,
    );
  }

  // If the fan-out took roughly as long as the slowest call, it ran in parallel.
  const slowest = Math.max(
    ...def.sections.map((s) => timings[s.key] ?? 0),
    0,
  );
  if (slowest > 0 && timings.fan_out_total > slowest * 2) {
    warnings.push(
      `fan-out took ${timings.fan_out_total}ms against a slowest call of ${slowest}ms — calls may not be running in parallel`,
    );
  }

  // --- assembly, with the draft as the fallback -----------------------------
  let sections = drafted;
  const assemblyStarted = Date.now();
  try {
    const assembled = await assemble(drafted);
    const violations = assemblyViolations(drafted, assembled);
    if (violations.length > 0) {
      console.error("[draft] assembly violated its contract:", violations);
      warnings.push(
        `assembly discarded — it broke its own contract: ${violations.join("; ")}`,
      );
    } else {
      sections = assembled;
    }
  } catch (error) {
    console.error("[draft] assembly failed:", error);
    warnings.push(
      `assembly failed, using unassembled sections: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  timings.assembly = Date.now() - assemblyStarted;

  // --- provenance integrity -------------------------------------------------
  const { sections: cleaned, dropped } = stripDanglingCitations(
    sections,
    input.evidence,
  );
  if (dropped.length > 0) {
    warnings.push(
      `dropped ${dropped.length} citation(s) pointing at evidence that does not exist: ${dropped.join(", ")}`,
    );
  }

  const wordCount = countWords(cleaned);
  // Only meaningful on a complete run. On a partial one the count is naturally
  // low, and a spurious warning here buries the real one about the failed section.
  if (
    missingSections.length === 0 &&
    (wordCount > WORD_TARGET.max || wordCount < WORD_TARGET.min)
  ) {
    warnings.push(
      `word count ${wordCount} is outside the ${WORD_TARGET.min}-${WORD_TARGET.max} target`,
    );
  }

  return {
    deliverable: {
      recipe: def.recipe,
      title: def.title,
      subject_label: input.subjectLabel,
      sections: cleaned,
      price_comparisons: input.priceComparisons ?? [],
      feature_matrix: input.featureMatrix ?? [],
      // C's audit route fills these in; B never writes them.
      risk_flags: [],
      grounding_issues: [],
      generated_at: new Date().toISOString(),
      word_count: wordCount,
    },
    warnings,
    timings,
    missingSections,
    degraded: warnings.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const REGISTRY = {
  battlecard: BATTLECARD,
  investor_update: INVESTOR_UPDATE,
} as const;

/** Dispatch by recipe name. Switch rather than lookup so each recipe keeps its own context key type. */
export async function draftRecipe(
  recipe: Recipe,
  input: RecipeInput,
): Promise<DraftResult> {
  switch (recipe) {
    case "investor_update":
      return runRecipe(INVESTOR_UPDATE, input);
    case "battlecard":
      return runRecipe(BATTLECARD, input);
  }
}
