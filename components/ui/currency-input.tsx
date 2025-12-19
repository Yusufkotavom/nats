"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string | number;
  onChange: (value: string) => void;
}

export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(({ value, onChange, onFocus, onBlur, ...props }, ref) => {
  const formatDisplayValue = (val: string | number) => {
    if (val === "" || val === undefined || val === null) return "";
    const strVal = val.toString();

    // Split into integer and decimal parts
    const parts = strVal.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? "." + parts[1] : "";

    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return formattedInteger + decimalPart;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove commas to get raw value
    const rawValue = inputValue.replace(/,/g, "");

    // Allow digits and one dot.
    if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
      onChange(rawValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);

    // On blur, force 2 decimal places if it's a valid number
    if (value !== "" && value !== undefined && value !== null) {
      const numberVal = parseFloat(value.toString());
      if (!isNaN(numberVal)) {
        onChange(numberVal.toFixed(2));
      }
    }
  };

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      value={formatDisplayValue(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={onFocus}
    />
  );
});

CurrencyInput.displayName = "CurrencyInput";
