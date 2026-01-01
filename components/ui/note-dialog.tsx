"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useState, useEffect } from "react";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function NoteDialog({
  open,
  onOpenChange,
  value,
  onChange,
  readOnly,
}: NoteDialogProps) {
  const [note, setNote] = useState(value || "");

  useEffect(() => {
    if (open) {
      setNote(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onChange(note);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            Add or edit notes for this entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <CustomTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter notes here..."
            className="min-h-[200px]"
            disabled={readOnly}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!readOnly && <Button onClick={handleSave}>Save</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
