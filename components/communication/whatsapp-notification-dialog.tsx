"use client";

import { createContactCommunicationLog } from "@/app/[locale]/communications/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ContactCommunicationEventType } from "@/prisma/generated/prisma/client";

type CommunicationContext = {
  contactId: string;
  eventType: ContactCommunicationEventType;
  sourceType?: string;
  sourceId?: string;
};

export function WhatsAppNotificationDialog({
  open,
  onOpenChange,
  title = "Kirim notifikasi customer",
  description = "Preview pesan (template dari Admin > Settings > Communication)",
  phone,
  message,
  onMessageChange,
  context,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  phone: string;
  message: string;
  onMessageChange: (next: string) => void;
  context: CommunicationContext | null;
  onSent?: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="text-sm text-muted-foreground">{description}</div>
          <Textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            className="min-h-[140px]"
          />
          <div className="text-xs text-muted-foreground">Tujuan: +{phone}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Nanti
            </Button>
            <Button
              onClick={async () => {
                if (!context || !phone || !message.trim()) return;
                await createContactCommunicationLog({
                  contactId: context.contactId,
                  eventType: context.eventType,
                  sourceType: context.sourceType || "SERVICE_ORDER",
                  sourceId: context.sourceId,
                  target: phone,
                  message,
                  status: "SENT",
                });
                window.open(
                  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
                await onSent?.();
                onOpenChange(false);
              }}
            >
              Kirim WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
