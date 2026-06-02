import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  publicCustomerLink: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  salesInvoice: {
    findFirst: vi.fn(),
  },
  pOSServiceOrder: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  buildPublicTrackingUrl,
  getPublicTrackingPageData,
} from "./customer-tracking";

describe("customer public tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an opaque public tracking URL for a document source", async () => {
    prismaMock.publicCustomerLink.create.mockResolvedValue({
      id: "link-1",
    });

    const result = await buildPublicTrackingUrl({
      baseUrl: "https://restoran.devk.my.id",
      locale: "id",
      companyId: "company-1",
      sourceType: "SALES_INVOICE",
      sourceId: "invoice-1",
      contactId: "contact-1",
    });

    expect(result.url).toMatch(/^https:\/\/restoran\.devk\.my\.id\/id\/public\/t\/[A-Za-z0-9_-]+$/);
    expect(result.token).toHaveLength(43);
    expect(prismaMock.publicCustomerLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          contactId: "contact-1",
          sourceType: "SALES_INVOICE",
          sourceId: "invoice-1",
          tokenHash: expect.any(String),
        }),
      }),
    );
  });

  it("resolves an invoice token into public company, customer, document, and status data", async () => {
    const now = new Date("2026-06-02T10:00:00.000Z");
    prismaMock.publicCustomerLink.findFirst.mockResolvedValue({
      id: "link-1",
      companyId: "company-1",
      contactId: "contact-1",
      sourceType: "SALES_INVOICE",
      sourceId: "invoice-1",
      expiresAt: null,
      revokedAt: null,
      viewCount: 2,
    });
    prismaMock.salesInvoice.findFirst.mockResolvedValue({
      id: "invoice-1",
      companyId: "company-1",
      invoiceNumber: "INV-2606-0038",
      status: "ISSUED",
      totalAmount: 50000,
      balanceDue: 50000,
      invoiceDate: now,
      dueDate: now,
      contact: {
        id: "contact-1",
        name: "wii book",
        phone: "081234567890",
      },
      company: {
        name: "Restoran Dev",
        profile: {
          name: "Restoran Dev",
          address: "Jl. Testing",
          phone: "0811111111",
          email: "admin@restoran.test",
          website: "https://restoran.devk.my.id",
          currencySymbol: "Rp",
          locale: "id-ID",
        },
      },
      salesOrder: {
        orderNumber: "SO-2606-0001",
        isServiceOrder: false,
        serviceWorkflowStatus: null,
      },
      payments: [],
    });

    const data = await getPublicTrackingPageData({
      token: "public-token",
      currentUrl: "https://restoran.devk.my.id/id/public/t/public-token",
    });

    expect(data.isFound).toBe(true);
    if (!data.isFound) {
      throw new Error("Expected public invoice tracking data");
    }

    expect(data).toEqual(
      expect.objectContaining({
        isFound: true,
        company: expect.objectContaining({
          name: "Restoran Dev",
          supportWhatsAppUrl: expect.stringContaining(
            "https%3A%2F%2Frestoran.devk.my.id%2Fid%2Fpublic%2Ft%2Fpublic-token",
          ),
        }),
        customer: {
          name: "wii book",
          phone: "081234567890",
        },
        document: expect.objectContaining({
          type: "Sales Invoice",
          number: "INV-2606-0038",
          orderNumber: "SO-2606-0001",
        }),
      }),
    );
    expect(data.statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Invoice", value: "ISSUED" }),
        expect.objectContaining({ label: "Sisa tagihan", value: "Rp50.000,00" }),
      ]),
    );
    expect(prismaMock.publicCustomerLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "link-1" },
        data: expect.objectContaining({
          viewCount: { increment: 1 },
          lastViewedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("resolves a service token into service workflow status and linked invoice status", async () => {
    prismaMock.publicCustomerLink.findFirst.mockResolvedValue({
      id: "link-1",
      companyId: "company-1",
      contactId: "contact-1",
      sourceType: "SERVICE_ORDER",
      sourceId: "service-1",
      expiresAt: null,
      revokedAt: null,
      viewCount: 0,
    });
    prismaMock.pOSServiceOrder.findFirst.mockResolvedValue({
      id: "service-1",
      companyId: "company-1",
      orderNumber: "WO-2606-0001",
      status: "READY",
      totalAmount: 120000,
      remainingAmount: 70000,
      targetDate: new Date("2026-06-04T00:00:00.000Z"),
      contactId: "contact-1",
      company: {
        name: "Restoran Dev",
        profile: {
          name: "Restoran Dev",
          address: "Jl. Testing",
          phone: "0811111111",
          email: null,
          website: null,
          currencySymbol: "Rp",
          locale: "id-ID",
        },
      },
    });
    prismaMock.salesInvoice.findFirst.mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-2606-0039",
      status: "PARTIALLY_PAID",
      balanceDue: 70000,
      contact: {
        id: "contact-1",
        name: "Pelanggan Service",
        phone: "081299988877",
      },
    });

    const data = await getPublicTrackingPageData({
      token: "service-token",
      currentUrl: "https://restoran.devk.my.id/id/public/t/service-token",
    });

    expect(data.isFound).toBe(true);
    if (!data.isFound) {
      throw new Error("Expected public service tracking data");
    }

    expect(data.document).toEqual(
      expect.objectContaining({
        type: "Service Order",
        number: "WO-2606-0001",
        invoiceNumber: "INV-2606-0039",
      }),
    );
    expect(data.customer).toEqual({
      name: "Pelanggan Service",
      phone: "081299988877",
    });
    expect(data.statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Service", value: "READY" }),
        expect.objectContaining({ label: "Invoice", value: "PARTIALLY_PAID" }),
      ]),
    );
  });
});
