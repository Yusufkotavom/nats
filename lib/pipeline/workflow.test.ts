import { describe, expect, it } from "vitest";
import { getSalesNextStep, getServiceNextStep } from "./workflow";

describe("pipeline workflow helpers", () => {
  it("computes sales next step with shipment optional path", () => {
    expect(
      getSalesNextStep({
        orderStatus: "DRAFT",
        hasShipment: false,
        hasDraftShipment: false,
        shipmentSkipped: false,
        hasInvoice: false,
        invoiceStatus: null,
        hasPayment: false,
      }),
    ).toBe("confirm_order");

    expect(
      getSalesNextStep({
        orderStatus: "CONFIRMED",
        hasShipment: false,
        hasDraftShipment: false,
        shipmentSkipped: true,
        hasInvoice: false,
        invoiceStatus: null,
        hasPayment: false,
      }),
    ).toBe("invoice");

    expect(
      getSalesNextStep({
        orderStatus: "CONFIRMED",
        hasShipment: true,
        hasDraftShipment: true,
        shipmentSkipped: false,
        hasInvoice: false,
        invoiceStatus: null,
        hasPayment: false,
      }),
    ).toBe("complete_shipment");
  });

  it("computes service next step from status + remaining balance", () => {
    expect(
      getServiceNextStep({ status: "NEW", remainingAmount: 10000, canClose: false }),
    ).toBe("move_processing");
    expect(
      getServiceNextStep({ status: "READY", remainingAmount: 5000, canClose: false }),
    ).toBe("move_done");
    expect(
      getServiceNextStep({ status: "DONE", remainingAmount: 5000, canClose: false }),
    ).toBe("settle_payment");
    expect(
      getServiceNextStep({ status: "DONE", remainingAmount: 0, canClose: true }),
    ).toBe("close_order");
  });
});
