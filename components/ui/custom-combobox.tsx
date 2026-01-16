"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

export interface CustomComboboxOption {
  value: string;
  label: string;
}

export interface CustomComboboxProps {
  options: CustomComboboxOption[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  label?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  triggerClassName?: string;
}

export function CustomCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  label,
  className,
  disabled,
  triggerClassName,
}: CustomComboboxProps) {
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    const option = options.find((o) => o.value === value);
    if (option) {
      setInputValue(option.label);
    }
  }, [value, options]);

  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  // When value changes externally or internally, we might want to update input value?
  // Base UI Combobox usually handles syncing input with selected value if configured.
  // However, for a simple implementation, we rely on the Combobox component to handle text input.

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label>{label}</Label>}
      <Combobox
        value={value}
        onValueChange={onValueChange}
        onInputValueChange={setInputValue}
        disabled={disabled}
      >
        <ComboboxInput placeholder={placeholder} className={triggerClassName} />
        <ComboboxContent>
          <ComboboxList>
            {filteredOptions.length === 0 && inputValue && (
              <ComboboxEmpty>No results found</ComboboxEmpty>
            )}
            {filteredOptions.map((option) => (
              <ComboboxItem key={option.value} value={option.value}>
                {option.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
