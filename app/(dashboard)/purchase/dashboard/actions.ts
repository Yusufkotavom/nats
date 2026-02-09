"use server";

import { prisma } from "@/lib/prisma";
import { PurchaseOrderStatus, PurchaseInvoiceStatus } from "@/prisma/generated/prisma/client";
import { startOfMonth, subMonths, format, endOfMonth } from "date-fns";

export async function getDashboardSummary() {
  try {
    const [
      totalOrders,
      totalInvoices,
      totalPaid,
      totalOutstanding
    ] = await Promise.all([
      // Total Purchase Orders Count
      prisma.purchaseOrder.count(),
      
      // Total Purchase Invoices Amount (Billed)
      prisma.purchaseInvoice.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: {
            not: PurchaseInvoiceStatus.CANCELED,
          },
        },
      }),

      // Total Paid Amount
      prisma.purchasePayment.aggregate({
        _sum: {
          amount: true,
        },
      }),

      // Total Outstanding (Unpaid Invoices)
      // This is an approximation. Ideally we check balanceDue on invoice if it exists, 
      // or calculate Total Invoice Amount - Total Payment Amount linked to it.
      // Looking at schema, SalesInvoice has balanceDue but PurchaseInvoice doesn't seem to have it explicitly mentioned in the snippet I saw?
      // Wait, let me check PurchaseInvoice schema again.
      // It has `totalAmount`. It doesn't show `balanceDue` in the snippet I saw for PurchaseInvoice (only SalesInvoice had it).
      // So I might need to calculate it or just sum invoices that are not paid.
      // A better approximation for outstanding is sum of invoices with status != PAID and != CANCELED.
      // But PARTIALLY_PAID is tricky without balanceDue.
      // Let's check if PurchaseInvoice has balanceDue.
      // In 06_purchasing.prisma snippet:
      // model PurchaseInvoice { ... totalAmount Decimal ... status PurchaseInvoiceStatus ... }
      // It DOES NOT have balanceDue in the snippet.
      // So I will calculate Outstanding as: Sum(Total Amount) where status in [DRAFT, BILLED, PARTIALLY_PAID] - Sum(Payments for those invoices).
      // Or simply Sum of all Invoices (except Canceled) - Sum of all Payments.
      
      prisma.purchaseInvoice.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: {
            in: [PurchaseInvoiceStatus.BILLED, PurchaseInvoiceStatus.PARTIALLY_PAID],
          },
        },
      }),
    ]);

    const totalInvoiceAmount = totalInvoices._sum.totalAmount?.toNumber() || 0;
    const totalPaidAmount = totalPaid._sum.amount?.toNumber() || 0;
    
    // Outstanding is basically what we owe.
    // Simple calc: Total Invoices (excluding draft/canceled) - Total Payments.
    // Draft invoices usually don't count as liability yet.
    
    const committedInvoices = await prisma.purchaseInvoice.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        status: {
          in: [PurchaseInvoiceStatus.BILLED, PurchaseInvoiceStatus.PARTIALLY_PAID, PurchaseInvoiceStatus.PAID]
        }
      }
    });
    
    const committedAmount = committedInvoices._sum.totalAmount?.toNumber() || 0;
    const outstandingAmount = Math.max(0, committedAmount - totalPaidAmount);

    return {
      success: true,
      data: {
        totalOrders,
        totalPurchases: committedAmount,
        totalPaid: totalPaidAmount,
        outstandingAmount: outstandingAmount,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return { success: false, error: "Failed to fetch dashboard summary" };
  }
}

export async function getPurchaseTrends() {
  try {
    // Get last 6 months
    const today = new Date();
    const sixMonthsAgo = subMonths(startOfMonth(today), 5);

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
        status: {
          not: PurchaseOrderStatus.CANCELLED,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by month
    const monthlyData = new Map<string, number>();
    
    // Initialize months
    for (let i = 0; i < 6; i++) {
      const date = subMonths(today, i);
      const key = format(date, "MMM yyyy");
      monthlyData.set(key, 0);
    }

    orders.forEach((order) => {
      const key = format(order.createdAt, "MMM yyyy");
      if (monthlyData.has(key)) {
        monthlyData.set(key, (monthlyData.get(key) || 0) + order.totalAmount.toNumber());
      }
    });

    // Sort by date (reverse the map iteration or reconstruction)
    // Actually we initialized current to past, so keys are "Feb 2026", "Jan 2026"...
    // We want chronological order for chart.
    
    const result = [];
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(today, i);
        const key = format(date, "MMM yyyy");
        result.push({
            name: key,
            amount: monthlyData.get(key) || 0
        });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching purchase trends:", error);
    return { success: false, error: "Failed to fetch purchase trends" };
  }
}

export async function getPurchaseStatusBreakdown() {
  try {
    const statusCounts = await prisma.purchaseOrder.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    const formattedData = statusCounts.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error fetching status breakdown:", error);
    return { success: false, error: "Failed to fetch status breakdown" };
  }
}

export async function getRecentPurchases() {
  try {
    const recentOrders = await prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        contact: {
          select: {
            name: true,
          },
        },
      },
    });

    const formattedOrders = recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      vendor: order.contact.name,
      date: order.createdAt,
      status: order.status,
      amount: order.totalAmount.toNumber(),
    }));

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error("Error fetching recent purchases:", error);
    return { success: false, error: "Failed to fetch recent purchases" };
  }
}
