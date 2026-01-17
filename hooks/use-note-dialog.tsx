"use client";

import { useState, useCallback } from "react";

interface UseNoteDialogProps {
  initialValue?: string;
}

export function useNoteDialog({ initialValue = "" }: UseNoteDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(initialValue);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    setIsOpen,
    openDialog,
    closeDialog,
    note,
    setNote,
    dialogProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
      value: note,
      onChange: setNote,
    },
  };
}
