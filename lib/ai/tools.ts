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

    const data = transactions.map((t) => {
      // Calculate total amount (sum of debits)
      const totalAmount = t.lines.reduce((sum, line) => sum.add(line.debitAmount), new Prisma.Decimal(0));

      return {
        Date: t.transactionDate.toISOString().split('T')[0],
        Description: t.description,
        Reference: t.entryNumber,
        Amount: totalAmount.toNumber().toFixed(2),
        Status: t.status,
      };
    });

    if (data.length === 0) return "No transactions found.";

    // Convert to Markdown Table
    const headers = Object.keys(data[0]);
    const headerRow = `| ${headers.join(" | ")} |`;
    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
    const rows = data.map(row => `| ${Object.values(row).join(" | ")} |`).join("\n");

    return `${headerRow}\n${separatorRow}\n${rows}`;
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

    const data = products.map((p) => {
      const totalQuantity = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const estimatedValue = p.averageCost.mul(totalQuantity).toNumber();

      return {
        "Product Name": p.name,
        SKU: p.sku,
        "Stock Level": totalQuantity,
        "Price": p.price.toNumber().toFixed(2),
        "Value": estimatedValue.toFixed(2),
      };
    });

    if (data.length === 0) return "No products found.";

    // Convert to Markdown Table
    const headers = Object.keys(data[0]);
    const headerRow = `| ${headers.join(" | ")} |`;
    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
    const rows = data.map(row => `| ${Object.values(row).join(" | ")} |`).join("\n");

    return `${headerRow}\n${separatorRow}\n${rows}`;
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

    const totalSalesAmount = totalSales._sum.totalAmount?.toNumber() || 0;

    const data = recentOrders.map((o) => ({
      "Order ID": o.id.substring(0, 8) + "...",
      Customer: o.contact.name,
      Status: o.status,
      Total: o.totalAmount.toNumber().toFixed(2),
      Date: o.createdAt.toISOString().split('T')[0],
    }));

    let markdown = `**Total Sales Revenue:** $${totalSalesAmount.toFixed(2)}\n\n`;

    if (data.length > 0) {
      // Convert to Markdown Table
      const headers = Object.keys(data[0]);
      const headerRow = `| ${headers.join(" | ")} |`;
      const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
      const rows = data.map(row => `| ${Object.values(row).join(" | ")} |`).join("\n");

      markdown += `**Recent Orders:**\n${headerRow}\n${separatorRow}\n${rows}`;
    } else {
      markdown += "No recent orders found.";
    }

    return markdown;
  },
};

export const businessTools = [
  getRecentTransactionsTool,
  getInventoryStatusTool,
  getSalesSummaryTool,
];
