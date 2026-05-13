import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiningSpotService } from "./dining-spot.service";

const prismaMock = vi.hoisted(() => ({
  diningArea: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  diningSpot: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  diningSpotSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  restaurantOrder: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("DiningSpotService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.restaurantOrder.findFirst.mockResolvedValue(null);
  });

  it("opens available spot", async () => {
    prismaMock.diningSpot.findUnique.mockResolvedValue({
      id: "spot-1",
      isActive: true,
      status: "AVAILABLE",
    });
    prismaMock.diningSpotSession.create.mockResolvedValue({ id: "dss-1" });

    await DiningSpotService.openSpot("spot-1", "user-1", 2);

    expect(prismaMock.diningSpotSession.create).toHaveBeenCalled();
    expect(prismaMock.diningSpot.update).toHaveBeenCalledWith({
      where: { id: "spot-1" },
      data: { status: "ORDERING" },
    });
  });

  it("closes active spot and sets it available", async () => {
    prismaMock.diningSpot.findUnique.mockResolvedValue({
      id: "spot-1",
      status: "ORDERING",
    });
    prismaMock.diningSpotSession.findFirst.mockResolvedValue({
      id: "dss-1",
      notes: null,
    });

    await DiningSpotService.closeSpot("spot-1", "user-1");

    expect(prismaMock.diningSpotSession.update).toHaveBeenCalled();
    expect(prismaMock.diningSpot.update).toHaveBeenCalledWith({
      where: { id: "spot-1" },
      data: { status: "AVAILABLE" },
    });
  });

  it("creates dining area and spot", async () => {
    prismaMock.diningArea.create.mockResolvedValue({ id: "area-1" });
    prismaMock.diningArea.findUnique.mockResolvedValue({ id: "area-1" });
    prismaMock.diningSpot.create.mockResolvedValue({ id: "spot-2" });

    await DiningSpotService.createArea({
      name: "VIP",
      code: "VIP",
      sortOrder: 2,
      isActive: true,
    });
    await DiningSpotService.createSpot({
      areaId: "area-1",
      spotCode: "R01",
      spotName: "Room 1",
      spotType: "ROOM",
      capacity: 4,
      isActive: true,
    });

    expect(prismaMock.diningArea.create).toHaveBeenCalled();
    expect(prismaMock.diningSpot.create).toHaveBeenCalled();
  });

  it("prevents deleting area with spots", async () => {
    prismaMock.diningArea.findUnique.mockResolvedValue({
      id: "area-1",
      _count: { spots: 1 },
    });

    await expect(DiningSpotService.deleteArea("area-1")).rejects.toThrow(
      "Cannot delete area with existing spots",
    );
  });

  it("prevents deleting non-available spot", async () => {
    prismaMock.diningSpot.findUnique.mockResolvedValue({
      id: "spot-3",
      status: "ORDERING",
    });

    await expect(DiningSpotService.deleteSpot("spot-3")).rejects.toThrow(
      "Cannot delete active/non-available dining spot",
    );
  });
});
