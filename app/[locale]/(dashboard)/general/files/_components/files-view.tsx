"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FileTable } from "./file-table";
import { FileUploadDialog } from "./file-upload-dialog";
import { getFiles } from "../actions";
import { useTranslations } from "next-intl";

export function FilesView({
  files,
}: {
  files: Awaited<ReturnType<typeof getFiles>>;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("General.Files");

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{t("title")}</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("upload_file")}
          </Button>
        </div>
      </div>
      <FileTable files={files} />
      <FileUploadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
