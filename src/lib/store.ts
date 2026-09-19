/**
 * Session store — a JSON file, deliberately.
 *
 * OWNER: Person A. Spec §6.
 *
 * No database. Prisma costs 40 minutes and buys nothing in a three-hour
 * build. One session at a time is the correct scope for a single-founder
 * demo, and "what breaks at scale" has an honest answer (§14) rather than a
 * half-built persistence layer.
 *
 * Every write is a full-file replace through a temp file and a rename, so a
 * crash mid-write can't leave the demo reading a truncated JSON file.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  Deliverable,
  Evidence,
  PageFetch,
  PriceComparison,
  PriceTier,
  Recipe,
} from "./contracts";

const DATA_DIR = join(process.cwd(), "data");
const SESSION_PATH = join(DATA_DIR, "session.json");

export interface Session {
  recipe: Recipe;
  updated_at: string;
  pages: PageFetch[];
  evidence: Evidence[];
  price_tiers: PriceTier[];
  price_comparisons: PriceComparison[];
  deliverable: Deliverable | null;
}

function emptySession(recipe: Recipe = "battlecard"): Session {
  return {
    recipe,
    updated_at: new Date().toISOString(),
    pages: [],
    evidence: [],
    price_tiers: [],
    price_comparisons: [],
    deliverable: null,
  };
}

/**
 * Read the current session. Never throws — a missing or corrupt file returns
 * an empty session, because a store read failing is not a reason to fail a
 * request that was going to overwrite it anyway.
 */
export async function readSession(): Promise<Session> {
  try {
    return JSON.parse(await readFile(SESSION_PATH, "utf8")) as Session;
  } catch {
    return emptySession();
  }
}

/** Atomic write: temp file then rename, so a reader never sees a partial file. */
export async function writeSession(session: Session): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const temp = `${SESSION_PATH}.${process.pid}.tmp`;
  const payload = JSON.stringify(
    { ...session, updated_at: new Date().toISOString() },
    null,
    2,
  );
  await writeFile(temp, payload, "utf8");
  await rename(temp, SESSION_PATH);
}

/** Merge a partial update into the stored session. */
export async function patchSession(patch: Partial<Session>): Promise<Session> {
  const current = await readSession();
  const next: Session = { ...current, ...patch };
  await writeSession(next);
  return next;
}

/** Start a fresh session for a run. Called at the top of /api/fetch. */
export async function resetSession(recipe: Recipe): Promise<Session> {
  const session = emptySession(recipe);
  await writeSession(session);
  return session;
}

/** Evidence lookup for provenance rendering — id → item. */
export async function evidenceById(): Promise<Map<string, Evidence>> {
  const { evidence } = await readSession();
  return new Map(evidence.map((e) => [e.id, e]));
}
