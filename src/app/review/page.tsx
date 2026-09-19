// Server component: reads the deliverable, then hands plain data to the
// client. Doing the fs read here keeps `data/fixtures/` out of the browser
// bundle, and formatting timestamps here keeps SSR and hydration agreed on a
// timezone — formatting them client-side renders two different strings.
import { ReviewClient } from "./review-client";
import { loadDeliverable } from "@/lib/review/load-deliverable";
import { timeOfDay } from "@/lib/review/format";

export const metadata = {
  title: "Review — Cadence",
};

export default function ReviewPage() {
  const { deliverable, evidence, source, fetchedAt } = loadDeliverable();

  // Honesty contract (spec 4). Nothing on this page was fetched live, so it
  // says so on screen rather than only in the README.
  const cachedLabel = fetchedAt
    ? `CACHED — fetched ${timeOfDay(fetchedAt)}`
    : source === "sample"
      ? "CACHED — sample data"
      : null;

  return (
    <ReviewClient
      initialDeliverable={deliverable}
      evidence={evidence}
      draftedAt={timeOfDay(deliverable.generated_at)}
      cachedLabel={cachedLabel}
    />
  );
}
