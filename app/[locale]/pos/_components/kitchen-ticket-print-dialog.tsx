"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type KitchenTicketPrintItem = {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  note?: string;
};

export type KitchenTicketPrintPayload = {
  ticketId?: string;
  ticketNumber?: string;
  orderId?: string;
  orderNumber?: string;
  sessionNumber?: string;
  sentAt?: Date;
  spotCode?: string;
  spotName?: string;
  areaName?: string;
  cashierName?: string;
  note?: string;
  items: KitchenTicketPrintItem[];
};

export interface KitchenTicketPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: KitchenTicketPrintPayload | null;
  /** Called after a successful print/close to clear cart etc. */
  onDone?: () => void;
}

const PRINT_TARGET_ID = "kitchen-ticket-print-area";

export function KitchenTicketPrintDialog({
  open,
  onOpenChange,
  payload,
  onDone,
}: KitchenTicketPrintDialogProps) {
  const sentAtLabel = useMemo(() => {
    if (!payload?.sentAt) return null;
    try {
      return payload.sentAt.toLocaleString("id-ID", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return payload.sentAt.toString();
    }
  }, [payload?.sentAt]);

  const handlePrint = useCallback(() => {
    // Rely on a scoped print stylesheet: only the ticket area is rendered.
    window.print();
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    onDone?.();
  }, [onOpenChange, onDone]);

  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.setAttribute("data-kitchen-ticket-print", "1");
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #${PRINT_TARGET_ID}, #${PRINT_TARGET_ID} * { visibility: visible !important; }
        #${PRINT_TARGET_ID} {
          position: fixed;
          left: 0;
          top: 0;
          width: 80mm;
          padding: 8px 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          color: #000;
          background: #fff;
        }
        #${PRINT_TARGET_ID} h2 { font-size: 14px; margin: 0 0 4px; }
        #${PRINT_TARGET_ID} .meta { font-size: 11px; }
        #${PRINT_TARGET_ID} hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        #${PRINT_TARGET_ID} table { width: 100%; border-collapse: collapse; }
        #${PRINT_TARGET_ID} td { vertical-align: top; padding: 2px 0; }
        #${PRINT_TARGET_ID} .qty { width: 36px; text-align: right; white-space: nowrap; }
        #${PRINT_TARGET_ID} .note { font-size: 11px; font-style: italic; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [open]);

  if (!payload) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cetak Tiket Dapur</DialogTitle>
          <DialogDescription>
            Tinjau tiket sebelum mencetak. Tombol Print membuka dialog print
            browser dan hanya mencetak area tiket (layout 80mm).
          </DialogDescription>
        </DialogHeader>

        <div
          id={PRINT_TARGET_ID}
          className="rounded-md border bg-white p-3 text-sm font-mono text-black"
        >
          <h2 className="text-base font-semibold">KITCHEN TICKET</h2>
          <div className="meta space-y-0.5">
            {payload.ticketNumber ? (
              <div>Tiket: {payload.ticketNumber}</div>
            ) : null}
            {payload.orderNumber ? (
              <div>Order: {payload.orderNumber}</div>
            ) : null}
            <div>
              Meja: {payload.areaName ? `[${payload.areaName}] ` : ""}
              {payload.spotCode || "-"}
              {payload.spotName ? ` — ${payload.spotName}` : ""}
            </div>
            {payload.cashierName ? (
              <div>Kasir: {payload.cashierName}</div>
            ) : null}
            {payload.sessionNumber ? (
              <div>Sesi: {payload.sessionNumber}</div>
            ) : null}
            {sentAtLabel ? <div>Waktu: {sentAtLabel}</div> : null}
          </div>
          <hr />
          <table>
            <tbody>
              {payload.items.map((item) => (
                <tr key={item.productId}>
                  <td className="qty">{item.quantity}x</td>
                  <td>
                    <div>
                      {item.productName}
                      {item.sku ? ` (${item.sku})` : ""}
                    </div>
                    {item.note ? (
                      <div className="note">» {item.note}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          {payload.note ? (
            <div className="text-xs">Catatan: {payload.note}</div>
          ) : null}
          <div className="text-center text-xs pt-2">
            -- Diteruskan ke dapur --
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose}>
            Tutup
          </Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
