import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiningSpotService } from "./dining-spot.service";

const prismaMock = vi.hoisted(() => ({
  diningArea: {
    upsert: vi.fn(),
  },
  diningSpot: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  diningSpotSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("DiningSpotService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
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
});
