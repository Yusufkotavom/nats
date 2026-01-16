"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onSearch?: (query: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  className,
  disabled,
  onSearch,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SearchableSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const selectedOption = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const inputValue = selectedOption ? selectedOption.label : "";

  return (
    <>
      <InputGroup
        className={cn("cursor-text", className)}
        onClick={() => !disabled && setOpen(true)}
        onKeyDown={(e) =>
          !disabled && /^[a-zA-Z0-9]$/.test(e.key) && setOpen(true)
        }
      >
        <InputGroupAddon>
          <Search className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          value={inputValue}
          placeholder={placeholder}
          readOnly
          className="cursor-pointer"
          disabled={disabled}
        />
      </InputGroup>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search..." onValueChange={onSearch} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
