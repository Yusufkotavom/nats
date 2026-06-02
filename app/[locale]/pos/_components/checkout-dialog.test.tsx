import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { CheckoutDialog } from "./checkout-dialog";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => undefined;
}

describe("CheckoutDialog pre-order mode", () => {
  it("submits pay-now mode by default", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <CheckoutDialog
        open
        onOpenChange={() => undefined}
        totalAmount={100000}
        onConfirm={onConfirm}
        paymentMethods={[{ id: "cash-1", name: "Cash", method: "CASH" }]}
        contacts={[]}
        selectedContactId={undefined}
        onSelectedContactChange={() => undefined}
        onQuickCreateContact={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("amount_paid"), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    expect(onConfirm).toHaveBeenCalledWith(
      "PAY_NOW",
      "CASH",
      100000,
      undefined,
      "cash-1",
    );
  });

  it("submits pre-order mode with invoice-only semantics", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <CheckoutDialog
        open
        onOpenChange={() => undefined}
        totalAmount={100000}
        allowPreOrder
        onConfirm={onConfirm}
        paymentMethods={[{ id: "cash-1", name: "Cash", method: "CASH" }]}
        contacts={[]}
        selectedContactId={undefined}
        onSelectedContactChange={() => undefined}
        onQuickCreateContact={() => undefined}
      />,
    );

    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(screen.getByText("Pre-Order (Invoice Only)"));
    fireEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    expect(onConfirm).toHaveBeenCalledWith(
      "PRE_ORDER",
      "CASH",
      0,
      undefined,
      "cash-1",
    );
  });

  it("hides pre-order mode on payment-only surfaces", () => {
    render(
      <CheckoutDialog
        open
        onOpenChange={() => undefined}
        totalAmount={100000}
        onConfirm={vi.fn()}
        paymentMethods={[{ id: "cash-1", name: "Cash", method: "CASH" }]}
        contacts={[]}
        selectedContactId={undefined}
        onSelectedContactChange={() => undefined}
        onQuickCreateContact={() => undefined}
      />,
    );

    expect(screen.queryByText("Pre-Order (Invoice Only)")).not.toBeInTheDocument();
    expect(screen.queryByText("Bayar Sekarang")).not.toBeInTheDocument();
  });

  it("uses searchable customer picker like sales order", () => {
    const onSelectedContactChange = vi.fn();
    const onContactSearch = vi.fn();

    render(
      <CheckoutDialog
        open
        onOpenChange={() => undefined}
        totalAmount={100000}
        onConfirm={vi.fn()}
        paymentMethods={[{ id: "cash-1", name: "Cash", method: "CASH" }]}
        contacts={[
          {
            id: "cust-1",
            name: "PT Alpha",
            phone: "08123",
            email: "alpha@example.com",
            address: "Bandung",
          },
        ]}
        selectedContactId={undefined}
        onSelectedContactChange={onSelectedContactChange}
        onContactSearch={onContactSearch}
        onQuickCreateContact={() => undefined}
      />,
    );

    fireEvent.click(screen.getByPlaceholderText("walk_in_customer"));
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "Alpha" },
    });
    fireEvent.click(screen.getByText("PT Alpha"));

    expect(onContactSearch).toHaveBeenCalledWith("Alpha");
    expect(onSelectedContactChange).toHaveBeenCalledWith("cust-1");
  });
});
