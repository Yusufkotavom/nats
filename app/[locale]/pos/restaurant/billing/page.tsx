import { redirect } from "next/navigation";

/**
 * Legacy route. The Billing board is now a tab inside /pos.
 */
export default function LegacyBillingRedirect() {
  redirect("/pos?tab=billing");
}
