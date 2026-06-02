"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import {
  CompanyCommunicationEventKey,
  ContactCommunicationChannel,
  ContactCommunicationEventType,
  ContactCommunicationStatus,
  ContactMessageTemplateKind,
} from "@/prisma/generated/prisma/client";
import {
  COMPANY_COMMUNICATION_EVENTS,
  getCommunicationEventMeta,
  normalizePhoneForWhatsApp,
  renderCommunicationTemplate,
} from "@/lib/communication/company-communication";
import { requireActiveCompanyContext } from "@/lib/company-context";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { buildPublicTrackingUrl, type PublicTrackingSourceType } from "@/lib/public-tracking/customer-tracking";

type ContactCommunicationStatusInput =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

function buildStatusTimestamps(status: ContactCommunicationStatusInput, now: Date) {
  const timestamps: {
    queuedAt?: Date;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
  } = {};

  if (status === "QUEUED") {
    timestamps.queuedAt = now;
  }

  if (status === "SENT") {
    timestamps.queuedAt = now;
    timestamps.sentAt = now;
  }

  if (status === "DELIVERED") {
    timestamps.queuedAt = now;
    timestamps.sentAt = now;
    timestamps.deliveredAt = now;
  }

  if (status === "READ") {
    timestamps.queuedAt = now;
    timestamps.sentAt = now;
    timestamps.deliveredAt = now;
    timestamps.readAt = now;
  }

  if (status === "FAILED") {
    timestamps.queuedAt = now;
  }

  return timestamps;
}

export async function createContactCommunicationLog(input: {
  contactId: string;
  eventType: ContactCommunicationEventType;
  sourceType?: string;
  sourceId?: string;
  target?: string;
  message: string;
  channel?: ContactCommunicationChannel;
  status?: ContactCommunicationStatusInput;
  documentLinks?: Array<{ label: string; url: string }>;
  errorMessage?: string;
  providerMessageId?: string;
}) {
  const session = await getSession();
  const now = new Date();
  const status = input.status || ContactCommunicationStatus.SENT;
  const timestamps = buildStatusTimestamps(status, now);

  const created = await prisma.contactCommunicationLog.create({
    data: {
      companyId: session?.activeCompanyId || null,
      contactId: input.contactId,
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      target: input.target,
      message: input.message,
      channel: input.channel || ContactCommunicationChannel.WHATSAPP,
      status,
      providerMessageId: input.providerMessageId,
      documentLinks: input.documentLinks,
      errorMessage: input.errorMessage,
      queuedAt: timestamps.queuedAt,
      sentAt: timestamps.sentAt,
      deliveredAt: timestamps.deliveredAt,
      readAt: timestamps.readAt,
      createdById: session?.userId,
    },
  });

  return { success: true, id: created.id };
}

export async function updateContactCommunicationLogStatus(input: {
  id: string;
  status: ContactCommunicationStatusInput;
  errorMessage?: string;
  providerMessageId?: string;
}) {
  const now = new Date();
  const timestamps = buildStatusTimestamps(input.status, now);

  await prisma.contactCommunicationLog.update({
    where: { id: input.id },
    data: {
      status: input.status,
      errorMessage: input.errorMessage || null,
      providerMessageId: input.providerMessageId,
      queuedAt: timestamps.queuedAt
        ? { set: timestamps.queuedAt }
        : undefined,
      sentAt: timestamps.sentAt
        ? { set: timestamps.sentAt }
        : undefined,
      deliveredAt: timestamps.deliveredAt
        ? { set: timestamps.deliveredAt }
        : undefined,
      readAt: timestamps.readAt
        ? { set: timestamps.readAt }
        : undefined,
    },
  });

  return { success: true };
}

export async function getContactMessageTemplates(contactId: string) {
  const templates = await prisma.contactMessageTemplate.findMany({
    where: { contactId },
    orderBy: { kind: "asc" },
  });

  return templates.map((item) => ({
    id: item.id,
    kind: item.kind,
    template: item.template,
    updatedAt: item.updatedAt,
  }));
}

