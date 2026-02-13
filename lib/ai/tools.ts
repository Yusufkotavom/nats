import { prisma } from "@/lib/prisma";
import { AITool } from "./types";
import { Prisma } from "@/prisma/generated/prisma/client";

export const getRecentTransactionsTool: AITool = {
  name: "get_recent_transactions",
  description: "Get recent financial transactions (journal entries) for the company. Use this to analyze financial activity.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of transactions to retrieve (default 5, max 20)",
      },
    },
    required: [],
  },
  handler: async ({ limit = 5 }: { limit?: number }) => {
    const transactions = await prisma.journalEntry.findMany({
      take: Math.min(limit, 20),
      orderBy: { transactionDate: "desc" },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    return transactions.map((t) => {
      // Calculate total amount (sum of debits)
      const totalAmount = t.lines.reduce((sum, line) => sum.add(line.debitAmount), new Prisma.Decimal(0));

      return {
        date: t.transactionDate,
        description: t.description,
        amount: totalAmount.toNumber(),
        reference: t.entryNumber,
        status: t.status,
        lines: t.lines.map((l) => ({
          account: l.account.name,
          debit: l.debitAmount.toNumber(),
          credit: l.creditAmount.toNumber(),
        })),
      };
    });
  },
};

export const getInventoryStatusTool: AITool = {
  name: "get_inventory_status",
  description: "Get current inventory stock levels for products. Use this to check product availability.",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search term for product name or SKU",
      },
    },
    required: [],
  },
  handler: async ({ search }: { search?: string }) => {
    const where: Prisma.ProductWhereInput = search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }
      : {};

    const products = await prisma.product.findMany({
      where,
      take: 10,
      select: {
        name: true,
        sku: true,
        price: true, // sellingPrice
        cost: true,
        averageCost: true,
        inventory: {
          select: {
            quantity: true,
          }
        }
      },
    });

    return products.map((p) => {
      const totalQuantity = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const estimatedValue = p.averageCost.mul(totalQuantity).toNumber();

      return {
        name: p.name,
        sku: p.sku,
        inventoryQuantity: totalQuantity,
        inventoryValue: estimatedValue,
        sellingPrice: p.price.toNumber(),
      };
    });
  },
};

export const getSalesSummaryTool: AITool = {
  name: "get_sales_summary",
  description: "Get a summary of sales performance including total sales and recent orders.",
  parameters: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { name: true } },
      },
    });

    const totalSales = await prisma.salesInvoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: {
          in: ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE"],
        },
      },
    });

    return {
      totalSales: totalSales._sum.totalAmount?.toNumber() || 0,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        customer: o.contact.name,
        status: o.status,
        total: o.totalAmount.toNumber(),
        date: o.createdAt,
      })),
    };
  },
};

export const businessTools = [
  getRecentTransactionsTool,
  getInventoryStatusTool,
  getSalesSummaryTool,
];
