/**
 * Person B — the recipe contract.
 *
 * Spec §2.1: one engine, two recipes. A recipe is data, not code — a list of
 * section specs plus a function that builds the context blocks those sections
 * read. Adding a third recipe means adding a file here, not touching the engine.
 */

import type {
  Differentiator,
  Evidence,
  FeatureRow,
  PriceComparison,
  Recipe,
} from "@/lib/contracts";

/** Everything any recipe might need. Battlecard uses all of it; others don't. */
export interface RecipeInput {
  evidence: Evidence[];
  /** "Thicket vs. VetFlow — for Brookside Animal Hospital" */
  subjectLabel: string;
  featureMatrix?: FeatureRow[];
  differentiators?: Differentiator[];
  priceComparisons?: PriceComparison[];
}

/**
 * One drafted section.
 *
 * `context` names a prepared block rather than carrying a builder function, so
 * the engine can build each block exactly once and hand the same string to every
 * section that needs it. Six sections independently re-serializing the evidence
 * set was the largest avoidable cost in a run.
 */
export interface SectionSpec<K extends string = string> {
  /** Must match a key the contract documents for this recipe. */
  key: string;
  title: string;
  system: string;
  context: K;
  maxTokens?: number;
}

export interface RecipeDefinition<K extends string = string> {
  recipe: Recipe;
  title: string;
  sections: readonly SectionSpec<K>[];
  /** Built once per run, before the fan-out. */
  prepare(input: RecipeInput): Record<K, string>;
}
