import { Prisma } from "@/prisma/generated/prisma/client";
import { MovementType } from "@/prisma/generated/prisma/enums";

type ProcessMovementData = {
  type: MovementType;
  productId: string;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  quantity: number;
  uomType?: string;
  unitCost?: number;
  locationId?: string;
  reference?: string;
  notes?: string;
  batchNumber?: string;
  inventoryMovementId: string;
  status: string;
};

export async function processMovement(
  tx: Prisma.TransactionClient,
  data: ProcessMovementData,
) {
  // Create the detail record
  return tx.inventoryMovementDetail.create({
    data: {
      inventoryMovementId: data.inventoryMovementId,
      productId: data.productId,
      quantity: data.quantity,
      unitCost: data.unitCost || 0,
      batchNumber: data.batchNumber,
      notes: data.notes,
    },
  });
}

type ExecuteUpdateData = {
  type: MovementType;
  productId: string;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  quantity: number;
  unitCost: number;
  batchNumber: string;
  locationId?: string | null;
};

export async function executeInventoryUpdate(
  tx: Prisma.TransactionClient,
  data: ExecuteUpdateData,
) {
  const {
    type,
    productId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    unitCost,
    batchNumber,
  } = data;

  // Handle IN / TRANSFER (Destination)
  if (type === "IN" || type === "TRANSFER") {
    if (!toWarehouseId) {
      throw new Error("Target warehouse required for IN/TRANSFER");
    }
    await upsertInventory(tx, {
      warehouseId: toWarehouseId,
      productId,
      batchNumber,
      quantityChange: quantity,
      unitCost,
    });
  }

  // Handle OUT / TRANSFER (Source)
  if (type === "OUT" || type === "TRANSFER") {
    if (!fromWarehouseId) {
      throw new Error("Source warehouse required for OUT/TRANSFER");
    }
    await upsertInventory(tx, {
      warehouseId: fromWarehouseId,
      productId,
      batchNumber,
      quantityChange: -quantity,
      unitCost,
    });
  }

  // Handle ADJUSTMENT
  // Assuming ADJUSTMENT acts like a direct modification.
  // If quantity is positive, it adds. If negative (not supported by Int usually in input but logic holds), it subtracts.
  // However, usually Adjustment requires a WarehouseId.
  if (type === "ADJUSTMENT") {
    // We need to know which warehouse.
    // Usually Adjustment has fromWarehouseId (if reducing) or toWarehouseId (if increasing).
    // Or just one warehouseId field.
    // Based on schema: fromWarehouseId / toWarehouseId.

    if (toWarehouseId) {
      await upsertInventory(tx, {
        warehouseId: toWarehouseId,
        productId,
        batchNumber,
        quantityChange: quantity,
        unitCost,
      });
    } else if (fromWarehouseId) {
      // If it's an adjustment "from" a warehouse, maybe it's reducing?
      // But the input quantity is likely absolute amount to adjust by?
      // Let's assume standard positive quantity implies addition if TO, subtraction if FROM?
      // Or if it's "Stock Take", it might be "Set To".
      // Given existing pattern:
      // If toWarehouseId is present, we add.
      // If fromWarehouseId is present, we subtract.
      await upsertInventory(tx, {
        warehouseId: fromWarehouseId,
        productId,
        batchNumber,
        quantityChange: -quantity,
        unitCost,
      });
    }
  }
}

type UpsertInventoryData = {
  warehouseId: string;
  productId: string;
  batchNumber: string;
  quantityChange: number;
  unitCost: number;
};

async function upsertInventory(
  tx: Prisma.TransactionClient,
  data: UpsertInventoryData,
) {
  const { warehouseId, productId, batchNumber, quantityChange, unitCost } =
    data;

  // Check if inventory record exists
  const existing = await tx.inventory.findUnique({
    where: {
      productId_warehouseId_batchNumber: {
        productId,
        warehouseId,
        batchNumber: batchNumber || "-",
      },
    },
  });

  if (existing) {
    // Update existing
    // Calculate new average cost if adding stock?
    // For now, simple weighted average for unitCost if adding
    let newUnitCost = existing.unitCost;

    // Only update cost if we are adding stock
    if (quantityChange > 0) {
      const oldTotalValue = Number(existing.unitCost) * existing.quantity;
      const addedValue = unitCost * quantityChange;
      const newQuantity = existing.quantity + quantityChange;
      if (newQuantity > 0) {
        newUnitCost = new Prisma.Decimal(
          (oldTotalValue + addedValue) / newQuantity,
        );
      }
    }

    await tx.inventory.update({
      where: { id: existing.id },
      data: {
        quantity: { increment: quantityChange },
        unitCost: newUnitCost,
      },
    });
  } else {
    // Create new
    // If quantityChange is negative, this might be an error or allowing negative stock
    await tx.inventory.create({
      data: {
        productId,
        warehouseId,
        batchNumber: batchNumber || "-",
        quantity: quantityChange,
        unitCost: unitCost,
      },
    });
  }
}