export async function upsertContactMessageTemplate(input: {
  contactId: string;
  kind: ContactMessageTemplateKind;
  template: string;
}) {
  const session = await getSession();

  const record = await prisma.contactMessageTemplate.upsert({
    where: {
      contactId_kind: {
        contactId: input.contactId,
        kind: input.kind,
      },
    },
    update: {
      template: input.template,
      createdById: session?.userId,
    },
    create: {
      contactId: input.contactId,
      kind: input.kind,
      template: input.template,
      createdById: session?.userId,
    },
  });

  return {
    success: true,
    id: record.id,
    updatedAt: record.updatedAt,
  };
}

export async function getCompanyCommunicationTemplates() {
  const { companyId } = await requireActiveCompanyContext();
  const [rows, profile] = await Promise.all([
    prisma.companyCommunicationTemplate.findMany({
      where: { companyId, channel: "WHATSAPP" },
      orderBy: { eventKey: "asc" },
    }),
    prisma.companyProfile.findUnique({
      where: { companyId },
      select: {
        serviceNotifyOnCreated: true,
        serviceNotifyOnReady: true,
        serviceNotifyOnCostDone: true,
        serviceNotifyOnPickedUp: true,
        serviceTemplateCreated: true,
        serviceTemplateReady: true,
        serviceTemplateCostDone: true,
        serviceTemplatePickedUp: true,
      },
    }),
  ]);
  const map = new Map(rows.map((row) => [row.eventKey, row]));

  return COMPANY_COMMUNICATION_EVENTS.map((event) => {
    const row = map.get(event.key);
    let fallbackEnabled = event.defaultEnabled;
    let fallbackTemplate = event.defaultTemplate;
    if (profile && !row) {
      if (event.key === "SERVICE_CREATED") {
        fallbackEnabled = profile.serviceNotifyOnCreated ?? fallbackEnabled;
        fallbackTemplate = profile.serviceTemplateCreated || fallbackTemplate;
      }
      if (event.key === "SERVICE_READY") {
        fallbackEnabled = profile.serviceNotifyOnReady ?? fallbackEnabled;
        fallbackTemplate = profile.serviceTemplateReady || fallbackTemplate;
      }
      if (event.key === "SERVICE_COST_DONE") {
        fallbackEnabled = profile.serviceNotifyOnCostDone ?? fallbackEnabled;
        fallbackTemplate = profile.serviceTemplateCostDone || fallbackTemplate;
      }
      if (event.key === "SERVICE_PICKED_UP") {
        fallbackEnabled = profile.serviceNotifyOnPickedUp ?? fallbackEnabled;
        fallbackTemplate = profile.serviceTemplatePickedUp || fallbackTemplate;
      }
    }
    return {
      eventKey: event.key,
      label: event.label,
      channel: "WHATSAPP" as const,
      isEnabled: row?.isEnabled ?? fallbackEnabled,
      template: row?.template ?? fallbackTemplate,
    };
  });
}

export async function getCompanyCommunicationTemplate(eventKey: CompanyCommunicationEventKey) {
  const { companyId } = await requireActiveCompanyContext();
  const [row, profile] = await Promise.all([
    prisma.companyCommunicationTemplate.findUnique({
      where: {
        companyId_eventKey_channel: {
          companyId,
          eventKey,
          channel: "WHATSAPP",
        },
      },
    }),
    prisma.companyProfile.findUnique({
      where: { companyId },
      select: {
        serviceNotifyOnCreated: true,
        serviceNotifyOnReady: true,
        serviceNotifyOnCostDone: true,
        serviceNotifyOnPickedUp: true,
        serviceTemplateCreated: true,
        serviceTemplateReady: true,
        serviceTemplateCostDone: true,
        serviceTemplatePickedUp: true,
      },
    }),
  ]);
  const meta = getCommunicationEventMeta(eventKey);
  let fallbackEnabled = meta?.defaultEnabled ?? true;
  let fallbackTemplate = meta?.defaultTemplate ?? "";
  if (profile && !row) {
    if (eventKey === "SERVICE_CREATED") {
      fallbackEnabled = profile.serviceNotifyOnCreated ?? fallbackEnabled;
      fallbackTemplate = profile.serviceTemplateCreated || fallbackTemplate;
    }
    if (eventKey === "SERVICE_READY") {
      fallbackEnabled = profile.serviceNotifyOnReady ?? fallbackEnabled;
      fallbackTemplate = profile.serviceTemplateReady || fallbackTemplate;
    }
    if (eventKey === "SERVICE_COST_DONE") {
      fallbackEnabled = profile.serviceNotifyOnCostDone ?? fallbackEnabled;
      fallbackTemplate = profile.serviceTemplateCostDone || fallbackTemplate;
    }
    if (eventKey === "SERVICE_PICKED_UP") {
      fallbackEnabled = profile.serviceNotifyOnPickedUp ?? fallbackEnabled;
      fallbackTemplate = profile.serviceTemplatePickedUp || fallbackTemplate;
    }
  }
  return {
    eventKey,
    isEnabled: row?.isEnabled ?? fallbackEnabled,
    template: row?.template ?? fallbackTemplate,
    channel: "WHATSAPP" as const,
  };
}

