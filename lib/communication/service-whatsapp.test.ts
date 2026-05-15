import { describe, expect, it } from "vitest";
import {
  buildServiceOrderCreatedMessage,
  buildServicePaymentReceivedMessage,
  buildServiceStatusUpdatedMessage,
} from "./service-whatsapp";

describe("service-whatsapp", () => {
  it("builds order created message with DP lines", () => {
    const message = buildServiceOrderCreatedMessage({
      customerName: "Budi",
      orderNumber: "SVC-001",
      itemsSummary: "Cetak Banner x1",
      totalAmount: 500000,
      downPaymentAmount: 200000,
      remainingAmount: 300000,
      targetDateLabel: "20/05/2026",
    });

    expect(message).toContain("SVC-001");
    expect(message).toContain("DP diterima");
    expect(message).toContain("Sisa pembayaran");
  });

  it("builds ready-to-pickup message for READY/DONE", () => {
    const message = buildServiceStatusUpdatedMessage({
      customerName: "Budi",
      orderNumber: "SVC-001",
      status: "READY",
      readyToPickup: true,
    });

    expect(message).toContain("siap diambil");
  });

  it("builds payment received proof message", () => {
    const message = buildServicePaymentReceivedMessage({
      customerName: "Budi",
      orderNumber: "SVC-001",
      paymentAmount: 300000,
      remainingAmount: 0,
    });

    expect(message).toContain("Pembayaran");
    expect(message).toContain("Sisa pembayaran: 0");
  });
});
