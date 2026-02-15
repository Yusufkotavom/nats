"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type OutboxEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: unknown;
};

export function OutboxEventDialog({
  open,
  onOpenChange,
  title,
  content,
}: OutboxEventDialogProps) {
  const text =
    typeof content === "string"
      ? content
      : JSON.stringify(content, null, 2) ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] rounded border bg-muted/20 p-3">
          <pre className="text-xs leading-relaxed">{text}</pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

