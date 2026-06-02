import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { normalizePhoneForWhatsApp } from "@/lib/communication/company-communication";

export type PublicTrackingSourceType =
  | "SALES_INVOICE"
  | "SERVICE_ORDER"
  | "SALES_PAYMENT"
  | "POS_RECEIPT";

type CompanyPublicInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  supportWhatsAppUrl: string | null;
};

type PublicTrackingStatus = {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type PublicTrackingPageData =
  | {
      isFound: false;
      reason: "not_found" | "expired";
    }
  | {
      isFound: true;
      company: CompanyPublicInfo;
      customer: {
        name: string;
        phone: string | null;
      };
      document: {
        type: string;
        number: string;
        orderNumber: string | null;
        invoiceNumber: string | null;
        amount: string;
        remainingAmount: string;
        date: string | null;
        targetDate: string | null;
      };
      statuses: PublicTrackingStatus[];
      actions: Array<{
        label: string;
        href: string;
        kind: "support";
      }>;
    };

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value || 0);
}

function buildMoney(
  value: unknown,
  profile?: { currencySymbol?: string | null; locale?: string | null } | null,
) {
  return formatCurrency(toNumber(value), {
    currencySymbol: profile?.currencySymbol || "Rp",
    locale: profile?.locale || "id-ID",
  });
}

function buildCompanyInfo(input: {
  company?: {
    name?: string | null;
    profile?: {
      name?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    } | null;
  } | null;
  currentUrl?: string;
}): CompanyPublicInfo {
  const profile = input.company?.profile;
  const name = profile?.name || input.company?.name || "Company";
  const supportPhone = normalizePhoneForWhatsApp(profile?.phone);
  const supportText = `Halo admin, mohon cek status dokumen saya: ${input.currentUrl || "-"}`;

  return {
    name,
    address: profile?.address || null,
    phone: profile?.phone || null,
    email: profile?.email || null,
    website: profile?.website || null,
    supportWhatsAppUrl: supportPhone
      ? `https://wa.me/${supportPhone}?text=${encodeURIComponent(supportText)}`
      : null,
  };
}

function statusTone(value: string): PublicTrackingStatus["tone"] {
  if (["PAID", "DONE", "CLOSED", "READY", "ISSUED", "POSTED", "COMPLETED"].includes(value)) return "success";
  if (["DRAFT", "NEW", "PROCESSING", "PARTIALLY_PAID", "OVERDUE"].includes(value)) return "warning";
  if (["CANCELLED", "FAILED"].includes(value)) return "danger";
  return "neutral";
}

export async function buildPublicTrackingUrl(input: {
  baseUrl: string;
  locale: string;
  companyId: string | null;
  sourceType: PublicTrackingSourceType;
  sourceId: string;
  contactId?: string | null;
  expiresAt?: Date | null;
}) {
  const token = createToken();
  const cleanBaseUrl = input.baseUrl.replace(/\/+$/, "");

  await prisma.publicCustomerLink.create({
    data: {
      companyId: input.companyId,
      contactId: input.contactId || null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      tokenHash: hashToken(token),
      expiresAt: input.expiresAt || null,
    },
  });

  return {
    token,
    url: `${cleanBaseUrl}/${input.locale}/public/t/${token}`,
  };
}

async function findActiveLink(token: string) {
  const link = await prisma.publicCustomerLink.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
  });

  if (!link) return { link: null, reason: "not_found" as const };
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return { link: null, reason: "expired" as const };
  }

  return { link, reason: null };
}

