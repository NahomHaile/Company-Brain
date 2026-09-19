/**
 * Anthropic client and the one call path everything goes through.
 *
 * OWNER: Person A. Spec §9.3.
 *
 * Every model call in Cadence — A's extractors, B's six section prompts,
 * C's audit and risk flagger — goes through callClaude(). Two reasons:
 *
 *  1. Model IDs live here and nowhere else (CLAUDE.md). A hardcoded model
 *     string in a route is a 404 nobody finds until the demo.
 *  2. A model returning prose instead of JSON is the single most likely
 *     runtime failure today (spec §16). One retry with a correction, then a
 *     typed throw — never a silent empty result.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

// ── Model IDs — the only place these strings appear ────────────────────────
//
// CLAUDE.md: the spec's `claude-sonnet-4-6` is UNVERIFIED. These are the
// known-good IDs. Verified live by `npm run verify-model`.

/** Critical path: extraction, drafting, audit. Spec §6 calls for Sonnet here. */
export const MODEL_MAIN = "claude-sonnet-5";

/** Cheap path. Spec §6: only for A2 evidence extraction if latency bites. */
export const MODEL_CHEAP = "claude-haiku-4-5";

/** Anything that needs judgment over speed. Not on the demo critical path. */
export const MODEL_DEEP = "claude-opus-5";

// ── Client ─────────────────────────────────────────────────────────────────

let client: Anthropic | null = null;

/**
 * Lazy so that importing this module during a build — or in a route that
 * never calls the model — doesn't throw on a missing key.
 */
export function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.",
      );
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// ── JSON extraction ────────────────────────────────────────────────────────

/**
 * Models wrap JSON in ```json fences despite being told not to, and
 * occasionally add a sentence of preamble. Strip both defensively rather
 * than burning a retry on something we can fix locally.
 */
export function extractJson(raw: string): string {
  let text = raw.trim();

  // ```json … ``` or ``` … ```
  const fenced = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1].trim();

  // Preamble before the payload: "Here is the JSON: [ … ]". Take the span
  // from the first brace/bracket to its matching last one.
  if (text[0] !== "{" && text[0] !== "[") {
    const start = text.search(/[[{]/);
    if (start !== -1) {
      const opener = text[start];
      const closer = opener === "{" ? "}" : "]";
      const end = text.lastIndexOf(closer);
      if (end > start) text = text.slice(start, end + 1);
    }
  }

  return text.trim();
}

/** Thrown when the model could not be made to produce schema-valid JSON. */
export class ClaudeJsonError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "ClaudeJsonError";
  }
}

// ── The call ───────────────────────────────────────────────────────────────

const JSON_RULE =
  "Return only a single JSON value. No preamble, no explanation, no markdown code fences.";

const CORRECTION =
  "Your previous response was not valid JSON. Return only the JSON object.";

export interface CallClaudeOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  model?: string;
  /** Label for logs. Makes a 2:45 integration failure traceable to a prompt. */
  label?: string;
}

/**
 * One model call, validated against its Zod schema.
 *
 * On unparseable or schema-invalid output, retries exactly once with the
 * correction appended and the bad output shown back to the model. A second
 * failure throws — a caller that wants a fixture fallback decides that for
 * itself rather than having it silently substituted here.
 */
export async function callClaude<T>(opts: CallClaudeOptions<T>): Promise<T> {
  const {
    system,
    user,
    schema,
    maxTokens = 8000,
    model = MODEL_MAIN,
    label = "claude",
  } = opts;

  const anthropic = getClient();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];

  let lastRaw = "";
  let lastProblem = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: `${system}\n\n${JSON_RULE}`,
      messages,
    });

    const raw = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    lastRaw = raw;

    if (response.stop_reason === "max_tokens") {
      // Truncated output can't parse. Retrying at the same cap won't help.
      throw new ClaudeJsonError(
        `[${label}] hit max_tokens (${maxTokens}) and returned truncated JSON. Raise maxTokens.`,
        raw,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch (err) {
      lastProblem = `not parseable as JSON (${(err as Error).message})`;
      if (attempt === 0) {
        messages.push(
          { role: "assistant", content: raw },
          { role: "user", content: CORRECTION },
        );
        continue;
      }
      break;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    lastProblem = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");

    if (attempt === 0) {
      messages.push(
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `${CORRECTION} It must match the required schema. Problems with your last response: ${lastProblem}`,
        },
      );
      continue;
    }
  }

  throw new ClaudeJsonError(
    `[${label}] failed schema validation after one retry — ${lastProblem}`,
    lastRaw,
  );
}
