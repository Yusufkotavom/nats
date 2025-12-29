import { useCompanyProfile } from "@/components/session-provider";
import { formatCurrency } from "@/lib/utils";
import { useCallback } from "react";

export function useFormatCurrency() {
  const profile = useCompanyProfile();

  const format = useCallback(
    (amount: number) => {
      return formatCurrency(amount, {
        currency: profile?.currency,
        currencySymbol: profile?.currencySymbol,
        currencyFormat: profile?.currencyFormat,
        locale: profile?.locale,
      });
    },
    [profile]
  );

  return format;
}
