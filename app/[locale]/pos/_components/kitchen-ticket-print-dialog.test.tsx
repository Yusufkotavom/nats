import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type {
  KitchenTicketPrintDialogProps,
  KitchenTicketPrintPayload,
} from "./kitchen-ticket-print-dialog";
import { KitchenTicketPrintDialog } from "./kitchen-ticket-print-dialog";

// Radix dialog relies on ResizeObserver in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  ResizeObserverMock;

const basePayload: KitchenTicketPrintPayload = {
  ticketId: "kt-1",
  ticketNumber: "KOT-1001",
  orderId: "ro-1",
  orderNumber: "RO-POS-1001",
  sessionNumber: "POS-1",
  cashierName: "Jane Cashier",
  spotCode: "T-05",
  spotName: "Meja 5",
  areaName: "Indoor",
  sentAt: new Date("2026-05-13T12:00:00Z"),
  note: "Tolong cepat",
  items: [
    {
      productId: "p1",
      productName: "Ayam Bakar",
      sku: "AYM-01",
      quantity: 2,
      note: "medium well",
    },
    {
      productId: "p2",
      productName: "Es Teh",
      sku: "ES-TH",
      quantity: 3,
    },
  ],
};

function renderDialog(
  overrides: Partial<KitchenTicketPrintDialogProps> = {},
) {
  const onOpenChange = vi.fn();
  const onDone = vi.fn();
  const utils = render(
    <KitchenTicketPrintDialog
      open={true}
      onOpenChange={onOpenChange}
      payload={basePayload}
      onDone={onDone}
      {...overrides}
    />,
  );
  return { ...utils, onOpenChange, onDone };
}

describe("KitchenTicketPrintDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when payload is null", () => {
    render(
      <KitchenTicketPrintDialog
        open={true}
        onOpenChange={vi.fn()}
        payload={null}
      />,
    );
    expect(screen.queryByText(/KITCHEN TICKET/i)).not.toBeInTheDocument();
  });

  it("renders payload details in the print area", () => {
    renderDialog();
    expect(screen.getByText("KITCHEN TICKET")).toBeInTheDocument();
    expect(screen.getByText(/KOT-1001/)).toBeInTheDocument();
    expect(screen.getByText(/RO-POS-1001/)).toBeInTheDocument();
    expect(screen.getByText(/\[Indoor\] T-05/)).toBeInTheDocument();
    expect(screen.getByText(/Meja 5/)).toBeInTheDocument();
    expect(screen.getByText(/Jane Cashier/)).toBeInTheDocument();
    expect(screen.getByText(/Sesi: POS-1/)).toBeInTheDocument();
    expect(screen.getByText(/Ayam Bakar/)).toBeInTheDocument();
    expect(screen.getByText(/» medium well/)).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("3x")).toBeInTheDocument();
    expect(screen.getByText(/Catatan: Tolong cepat/)).toBeInTheDocument();
  });

  it("calls window.print when Print is clicked", () => {
    const printSpy = vi
      .spyOn(window, "print")
      .mockImplementation(() => undefined);
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) and onDone when Tutup is clicked", () => {
    const { onOpenChange, onDone } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /tutup/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("injects a print-only stylesheet while open", () => {
    const { unmount } = renderDialog();
    const style = document.querySelector(
      "style[data-kitchen-ticket-print]",
    );
    expect(style).not.toBeNull();
    unmount();
    const afterUnmount = document.querySelector(
      "style[data-kitchen-ticket-print]",
    );
    expect(afterUnmount).toBeNull();
  });
});
