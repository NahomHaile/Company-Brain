// Export — CADENCE-BUILD-SPEC.md §12.3
//
// OWNER: Person D. Safe to drop into the review canvas.
//
// Three exits: copy the Markdown, print a one-page sheet, or open a draft email.
// The print sheet is rendered right here rather than printing whatever happens to
// be on screen, so the PDF is identical no matter which page the bar sits on —
// and it fits on one page, because it is read thirty seconds before a call.

"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HonestyBadge } from "@/components/HonestyBadge";
import { toMailBody, toMarkdown } from "@/lib/battlecard-markdown";
import type { RunResult } from "@/lib/pipeline-client";

export function ExportBar({ run }: { run: RunResult }) {
  const [copied, setCopied] = useState(false);

  const copyMarkdown = async () => {
    const md = toMarkdown(run);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      // Clipboard permission denied — fall back to a selectable textarea.
      const el = document.createElement("textarea");
      el.value = md;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoHref =
    `mailto:?subject=${encodeURIComponent(run.deliverable.subject_label)}` +
    `&body=${encodeURIComponent(toMailBody(run))}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={copyMarkdown}>
          {copied ? <Check className="text-emerald-600" /> : <Copy />}
          {copied ? "Copied" : "Copy Markdown"}
        </Button>

        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer /> Print / Save as PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={mailtoHref} />}
        >
          <Mail /> Email it to myself
        </Button>
        <HonestyBadge kind="simulated-send" />
      </div>

      <PrintSheetPortal run={run} />
    </>
  );
}

/**
 * The print sheet is portalled to <body> so it is a direct child of it. Print CSS
 * then hides its siblings outright — hiding them in place leaves their height
 * behind and you get a blank second page.
 */
const noopSubscribe = () => () => {};

function PrintSheetPortal({ run }: { run: RunResult }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(<PrintSheet run={run} />, document.body);
}

/** Hidden on screen, and the only thing visible when the page prints. One page. */
function PrintSheet({ run }: { run: RunResult }) {
  const d = run.deliverable;
  const flagged = new Set(d.risk_flags.map((f) => f.sentence_id));
  const unsourced = new Set(
    d.grounding_issues.filter((g) => g.issue === "unsourced").map((g) => g.sentence_id),
  );

  const sources = Array.from(
    new Map(
      run.evidence
        .filter((e) => e.source_url)
        .map((e) => [e.source_url as string, e.source_label]),
    ),
  );

  return (
    <div className="cadence-print" aria-hidden>
      <header className="cp-head">
        <div>
          <h1>{d.title}</h1>
          <p className="cp-subject">{d.subject_label}</p>
        </div>
        <div className="cp-meta">
          <span className="cp-brand">Cadence</span>
          <span>{new Date(d.generated_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}</span>
          <span>{d.word_count} words</span>
        </div>
      </header>

      {d.price_comparisons.length ? (
        <div className="cp-pricing">
          <span className="cp-pricing-label">Pricing (computed in code)</span>
          {d.price_comparisons.map((c, i) => (
            <span key={i} className="cp-pricing-row">
              <b>{c.our_tier}</b>{" "}
              {c.normalized_monthly_per_seat_ours === null
                ? "not published"
                : `$${c.normalized_monthly_per_seat_ours}/seat/mo`}{" "}
              vs <b>{c.their_tier}</b>{" "}
              {c.normalized_monthly_per_seat_theirs === null
                ? "not published"
                : `$${c.normalized_monthly_per_seat_theirs}/seat/mo`}
              {c.cheaper === "unknown" ? " — no comparison possible" : ` — ${c.cheaper} cheaper`}
              {c.caveat ? <em> {c.caveat}</em> : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="cp-body">
        {d.sections.map((section) => (
          <section key={section.key} className="cp-section">
            <h2>{section.title}</h2>
            <ul>
              {section.sentences.map((s) => (
                <li key={s.id}>
                  {s.text}
                  {flagged.has(s.id) ? <span className="cp-flag"> ⚑ review</span> : null}
                  {unsourced.has(s.id) ? <span className="cp-flag"> ◦ unsourced</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {d.risk_flags.length ? (
        <div className="cp-risks">
          <b>Before you say it:</b>{" "}
          {d.risk_flags.map((f) => (
            <span key={f.id} className="cp-risk">
              ⚑ “{f.span}” — {f.category.replace(/_/g, " ")} ({f.severity}).
            </span>
          ))}
        </div>
      ) : null}

      <footer className="cp-foot">
        <span>
          Sources:{" "}
          {sources.map(([url, label]) => `${label} (${url})`).join(" · ") || "internal only"}
        </span>
        <span>
          Maya Okonkwo and Thicket are synthetic demo data. Competitor and prospect pages are
          real public marketing pages.
        </span>
      </footer>
    </div>
  );
}
