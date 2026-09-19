"use client";

import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Evidence } from "@/lib/contracts";
import { isStale } from "@/lib/review/evidence";
import { spoken, ui } from "@/lib/review/theme";
import styles from "./review-canvas.module.css";

function formatFetched(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    // Pinned for the same reason timeOfDay is: an unpinned zone can print a
    // different day here than the grounding note shows.
    timeZone: "America/New_York",
  });
}

function Receipt({ item }: { item: Evidence }) {
  const stale = isStale(item.fetched_at);
  return (
    <figure className="flex flex-col gap-2">
      {/* The verbatim quote is the product. It leads, set in the spoken face. */}
      <blockquote
        className={`${spoken.className} text-[15px] leading-relaxed text-[#14171A]`}
      >
        {item.quote}
      </blockquote>
      <figcaption
        className={`${ui.className} flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px]`}
      >
        {item.source_url ? (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B7076] underline underline-offset-2 hover:text-[#14171A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B7076]"
          >
            {item.source_label}
          </a>
        ) : (
          // Pasted evidence has no URL. Render the label, never a dead link.
          <span className="text-[#6B7076]">{item.source_label}</span>
        )}
        {item.fetched_at && (
          <span className={stale ? "text-[#9E3320]" : "text-[#6B7076]"}>
            {stale
              ? `fetched ${formatFetched(item.fetched_at)} — may have changed`
              : `fetched ${formatFetched(item.fetched_at)}`}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Hover any sentence to see the verbatim evidence behind it.
 *
 * The dotted pencil underline is the affordance, not decoration: an unmarked
 * sentence advertises nothing, and a reader has no reason to hover it. Opens
 * with no delay — Base UI's default 300ms reads as lag.
 *
 * Renders children bare when there is no evidence; an unsourced sentence gets
 * the proofreader's mark from the canvas instead of an empty popover.
 */
export function ProvenancePopover({
  evidence,
  children,
}: {
  evidence: Evidence[];
  children: ReactNode;
}) {
  if (evidence.length === 0) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={0}
        closeDelay={80}
        nativeButton={false}
        render={<span />}
        className={styles.sourced}
      >
        {children}
      </PopoverTrigger>
      {/* Styled as a margin note: hairline, no shadow theatre, paper ground. */}
      <PopoverContent
        side="top"
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-2rem))] gap-3 rounded-none border-l-2 border-l-[#6B7076] bg-white p-4 shadow-sm ring-1 ring-[#D7D3CA]"
      >
        {evidence.map((item, i) => (
          <div key={item.id} className="flex flex-col gap-3">
            {i > 0 && <hr className="border-[#D7D3CA]" />}
            <Receipt item={item} />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
