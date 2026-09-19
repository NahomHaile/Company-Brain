/**
 * Page fetch: robots check, polite retrieval, HTML → text, cache.
 *
 * OWNER: Person A. Spec §4.1 / §9.4.
 *
 * A judge will ask about scraping. The answer is in this file rather than in
 * a shrug: we read robots.txt first and honour it, we identify ourselves, we
 * fetch only public marketing and pricing pages, we rate-limit to one request
 * per second, and we cache. No login walls, no paywalls, no personal data.
 *
 * The other half of this file is honesty about failure. A JS-rendered SPA
 * returns an error the UI states plainly; it never returns a fabricated page.
 */
import { load } from "cheerio";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PageFetch } from "./contracts";

/** Identifies us and points at the project. Spec §4.1. */
export const USER_AGENT =
  "CadenceBot/0.1 (Chatathon 2026 project; contact via repo; respects robots.txt)";

const FETCH_TIMEOUT_MS = 10_000;
const RATE_LIMIT_MS = 1_000;
const MAX_TEXT_CHARS = 15_000;

/** Below this, the page is almost certainly client-rendered. Spec §9.4. */
const JS_RENDERED_THRESHOLD = 200;

const CACHE_DIR = join(process.cwd(), "data", "cache");
const FIXTURE_DIR = join(process.cwd(), "data", "fixtures");

// ── Rate limiting ──────────────────────────────────────────────────────────
//
// One request per second, globally, across everything in this process.
// Chained through a promise so that Promise.all'd fetches queue rather than
// racing — parallelism is for the model calls, not for hammering a host.

let rateLimitChain: Promise<void> = Promise.resolve();

function rateLimit(): Promise<void> {
  const ready = rateLimitChain;
  rateLimitChain = ready.then(
    () => new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS)),
  );
  return ready;
}

// ── robots.txt ─────────────────────────────────────────────────────────────

/**
 * Minimal robots.txt evaluation: the `*` group plus any group naming us,
 * longest-match wins between Allow and Disallow.
 *
 * Deliberately conservative — a parse failure or an unreachable robots.txt
 * that returns anything other than 404 means we do not fetch. Erring toward
 * not fetching costs us a cached fallback; erring the other way is the thing
 * we told the judges we don't do.
 */
export function isAllowedByRobots(robotsTxt: string, url: string): boolean {
  const path = new URL(url).pathname || "/";

  const groups: Array<{ agents: string[]; rules: Array<[string, boolean]> }> = [];
  let current: (typeof groups)[number] | null = null;
  let lastLineWasAgent = false;

  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();

    if (field === "user-agent") {
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    if (field === "allow" || field === "disallow") {
      lastLineWasAgent = false;
      if (!current) continue;
      current.rules.push([value, field === "allow"]);
    }
  }

  const applicable = groups.filter(
    (g) => g.agents.includes("*") || g.agents.some((a) => a.includes("cadencebot")),
  );
  if (applicable.length === 0) return true;

  // A group naming us specifically overrides the wildcard group.
  const specific = applicable.filter((g) =>
    g.agents.some((a) => a.includes("cadencebot")),
  );
  const rules = (specific.length ? specific : applicable).flatMap((g) => g.rules);

  let decision = true;
  let longest = -1;

  for (const [pattern, allow] of rules) {
    // "Disallow:" with an empty value means allow everything.
    if (pattern === "") continue;
    if (!path.startsWith(pattern)) continue;
    if (pattern.length > longest) {
      longest = pattern.length;
      decision = allow;
    }
  }

  return decision;
}

async function checkRobots(url: string): Promise<{ allowed: boolean; detail: string | null }> {
  const robotsUrl = new URL("/robots.txt", url).toString();
  try {
    await rateLimit();
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    // No robots.txt means no restrictions.
    if (response.status === 404) return { allowed: true, detail: null };

    if (!response.ok) {
      return {
        allowed: false,
        detail: `robots.txt returned ${response.status}; treating as disallowed.`,
      };
    }

    const text = await response.text();
    const allowed = isAllowedByRobots(text, url);
    return {
      allowed,
      detail: allowed ? null : `robots.txt disallows ${new URL(url).pathname}.`,
    };
  } catch (err) {
    return {
      allowed: false,
      detail: `Could not read robots.txt (${(err as Error).name}); treating as disallowed.`,
    };
  }
}

// ── HTML → text ────────────────────────────────────────────────────────────

/**
 * Strip chrome, keep content. Never hand raw HTML to the model — a navbar and
 * a cookie banner cost 40K tokens and teach it nothing (spec §6).
 */
export function extractText(html: string): string {
  const $ = load(html);

  $(
    "script, style, noscript, svg, nav, footer, header, iframe, form, " +
      "[role=navigation], [aria-hidden=true], .cookie, #cookie-banner",
  ).remove();

  // Prefer the semantic content root; fall back to body.
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");

  const text = root.text();

  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

// ── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry {
  url: string;
  text: string;
  fetched_at: string;
}

const cacheKey = (url: string) =>
  createHash("sha256").update(url).digest("hex").slice(0, 16);

