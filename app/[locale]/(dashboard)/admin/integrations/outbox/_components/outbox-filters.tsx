"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Search } from "lucide-react";

const ALL_STATUSES_VALUE = "__ALL_STATUSES__";

const statusOptions = [
  { label: "All Statuses", value: ALL_STATUSES_VALUE },
  { label: "PENDING", value: "PENDING" },
  { label: "PROCESSING", value: "PROCESSING" },
  { label: "PROCESSED", value: "PROCESSED" },
  { label: "FAILED", value: "FAILED" },
  { label: "DEAD", value: "DEAD" },
];

export function OutboxFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const initialStatus = searchParams.get("status") || "";
  const initialSearch = searchParams.get("search") || "";
  const initialTopic = searchParams.get("topic") || "";
  const initialType = searchParams.get("type") || "";

  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [topic, setTopic] = useState(initialTopic);
  const [type, setType] = useState(initialType);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);

      if (status) params.set("status", status);
      else params.delete("status");

      if (topic) params.set("topic", topic);
      else params.delete("topic");

      if (type) params.set("type", type);
      else params.delete("type");

      if (search) params.set("search", search);
      else params.delete("search");

      params.set("page", "1");

      const next = `${pathname}?${params.toString()}`;
      const current = `${pathname}?${searchParams.toString()}`;
      if (next !== current) {
        replace(next);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [status, topic, type, search, searchParams, pathname, replace]);

  const selectStatusValue = useMemo(
    () => (status ? status : ALL_STATUSES_VALUE),
    [status]
  );

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <CustomInput
            placeholder="Search id, type, aggregateId, error..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full md:w-56">
          <CustomSelect
            value={selectStatusValue}
            options={statusOptions}
            onValueChange={(value) =>
              setStatus(value === ALL_STATUSES_VALUE ? "" : value)
            }
            placeholder="Status"
          />
        </div>

        <div className="w-full md:w-56">
          <CustomInput
            placeholder="Topic (exact)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="w-full md:w-56">
          <CustomInput
            placeholder="Type (contains)"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
