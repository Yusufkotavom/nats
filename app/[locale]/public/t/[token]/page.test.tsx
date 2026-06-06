import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
const getPublicTrackingPageDataMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/public-tracking/customer-tracking", () => ({
  getPublicTrackingPageData: getPublicTrackingPageDataMock,
}));

import PublicTrackingPage from "./page";

describe("PublicTrackingPage", () => {
  it("renders latest history, full history, and public document downloads", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        host: "restoran.devk.my.id",
        "x-forwarded-proto": "https",
      }),
    );
    getPublicTrackingPageDataMock.mockResolvedValue({
      isFound: true,
      company: {
        name: "Restoran Dev",
        address: "Jl. Testing",
        phone: "0811111111",
        email: null,
        website: null,
        supportWhatsAppUrl: "https://wa.me/628111111111?text=test",
      },
      customer: {
        name: "Wii Book",
        phone: "081234567890",
      },
      document: {
        type: "Sales Invoice",
        number: "INV-2606-0038",
        orderNumber: "SO-2606-0001",
        invoiceNumber: "INV-2606-0038",
        amount: "Rp50.000,00",
        remainingAmount: "Rp10.000,00",
        date: "02 Jun 2026",
        targetDate: "05 Jun 2026",
      },
      statuses: [
        { label: "Invoice", value: "ISSUED", tone: "success" },
        { label: "Sisa tagihan", value: "Rp10.000,00", tone: "warning" },
      ],
      actions: [
        {
          label: "Hubungi admin via WhatsApp",
          href: "https://wa.me/628111111111?text=test",
          kind: "support",
        },
      ],
      availableDocuments: [
        {
          label: "Invoice PDF",
          href: "https://restoran.devk.my.id/id/public/t/abc/documents?code=SALES_INVOICE&entityId=invoice-1",
          code: "SALES_INVOICE",
          entityId: "invoice-1",
        },
      ],
      latestHistory: {
        id: "sales-payment-1",
        area: "Sales",
        type: "Sales Payment",
        documentNumber: "PAY-2606-0001",
        status: "POSTED",
        amount: "Rp40.000,00",
        balanceDue: null,
        happenedAt: "02 Jun 2026",
        detail: "Invoice INV-2606-0038 • Cash",
        isLatest: true,
        documentLinks: [
          {
            label: "Invoice PDF",
            href: "https://restoran.devk.my.id/id/public/t/abc/documents?code=SALES_INVOICE&entityId=invoice-1",
            code: "SALES_INVOICE",
            entityId: "invoice-1",
          },
        ],
      },
      fullHistory: [
        {
          id: "sales-payment-1",
          area: "Sales",
          type: "Sales Payment",
          documentNumber: "PAY-2606-0001",
          status: "POSTED",
          amount: "Rp40.000,00",
          balanceDue: null,
          happenedAt: "02 Jun 2026",
          detail: "Invoice INV-2606-0038 • Cash",
          isLatest: true,
          documentLinks: [
            {
              label: "Invoice PDF",
              href: "https://restoran.devk.my.id/id/public/t/abc/documents?code=SALES_INVOICE&entityId=invoice-1",
              code: "SALES_INVOICE",
              entityId: "invoice-1",
            },
          ],
        },
        {
          id: "sales-invoice-1",
          area: "Sales",
          type: "Sales Invoice",
          documentNumber: "INV-2606-0038",
          status: "ISSUED",
          amount: "Rp50.000,00",
          balanceDue: "Rp10.000,00",
          happenedAt: "01 Jun 2026",
          detail: "Jatuh tempo 05 Jun 2026",
          isLatest: false,
          documentLinks: [
            {
              label: "Invoice PDF",
              href: "https://restoran.devk.my.id/id/public/t/abc/documents?code=SALES_INVOICE&entityId=invoice-1",
              code: "SALES_INVOICE",
              entityId: "invoice-1",
            },
          ],
        },
      ],
    });

    render(await PublicTrackingPage({ params: Promise.resolve({ locale: "id", token: "abc" }) }));

    expect(screen.getByText("Restoran Dev")).toBeInTheDocument();
    expect(
      screen.getByText(/menampilkan status terbaru, history transaksi customer, dan dokumen/i),
    ).toBeInTheDocument();
    expect(screen.getByText("History Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Dokumen Tersedia")).toBeInTheDocument();
    expect(screen.getAllByText("INV-2606-0038").length).toBeGreaterThan(1);
    expect(
      screen
        .getAllByRole("link", { name: /Invoice PDF/i })
        .some(
          (node) =>
            node.getAttribute("href") ===
            "https://restoran.devk.my.id/id/public/t/abc/documents?code=SALES_INVOICE&entityId=invoice-1",
        ),
    ).toBe(true);
    expect(screen.getAllByRole("link", { name: /Invoice PDF/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Hubungi Support WhatsApp/i })).toHaveAttribute(
      "href",
      "https://wa.me/628111111111?text=test",
    );
  });
});
