import { render, screen } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PurchaseInvoiceForm } from "./purchase-invoice-form";
import { SuperJSON } from "@/lib/superjson";

const confirmMock = vi.fn(async (_options: any) => false);

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../actions", () => ({
  createPurchaseInvoice: vi.fn(),
  updatePurchaseInvoice: vi.fn(),
  getPurchaseOrder: vi.fn(),
  postPurchaseInvoice: vi.fn(),
}));

vi.mock("@/app/[locale]/(dashboard)/general/files/actions", () => ({
  uploadFile: vi.fn(),
}));

vi.mock("@/hooks/use-confirm", () => ({
  useConfirm: () => confirmMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/providers/session-provider", () => ({
  useCompanyProfile: () => ({ dateFormat: "dd/MM/yyyy" }),
}));

describe("PurchaseInvoiceForm", () => {
  beforeEach(() => {
    confirmMock.mockClear();
  });

  it("restores selected product from persisted productId when editing", () => {
    const invoice = SuperJSON.serialize({
      id: "pi-1",
      invoiceNumber: "PINV-001",
      contactId: "vendor-1",
      purchaseOrderId: null,
      invoiceDate: new Date("2026-06-02"),
      dueDate: new Date("2026-06-10"),
      notes: null,
      status: "DRAFT",
      globalDiscount: 0,
      totalTax: 0,
      shippingCost: 0,
      handlingCost: 0,
      departmentId: null,
      projectId: null,
      attachments: [],
      items: [
        {
          id: "item-1",
          description: "Widget A",
          productId: "prod-1",
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          tax: 0,
          taxRateId: null,
        },
      ],
    });

    render(
      <PurchaseInvoiceForm
        invoice={invoice}
        vendors={[{ id: "vendor-1", name: "Vendor A" }]}
        purchaseOrders={SuperJSON.serialize([])}
        products={[
          {
            id: "prod-1",
            name: "Widget A",
            price: 150,
            cost: 100,
            sku: "W-A",
            category: null,
          },
        ] as any}
        taxRates={[]}
      />,
    );

    expect(screen.getByDisplayValue("Widget A")).toBeInTheDocument();
  });

  it("shows an informative multiline post invoice confirmation summary", async () => {
    const invoice = SuperJSON.serialize({
      id: "pi-1",
      invoiceNumber: "PI-2606-0038",
      contactId: "vendor-1",
      contact: { id: "vendor-1", name: "Vendor A" },
      purchaseOrderId: null,
      invoiceDate: new Date("2026-06-02"),
      dueDate: new Date("2026-06-10"),
      notes: null,
      status: "DRAFT",
      totalAmount: 50000,
      balanceDue: 50000,
      globalDiscount: 0,
      totalTax: 0,
      shippingCost: 0,
      handlingCost: 0,
      departmentId: null,
      projectId: null,
      attachments: [],
      items: [
        {
          id: "item-1",
          description: "Widget A",
          productId: "prod-1",
          quantity: 1,
          unitPrice: 50000,
          discount: 0,
          tax: 0,
          taxRateId: null,
        },
      ],
    });

    render(
      <PurchaseInvoiceForm
        invoice={invoice}
        vendors={[{ id: "vendor-1", name: "Vendor A" }]}
        purchaseOrders={SuperJSON.serialize([])}
        products={[]}
        taxRates={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Post Invoice" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    const options = confirmMock.mock.calls[0][0];
    expect(options).toMatchObject({
      title: "Post Invoice",
    });
    expect(options.description.split("\n")).toEqual([
      "Invoice: PI-2606-0038",
      "Vendor: Vendor A",
      "Jumlah item produk/jasa: 1",
      expect.stringMatching(/^Nominal transaksi: Rp/),
      expect.stringMatching(/^Sisa tagihan saat ini: Rp/),
      "Aksi ini akan membuat jurnal dan tidak bisa dibatalkan.",
    ]);
  });
});
