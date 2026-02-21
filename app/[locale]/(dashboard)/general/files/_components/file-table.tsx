"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import { deleteFile, getFiles } from "../actions";
import { useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";
import { useFormatDate } from "@/hooks/use-format-date";
import { useTranslations } from "next-intl";

export function FileTable({
  files,
}: {
  files: Awaited<ReturnType<typeof getFiles>>;
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("type")}</TableHead>
            <TableHead>{t("size")}</TableHead>
            <TableHead>{t("uploaded_by")}</TableHead>
            <TableHead>{t("date")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-2"
                >
                  {file.name}
                </a>
              </TableCell>
              <TableCell>{file.mimeType}</TableCell>
              <TableCell>{formatSize(file.size)}</TableCell>
              <TableCell>{file.uploadedBy?.name || t("unknown")}</TableCell>
              <TableCell>
                {formatDate(file.createdAt)}
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
          {files.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                {t("no_files_found")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
