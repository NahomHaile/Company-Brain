"use client";

import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Evidence } from "@/lib/contracts";
import { isStale } from "@/lib/review/evidence";
import { prose } from "@/lib/review/theme";

function formatFetched(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function Receipt({ item }: { item: Evidence }) {
  const stale = isStale(item.fetched_at);
  return (
    <figure className="flex flex-col gap-2">
      {/* The verbatim quote is the product. It leads, set in the serif. */}
      <blockquote
        className={`${prose.className} text-[15px] leading-relaxed text-[#1A1A17]`}
      >
        {item.quote}
      </blockquote>
      <figcaption className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        {item.source_url ? (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2F6F5E] underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F5E]"
          >
            {item.source_label}
          </a>
        ) : (
          // Pasted evidence has no URL. Render the label, never a dead link.
          <span className="text-[#1A1A17]/60">{item.source_label}</span>
        )}
        {item.fetched_at && (
          <span className={stale ? "text-[#B3701A]" : "text-[#1A1A17]/45"}>
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
 * Hover any sentence to see the verbatim evidence behind it (spec 11.4 #1).
 *
 * Opens with no delay — Base UI's default is 300ms, which reads as lag. The
 * trigger renders as a span so it sits inside flowing prose rather than
 * breaking the line as a button would.
 *
 * Renders children bare when there is no evidence: an unsourced sentence gets
 * the warning treatment from the canvas instead of an empty popover.
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
        className="cursor-help rounded-xs transition-colors data-[popup-open]:bg-[#2F6F5E]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F5E]"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-2rem))] gap-3 border-t-2 border-t-[#2F6F5E] bg-[#FCFCFA] p-4"
      >
        {evidence.map((item, i) => (
          <div key={item.id} className="flex flex-col gap-3">
            {i > 0 && <hr className="border-[#E3E2DC]" />}
            <Receipt item={item} />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
