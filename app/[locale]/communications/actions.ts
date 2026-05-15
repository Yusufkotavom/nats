"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import {
  ContactCommunicationChannel,
  ContactCommunicationEventType,
  ContactCommunicationStatus,
  ContactMessageTemplateKind,
} from "@/prisma/generated/prisma/client";

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
