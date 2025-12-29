import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormatCurrencyOptions {
  currency?: string;
  currencySymbol?: string;
  currencyFormat?: string;
  locale?: string;
}

export const formatCurrency = (
  amount: number,
  options?: FormatCurrencyOptions
) => {
  const {
    currency = "USD",
    currencySymbol,
    currencyFormat = "standard",
  } = options || {};

  let targetLocale = "en-US";
  if (currencyFormat === "european") {
    targetLocale = "de-DE";
  } else if (currencyFormat === "indian") {
    targetLocale = "en-IN";
  }

  if (currencySymbol) {
    const formattedNumber = new Intl.NumberFormat(targetLocale, {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (currencyFormat === "european") {
      return `${formattedNumber} ${currencySymbol}`;
    }
    return `${currencySymbol}${formattedNumber}`;
  }

  return new Intl.NumberFormat(targetLocale, {
    style: "currency",
    currency: currency,
  }).format(amount);
};
