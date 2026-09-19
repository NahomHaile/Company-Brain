/**
 * TEMPORARY — Person B's local stand-in for Person A's `src/lib/anthropic.ts`.
 *
 * DELETE THIS FILE the moment A lands the real one. The signature matches
 * CADENCE-BUILD-SPEC.md §9.3 exactly, so the swap is a one-line import change
 * in `analyze.ts` and `draft.ts` — nothing else moves.
 *
 * Note for A: the hardening below is worth keeping in the real client. It was
 * written during a brief detour onto another provider and is provider-agnostic:
 * per-call timeout, a degradation chain, truncation detection, and a lazily
 * constructed client. Each one corresponds to a failure actually observed in a
 * live run, not a hypothetical.
 *
 * Two upgrades not done here, both additive:
 *   1. Structured outputs (`output_config.format`) would make fence-stripping
 *      and the schema retry unnecessary.
 *   2. An optional `effort` arg would let cheap extraction run low and the
 *      judgment-heavy prompts (pivots, landmines, assembly) run higher.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Raised when the MODEL produced output that failed schema validation.
 *
 * Distinct from a bare ZodError, which a route also gets when the CALLER sends
 * a malformed body. Without this the two are indistinguishable and a caller
 * debugs their own payload while chasing a model problem.
 */
export class ModelOutputError extends Error {
  readonly issues: z.ZodIssue[];
  readonly raw: string;

  constructor(message: string, issues: z.ZodIssue[], raw: string) {
    super(message);
    this.name = "ModelOutputError";
    this.issues = issues;
    this.raw = raw;
  }
}

/**
 * Degradation chain, tried in order.
 *
 * Spec §6 pins `claude-sonnet-4-6`. That ID resolves, but `claude-sonnet-5` is
 * both newer and cheaper ($2/$10 per MTok vs $3/$15), so it leads. Haiku is the
 * last resort only — §6 reserves it for cheap extraction, and the judgment-heavy
 * prompts are measurably weaker on it. Better a thinner card than no card.
 */
export const MODEL_CHAIN = ["claude-sonnet-5", "claude-haiku-4-5"] as const;

export const PRIMARY_MODEL = MODEL_CHAIN[0];

/** A hung call must not eat the fan-out and push the route past maxDuration. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Above this, switch to streaming and give the call more room.
 *
 * A live run had assembly (max_tokens 16000) time out on Sonnet at 30s and fall
 * through to Haiku, which then took 108s and did not tighten properly. Long
 * generations need streaming to avoid HTTP timeouts — the SDK requires it for
 * large max_tokens for exactly this reason.
 */
const STREAMING_THRESHOLD_TOKENS = 8192;

const RETRY_NUDGE =
  "Your previous response was not valid JSON. Return only the JSON object.";

/**
 * Constructed lazily, not at module scope. The SDK throws when no API key is
 * present, and at module scope that throw happens while Next.js collects route
 * metadata — so a missing key breaks `next build`, not just the one request
 * that needed it.
 */
let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    // Org-level keys are not scoped to a workspace and are rejected without
    // this header. Workspace-scoped keys ignore it, so setting it is harmless.
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic({
      maxRetries: 2, // SDK handles 429/5xx/connection errors itself
      ...(workspaceId
        ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
        : {}),
    });
  }
  return client;
}

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

/** Auth, quota and bad-request failures will not fix themselves on another model. */
function isFatal(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 429;
}

/** Walk the model chain until one answers. */
async function generate(
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  timeoutMs: number,
): Promise<string> {
  let lastError: unknown = new Error("no attempt was made");

  // Long generations stream: a buffered request with a large max_tokens hits
  // the HTTP timeout before the model finishes.
  const stream = maxTokens > STREAMING_THRESHOLD_TOKENS;

  for (const model of MODEL_CHAIN) {
    try {
      const request = {
        model,
        max_tokens: maxTokens,
        system,
        messages,
      } as const;

      const response = stream
        ? await getClient()
            .messages.stream(request, { timeout: timeoutMs })
            .finalMessage()
        : await getClient().messages.create(request, { timeout: timeoutMs });

      // A truncated response is a successful call that yields unparseable JSON.
      // Saying so beats a downstream "Unexpected end of JSON input".
      if (response.stop_reason === "max_tokens") {
        throw new Error(
          `${model} truncated output at max_tokens=${maxTokens}; raise maxTokens for this call`,
        );
      }

      const text = textOf(response);
      if (!text) {
        throw new Error(
          `${model} returned no text (stop_reason: ${response.stop_reason})`,
        );
      }

      if (model !== PRIMARY_MODEL) {
        console.warn(`[model] answered by fallback "${model}"`);
      }
      return text;
    } catch (error) {
      lastError = error;
      if (isFatal(error)) throw error;
      console.warn(
        `[model] "${model}" failed (${
          error instanceof Error ? error.message : String(error)
        }); trying next`,
      );
    }
  }

  throw lastError;
}

/**
 * One model call, parsed and schema-validated. Throws if no model can produce
 * valid JSON in two attempts — an unvalidated response is a crash during the
 * demo, so failing loudly here is the point.
 */
export async function callClaude<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  /** Assembly needs more than a section does. Defaults to 30s. */
  timeoutMs?: number;
}): Promise<T> {
  const {
    system,
    user,
    schema,
    maxTokens = 8192,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = opts;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  const first = await generate(system, messages, maxTokens, timeoutMs);

  try {
    return schema.parse(JSON.parse(stripFences(first)));
  } catch {
    // One retry telling the model what it got wrong, then give up.
    const retry = await generate(
      system,
      [
        ...messages,
        { role: "assistant", content: first },
        { role: "user", content: RETRY_NUDGE },
      ],
      maxTokens,
      timeoutMs,
    );

    try {
      return schema.parse(JSON.parse(stripFences(retry)));
    } catch (error) {
      // Rethrow as ModelOutputError so callers can tell "the model failed"
      // apart from "the caller sent a bad body" — both are ZodError otherwise.
      throw new ModelOutputError(
        `model output failed schema validation after one retry: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof z.ZodError ? error.issues : [],
        retry.slice(0, 2000),
      );
    }
  }
}