export async function getPublicTrackingPageData(input: {
  token: string;
  currentUrl?: string;
}): Promise<PublicTrackingPageData> {
  const { link, reason } = await findActiveLink(input.token);
  if (!link) {
    return { isFound: false, reason: reason || "not_found" };
  }

  await prisma.publicCustomerLink.update({
    where: { id: link.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  if (link.sourceType === "SERVICE_ORDER") {
    return getServiceTrackingData(link, input.currentUrl);
  }

  return getInvoiceTrackingData(link, input.currentUrl);
}

async function getInvoiceTrackingData(link: any, currentUrl?: string): Promise<PublicTrackingPageData> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: link.sourceType === "SALES_PAYMENT" ? undefined : link.sourceId,
      companyId: link.companyId,
    },
    include: {
      contact: true,
      company: { include: { profile: true } },
      salesOrder: true,
      payments: true,
    },
  });

  if (!invoice) return { isFound: false, reason: "not_found" };

  const profile = invoice.company?.profile;
  const statuses: PublicTrackingStatus[] = [
    { label: "Invoice", value: invoice.status, tone: statusTone(invoice.status) },
    { label: "Sisa tagihan", value: buildMoney(invoice.balanceDue, profile), tone: toNumber(invoice.balanceDue) <= 0 ? "success" : "warning" },
  ];

  if (invoice.salesOrder?.isServiceOrder && invoice.salesOrder.serviceWorkflowStatus) {
    statuses.push({
      label: "Service",
      value: invoice.salesOrder.serviceWorkflowStatus,
      tone: statusTone(invoice.salesOrder.serviceWorkflowStatus),
    });
  }

  return {
    isFound: true,
    company: buildCompanyInfo({ company: invoice.company, currentUrl }),
    customer: {
      name: invoice.contact?.name || "-",
      phone: invoice.contact?.phone || null,
    },
    document: {
      type: "Sales Invoice",
      number: invoice.invoiceNumber,
      orderNumber: invoice.salesOrder?.orderNumber || null,
      invoiceNumber: invoice.invoiceNumber,
      amount: buildMoney(invoice.totalAmount, profile),
      remainingAmount: buildMoney(invoice.balanceDue, profile),
      date: invoice.invoiceDate ? formatDate(invoice.invoiceDate, { dateFormat: "dd MMM yyyy" }) : null,
      targetDate: invoice.dueDate ? formatDate(invoice.dueDate, { dateFormat: "dd MMM yyyy" }) : null,
    },
    statuses,
    actions: buildPublicActions(invoice.company, currentUrl),
  };
}

async function getServiceTrackingData(link: any, currentUrl?: string): Promise<PublicTrackingPageData> {
  const serviceOrder = await prisma.pOSServiceOrder.findFirst({
    where: {
      id: link.sourceId,
      companyId: link.companyId,
    },
    include: {
      company: { include: { profile: true } },
    },
  });

  if (!serviceOrder) return { isFound: false, reason: "not_found" };

  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: serviceOrder.salesInvoiceId,
      companyId: link.companyId,
    },
    include: {
      contact: true,
    },
  });

  const profile = serviceOrder.company?.profile;
  const statuses: PublicTrackingStatus[] = [
    { label: "Service", value: serviceOrder.status, tone: statusTone(serviceOrder.status) },
  ];

  if (invoice) {
    statuses.push({ label: "Invoice", value: invoice.status, tone: statusTone(invoice.status) });
  }
  statuses.push({
    label: "Sisa tagihan",
    value: buildMoney(serviceOrder.remainingAmount, profile),
    tone: toNumber(serviceOrder.remainingAmount) <= 0 ? "success" : "warning",
  });

  return {
    isFound: true,
    company: buildCompanyInfo({ company: serviceOrder.company, currentUrl }),
    customer: {
      name: invoice?.contact?.name || "-",
      phone: invoice?.contact?.phone || null,
    },
    document: {
      type: "Service Order",
      number: serviceOrder.orderNumber,
      orderNumber: serviceOrder.orderNumber,
      invoiceNumber: invoice?.invoiceNumber || null,
      amount: buildMoney(serviceOrder.totalAmount, profile),
      remainingAmount: buildMoney(serviceOrder.remainingAmount, profile),
      date: serviceOrder.createdAt ? formatDate(serviceOrder.createdAt, { dateFormat: "dd MMM yyyy" }) : null,
      targetDate: serviceOrder.targetDate ? formatDate(serviceOrder.targetDate, { dateFormat: "dd MMM yyyy" }) : null,
    },
    statuses,
    actions: buildPublicActions(serviceOrder.company, currentUrl),
  };
}

function buildPublicActions(company: any, currentUrl?: string) {
  const supportUrl = buildCompanyInfo({ company, currentUrl }).supportWhatsAppUrl;
  return supportUrl
    ? [
        {
          label: "Hubungi admin via WhatsApp",
          href: supportUrl,
          kind: "support" as const,
        },
      ]
    : [];
}
