import React from "react";
import { pdf } from "@react-pdf/renderer";
import { getSalesInvoiceData } from "@/app/[locale]/(dashboard)/sales/_reports/sales-invoice/data";
import { SalesInvoicePdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-invoice/pdf";
import { getSalesOrderData } from "@/app/[locale]/(dashboard)/sales/_reports/sales-order/data";
import { SalesOrderPdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-order/pdf";
import { getServiceInvoiceData } from "@/app/[locale]/(dashboard)/services/_reports/service-invoice/data";
import { ServiceInvoicePdf } from "@/app/[locale]/(dashboard)/services/_reports/service-invoice/pdf";
import { getServiceWorkOrderData } from "@/app/[locale]/(dashboard)/services/_reports/service-work-order/data";
import { ServiceWorkOrderPdf } from "@/app/[locale]/(dashboard)/services/_reports/service-work-order/pdf";
import { getPOSReceiptData } from "@/app/[locale]/pos/_reports/receipt/data";
import { POSReceiptPdf } from "@/app/[locale]/pos/_reports/receipt/pdf";
import {
  getPublicTrackingAccess,
  type PublicDocumentCode,
} from "@/lib/public-tracking/customer-tracking";
import { prisma } from "@/lib/prisma";

type SupportedDocument = {
  fileName: string;
  companyId: string;
  context: any;
  component: (props: any) => React.ReactElement;
};

function buildPublicCompany(profile: any) {
  return {
    name: profile?.name || "Company",
    address: profile?.address || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    website: profile?.website || "",
    dateFormat: profile?.dateFormat || "dd MMM yyyy",
    currency: profile?.currency || "IDR",
    currencySymbol: profile?.currencySymbol || "Rp",
    currencyFormat: profile?.currencyFormat || "standard",
    locale: profile?.locale || "id-ID",
    serviceUniversalNote: profile?.serviceUniversalNote || "",
  };
}

function buildTranslations(code: PublicDocumentCode) {
  if (code !== "POS_RECEIPT") return {};
  return {
    pos_receipt: "POS Receipt",
    cashier: "Cashier",
    customer: "Customer",
    walk_in_customer: "Walk-in Customer",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    tax: "Tax",
    paid_via: "Paid Via",
    thank_you: "Thank you",
    come_again: "Come Again",
    invoice: "Invoice",
    date: "Date",
  };
}

async function canAccessInvoice(link: { companyId: string | null; contactId: string | null; sourceType: string; sourceId: string }, entityId: string) {
  if (!link.companyId) return false;

  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: entityId,
      companyId: link.companyId,
      ...(link.contactId ? { contactId: link.contactId } : {}),
    },
    select: {
      id: true,
      salesOrder: { select: { isServiceOrder: true } },
    },
  });
  if (invoice) return invoice;

  if (link.sourceType === "SALES_INVOICE" || link.sourceType === "POS_RECEIPT") {
    if (link.sourceId !== entityId) return false;
    return prisma.salesInvoice.findFirst({
      where: { id: entityId, companyId: link.companyId },
      select: {
        id: true,
        salesOrder: { select: { isServiceOrder: true } },
      },
    });
  }

  if (link.sourceType === "SALES_PAYMENT") {
    const payment = await prisma.salesPayment.findFirst({
      where: { id: link.sourceId, companyId: link.companyId },
      select: { salesInvoiceId: true },
    });
    if (!payment?.salesInvoiceId || payment.salesInvoiceId !== entityId) return false;
    return prisma.salesInvoice.findFirst({
      where: { id: entityId, companyId: link.companyId },
      select: {
        id: true,
        salesOrder: { select: { isServiceOrder: true } },
      },
    });
  }

  if (link.sourceType === "SERVICE_ORDER") {
    const serviceOrder = await prisma.pOSServiceOrder.findFirst({
      where: { id: link.sourceId, companyId: link.companyId },
      select: { salesInvoiceId: true },
    });
    if (!serviceOrder?.salesInvoiceId || serviceOrder.salesInvoiceId !== entityId) return false;
    return prisma.salesInvoice.findFirst({
      where: { id: entityId, companyId: link.companyId },
      select: {
        id: true,
        salesOrder: { select: { isServiceOrder: true } },
      },
    });
  }

  return false;
}

