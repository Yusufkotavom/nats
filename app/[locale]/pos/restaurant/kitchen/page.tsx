import { redirect } from "next/navigation";

/**
 * Legacy route. The Kitchen board is now a tab inside /pos.
 */
export default function LegacyKitchenRedirect() {
  redirect("/pos?tab=kitchen");
}