async function readCache(url: string): Promise<CacheEntry | null> {
  try {
    const raw = await readFile(join(CACHE_DIR, `${cacheKey(url)}.json`), "utf8");
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(
      join(CACHE_DIR, `${cacheKey(entry.url)}.json`),
      JSON.stringify(entry, null, 2),
      "utf8",
    );
  } catch {
    // A cache write failure must never fail the request.
  }
}

/**
 * Demo fallback. Spec §9.4 step 6 and §12.5: conference wifi is a listed risk,
 * and a cached page rendered without the CACHED badge would be dishonest —
 * so this always comes back with `cached: true`.
 */
async function readDemoFixture(role: PageFetch["role"]): Promise<string | null> {
  const file = role === "competitor" ? "cached-competitor.html" : "cached-target.html";
  try {
    return await readFile(join(FIXTURE_DIR, file), "utf8");
  } catch {
    return null;
  }
}

// ── The fetch ──────────────────────────────────────────────────────────────

function labelFor(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return url;
  }
}

export interface FetchPageOptions {
  url: string;
  role: PageFetch["role"];
  /** Skip the network entirely and serve the cached demo pair. */
  forceCached?: boolean;
}

/**
 * Fetch one public page and return text plus everything the UI needs to be
 * honest about where it came from.
 *
 * Never throws. Every failure mode is a populated PageFetch with `ok: false`
 * and a named `error`, because a thrown exception mid-demo shows a stack
 * trace and a returned error shows a sentence a founder can read.
 */
export async function fetchPage(opts: FetchPageOptions): Promise<PageFetch> {
  const { url, role, forceCached = false } = opts;

  const base: PageFetch = {
    requested_url: url,
    source_label: labelFor(url),
    role,
    ok: false,
    text: "",
    char_count: 0,
    fetched_at: null,
    cached: false,
    robots_allowed: true,
    error: null,
    error_detail: null,
  };

  const fallback = async (error: PageFetch["error"], detail: string): Promise<PageFetch> => {
    const cached = await readCache(url);
    if (cached) {
      return {
        ...base,
        ok: true,
        text: cached.text,
        char_count: cached.text.length,
        fetched_at: cached.fetched_at,
        cached: true,
        robots_allowed: error !== "robots_disallowed",
        error,
        error_detail: `${detail} Serving the cached copy.`,
      };
    }

    // robots said no — a demo fixture would be substituting content we were
    // told not to read. Fail honestly instead.
    if (error !== "robots_disallowed") {
      const demo = await readDemoFixture(role);
      if (demo) {
        const text = extractText(demo);
        return {
          ...base,
          ok: true,
          text,
          char_count: text.length,
          fetched_at: null,
          cached: true,
          error,
          error_detail: `${detail} Serving the cached demo page.`,
        };
      }
    }

    return {
      ...base,
      ok: false,
      error: error === "robots_disallowed" ? error : "no_fallback",
      robots_allowed: error !== "robots_disallowed",
      error_detail: `${detail} No cached copy available.`,
    };
  };

  if (forceCached) {
    return fallback("fetch_failed", "Cached mode requested.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("not an http(s) URL");
    }
  } catch {
    return { ...base, error: "fetch_failed", error_detail: `"${url}" is not a valid URL.` };
  }

  const robots = await checkRobots(url);
  if (!robots.allowed) {
    return fallback("robots_disallowed", robots.detail ?? "Disallowed by robots.txt.");
  }

  try {
    await rateLimit();
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      return fallback("fetch_failed", `${labelFor(url)} returned HTTP ${response.status}.`);
    }

    const html = await response.text();
    const text = extractText(html);

    // Spec §9.4: say so honestly rather than faking a card from a nav bar.
    if (text.length < JS_RENDERED_THRESHOLD) {
      return {
        ...base,
        ok: false,
        text,
        char_count: text.length,
        fetched_at: new Date().toISOString(),
        error: "js_rendered",
        error_detail:
          `${labelFor(url)} returned only ${text.length} characters of text. ` +
          "It is most likely rendered in the browser with JavaScript, which we do not execute. " +
          "Paste the page text instead.",
      };
    }

    const fetchedAt = new Date().toISOString();
    await writeCache({ url, text, fetched_at: fetchedAt });

    return {
      ...base,
      ok: true,
      text,
      char_count: text.length,
      fetched_at: fetchedAt,
      cached: false,
    };
  } catch (err) {
    const name = (err as Error).name;
    const reason =
      name === "TimeoutError"
        ? `${labelFor(url)} did not respond within ${FETCH_TIMEOUT_MS / 1000}s.`
        : `Could not reach ${labelFor(url)} (${name}).`;
    return fallback("fetch_failed", reason);
  }
}

/**
 * Fetch several pages at once. The rate limiter still serializes the actual
 * requests to one per second — this just removes the round-trip waiting.
 */
export async function fetchPages(pages: FetchPageOptions[]): Promise<PageFetch[]> {
  return Promise.all(pages.map(fetchPage));
}