export async function upsertCompanyCommunicationTemplate(input: {
  eventKey: CompanyCommunicationEventKey;
  isEnabled: boolean;
  template: string;
}) {
  const { companyId } = await requireActiveCompanyContext();
  const session = await getSession();
  const trimmedTemplate = input.template.trim();
  if (!trimmedTemplate) {
    throw new Error("Template wajib diisi");
  }

  await prisma.companyCommunicationTemplate.upsert({
    where: {
      companyId_eventKey_channel: {
        companyId,
        eventKey: input.eventKey,
        channel: "WHATSAPP",
      },
    },
    update: {
      isEnabled: input.isEnabled,
      template: trimmedTemplate,
      createdById: session?.userId || null,
    },
    create: {
      companyId,
      eventKey: input.eventKey,
      channel: "WHATSAPP",
      isEnabled: input.isEnabled,
      template: trimmedTemplate,
      createdById: session?.userId || null,
    },
  });

  revalidateLocalizedPath("/admin/settings/communication");
  return { success: true };
}

function mapEventKeyToContactEventType(eventKey: CompanyCommunicationEventKey): ContactCommunicationEventType {
  if (eventKey === "SALES_INVOICE_ISSUED") return "SALES_INVOICE";
  if (eventKey === "SALES_PAYMENT_POSTED") return "SALES_PAYMENT_POSTED";
  if (eventKey === "POS_PAYMENT_POSTED") return "POS_PAYMENT_POSTED";
  if (eventKey === "SERVICE_CREATED") return "SERVICE_CREATED";
  return "SERVICE_STATUS_UPDATED";
}

export async function buildCompanyCommunicationPreview(input: {
  eventKey: CompanyCommunicationEventKey;
  vars: Record<string, string | number | null | undefined>;
}) {
  const tpl = await getCompanyCommunicationTemplate(input.eventKey);
  const message = renderCommunicationTemplate(tpl.template, input.vars);
  return {
    eventKey: input.eventKey,
    isEnabled: tpl.isEnabled,
    message,
  };
}

export async function sendCompanyCommunicationTest(input: {
  eventKey: CompanyCommunicationEventKey;
  contactId: string;
  targetPhone?: string | null;
  vars: Record<string, string | number | null | undefined>;
}) {
  const tpl = await getCompanyCommunicationTemplate(input.eventKey);
  const message = renderCommunicationTemplate(tpl.template, input.vars);
  const normalizedPhone = normalizePhoneForWhatsApp(input.targetPhone);

  const created = await createContactCommunicationLog({
    contactId: input.contactId,
    eventType: mapEventKeyToContactEventType(input.eventKey),
    sourceType: "COMPANY_COMMUNICATION_TEST",
    sourceId: input.eventKey,
    target: normalizedPhone || undefined,
    message,
    status: normalizedPhone ? "SENT" : "FAILED",
    errorMessage: normalizedPhone ? undefined : "Target phone is missing or invalid",
  });

  return {
    ...created,
    message,
    whatsappUrl: normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
      : null,
  };
}

export async function createPublicTrackingLink(input: {
  baseUrl: string;
  locale: string;
  sourceType: PublicTrackingSourceType;
  sourceId: string;
  contactId?: string | null;
  expiresAt?: Date | null;
}) {
  const { companyId } = await requireActiveCompanyContext();

  return buildPublicTrackingUrl({
    baseUrl: input.baseUrl,
    locale: input.locale,
    companyId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    contactId: input.contactId || null,
    expiresAt: input.expiresAt || null,
  });
}
