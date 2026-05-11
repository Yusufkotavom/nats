import { prisma } from "@/lib/prisma";

export class DiningSpotService {
  static async getAreasWithSpots() {
    return prisma.diningArea.findMany({
      include: {
        spots: {
          include: {
            _count: { select: { heldOrders: true, sessions: true } },
          },
          orderBy: { spotCode: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  static async createArea(data: {
    name: string;
    code: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return prisma.diningArea.create({
      data: {
        name: data.name,
        code: data.code,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async updateArea(
    id: string,
    data: { name: string; code: string; sortOrder?: number; isActive?: boolean },
  ) {
    return prisma.diningArea.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async deleteArea(id: string) {
    const area = await prisma.diningArea.findUnique({
      where: { id },
      include: { _count: { select: { spots: true } } },
    });
    if (!area) throw new Error("Dining area not found");
    if (area._count.spots > 0) {
      throw new Error("Cannot delete area with existing spots");
    }
    await prisma.diningArea.delete({ where: { id } });
  }

  static async createSpot(data: {
    areaId: string;
    spotCode: string;
    spotName: string;
    spotType: "TABLE" | "ROOM";
    capacity?: number;
    isActive?: boolean;
  }) {
    const area = await prisma.diningArea.findUnique({ where: { id: data.areaId } });
    if (!area) throw new Error("Dining area not found");
    return prisma.diningSpot.create({
      data: {
        areaId: data.areaId,
        spotCode: data.spotCode,
        spotName: data.spotName,
        spotType: data.spotType,
        capacity: data.capacity ?? 2,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async updateSpot(
    id: string,
    data: {
      areaId: string;
      spotCode: string;
      spotName: string;
      spotType: "TABLE" | "ROOM";
      capacity?: number;
      isActive?: boolean;
    },
  ) {
    const area = await prisma.diningArea.findUnique({ where: { id: data.areaId } });
    if (!area) throw new Error("Dining area not found");
    return prisma.diningSpot.update({
      where: { id },
      data: {
        areaId: data.areaId,
        spotCode: data.spotCode,
        spotName: data.spotName,
        spotType: data.spotType,
        capacity: data.capacity ?? 2,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async deleteSpot(id: string) {
    const spot = await prisma.diningSpot.findUnique({ where: { id } });
    if (!spot) throw new Error("Dining spot not found");
    if (spot.status !== "AVAILABLE") {
      throw new Error("Cannot delete active/non-available dining spot");
    }
    await prisma.diningSpot.delete({ where: { id } });
  }

  static async ensureDefaultLayout() {
    const area = await prisma.diningArea.upsert({
      where: { code: "MAIN" },
      update: { name: "Main Area", isActive: true },
      create: { code: "MAIN", name: "Main Area", sortOrder: 1, isActive: true },
    });

    for (let i = 1; i <= 12; i += 1) {
      const code = `T${String(i).padStart(2, "0")}`;
      await prisma.diningSpot.upsert({
        where: { spotCode: code },
        update: { areaId: area.id, isActive: true },
        create: {
          areaId: area.id,
          spotCode: code,
          spotName: `Table ${i}`,
          spotType: "TABLE",
          capacity: i <= 4 ? 2 : 4,
          status: "AVAILABLE",
          isActive: true,
        },
      });
    }
  }

  static async openSpot(diningSpotId: string, userId: string, guestCount?: number, notes?: string) {
    return await prisma.$transaction(async (tx) => {
      const spot = await tx.diningSpot.findUnique({ where: { id: diningSpotId } });
      if (!spot) throw new Error("Dining spot not found");
      if (!spot.isActive) throw new Error("Dining spot is not active");
      if (spot.status !== "AVAILABLE") throw new Error("Dining spot is not available");

      const session = await tx.diningSpotSession.create({
        data: {
          diningSpotId,
          openedBy: userId,
          guestCount: guestCount || null,
          notes: notes || null,
          status: "ORDERING",
        },
      });

      await tx.diningSpot.update({
        where: { id: diningSpotId },
        data: { status: "ORDERING" },
      });

      return session;
    });
  }

  static async closeSpot(diningSpotId: string, userId: string, notes?: string) {
    return await prisma.$transaction(async (tx) => {
      const spot = await tx.diningSpot.findUnique({ where: { id: diningSpotId } });
      if (!spot) throw new Error("Dining spot not found");
      if (spot.status === "AVAILABLE") throw new Error("Dining spot is already available");

      const openSession = await tx.diningSpotSession.findFirst({
        where: { diningSpotId, closedAt: null },
        orderBy: { openedAt: "desc" },
      });
      if (!openSession) throw new Error("No open dining spot session found");

      await tx.diningSpotSession.update({
        where: { id: openSession.id },
        data: {
          closedAt: new Date(),
          closedBy: userId,
          status: "CLOSED",
          notes: notes ? `${openSession.notes || ""}\n${notes}`.trim() : openSession.notes,
        },
      });

      await tx.diningSpot.update({
        where: { id: diningSpotId },
        data: { status: "AVAILABLE" },
      });
    });
  }
}
