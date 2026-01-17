"use client";

import { useState, useCallback } from "react";
import { Attachment } from "@/components/ui/attachment-dialog";

interface UseAttachmentDialogProps {
  initialAttachments?: Attachment[];
}

export function useAttachmentDialog({
  initialAttachments = [],
}: UseAttachmentDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    setIsOpen,
    openDialog,
    closeDialog,
    attachments,
    setAttachments,
    dialogProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
      attachments,
      onAttachmentsChange: setAttachments,
    },
  };
}
