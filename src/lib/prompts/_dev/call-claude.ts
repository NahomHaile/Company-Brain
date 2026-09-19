/**
 * TEMPORARY — Person B's local stand-in for Person A's `src/lib/anthropic.ts`.
 *
 * DELETE THIS FILE the moment A lands the real one. The signature below matches
 * CADENCE-BUILD-SPEC.md §9.3 exactly, so the swap is a one-line import change in
 * `analyze.ts` and `draft.ts` — nothing else moves.
 *
 * This exists only so B's prompts can be tested before A ships. It is not a
 * second implementation of A's file and must not outlive it.
 *
 * Note for A: two upgrades worth considering for the real one —
 *   1. Structured outputs (`output_config.format`) would make fence-stripping and
 *      the retry unnecessary; the model can't return non-JSON in the first place.
 *   2. An optional `effort` arg would let cheap extraction calls run at "low" and
 *      the judgment-heavy ones (pivots, landmines, assembly) run higher.
 * Both are additive. This shim stays on the §9.3 signature so the swap stays clean.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Spec §6 pins `claude-sonnet-4-6`. That ID does resolve, but `claude-sonnet-5` is
 * both newer and cheaper ($2/$10 per MTok vs $3/$15), so the shim uses it.
 * The real constant belongs in A's `anthropic.ts` — per CLAUDE.md model IDs live in
 * exactly one place, and this is a placeholder for it.
 */
export const DRAFTING_MODEL = "claude-sonnet-5";

/**
 * Constructed lazily, not at module scope. The SDK throws when no API key is
 * present, and at module scope that throw happens while Next.js is collecting
 * route metadata — so a missing key breaks `next build` rather than failing the
 * one request that actually needed it. Worth keeping in the real `anthropic.ts`.
 */
let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const RETRY_NUDGE =
  "Your previous response was not valid JSON. Return only the JSON object.";

/**
 * Models sometimes wrap JSON in markdown fences despite being told not to.
 * Strip them defensively rather than losing a whole section over formatting.
 */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * One model call, parsed and schema-validated. Throws if the model cannot produce
 * valid JSON in two attempts — an unvalidated response is a crash during the demo,
 * so failing loudly here is the point.
 */
export async function callClaude<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const { system, user, schema, maxTokens = 8192 } = opts;

  const attempt = async (messages: Anthropic.MessageParam[]) => {
    const response = await getClient().messages.create({
      model: DRAFTING_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    });
    return textOf(response);
  };

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  const first = await attempt(messages);

  try {
    return schema.parse(JSON.parse(stripFences(first)));
  } catch {
    // One retry telling the model what it got wrong, then give up.
    const retry = await attempt([
      ...messages,
      { role: "assistant", content: first },
      { role: "user", content: RETRY_NUDGE },
    ]);
    return schema.parse(JSON.parse(stripFences(retry)));
  }
}
