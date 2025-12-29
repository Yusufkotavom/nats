import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormatDateOptions {
  dateFormat?: string;
  includeTime?: boolean;
}

export const formatDate = (
  date: Date | string | number,
  options?: FormatDateOptions
) => {
  const { dateFormat = "MMM dd, yyyy", includeTime = false } = options || {};

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return "";
  }

  const formatStr = includeTime ? `${dateFormat} HH:mm` : dateFormat;
  return format(dateObj, formatStr);
};

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

export const generatePagination = (currentPage: number, totalPages: number) => {
  // If total pages is 7 or less, show all pages
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If current page is among the first 3 pages, show first 3, ellipsis, last 2
  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages - 1, totalPages];
  }

  // If current page is among the last 3 pages, show first 2, ellipsis, last 3
  if (currentPage >= totalPages - 2) {
    return [1, 2, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  // If current page is somewhere in the middle, show first 1, ellipsis, current-1, current, current+1, ellipsis, last 1
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
};
