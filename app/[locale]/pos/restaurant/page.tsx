import { redirect } from "next/navigation";

/**
 * Legacy route. The Restaurant UI has been consolidated into tabs on /pos.
 * Redirect to the unified POS view on the Floor tab.
 */
export default function LegacyRestaurantRedirect() {
  redirect("/pos?tab=floor");
}
