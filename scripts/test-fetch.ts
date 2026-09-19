/**
 * Fetch-page assertions — Person A.
 *
 * Covers the two things that are easy to get quietly wrong: robots.txt
 * evaluation (where being wrong means we did something we told the judges we
 * don't do) and cheerio extraction (where being wrong means 40K tokens of
 * navbar, or a stripped pricing table).
 *
 * No network — robots strings and the cached fixture are the inputs.
 * Run: npm run test:fetch
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractText, isAllowedByRobots } from "../src/lib/fetch-page";

let failed = 0;

function check(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed++;
    console.log(`FAIL  ${label} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  } else {
    console.log(`OK    ${label}`);
  }
}

// ── robots.txt ─────────────────────────────────────────────────────────────
const basic = "User-agent: *\nDisallow: /admin\nDisallow: /private";
check("public page allowed", isAllowedByRobots(basic, "https://x.com/pricing"), true);
check("disallowed path blocked", isAllowedByRobots(basic, "https://x.com/admin"), false);
check("disallowed prefix blocks children", isAllowedByRobots(basic, "https://x.com/admin/users"), false);

check("blanket disallow blocks everything", isAllowedByRobots("User-agent: *\nDisallow: /", "https://x.com/pricing"), false);
check("empty Disallow means allow all", isAllowedByRobots("User-agent: *\nDisallow:", "https://x.com/anything"), true);

const longest = "User-agent: *\nDisallow: /\nAllow: /pricing";
check("longest match wins — Allow", isAllowedByRobots(longest, "https://x.com/pricing"), true);
check("longest match wins — root stays blocked", isAllowedByRobots(longest, "https://x.com/other"), false);

check(
  "a group naming us overrides the wildcard",
  isAllowedByRobots("User-agent: *\nDisallow: /\n\nUser-agent: CadenceBot\nAllow: /", "https://x.com/pricing"),
  true,
);
check("another bot's rules don't apply to us", isAllowedByRobots("User-agent: BadBot\nDisallow: /", "https://x.com/pricing"), true);
check("multi-agent group applies", isAllowedByRobots("User-agent: A\nUser-agent: *\nDisallow: /secret", "https://x.com/secret"), false);
check("comments are stripped", isAllowedByRobots("# hi\nUser-agent: *  # all\nDisallow: /admin # no", "https://x.com/admin"), false);

// ── cheerio extraction ─────────────────────────────────────────────────────
const html = readFileSync(join(process.cwd(), "data/fixtures/cached-competitor.html"), "utf8");
const text = extractText(html);

console.log(`\n      extracted ${text.length} chars from ${html.length} chars of HTML`);

for (const kept of [
  "$49 per user / month",
  "$948 per user / year",
  "Let's talk",
  "2,400 veterinary practices",
  "under two weeks",
  "Patient recall messaging",
]) {
  check(`keeps content: "${kept}"`, text.includes(kept), true);
}

for (const stripped of ["gtag", "dataLayer", "font-size", "Careers", "Privacy", "newsletter"]) {
  check(`strips chrome: "${stripped}"`, text.includes(stripped), false);
}

if (failed > 0) {
  console.log(`\n${failed} fetch assertion(s) failed.`);
  process.exit(1);
}
console.log("\nfetch-page OK — robots honoured, chrome stripped, pricing content intact.");
