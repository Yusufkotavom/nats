"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { FileTable } from "./file-table";
import { FileUploadDialog } from "./file-upload-dialog";
import { useTranslations } from "next-intl";
import {
  PageListLayout,
  PageListHeader,
  PageListTitle,
  PageListActions,
  PageListContent,
  PageListFilter,
} from "@/components/layout/page/list-layout";
import { CustomInput } from "@/components/ui/custom-input";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect } from "react";

export function FilesView({
  initialFiles,
  total,
  page,
  limit,
  search: initialSearch,
}: {
  initialFiles: any[];
  total: number;
  page: number;
  limit: number;
  search?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch || "");
  const debouncedSearch = useDebounce(search, 500);
  const t = useTranslations("General.Files");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only update if search has actually changed from what's in the URL
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch === currentSearch) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to page 1 on search
    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pathname, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("title")} />
        <PageListActions>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("upload_file")}
          </Button>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <CustomInput
            placeholder={t("search_files")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageListFilter>

      <PageListContent>
        <FileTable
          files={initialFiles}
          pagination={{
            totalEntries: total,
            pageSize: limit,
            currentPage: page,
            onPageChange: handlePageChange,
          }}
        />
      </PageListContent>

      <FileUploadDialog open={open} onOpenChange={setOpen} />
    </PageListLayout>
  );
}
