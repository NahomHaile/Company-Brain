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

Every input sentence has a number. Your output references those numbers; you never handle citations yourself.

Do this:
- Remove cross-section repetition. A point made in the pivots should not restate the positioning paragraph. When two sections make the same point, keep it where it lands hardest and cut the other.
- Fix transitions so the sections read as one document rather than six.
- Tighten to the word count you are given. This gets scanned in 90 seconds before a call, not read.

Do not do this:
- Do not introduce any new fact, claim, number, or example that was not already in the text you were given.
- Do not change any number.
- Do not add, remove, or reorder sections. Return exactly the sections you were given, with the same "key" and "title" values.

For every sentence you return, "from" lists the numbers of the input sentences it came from:
- Kept a sentence more or less as-is → "from": [12]
- Merged two sentences → "from": [12, 13]
- Split one sentence into two → both returned sentences have "from": [12]
- Cut a sentence → it simply does not appear in your output

Getting "from" right is the most important thing you do here. Provenance is rebuilt from those numbers, so a sentence with the wrong "from" ends up citing the wrong source, and an omitted number silently drops a citation.

Return a JSON array of section objects with exactly these keys: key, title, sentences. Each sentence has exactly: from, text.

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

  // Per-sentence citation loss is no longer checkable here, and no longer
  // needs to be: assembly does not handle evidence_ids at all now. It returns
  // `from` indices and `rehydrate` computes the union from the originals, so a
  // citation cannot be dropped or invented on a per-sentence basis.
  //
  // What can still go wrong is wholesale: the model returning `from: []`
  // everywhere, or indices pointing nowhere, either of which strips the
  // document of provenance while looking structurally fine.
  const beforeIds = new Set(
    before.flatMap((s) => s.sentences).flatMap((s) => s.evidence_ids),
  );
  const afterIds = new Set(
    after.flatMap((s) => s.sentences).flatMap((s) => s.evidence_ids),
  );

  const invented = [...afterIds].filter((id) => !beforeIds.has(id));
  if (invented.length > 0) {
    problems.push(`citations invented during assembly: ${invented.join(", ")}`);
  }

  if (beforeIds.size > 0 && afterIds.size === 0) {
    problems.push("assembly returned no citations at all — `from` mapping failed");
  }

  // Cutting content legitimately drops some citations. Losing most of them
  // means the mapping broke rather than the editing being aggressive.
  const retained = [...beforeIds].filter((id) => afterIds.has(id)).length;
  if (beforeIds.size >= 4 && retained / beforeIds.size < 0.5) {
    problems.push(
      `assembly retained only ${retained} of ${beforeIds.size} distinct citations`,
    );
  }

  const unsourced = after
    .flatMap((s) => s.sentences)
    .filter((s) => s.evidence_ids.length === 0).length;
  const total = after.flatMap((s) => s.sentences).length;
  if (total > 0 && unsourced / total > 0.5) {
    problems.push(`${unsourced} of ${total} assembled sentences have no citations`);
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

/**
 * Assembly's output shape. Note what is absent: evidence_ids.
 *
 * The model used to carry citations through the rewrite and kept losing them —
 * a live run dropped ids from five sentences, which tripped the contract check
 * and cost us the tightened draft. Asking more firmly was not going to work:
 * tracking a dozen id arrays while rewriting prose is the wrong job for it.
 *
 * So it never sees them. It references input sentences by number, and code
 * rebuilds provenance from those numbers. A citation now cannot be lost or
 * invented, only mapped — the same principle as §3.1 keeping arithmetic out of
 * the model, applied to the thing the product actually sells.
 */
const AssembledSection = z.object({
  key: z.string(),
  title: z.string(),
  sentences: z.array(
    z.object({
      from: z.array(z.number().int().min(0)),
      text: z.string(),
    }),
  ),
});
export const AssembledSectionArray = z.array(AssembledSection);

/** Flatten to numbered sentences so the model can reference them. */
export function numberSentences(sections: Section[]) {
  const flat: Sentence[] = [];
  const numbered = sections.map((section) => ({
    key: section.key,
    title: section.title,
    sentences: section.sentences.map((sentence) => {
      flat.push(sentence);
      return { n: flat.length - 1, text: sentence.text };
    }),
  }));
  return { numbered, flat };
}

/** Rebuild provenance from the model's `from` numbers. */
export function rehydrate(
  assembled: z.infer<typeof AssembledSectionArray>,
  flat: Sentence[],
): Section[] {
  return assembled.map((section) => ({
    key: section.key,
    title: section.title,
    sentences: section.sentences.map((sentence, index) => {
      // Union of every source sentence's citations. Out-of-range numbers are
      // dropped rather than trusted — the model is not the authority here.
      const ids = new Set<string>();
      for (const n of sentence.from) {
        for (const id of flat[n]?.evidence_ids ?? []) ids.add(id);
      }
      return {
        id: `${section.key}_s${index + 1}`,
        text: sentence.text,
        evidence_ids: [...ids],
      };
    }),
  }));
}

async function assemble(sections: Section[]): Promise<Section[]> {
  // Telling it the current count and the cut required is far more effective
  // than the target alone. A live run came back at 813 words against a 550
  // ceiling because "target 350 to 550" gave it nothing to measure against.
  const current = countWords(sections);
  const instruction =
    current > WORD_TARGET.max
      ? `The draft below is ${current} words. That is ${current - WORD_TARGET.max} over the ceiling. Cut it to between ${WORD_TARGET.min} and ${WORD_TARGET.max} words. This is the main thing you are being asked to do.`
      : `The draft below is ${current} words, already within the ${WORD_TARGET.min}-${WORD_TARGET.max} target. Do not pad it.`;

  const { numbered, flat } = numberSentences(sections);

  const assembled = await callClaude({
    system: ASSEMBLY_SYSTEM,
    user: `${instruction}\n\n${JSON.stringify(numbered, null, 2)}`,
    schema: AssembledSectionArray,
    maxTokens: 16000,
    // Assembly rewrites the whole document in one generation; a live run
    // measured 80-139s. The section fan-out wants a much shorter leash.
    timeoutMs: 180_000,
  });

  return rehydrate(assembled, flat);
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
