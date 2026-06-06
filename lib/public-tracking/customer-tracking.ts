import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForWhatsApp } from "@/lib/communication/company-communication";
import { formatCurrency, formatDate } from "@/lib/utils";

export type PublicTrackingSourceType =
  | "SALES_ORDER"
  | "SALES_INVOICE"
  | "SERVICE_ORDER"
  | "SALES_PAYMENT"
  | "POS_RECEIPT";

export type PublicDocumentCode =
  | "SALES_ORDER"
  | "SALES_INVOICE"
  | "POS_RECEIPT"
  | "SERVICE_WORK_ORDER"
  | "SERVICE_INVOICE";

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

type PublicDocumentLink = {
  label: string;
  href: string;
  code: PublicDocumentCode;
  entityId: string;
};

type PublicHistoryItem = {
  id: string;
  area: "Sales" | "Service";
  type: string;
  documentNumber: string;
  status: string;
  amount: string;
  balanceDue: string | null;
  happenedAt: string | null;
  detail: string;
  isLatest: boolean;
  documentLinks: PublicDocumentLink[];
};

type PublicCustomerLinkRecord = {
  id: string;
  companyId: string | null;
  contactId: string | null;
  sourceType: PublicTrackingSourceType;
  sourceId: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

type CompanyProfileLike = {
  currencySymbol?: string | null;
  locale?: string | null;
  currency?: string | null;
  currencyFormat?: string | null;
  dateFormat?: string | null;
};

type RawDocumentTarget = {
  label: string;
  code: PublicDocumentCode;
  entityId: string;
};

type RawHistoryItem = {
  id: string;
  area: "Sales" | "Service";
  type: string;
  documentNumber: string;
  status: string;
  amount: number;
  balanceDue: number | null;
  happenedAt: Date | null;
  detail: string;
  documentTargets: RawDocumentTarget[];
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
      availableDocuments: PublicDocumentLink[];
      latestHistory: PublicHistoryItem | null;
      fullHistory: PublicHistoryItem[];
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
  profile?: CompanyProfileLike | null,
) {
  return formatCurrency(toNumber(value), {
    currency: profile?.currency || "IDR",
    currencySymbol: profile?.currencySymbol || "Rp",
    currencyFormat: profile?.currencyFormat || "standard",
    locale: profile?.locale || "id-ID",
  });
}

function buildDate(
  value: Date | string | null | undefined,
  profile?: CompanyProfileLike | null,
) {
  if (!value) return null;
  return formatDate(value, { dateFormat: profile?.dateFormat || "dd MMM yyyy" });
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

function makeDocumentLink(currentUrl: string | undefined, target: RawDocumentTarget): PublicDocumentLink {
  const href = currentUrl
    ? `${currentUrl.replace(/\/+$/, "")}/documents?code=${encodeURIComponent(target.code)}&entityId=${encodeURIComponent(target.entityId)}`
    : "#";
  return { ...target, href };
}

function uniqueTargets(targets: RawDocumentTarget[]) {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.code}:${target.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatHistoryItems(
  items: RawHistoryItem[],
  profile: CompanyProfileLike | null | undefined,
  currentUrl?: string,
): PublicHistoryItem[] {
  const sorted = [...items].sort((a, b) => {
    const aTime = a.happenedAt?.getTime() || 0;
    const bTime = b.happenedAt?.getTime() || 0;
    return bTime - aTime;
  });

  return sorted.map((item, index) => ({
    id: item.id,
    area: item.area,
    type: item.type,
    documentNumber: item.documentNumber,
    status: item.status,
    amount: buildMoney(item.amount, profile),
    balanceDue: item.balanceDue === null ? null : buildMoney(item.balanceDue, profile),
    happenedAt: buildDate(item.happenedAt, profile),
    detail: item.detail,
    isLatest: index === 0,
    documentLinks: uniqueTargets(item.documentTargets).map((target) => makeDocumentLink(currentUrl, target)),
  }));
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

function buildDocumentTargetsForInvoice(input: {
  invoice: any;
  order?: any | null;
}) {
  const targets: RawDocumentTarget[] = [
    { label: "Invoice PDF", code: "SALES_INVOICE", entityId: input.invoice.id },
  ];

  if (input.order?.id) {
    targets.unshift({ label: "Sales Order PDF", code: "SALES_ORDER", entityId: input.order.id });
  }

  if (input.order?.isServiceOrder && input.order?.id) {
    targets.push({ label: "Service Work Order", code: "SERVICE_WORK_ORDER", entityId: input.order.id });
    targets.push({ label: "Service Invoice", code: "SERVICE_INVOICE", entityId: input.invoice.id });
  }

  if (input.invoice.posSessionId) {
    targets.push({ label: "POS Receipt", code: "POS_RECEIPT", entityId: input.invoice.id });
  }

  return uniqueTargets(targets);
}

function buildDocumentTargetsForOrder(input: {
  order: any;
  invoices: any[];
}) {
  const targets: RawDocumentTarget[] = [
    { label: "Sales Order PDF", code: "SALES_ORDER", entityId: input.order.id },
  ];

  if (input.order.isServiceOrder) {
    targets.push({ label: "Service Work Order", code: "SERVICE_WORK_ORDER", entityId: input.order.id });
  }

  for (const invoice of input.invoices) {
    targets.push(...buildDocumentTargetsForInvoice({ invoice, order: input.order }));
  }

  return uniqueTargets(targets);
}

function buildDocumentTargetsForPayment(input: {
  payment: any;
  invoice?: any | null;
  order?: any | null;
}) {
  if (!input.invoice) return [];
  return buildDocumentTargetsForInvoice({ invoice: input.invoice, order: input.order });
}

function buildDocumentTargetsForService(input: {
  serviceOrder: any;
  salesOrder?: any | null;
  invoice?: any | null;
}) {
  const targets: RawDocumentTarget[] = [];

  if (input.salesOrder?.id) {
    targets.push({ label: "Service Work Order", code: "SERVICE_WORK_ORDER", entityId: input.salesOrder.id });
    targets.push({ label: "Sales Order PDF", code: "SALES_ORDER", entityId: input.salesOrder.id });
  }

  if (input.invoice?.id) {
    targets.push({ label: "Service Invoice", code: "SERVICE_INVOICE", entityId: input.invoice.id });
    targets.push(...buildDocumentTargetsForInvoice({ invoice: input.invoice, order: input.salesOrder }));
  }

  return uniqueTargets(targets);
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

  return { link: link as PublicCustomerLinkRecord, reason: null };
}

export async function getPublicTrackingAccess(token: string) {
  return findActiveLink(token);
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

async function collectContactHistory(link: PublicCustomerLinkRecord) {
  if (!link.companyId || !link.contactId) {
    return [];
  }

  const [salesOrders, salesInvoices, salesPayments, serviceOrders] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { companyId: link.companyId, contactId: link.contactId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        orderDate: true,
        expectedDate: true,
        notes: true,
        isServiceOrder: true,
        serviceWorkflowStatus: true,
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.salesInvoice.findMany({
      where: { companyId: link.companyId, contactId: link.contactId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        balanceDue: true,
        invoiceDate: true,
        dueDate: true,
        notes: true,
        posSessionId: true,
        salesOrderId: true,
        payments: {
          select: {
            id: true,
            paymentNumber: true,
          },
        },
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.salesPayment.findMany({
      where: { companyId: link.companyId, contactId: link.contactId },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        method: true,
        reference: true,
        notes: true,
        salesInvoiceId: true,
        cashAccount: { select: { name: true } },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.pOSServiceOrder.findMany({
      where: { companyId: link.companyId, contactId: link.contactId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        remainingAmount: true,
        createdAt: true,
        targetDate: true,
        notes: true,
        salesOrderId: true,
        salesInvoiceId: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    }),
  ]);

  const orderMap = new Map(salesOrders.map((order) => [order.id, order]));
  const invoiceMap = new Map(salesInvoices.map((invoice) => [invoice.id, invoice]));

  const history: RawHistoryItem[] = [
    ...salesOrders.map((order) => {
      const linkedInvoices = salesInvoices.filter((invoice) => invoice.salesOrderId === order.id);
      return {
        id: `sales-order-${order.id}`,
        area: "Sales" as const,
        type: order.isServiceOrder ? "Sales Order / Service" : "Sales Order",
        documentNumber: order.orderNumber,
        status: order.serviceWorkflowStatus || order.status,
        amount: toNumber(order.totalAmount),
        balanceDue: linkedInvoices.length
          ? linkedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.balanceDue), 0)
          : null,
        happenedAt: order.orderDate,
        detail: order.notes || (order.expectedDate ? `Target ${formatDate(order.expectedDate, { dateFormat: "yyyy-MM-dd" })}` : "-"),
        documentTargets: buildDocumentTargetsForOrder({ order, invoices: linkedInvoices }),
      };
    }),
    ...salesInvoices.map((invoice) => ({
      id: `sales-invoice-${invoice.id}`,
      area: "Sales" as const,
      type: orderMap.get(invoice.salesOrderId || "")?.isServiceOrder ? "Service Invoice" : "Sales Invoice",
      documentNumber: invoice.invoiceNumber,
      status: invoice.status,
      amount: toNumber(invoice.totalAmount),
      balanceDue: toNumber(invoice.balanceDue),
      happenedAt: invoice.invoiceDate,
      detail: invoice.notes || (invoice.dueDate ? `Jatuh tempo ${formatDate(invoice.dueDate, { dateFormat: "yyyy-MM-dd" })}` : "-"),
      documentTargets: buildDocumentTargetsForInvoice({
        invoice,
        order: invoice.salesOrderId ? orderMap.get(invoice.salesOrderId) : null,
      }),
    })),
    ...salesPayments.map((payment) => ({
      id: `sales-payment-${payment.id}`,
      area: "Sales" as const,
      type: "Sales Payment",
      documentNumber: payment.paymentNumber,
      status: "POSTED",
      amount: toNumber(payment.amount),
      balanceDue: null,
      happenedAt: payment.paymentDate,
      detail: [
        payment.salesInvoiceId && invoiceMap.get(payment.salesInvoiceId)?.invoiceNumber
          ? `Invoice ${invoiceMap.get(payment.salesInvoiceId)?.invoiceNumber}`
          : null,
        payment.cashAccount?.name || null,
        payment.method || null,
        payment.reference || null,
        payment.notes || null,
      ]
        .filter(Boolean)
        .join(" • ") || "-",
      documentTargets: buildDocumentTargetsForPayment({
        payment,
        invoice: payment.salesInvoiceId ? invoiceMap.get(payment.salesInvoiceId) : null,
        order:
          payment.salesInvoiceId && invoiceMap.get(payment.salesInvoiceId)?.salesOrderId
            ? orderMap.get(invoiceMap.get(payment.salesInvoiceId)?.salesOrderId as string)
            : null,
      }),
    })),
    ...serviceOrders.map((serviceOrder) => ({
      id: `service-order-${serviceOrder.id}`,
      area: "Service" as const,
      type: "Service Order",
      documentNumber: serviceOrder.orderNumber,
      status: serviceOrder.status,
      amount: toNumber(serviceOrder.totalAmount),
      balanceDue: toNumber(serviceOrder.remainingAmount),
      happenedAt: serviceOrder.createdAt,
      detail: [
        serviceOrder.targetDate
          ? `Target ${formatDate(serviceOrder.targetDate, { dateFormat: "yyyy-MM-dd" })}`
          : null,
        serviceOrder.notes || null,
      ]
        .filter(Boolean)
        .join(" • ") || "-",
      documentTargets: buildDocumentTargetsForService({
        serviceOrder,
        salesOrder: serviceOrder.salesOrderId ? orderMap.get(serviceOrder.salesOrderId) : null,
        invoice: serviceOrder.salesInvoiceId ? invoiceMap.get(serviceOrder.salesInvoiceId) : null,
      }),
    })),
  ];

  return history;
}

async function getOrderTrackingData(
  link: PublicCustomerLinkRecord,
  currentUrl?: string,
): Promise<PublicTrackingPageData> {
  const order = await prisma.salesOrder.findFirst({
    where: {
      id: link.sourceId,
      companyId: link.companyId,
    },
    include: {
      contact: true,
      company: { include: { profile: true } },
      invoices: {
        include: {
          payments: {
            select: {
              id: true,
              paymentNumber: true,
            },
          },
        },
      },
    },
  });

  if (!order) return { isFound: false, reason: "not_found" };

  const profile = order.company?.profile;
  const statuses: PublicTrackingStatus[] = [
    { label: "Sales Order", value: order.status, tone: statusTone(order.status) },
  ];
  const contactHistory = await collectContactHistory(link);

  if (order.isServiceOrder && order.serviceWorkflowStatus) {
    statuses.push({
      label: "Service",
      value: order.serviceWorkflowStatus,
      tone: statusTone(order.serviceWorkflowStatus),
    });
  }

  const history = formatHistoryItems(
    contactHistory.length
      ? contactHistory
      : [
          {
            id: `sales-order-${order.id}`,
            area: "Sales",
            type: order.isServiceOrder ? "Sales Order / Service" : "Sales Order",
            documentNumber: order.orderNumber,
            status: order.status,
            amount: toNumber(order.totalAmount),
            balanceDue: order.invoices.length
              ? order.invoices.reduce((sum, invoice) => sum + toNumber(invoice.balanceDue), 0)
              : null,
            happenedAt: order.orderDate,
            detail: order.notes || "-",
            documentTargets: buildDocumentTargetsForOrder({ order, invoices: order.invoices }),
          },
        ],
    profile,
    currentUrl,
  );

  const availableDocuments = uniqueTargets(buildDocumentTargetsForOrder({ order, invoices: order.invoices })).map((target) =>
    makeDocumentLink(currentUrl, target),
  );

  return {
    isFound: true,
    company: buildCompanyInfo({ company: order.company, currentUrl }),
    customer: {
      name: order.contact?.name || "-",
      phone: order.contact?.phone || null,
    },
    document: {
      type: order.isServiceOrder ? "Sales Order / Service" : "Sales Order",
      number: order.orderNumber,
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoices?.[0]?.invoiceNumber || null,
      amount: buildMoney(order.totalAmount, profile),
      remainingAmount: buildMoney(
        order.invoices.length
          ? order.invoices.reduce((sum, invoice) => sum + toNumber(invoice.balanceDue), 0)
          : 0,
        profile,
      ),
      date: buildDate(order.orderDate, profile),
      targetDate: buildDate(order.expectedDate, profile),
    },
    statuses,
    actions: buildPublicActions(order.company, currentUrl),
    availableDocuments,
    latestHistory: history[0] || null,
    fullHistory: history,
  };
}

async function getInvoiceTrackingData(
  link: PublicCustomerLinkRecord,
  currentUrl?: string,
): Promise<PublicTrackingPageData> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: link.sourceId,
      companyId: link.companyId,
    },
    include: {
      contact: true,
      company: { include: { profile: true } },
      salesOrder: true,
      payments: {
        select: {
          id: true,
          paymentNumber: true,
        },
      },
    },
  });

  if (!invoice) return { isFound: false, reason: "not_found" };

  const profile = invoice.company?.profile;
  const statuses: PublicTrackingStatus[] = [
    { label: "Invoice", value: invoice.status, tone: statusTone(invoice.status) },
    {
      label: "Sisa tagihan",
      value: buildMoney(invoice.balanceDue, profile),
      tone: toNumber(invoice.balanceDue) <= 0 ? "success" : "warning",
    },
  ];

  if (invoice.salesOrder?.isServiceOrder && invoice.salesOrder.serviceWorkflowStatus) {
    statuses.push({
      label: "Service",
      value: invoice.salesOrder.serviceWorkflowStatus,
      tone: statusTone(invoice.salesOrder.serviceWorkflowStatus),
    });
  }
  const contactHistory = await collectContactHistory(link);

  const history = formatHistoryItems(
    contactHistory.length
      ? contactHistory
      : [
          {
            id: `sales-invoice-${invoice.id}`,
            area: "Sales",
            type: invoice.salesOrder?.isServiceOrder ? "Service Invoice" : "Sales Invoice",
            documentNumber: invoice.invoiceNumber,
            status: invoice.status,
            amount: toNumber(invoice.totalAmount),
            balanceDue: toNumber(invoice.balanceDue),
            happenedAt: invoice.invoiceDate,
            detail: invoice.notes || "-",
            documentTargets: buildDocumentTargetsForInvoice({ invoice, order: invoice.salesOrder }),
          },
        ],
    profile,
    currentUrl,
  );

  const availableDocuments = uniqueTargets(
    buildDocumentTargetsForInvoice({ invoice, order: invoice.salesOrder }),
  ).map((target) => makeDocumentLink(currentUrl, target));

  return {
    isFound: true,
    company: buildCompanyInfo({ company: invoice.company, currentUrl }),
    customer: {
      name: invoice.contact?.name || "-",
      phone: invoice.contact?.phone || null,
    },
    document: {
      type: invoice.salesOrder?.isServiceOrder ? "Service Invoice" : "Sales Invoice",
      number: invoice.invoiceNumber,
      orderNumber: invoice.salesOrder?.orderNumber || null,
      invoiceNumber: invoice.invoiceNumber,
      amount: buildMoney(invoice.totalAmount, profile),
      remainingAmount: buildMoney(invoice.balanceDue, profile),
      date: buildDate(invoice.invoiceDate, profile),
      targetDate: buildDate(invoice.dueDate, profile),
    },
    statuses,
    actions: buildPublicActions(invoice.company, currentUrl),
    availableDocuments,
    latestHistory: history[0] || null,
    fullHistory: history,
  };
}

async function getPaymentTrackingData(
  link: PublicCustomerLinkRecord,
  currentUrl?: string,
): Promise<PublicTrackingPageData> {
  const payment = await prisma.salesPayment.findFirst({
    where: {
      id: link.sourceId,
      companyId: link.companyId,
    },
    include: {
      contact: true,
      company: { include: { profile: true } },
      cashAccount: true,
      salesInvoice: {
        include: {
          contact: true,
          salesOrder: true,
          payments: {
            select: {
              id: true,
              paymentNumber: true,
            },
          },
        },
      },
    },
  });

  if (!payment) return { isFound: false, reason: "not_found" };

  const profile = payment.company?.profile;
  const statuses: PublicTrackingStatus[] = [
    { label: "Payment", value: "POSTED", tone: "success" },
  ];
  const contactHistory = await collectContactHistory(link);

  if (payment.salesInvoice) {
    statuses.push({
      label: "Invoice",
      value: payment.salesInvoice.status,
      tone: statusTone(payment.salesInvoice.status),
    });
    statuses.push({
      label: "Sisa tagihan",
      value: buildMoney(payment.salesInvoice.balanceDue, profile),
      tone: toNumber(payment.salesInvoice.balanceDue) <= 0 ? "success" : "warning",
    });
  }

  const history = formatHistoryItems(
    contactHistory.length
      ? contactHistory
      : [
          {
            id: `sales-payment-${payment.id}`,
            area: "Sales",
            type: "Sales Payment",
            documentNumber: payment.paymentNumber,
            status: "POSTED",
            amount: toNumber(payment.amount),
            balanceDue: null,
            happenedAt: payment.paymentDate,
            detail: [
              payment.salesInvoice?.invoiceNumber ? `Invoice ${payment.salesInvoice.invoiceNumber}` : null,
              payment.cashAccount?.name || null,
              payment.method || null,
              payment.reference || null,
              payment.notes || null,
            ]
              .filter(Boolean)
              .join(" • ") || "-",
            documentTargets: buildDocumentTargetsForPayment({
              payment,
              invoice: payment.salesInvoice,
              order: payment.salesInvoice?.salesOrder,
            }),
          },
        ],
    profile,
    currentUrl,
  );

  const availableDocuments = uniqueTargets(
    buildDocumentTargetsForPayment({
      payment,
      invoice: payment.salesInvoice,
      order: payment.salesInvoice?.salesOrder,
    }),
  ).map((target) => makeDocumentLink(currentUrl, target));

  return {
    isFound: true,
    company: buildCompanyInfo({ company: payment.company, currentUrl }),
    customer: {
      name: payment.contact?.name || payment.salesInvoice?.contact?.name || "-",
      phone: payment.contact?.phone || payment.salesInvoice?.contact?.phone || null,
    },
    document: {
      type: "Sales Payment",
      number: payment.paymentNumber,
      orderNumber: payment.salesInvoice?.salesOrder?.orderNumber || null,
      invoiceNumber: payment.salesInvoice?.invoiceNumber || null,
      amount: buildMoney(payment.amount, profile),
      remainingAmount: buildMoney(payment.salesInvoice?.balanceDue || 0, profile),
      date: buildDate(payment.paymentDate, profile),
      targetDate: payment.salesInvoice?.dueDate ? buildDate(payment.salesInvoice.dueDate, profile) : null,
    },
    statuses,
    actions: buildPublicActions(payment.company, currentUrl),
    availableDocuments,
    latestHistory: history[0] || null,
    fullHistory: history,
  };
}

async function getPosReceiptTrackingData(
  link: PublicCustomerLinkRecord,
  currentUrl?: string,
): Promise<PublicTrackingPageData> {
  const base = await getInvoiceTrackingData(link, currentUrl);
  if (!base.isFound) return base;

  return {
    ...base,
    document: {
      ...base.document,
      type: "POS Receipt",
    },
  };
}

async function getServiceTrackingData(
  link: PublicCustomerLinkRecord,
  currentUrl?: string,
): Promise<PublicTrackingPageData> {
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

  const [invoice, salesOrder] = await Promise.all([
    serviceOrder.salesInvoiceId
      ? prisma.salesInvoice.findFirst({
          where: {
            id: serviceOrder.salesInvoiceId,
            companyId: link.companyId,
          },
          include: {
            contact: true,
            payments: {
              select: {
                id: true,
                paymentNumber: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    serviceOrder.salesOrderId
      ? prisma.salesOrder.findFirst({
          where: {
            id: serviceOrder.salesOrderId,
            companyId: link.companyId,
          },
          include: {
            contact: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const profile = serviceOrder.company?.profile;
  const statuses: PublicTrackingStatus[] = [
    { label: "Service", value: serviceOrder.status, tone: statusTone(serviceOrder.status) },
  ];
  const contactHistory = await collectContactHistory(link);

  if (invoice) {
    statuses.push({ label: "Invoice", value: invoice.status, tone: statusTone(invoice.status) });
  }
  statuses.push({
    label: "Sisa tagihan",
    value: buildMoney(serviceOrder.remainingAmount, profile),
    tone: toNumber(serviceOrder.remainingAmount) <= 0 ? "success" : "warning",
  });

  const history = formatHistoryItems(
    contactHistory.length
      ? contactHistory
      : [
          {
            id: `service-order-${serviceOrder.id}`,
            area: "Service",
            type: "Service Order",
            documentNumber: serviceOrder.orderNumber,
            status: serviceOrder.status,
            amount: toNumber(serviceOrder.totalAmount),
            balanceDue: toNumber(serviceOrder.remainingAmount),
            happenedAt: serviceOrder.createdAt,
            detail: serviceOrder.notes || "-",
            documentTargets: buildDocumentTargetsForService({
              serviceOrder,
              salesOrder,
              invoice,
            }),
          },
        ],
    profile,
    currentUrl,
  );

  const availableDocuments = uniqueTargets(
    buildDocumentTargetsForService({
      serviceOrder,
      salesOrder,
      invoice,
    }),
  ).map((target) => makeDocumentLink(currentUrl, target));

  return {
    isFound: true,
    company: buildCompanyInfo({ company: serviceOrder.company, currentUrl }),
    customer: {
      name: invoice?.contact?.name || salesOrder?.contact?.name || "-",
      phone: invoice?.contact?.phone || salesOrder?.contact?.phone || null,
    },
    document: {
      type: "Service Order",
      number: serviceOrder.orderNumber,
      orderNumber: salesOrder?.orderNumber || serviceOrder.orderNumber,
      invoiceNumber: invoice?.invoiceNumber || null,
      amount: buildMoney(serviceOrder.totalAmount, profile),
      remainingAmount: buildMoney(serviceOrder.remainingAmount, profile),
      date: buildDate(serviceOrder.createdAt, profile),
      targetDate: buildDate(serviceOrder.targetDate, profile),
    },
    statuses,
    actions: buildPublicActions(serviceOrder.company, currentUrl),
    availableDocuments,
    latestHistory: history[0] || null,
    fullHistory: history,
  };
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

  if (link.sourceType === "SALES_ORDER") {
    return getOrderTrackingData(link, input.currentUrl);
  }

  if (link.sourceType === "SALES_PAYMENT") {
    return getPaymentTrackingData(link, input.currentUrl);
  }

  if (link.sourceType === "POS_RECEIPT") {
    return getPosReceiptTrackingData(link, input.currentUrl);
  }

  return getInvoiceTrackingData(link, input.currentUrl);
}
