import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServicePipelineTopbar } from "./service-pipeline-topbar";

describe("ServicePipelineTopbar", () => {
  it("renders linked stages when invoice/payment exist", () => {
    render(
      <ServicePipelineTopbar
        data={{
          orderId: "svc-1",
          orderNumber: "SVC-001",
          orderStatus: "IN_PROGRESS",
          invoiceId: "inv-1",
          invoiceNumber: "INV-001",
          invoiceStatus: "ISSUED",
          paymentId: "pay-1",
          paymentNumber: "PAY-001",
          paymentPosted: true,
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /service order/i })).toHaveAttribute(
      "href",
      "/services/pipeline/svc-1",
    );
    expect(screen.getByRole("link", { name: /invoice/i })).toHaveAttribute(
      "href",
      "/sales/invoices/inv-1",
    );
    expect(screen.getByRole("link", { name: /payment/i })).toHaveAttribute(
      "href",
      "/sales/payments/pay-1",
    );
  });

  it("shows placeholder for stages that are not created", () => {
    render(
      <ServicePipelineTopbar
        data={{
          orderId: "svc-1",
          orderNumber: "SVC-001",
          orderStatus: "NEW",
          invoiceId: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentId: null,
          paymentNumber: null,
          paymentPosted: null,
        }}
      />,
    );

    expect(screen.getByText("Invoice: -")).toBeInTheDocument();
    expect(screen.getByText("Payment: -")).toBeInTheDocument();
  });
});
