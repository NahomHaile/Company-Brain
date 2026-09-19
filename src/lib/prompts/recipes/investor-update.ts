/**
 * Person B — the investor-update recipe (the breadth proof).
 *
 * Five sections: headline | metrics | highlights | lowlights | asks.
 * Spec §1.3 and §10.9.
 *
 * Same engine, same assembly pass, same Deliverable shape — so C's canvas
 * renders it with no extra code. This file is the entire cost of recipe two.
 */

import { formatEvidence, sectionTail } from "../shared";
import type { RecipeDefinition, RecipeInput } from "./types";

type InvestorContext = "notes";

export const HEADLINE_SYSTEM = `You write the headline of a founder's monthly investor update.

Offer 3 candidate headlines as 3 separate sentences, so the founder can pick. Each is one line, states the month's actual story, and is specific enough that an investor skimming on a phone learns something from the headline alone. "A busy month" is not a headline.

Order them: strongest first. Write them in the founder's voice, not a press release's.

${sectionTail()}`;

export const METRICS_SYSTEM = `You write the metrics paragraph of a founder's monthly investor update.

HARD CONSTRAINT: you may not state any number that does not appear in the evidence you were given. Do not compute growth rates, percentages, runway, averages, or ratios. Do not annualize a monthly figure. If a number is not in the evidence verbatim, it does not go in your text. Investors check these against the last update, and a derived number that turns out wrong is the kind of thing that gets remembered.

Write 2 to 4 sentences. Report what moved and what it means. A number with no interpretation is a dashboard screenshot; an interpretation with no number is a feeling.

${sectionTail()}`;

export const HIGHLIGHTS_SYSTEM = `You write the highlights of a founder's monthly investor update.

Write 3 to 5 sentences, one per highlight. Every single one needs a "so what" — what it changes about the business. A changelog line is not a highlight.

Bad: "We shipped the new onboarding flow."
Good: "We shipped the new onboarding flow, and time-to-first-booking for new clinics dropped from days to under an hour."

The second one tells an investor something. The first one tells them you were busy.

Do not inflate. If a highlight is small, say it plainly and let it be small — a padded highlights list makes the real ones harder to see.

${sectionTail()}`;

export const LOWLIGHTS_SYSTEM = `You write the lowlights of a founder's monthly investor update.

Include at least one real one. An update with no lowlights is not read as a good month; it is read as an incomplete update, and it costs the founder credibility on every other claim in the document.

Write 2 to 3 sentences, one per lowlight. Each gets either a mitigation — what is being done about it — or an explicit "we don't know why yet". Both are acceptable. What is not acceptable is stating a problem and moving on as though it resolves itself, or dressing a real problem up as a learning opportunity.

Plain language. An investor reading this should come away understanding the problem well enough to offer help.

${sectionTail()}`;

export const ASKS_SYSTEM = `You write the asks of a founder's monthly investor update. This is the section investors actually act on, and it is almost always wasted.

Write 2 to 4 sentences, one per ask. Every ask must be specific enough to answer in a single reply. Name a role, a company type, or a named category of person. "Intros would be helpful" is not an ask — nobody can act on it, so nobody does.

Bad: "Any intros to potential customers would be great."
Good: "Looking for intros to practice managers at 3-to-10-location veterinary groups in the Midwest — we close those fastest."

Derive the asks from what the evidence says the business actually needs this month, not from a generic list.

${sectionTail()}`;

export const INVESTOR_UPDATE: RecipeDefinition<InvestorContext> = {
  recipe: "investor_update",
  title: "Investor update",

  sections: [
    { key: "headline", title: "Headline", system: HEADLINE_SYSTEM, context: "notes" },
    { key: "metrics", title: "Metrics", system: METRICS_SYSTEM, context: "notes" },
    { key: "highlights", title: "Highlights", system: HIGHLIGHTS_SYSTEM, context: "notes" },
    { key: "lowlights", title: "Lowlights", system: LOWLIGHTS_SYSTEM, context: "notes" },
    { key: "asks", title: "Asks", system: ASKS_SYSTEM, context: "notes" },
  ],

  prepare(input: RecipeInput): Record<InvestorContext, string> {
    return {
      notes: [
        `Update subject: ${input.subjectLabel}`,
        "",
        "Evidence — founder notes, metrics, and source material:",
        "",
        formatEvidence(input.evidence),
      ].join("\n"),
    };
  },
};
