import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SalesPipelineTopbar } from "./sales-pipeline-topbar";

describe("SalesPipelineTopbar", () => {
  it("renders links for available pipeline stages", () => {
    render(
      <SalesPipelineTopbar
        active="order"
        data={{
          orderId: "so-1",
          shipmentId: "sh-1",
          invoiceId: "inv-1",
          paymentId: "pay-1",
          orderStatus: "APPROVED",
          shipmentStatus: "COMPLETED",
          invoiceStatus: "ISSUED",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /order/i })).toHaveAttribute(
      "href",
      "/sales/orders/so-1/edit",
    );
    expect(screen.getByRole("link", { name: /shipment/i })).toHaveAttribute(
      "href",
      "/sales/shipments/sh-1/edit",
    );
    expect(screen.getByRole("link", { name: /invoice/i })).toHaveAttribute(
      "href",
      "/sales/invoices/inv-1/edit",
    );
    expect(screen.getByRole("link", { name: /payment/i })).toHaveAttribute(
      "href",
      "/sales/payments/pay-1/edit",
    );
  });

  it("renders placeholder for stages not created yet", () => {
    render(
      <SalesPipelineTopbar
        active="order"
        data={{
          orderId: "so-1",
          shipmentId: null,
          invoiceId: null,
          paymentId: null,
          orderStatus: "DRAFT",
          shipmentStatus: null,
          invoiceStatus: null,
        }}
      />,
    );

    expect(screen.getByText("Shipment: -")).toBeInTheDocument();
    expect(screen.getByText("Invoice: -")).toBeInTheDocument();
    expect(screen.getByText("Payment: -")).toBeInTheDocument();
  });
});
