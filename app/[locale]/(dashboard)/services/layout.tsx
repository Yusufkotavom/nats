import { redirect } from "next/navigation";

/**
 * @deprecated Services module is permanently deprecated and scheduled for removal.
 * Keep this guard to prevent further operational usage through /services routes.
 */
export default function DeprecatedServicesLayout() {
  redirect("/pos?deprecated=services");
}
