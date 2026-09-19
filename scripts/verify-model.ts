/**
 * Model ID verification — Person A, spec §6 / CLAUDE.md.
 *
 * The spec names `claude-sonnet-4-6`, which CLAUDE.md flags as unconfirmed.
 * A 404 on the model string strands all four people at once, so confirm every
 * ID in lib/anthropic.ts resolves with one live call before 2:00.
 *
 * Run: npm run verify-model
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_MAIN, MODEL_CHEAP, MODEL_DEEP } from "../src/lib/anthropic";

// Next.js loads .env.local automatically; a bare tsx script does not.
function loadEnvLocal() {
  try {
    const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env.local — fall through to the env check below.
  }
}

loadEnvLocal();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set.\n" +
      "Copy .env.example to .env.local and add your key, then re-run.\n" +
      ".env.local is gitignored — never commit a real key.",
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELS: Array<[string, string]> = [
  ["MODEL_MAIN ", MODEL_MAIN],
  ["MODEL_CHEAP", MODEL_CHEAP],
  ["MODEL_DEEP ", MODEL_DEEP],
  // The spec's ID. Checked so we can report on it rather than guess.
  ["spec §6     ", "claude-sonnet-4-6"],
  // CLAUDE.md lists this dated variant as known-good. Confirm which form works.
  ["dated haiku", "claude-haiku-4-5-20251001"],
];

let failures = 0;

for (const [label, model] of MODELS) {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("")
      .trim();
    console.log(`OK    ${label}  ${model}  → "${text}"`);
  } catch (err) {
    const isInUse = [MODEL_MAIN, MODEL_CHEAP, MODEL_DEEP].includes(model);
    if (isInUse) failures++;
    const status = err instanceof Anthropic.APIError ? err.status : "?";
    console.log(
      `${isInUse ? "FAIL" : "n/a "}  ${label}  ${model}  → ${status} ${(err as Error).message.slice(0, 120)}`,
    );
  }
}

if (failures > 0) {
  console.log(
    `\n${failures} model ID(s) in lib/anthropic.ts do not resolve. Fix before anyone else runs a route.`,
  );
  process.exit(1);
}
console.log("\nAll model IDs in lib/anthropic.ts resolve.");
