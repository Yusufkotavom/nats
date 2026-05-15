import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  contactCommunicationLog: {
    create: vi.fn(),
    update: vi.fn(),
  },
  contactMessageTemplate: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { createContactCommunicationLog } from "./actions";

describe("communications/actions createContactCommunicationLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ userId: "user-1" });
    prismaMock.contactCommunicationLog.create.mockResolvedValue({
      id: "log-1",
    });
    prismaMock.contactCommunicationLog.update.mockResolvedValue({
      id: "log-1",
    });
    prismaMock.contactMessageTemplate.findMany.mockResolvedValue([]);
    prismaMock.contactMessageTemplate.upsert.mockResolvedValue({
      id: "tpl-1",
      updatedAt: new Date("2026-05-15T00:00:00.000Z"),
    });
  });

  it("persists communication log with default whatsapp + sent status", async () => {
    const result = await createContactCommunicationLog({
      contactId: "contact-1",
      eventType: "SERVICE_CREATED",
      sourceType: "SERVICE_ORDER",
      sourceId: "svc-1",
      message: "Service baru masuk",
    });

    expect(result).toEqual({ success: true, id: "log-1" });
    expect(prismaMock.contactCommunicationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: "contact-1",
          eventType: "SERVICE_CREATED",
          sourceType: "SERVICE_ORDER",
          sourceId: "svc-1",
          channel: "WHATSAPP",
          status: "SENT",
          createdById: "user-1",
        }),
      }),
    );
  });

  it("updates communication lifecycle status to delivered", async () => {
    const { updateContactCommunicationLogStatus } = await import("./actions");

    const result = await updateContactCommunicationLogStatus({
      id: "log-1",
      status: "DELIVERED",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.contactCommunicationLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({
          status: "DELIVERED",
        }),
      }),
    );
  });

  it("upserts message template in DB", async () => {
    const { upsertContactMessageTemplate } = await import("./actions");

    const result = await upsertContactMessageTemplate({
      contactId: "contact-1",
      kind: "PROMO",
      template: "Halo {{contact_name}}",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.contactMessageTemplate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contactId_kind: {
            contactId: "contact-1",
            kind: "PROMO",
          },
        },
        create: expect.objectContaining({
          contactId: "contact-1",
          kind: "PROMO",
          template: "Halo {{contact_name}}",
        }),
      }),
    );
  });

  it("reads message templates from DB", async () => {
    const { getContactMessageTemplates } = await import("./actions");
    prismaMock.contactMessageTemplate.findMany.mockResolvedValueOnce([
      {
        id: "tpl-1",
        kind: "PROMO",
        template: "Promo",
        updatedAt: new Date("2026-05-15T00:00:00.000Z"),
      },
    ]);

    const rows = await getContactMessageTemplates("contact-1");

    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("PROMO");
    expect(prismaMock.contactMessageTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contactId: "contact-1" },
      }),
    );
  });
});
