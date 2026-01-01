"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileIcon, Trash2, Paperclip } from "lucide-react";

export interface Attachment {
  id: string;
  name: string;
  url: string;
}

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  uploadAction: (formData: FormData) => Promise<{
    success?: boolean;
    file?: { id: string; name: string; url: string };
    error?: string;
  }>;
}

export function AttachmentDialog({
  open,
  onOpenChange,
  attachments,
  onAttachmentsChange,
  uploadAction,
}: AttachmentDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadAction(formData);
      if (result.success && result.file) {
        onAttachmentsChange([
          ...attachments,
          {
            id: result.file.id,
            name: result.file.name,
            url: result.file.url,
          },
        ]);
      } else {
        setError(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    onAttachmentsChange(newAttachments);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
          <DialogDescription>
            Manage files attached to this record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Files ({attachments.length})
            </h3>
            <div className="relative">
              <input
                type="file"
                id="dialog-file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("dialog-file-upload")?.click()
                }
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3 w-3" />
                )}
                {isUploading ? "Uploading..." : "Upload New"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto rounded-md border">
            {attachments.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                <Paperclip className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No attachments yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {attachments.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 overflow-hidden"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                        <FileIcon className="h-4 w-4" />
                      </div>
                      <span className="truncate text-sm font-medium hover:underline">
                        {file.name}
                      </span>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAttachment(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
