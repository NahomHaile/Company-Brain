// Investor-update input — CADENCE-BUILD-SPEC.md §12.2, recipe 2
//
// OWNER: Person D.
//
// Same engine, different ingest. The battlecard reads two URLs; the update reads
// whatever Maya already wrote down this month. The connector buttons load
// fixtures and say so — §4 requires the badge in the UI, not just the README.

"use client";

import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HonestyBadge } from "@/components/HonestyBadge";
import { SIMULATED_SOURCES } from "@/lib/demo-config";

export function PasteInputPanel({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const append = (text: string) =>
    onChange(value.trim() ? `${value.trim()}\n\n${text}` : text);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="update-notes" className="text-sm font-medium">
          Everything you already wrote down this month
        </label>
        <Textarea
          id="update-notes"
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          placeholder="Paste Slack threads, a CRM export, meeting notes, numbers scribbled in a doc. Messy is fine — that is the point."
          className="min-h-56 font-mono text-[13px] leading-relaxed"
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Cadence extracts facts with a verbatim quote for each one. Nothing gets stated that it
            cannot point at.
          </p>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {value.length.toLocaleString()} chars
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Load sample material</span>
          <HonestyBadge kind="simulated-connector" />
        </div>
        <p className="text-xs text-muted-foreground">
          These buttons paste fixtures into the box above. There is no Slack app, no CRM
          integration and no calendar behind them, and all of it is synthetic Thicket data.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {SIMULATED_SOURCES.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => append(s.text)}
            >
              {s.label}
            </Button>
          ))}
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onChange("")}
            >
              <Trash2 /> Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <Button
          type="submit"
          size="lg"
          disabled={busy || value.trim().length < 20}
          className="h-11 px-5 text-sm"
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Drafting…
            </>
          ) : (
            <>
              Draft the update <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
