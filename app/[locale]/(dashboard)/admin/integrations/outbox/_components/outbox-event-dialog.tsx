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
      <DialogContent className="max-w-full w-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="w-full overflow-auto max-h-[300px] p-2 border border-muted bg-muted/20">
          <pre className="text-xs leading-relaxed overflow-auto w-full h-full">
            {text}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

