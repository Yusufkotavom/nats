"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import { deleteFile } from "../actions";
import { useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";
import { useFormatDate } from "@/hooks/use-format-date";
import { useTranslations } from "next-intl";
import { Column, DataTable } from "@/components/ui/data-table";

export function FileTable({
  files,
  pagination,
}: {
  files: any[];
  pagination?: {
    totalEntries: number;
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const alert = useAlert();
  const formatDate = useFormatDate();
  const t = useTranslations("General.Files");
  const tCommon = useTranslations("Common");

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: t("delete_file"),
        description: t("delete_confirm_desc"),
      })
    ) {
      setDeletingId(id);
      try {
        await deleteFile(id);
      } catch (error) {
        console.error("Failed to delete file:", error);
        await alert({
          title: tCommon("error"),
          description: t("delete_error"),
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t("unit_bytes")}`;
    const k = 1024;
    const sizes = [t("unit_bytes"), t("unit_kb"), t("unit_mb"), t("unit_gb")];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const columns: Column<any>[] = [
    {
      header: t("name"),
      cell: (file) => (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="hover:underline flex items-center gap-2 font-medium"
        >
          {file.name}
        </a>
      ),
    },
    {
      header: t("type"),
      accessorKey: "mimeType",
    },
    {
      header: t("size"),
      cell: (file) => formatSize(file.size),
    },
    {
      header: t("uploaded_by"),
      cell: (file) => file.uploadedBy?.name || file.uploadedById || t("unknown"),
    },
    {
      header: t("date"),
      cell: (file) => formatDate(file.createdAt),
    },
    {
      header: t("actions"),
      className: "text-right",
      cell: (file) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" asChild>
            <a href={file.url} download>
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(file.id)}
            disabled={deletingId === file.id}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={files}
      columns={columns}
      pagination={pagination}
      emptyMessage={t("no_files_found")}
    />
  );
}
