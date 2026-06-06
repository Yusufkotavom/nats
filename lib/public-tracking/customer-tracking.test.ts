import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  publicCustomerLink: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  salesOrder: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  salesInvoice: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  salesPayment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  pOSServiceOrder: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  buildPublicTrackingUrl,
  getPublicTrackingAccess,
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

  it("resolves access metadata for an active public token", async () => {
    prismaMock.publicCustomerLink.findFirst.mockResolvedValue({
      id: "link-1",
      companyId: "company-1",
      contactId: "contact-1",
      sourceType: "SALES_INVOICE",
      sourceId: "invoice-1",
      expiresAt: null,
      revokedAt: null,
    });

    const result = await getPublicTrackingAccess("public-token");

    expect(result.reason).toBeNull();
    expect(result.link).toEqual(
      expect.objectContaining({
        id: "link-1",
        companyId: "company-1",
        contactId: "contact-1",
      }),
    );
  });

  it("returns invoice summary, latest history, full history, and public document downloads", async () => {
    const now = new Date("2026-06-02T10:00:00.000Z");
    const due = new Date("2026-06-05T10:00:00.000Z");

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
      balanceDue: 10000,
      invoiceDate: now,
      dueDate: due,
      posSessionId: "session-1",
      contact: {
        id: "contact-1",
        name: "Wii Book",
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
          currency: "IDR",
          currencyFormat: "standard",
          locale: "id-ID",
          dateFormat: "dd MMM yyyy",
        },
      },
      salesOrder: {
        id: "order-1",
        orderNumber: "SO-2606-0001",
        isServiceOrder: false,
        serviceWorkflowStatus: null,
      },
      payments: [
        {
          id: "payment-1",
          paymentNumber: "PAY-2606-0001",
        },
      ],
      notes: "Jatuh tempo normal",
    });
    prismaMock.salesOrder.findMany.mockResolvedValue([
      {
        id: "order-1",
        orderNumber: "SO-2606-0001",
        status: "CONFIRMED",
        totalAmount: 50000,
        orderDate: new Date("2026-06-01T08:00:00.000Z"),
        expectedDate: due,
        notes: "Order customer",
        isServiceOrder: false,
        serviceWorkflowStatus: null,
      },
    ]);
    prismaMock.salesInvoice.findMany.mockResolvedValue([
      {
        id: "invoice-1",
        invoiceNumber: "INV-2606-0038",
        status: "ISSUED",
        totalAmount: 50000,
        balanceDue: 10000,
        invoiceDate: now,
        dueDate: due,
        notes: "Invoice berjalan",
        posSessionId: "session-1",
        salesOrderId: "order-1",
        payments: [{ id: "payment-1", paymentNumber: "PAY-2606-0001" }],
      },
    ]);
    prismaMock.salesPayment.findMany.mockResolvedValue([
      {
        id: "payment-1",
        paymentNumber: "PAY-2606-0001",
        paymentDate: new Date("2026-06-02T12:00:00.000Z"),
        amount: 40000,
        method: "Cash",
        reference: "REF-001",
        notes: "Pelunasan sebagian",
        salesInvoiceId: "invoice-1",
        cashAccount: { name: "Cash" },
      },
    ]);
    prismaMock.pOSServiceOrder.findMany.mockResolvedValue([]);

    const data = await getPublicTrackingPageData({
      token: "public-token",
      currentUrl: "https://restoran.devk.my.id/id/public/t/public-token",
    });

    expect(data.isFound).toBe(true);
    if (!data.isFound) {
      throw new Error("Expected public invoice tracking data");
    }

    expect(data.document).toEqual(
      expect.objectContaining({
        type: "Sales Invoice",
        number: "INV-2606-0038",
        orderNumber: "SO-2606-0001",
        remainingAmount: "Rp10.000,00",
      }),
    );
    expect(data.availableDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Sales Order PDF",
          code: "SALES_ORDER",
        }),
        expect.objectContaining({
          label: "Invoice PDF",
          code: "SALES_INVOICE",
        }),
        expect.objectContaining({
          label: "POS Receipt",
          code: "POS_RECEIPT",
        }),
      ]),
    );
    expect(
      data.availableDocuments.some((document) => document.label.includes("Payment")),
    ).toBe(false);
    expect(data.latestHistory).toEqual(
      expect.objectContaining({
        type: "Sales Payment",
        documentNumber: "PAY-2606-0001",
        isLatest: true,
      }),
    );
    expect(data.fullHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "Sales Payment",
          documentNumber: "PAY-2606-0001",
        }),
        expect.objectContaining({
          type: "Sales Invoice",
          documentNumber: "INV-2606-0038",
        }),
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

  it("resolves a service token into service workflow history and documents", async () => {
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
      createdAt: new Date("2026-06-02T09:00:00.000Z"),
      targetDate: new Date("2026-06-04T00:00:00.000Z"),
      contactId: "contact-1",
      salesOrderId: "order-1",
      salesInvoiceId: "invoice-1",
      notes: "Servis jalan",
      company: {
        name: "Restoran Dev",
        profile: {
          name: "Restoran Dev",
          address: "Jl. Testing",
          phone: "0811111111",
          currencySymbol: "Rp",
          currency: "IDR",
          currencyFormat: "standard",
          locale: "id-ID",
          dateFormat: "dd MMM yyyy",
        },
      },
    });
    prismaMock.salesOrder.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "SO-2606-0001",
      contact: {
        name: "Pelanggan Service",
        phone: "081299988877",
      },
    });
    prismaMock.salesInvoice.findFirst.mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-2606-0039",
      status: "PARTIALLY_PAID",
      totalAmount: 120000,
      balanceDue: 70000,
      dueDate: new Date("2026-06-04T00:00:00.000Z"),
      contact: {
        id: "contact-1",
        name: "Pelanggan Service",
        phone: "081299988877",
      },
      payments: [],
    });
    prismaMock.salesOrder.findMany.mockResolvedValue([]);
    prismaMock.salesInvoice.findMany.mockResolvedValue([]);
    prismaMock.salesPayment.findMany.mockResolvedValue([]);
    prismaMock.pOSServiceOrder.findMany.mockResolvedValue([
      {
        id: "service-1",
        orderNumber: "WO-2606-0001",
        status: "READY",
        totalAmount: 120000,
        remainingAmount: 70000,
        createdAt: new Date("2026-06-02T09:00:00.000Z"),
        targetDate: new Date("2026-06-04T00:00:00.000Z"),
        notes: "Servis jalan",
        salesOrderId: "order-1",
        salesInvoiceId: "invoice-1",
      },
    ]);

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
    expect(data.availableDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SERVICE_WORK_ORDER" }),
        expect.objectContaining({ code: "SERVICE_INVOICE" }),
      ]),
    );
    expect(data.fullHistory[0]).toEqual(
      expect.objectContaining({
        type: "Service Order",
      }),
    );
  });
});
