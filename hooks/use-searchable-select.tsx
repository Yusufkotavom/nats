"use client";

import { useState, useCallback } from "react";
import { SearchableSelectOption } from "@/components/ui/searchable-select";

interface UseSearchableSelectProps {
  initialValue?: string | null;
  initialOptions?: SearchableSelectOption[];
  onSearch?: (query: string) => void;
}

export function useSearchableSelect({
  initialValue = null,
  initialOptions = [],
  onSearch,
}: UseSearchableSelectProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<string | null>(initialValue);
  const [options, setOptions] =
    useState<SearchableSelectOption[]>(initialOptions);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearch?.(query);
    },
    [onSearch]
  );

  return {
    isOpen,
    setIsOpen,
    value,
    setValue,
    options,
    setOptions,
    searchQuery,
    setSearchQuery,
    selectProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
      value,
      onValueChange: setValue,
      options,
      onSearch: handleSearch,
    },
  };
}
