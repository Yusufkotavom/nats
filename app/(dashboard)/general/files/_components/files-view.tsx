"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FileTable } from "./file-table";
import { FileUploadDialog } from "./file-upload-dialog";

interface FileWithUser {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: {
    name: string;
  } | null;
  createdAt: Date;
}

interface FilesViewProps {
  files: FileWithUser[];
}

export function FilesView({ files }: FilesViewProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Files</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Upload File
          </Button>
        </div>
      </div>
      <FileTable files={files} />
      <FileUploadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
