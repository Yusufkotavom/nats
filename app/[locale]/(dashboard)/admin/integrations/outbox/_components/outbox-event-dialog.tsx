"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type OutboxEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    status: "FAILED" | "DEAD" | string;
    lastError?: string | null;
    payload: unknown;
  } | null;
};

export function OutboxEventDialog({
  event,
  open,
  onOpenChange,
}: OutboxEventDialogProps) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  if (!event) return null;

  const title = event.status === "FAILED" || event.status === "DEAD"
    ? t("view_error")
    : t("view_payload");

  const content = event.status === "FAILED" || event.status === "DEAD"
    ? event.lastError
    : JSON.stringify(event.payload, null, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            ID: {event.id}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {content || "—"}
            </pre>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
