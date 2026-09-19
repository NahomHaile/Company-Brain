// The entire non-technical workflow — CADENCE-BUILD-SPEC.md §12.2
//
// OWNER: Person D.
//
// Two URL fields and one button. Both fields are prefilled with the demo pair so
// a judge can hit Generate the second the page loads. Say that out loud in the
// demo: there is nothing to configure.

"use client";

import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_PAIR } from "@/lib/demo-config";

export type UrlInputValues = { targetUrl: string; competitorUrl: string };

export function UrlInputPanel({
  values,
  onChange,
  onSubmit,
  busy,
}: {
  values: UrlInputValues;
  onChange: (next: UrlInputValues) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const isDemoPair =
    values.targetUrl === DEMO_PAIR.target.url &&
    values.competitorUrl === DEMO_PAIR.competitor.url;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <Field
        id="target-url"
        label="Who you're meeting"
        hint={DEMO_PAIR.target.role}
        value={values.targetUrl}
        disabled={busy}
        onChange={(targetUrl) => onChange({ ...values, targetUrl })}
      />
      <Field
        id="competitor-url"
        label="Who you're up against"
        hint={DEMO_PAIR.competitor.role}
        value={values.competitorUrl}
        disabled={busy}
        onChange={(competitorUrl) => onChange({ ...values, competitorUrl })}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={busy || !values.targetUrl.trim() || !values.competitorUrl.trim()}
          className="h-11 px-5 text-sm"
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              Generate battlecard <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>

        {!isDemoPair && !busy ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                targetUrl: DEMO_PAIR.target.url,
                competitorUrl: DEMO_PAIR.competitor.url,
              })
            }
          >
            <RotateCcw /> Reset to the demo pair
          </Button>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Cadence checks each site&rsquo;s <code className="font-mono">robots.txt</code> before
        fetching, identifies itself in the user agent, reads public marketing and pricing pages
        only, and waits a second between requests. No login walls, no paywalls, no personal data.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="url"
        inputMode="url"
        spellCheck={false}
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 font-mono text-[13px]"
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
