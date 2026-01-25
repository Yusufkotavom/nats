"use client";

import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function PurchaseInvoiceFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "ALL"
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }

      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      } else {
        params.delete("status");
      }

      params.set("page", "1");

      const currentSearch = searchParams.get("search") || "";
      const currentStatus = searchParams.get("status") || "ALL";

      if (searchTerm !== currentSearch || statusFilter !== currentStatus) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, searchParams, pathname, replace]);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <CustomInput
            placeholder="Search invoices..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "ALL", label: "All Status" },
            { value: "DRAFT", label: "Draft" },
            { value: "BILLED", label: "Billed" },
            { value: "PARTIALLY_PAID", label: "Partially Paid" },
            { value: "PAID", label: "Paid" },
            { value: "CANCELED", label: "Canceled" },
          ]}
          triggerClassName="w-[180px]"
        />
      </div>
    </div>
  );
}
