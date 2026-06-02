import { describe, expect, it } from "vitest";

import { buildSalesInvoiceDraftSavedDescription } from "./sales-invoice-form";

describe("SalesInvoiceForm messaging", () => {
  it("explains that a newly created sales invoice is still draft and must be posted", () => {
    const description = buildSalesInvoiceDraftSavedDescription({
      invoiceNumber: "INV-2606-0038",
      customerName: "wii book",
    });

    expect(description.split("\n")).toEqual([
      "Invoice INV-2606-0038 untuk wii book berhasil dibuat sebagai Draft.",
      "Silakan edit dan periksa lagi data invoice sebelum diposting.",
      "Klik Post Invoice untuk membuat invoice resmi dan jurnal transaksi.",
    ]);
  });
});
