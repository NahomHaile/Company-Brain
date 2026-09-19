// Review canvas design tokens — see CADENCE-DESIGN-DIRECTION.md §3, §4.
//
// The artifact is a scouting report Maya opens thirty seconds before a call and
// scans under mild pressure, not a SaaS dashboard. Printed prep sheet, marked
// up by hand. White paper, no dark mode, no card grid.
//
//   paper   #FFFFFF   a prep sheet is printed
//   ink     #14171A   body text
//   rule    #D7D3CA   hairlines, printed-form grey
//   marker  #F2E85C   highlighter — risk-flagged spans
//   stamp   #9E3320   oxidised red — severity and proofreader's marks
//   pencil  #6B7076   provenance underlines, margin notes
//
// Written as literal Tailwind arbitrary values at each use site rather than CSS
// variables, for two reasons: Tailwind only scans literal class strings, and
// Base UI portals popovers to document.body where variables scoped to the page
// wrapper would never reach them.
//
// The three overlays are the three ways a person marks up a printed page —
// highlighter, pencil, proofreader's stamp. One coherent world, instantly
// legible, which is what makes it read as intent rather than Tailwind defaults.
import { Newsreader, Public_Sans } from "next/font/google";

/**
 * The spoken column. Pivots, landmines, positioning — language Maya says out
 * loud on a call, so it is set large enough to read at a glance.
 *
 * Apply `.className` directly to portalled content; inheritance does not cross
 * a portal boundary.
 */
export const spoken = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/** Interface, tables, labels — the reference column she glances at. */
export const ui = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
