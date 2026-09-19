// Pure span math for the review canvas. No React, no I/O — this is the one
// place a silent bug would quietly eat a risk flag, so it carries tests.
// Relative import, not the @/ alias: `node --test` doesn't resolve tsconfig
// paths. It's type-only, so it strips to nothing at runtime either way.
import type { RiskFlag } from "../contracts.ts";

export type Segment =
  | { kind: "plain"; text: string }
  | { kind: "flag"; text: string; flag: RiskFlag };

type Hit = { start: number; end: number; flag: RiskFlag };

function locate(text: string, flags: RiskFlag[]): Hit[] {
  const hits: Hit[] = [];
  for (const flag of flags) {
    if (flag.span.length === 0) continue;
    const start = text.indexOf(flag.span);
    if (start < 0) continue;
    hits.push({ start, end: start + flag.span.length, flag });
  }
  hits.sort((a, b) => a.start - b.start);
  // Overlapping spans can't both be highlighted; first by position wins.
  return hits.filter((hit, i, kept) => i === 0 || hit.start >= kept[i - 1].end);
}

export function segmentSentence(text: string, flags: RiskFlag[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end, flag } of locate(text, flags)) {
    if (start > cursor) {
      segments.push({ kind: "plain", text: text.slice(cursor, start) });
    }
    segments.push({ kind: "flag", text: text.slice(start, end), flag });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ kind: "plain", text: text.slice(cursor) });
  }
  return segments.length > 0 ? segments : [{ kind: "plain", text }];
}

/** After an edit a span may no longer appear. Unmatched flags are surfaced, never dropped. */
export function partitionFlags(text: string, flags: RiskFlag[]) {
  const matched: RiskFlag[] = [];
  const unmatched: RiskFlag[] = [];
  for (const flag of flags) {
    (text.includes(flag.span) ? matched : unmatched).push(flag);
  }
  return { matched, unmatched };
}

/** Redact = accept the pre-written safe phrasing. Flag, never silently rewrite (§3.3). */
export function applyRedaction(text: string, flag: RiskFlag): string {
  const start = text.indexOf(flag.span);
  if (start < 0) return text;
  return (
    text.slice(0, start) +
    flag.suggested_alternative +
    text.slice(start + flag.span.length)
  );
}
