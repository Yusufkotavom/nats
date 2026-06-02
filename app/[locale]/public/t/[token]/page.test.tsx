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
  it("renders company header, full customer phone, and support CTA", async () => {
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
        remainingAmount: "Rp50.000,00",
        date: "02 Jun 2026",
        targetDate: "02 Jun 2026",
      },
      statuses: [
        { label: "Invoice", value: "ISSUED", tone: "success" },
        { label: "Sisa tagihan", value: "Rp50.000,00", tone: "warning" },
      ],
      actions: [],
    });

    render(await PublicTrackingPage({ params: Promise.resolve({ locale: "id", token: "abc" }) }));

    expect(screen.getByText("Restoran Dev")).toBeInTheDocument();
    expect(screen.getByText("081234567890")).toBeInTheDocument();
    expect(screen.getAllByText("INV-2606-0038")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Hubungi Support WhatsApp/i })).toHaveAttribute(
      "href",
      "https://wa.me/628111111111?text=test",
    );
  });
});
