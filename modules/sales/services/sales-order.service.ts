import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SalesOrderInput } from "@/app/(dashboard)/sales/orders/types";

export class SalesOrderService {
  static async create(data: SalesOrderInput, userId: string) {
    // Generate temporary draft number
    const orderNumber = `DRAFT-${Date.now()}`;

    // Calculate totals
    let totalAmount = 0;
    const taxAmount = 0;
    const discountAmount = 0;
    let subtotal = 0;

    data.items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      totalAmount += lineTotal; // Simplified for now
    });

    return await prisma.$transaction(async (tx) => {
      const result = await tx.salesOrder.create({
        data: {
          orderNumber,
          contactId: data.contactId,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          notes: data.notes,
          status: "DRAFT",
          totalAmount,
          subtotal,
          taxAmount,
          discountAmount,
          departmentId: data.departmentId,
          projectId: data.projectId,
          createdById: userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
          attachments: {
            connect: data.attachmentIds?.map((id) => ({ id })) || [],
          },
        },
        include: {
          items: true,
        },
      });

      // Emit Integration Event via Outbox
      await enqueueIntegrationEvent(tx, {
        topic: "sales",
        type: "SALES_ORDER_CREATED",
        aggregateType: "sales_order",
        aggregateId: result.id,
        payload: {
          salesOrderId: result.id,
          orderNumber: result.orderNumber,
          totalAmount: result.totalAmount.toString(),
          userId,
        },
      });

      return result;
    });
  }
}