async function canAccessOrder(link: { companyId: string | null; contactId: string | null; sourceType: string; sourceId: string }, entityId: string) {
  if (!link.companyId) return false;

  const order = await prisma.salesOrder.findFirst({
    where: {
      id: entityId,
      companyId: link.companyId,
      ...(link.contactId ? { contactId: link.contactId } : {}),
    },
    select: { id: true, isServiceOrder: true },
  });
  if (order) return order;

  if (link.sourceType === "SALES_ORDER" && link.sourceId === entityId) {
    return prisma.salesOrder.findFirst({
      where: { id: entityId, companyId: link.companyId },
      select: { id: true, isServiceOrder: true },
    });
  }

  if (link.sourceType === "SERVICE_ORDER") {
    const serviceOrder = await prisma.pOSServiceOrder.findFirst({
      where: { id: link.sourceId, companyId: link.companyId },
      select: { salesOrderId: true },
    });
    if (!serviceOrder?.salesOrderId || serviceOrder.salesOrderId !== entityId) return false;
    return prisma.salesOrder.findFirst({
      where: { id: entityId, companyId: link.companyId },
      select: { id: true, isServiceOrder: true },
    });
  }

  return false;
}

async function resolveSupportedDocument(link: {
  companyId: string | null;
  contactId: string | null;
  sourceType: string;
  sourceId: string;
}, code: PublicDocumentCode, entityId: string): Promise<SupportedDocument | null> {
  if (!link.companyId) return null;

  if (code === "SALES_ORDER") {
    const allowed = await canAccessOrder(link, entityId);
    if (!allowed) return null;
    const data = await getSalesOrderData({ orderId: entityId });
    return {
      companyId: link.companyId,
      fileName: data.order.orderNumber || "sales-order",
      context: data,
      component: SalesOrderPdf,
    };
  }

  if (code === "SERVICE_WORK_ORDER") {
    const allowed = await canAccessOrder(link, entityId);
    if (!allowed || !allowed.isServiceOrder) return null;
    const data = await getServiceWorkOrderData({ orderId: entityId });
    return {
      companyId: link.companyId,
      fileName: data.serviceOrder.orderNumber || "service-work-order",
      context: data,
      component: ServiceWorkOrderPdf,
    };
  }

  if (code === "SALES_INVOICE") {
    const allowed = await canAccessInvoice(link, entityId);
    if (!allowed) return null;
    const data = await getSalesInvoiceData({ invoiceId: entityId });
    return {
      companyId: link.companyId,
      fileName: data.invoice.invoiceNumber || "sales-invoice",
      context: data,
      component: SalesInvoicePdf,
    };
  }

  if (code === "SERVICE_INVOICE") {
    const allowed = await canAccessInvoice(link, entityId);
    if (!allowed || !allowed.salesOrder?.isServiceOrder) return null;
    const data = await getServiceInvoiceData({ invoiceId: entityId });
    return {
      companyId: link.companyId,
      fileName: data.invoice.invoiceNumber || "service-invoice",
      context: data,
      component: ServiceInvoicePdf,
    };
  }

  if (code === "POS_RECEIPT") {
    const allowed = await canAccessInvoice(link, entityId);
    if (!allowed) return null;
    const data = await getPOSReceiptData({ invoiceId: entityId });
    return {
      companyId: link.companyId,
      fileName: data.invoice.invoiceNumber || "pos-receipt",
      context: data,
      component: POSReceiptPdf,
    };
  }

  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") as PublicDocumentCode | null;
  const entityId = searchParams.get("entityId");

  if (!code || !entityId) {
    return new Response("Missing document code or entity id", { status: 400 });
  }

  const { link, reason } = await getPublicTrackingAccess(token);
  if (!link) {
    return new Response(reason === "expired" ? "Link expired" : "Link not found", { status: 404 });
  }

  const resolved = await resolveSupportedDocument(link, code, entityId);
  if (!resolved) {
    return new Response("Document not available for this public link", { status: 404 });
  }

  const company = await prisma.company.findFirst({
    where: { id: resolved.companyId },
    include: { profile: true },
  });
  const reportTemplate = await prisma.reportTemplate.findUnique({
    where: { code },
  });

  const reportContext = {
    data: resolved.context,
    user: {
      name: "Public Customer",
      email: "",
    },
    company: buildPublicCompany(company?.profile),
    config: ((reportTemplate?.config as Record<string, unknown>) || {}) as Record<string, unknown>,
    translations: buildTranslations(code),
  };

  const blob = await pdf(React.createElement(resolved.component, reportContext)).toBlob();
  const buffer = await blob.arrayBuffer();
  const safeFileName = resolved.fileName.replace(/[^a-zA-Z0-9-_]+/g, "-");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
