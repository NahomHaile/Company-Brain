// Review canvas palette and type.
//
// The palette encodes epistemic state, not decoration: a sentence is sourced,
// unsourced, or risky. Sourced sentences get NO treatment — the default is
// quiet so that only problems are visible. Decorate everything and nothing
// reads as a warning.
//
//   paper      #FCFCFA   document surface
//   ink        #1A1A17   body text
//   rule       #E3E2DC   hairlines and section dividers
//   receipt    #2F6F5E   provenance popover only, never in body text
//   unsourced  #B3701A   dotted underline on unsourced claims
//   risk       #A33A4A   inline highlight on risky spans
//
// These are written as literal Tailwind arbitrary values at each use site
// (text-[#1A1A17]) rather than CSS variables, for two reasons: Tailwind only
// scans literal class strings, and Base UI portals popovers to document.body
// where variables scoped to the page wrapper would not reach them.
//
// Risk severity is encoded structurally, not chromatically — one hue, varying
// underline weight. A three-colour traffic light reads as generic.
import { Source_Serif_4 } from "next/font/google";

/**
 * The deliverable is printed and read aloud before a call, so its prose is set
 * in a document serif. Interface chrome stays in Geist (loaded in layout.tsx).
 *
 * Apply `prose.className` directly to portalled content — inheritance does not
 * cross a portal boundary.
 */
export const prose = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
});

/** Severity → underline treatment. One hue; weight carries the signal. */
export const riskUnderline = {
  low: "underline decoration-dotted decoration-1 underline-offset-4 decoration-[#A33A4A]",
  medium: "underline decoration-solid decoration-2 underline-offset-4 decoration-[#A33A4A]",
  high: "underline decoration-solid decoration-2 underline-offset-4 decoration-[#A33A4A] bg-[#A33A4A]/12",
} as const;
