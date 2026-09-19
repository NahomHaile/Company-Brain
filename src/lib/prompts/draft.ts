/**
 * Person B — the drafting engine.
 *
 * One engine, N recipes (§2.1). This file knows how to fan out sections, keep
 * their ids from colliding, and assemble the result. It knows nothing about what
 * a battlecard or an investor update contains — that lives in `recipes/`.
 *
 * Adding a recipe means adding a file under `recipes/` and one line in REGISTRY.
 */

import { z } from "zod";
import {
  Section as SectionSchema,
  Sentence as SentenceSchema,
  type Deliverable,
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
// Engine internals
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
 * Prepare context once, fan every section out in a single Promise.all, assemble.
 *
 * The section calls are independent. Sequential is roughly 50s and kills the
 * demo; parallel is roughly 10s (§3.4).
 */
export async function runRecipe<K extends string>(
  def: RecipeDefinition<K>,
  input: RecipeInput,
): Promise<Deliverable> {
  const blocks = def.prepare(input);

  const drafted = await Promise.all(
    def.sections.map((spec) => draftSection(spec, blocks[spec.context])),
  );

  const sections = await assemble(drafted);

  return {
    recipe: def.recipe,
    title: def.title,
    subject_label: input.subjectLabel,
    sections,
    price_comparisons: input.priceComparisons ?? [],
    feature_matrix: input.featureMatrix ?? [],
    // C's audit route fills these in; B never writes them.
    risk_flags: [],
    grounding_issues: [],
    generated_at: new Date().toISOString(),
    word_count: countWords(sections),
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const REGISTRY = {
  battlecard: BATTLECARD,
  investor_update: INVESTOR_UPDATE,
} as const;

/** Dispatch by recipe name. Switch rather than a lookup so each recipe keeps its own context key type. */
export async function draftRecipe(
  recipe: Recipe,
  input: RecipeInput,
): Promise<Deliverable> {
  switch (recipe) {
    case "investor_update":
      return runRecipe(INVESTOR_UPDATE, input);
    case "battlecard":
      return runRecipe(BATTLECARD, input);
  }
}
