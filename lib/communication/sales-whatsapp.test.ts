import { describe, expect, it } from "vitest";
import {
  buildSalesInvoiceWhatsAppMessage,
  normalizePhoneForWhatsApp,
} from "./sales-whatsapp";

describe("sales-whatsapp", () => {
  it("normalizes Indonesian phone numbers", () => {
    expect(normalizePhoneForWhatsApp("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhoneForWhatsApp("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhoneForWhatsApp("81234567890")).toBe("6281234567890");
  });

  it("builds message with invoice and receipt urls", () => {
    const message = buildSalesInvoiceWhatsAppMessage({
      contactName: "Budi",
      invoiceNumber: "INV-001",
      totalAmount: 150000,
      balanceDue: 50000,
      invoiceUrl: "https://app.test/invoice",
      receiptUrl: "https://app.test/receipt",
      introLabel: "Berikut invoice Anda",
      totalLabel: "Total:",
      balanceLabel: "Sisa:",
      helpLabel: "Silakan hubungi kami.",
    });

    expect(message).toContain("Halo Budi");
    expect(message).toContain("INV-001");
    expect(message).toContain("Invoice PDF: https://app.test/invoice");
    expect(message).toContain("Nota POS: https://app.test/receipt");
  });
});
