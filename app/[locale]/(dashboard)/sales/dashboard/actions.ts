"use server";

import { prisma } from "@/lib/prisma";
import { SalesOrderStatus, SalesInvoiceStatus } from "@/prisma/generated/prisma/client";
import { startOfMonth, subMonths, format } from "date-fns";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

export async function getDashboardSummary() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const [
      totalOrders,
      totalInvoices,
      totalPayments,
      outstandingInvoices
    ] = await Promise.all([
      // Total Sales Orders Count
      prisma.salesOrder.count(),

      // Total Sales (Invoiced Amount)
      prisma.salesInvoice.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: {
            notIn: [SalesInvoiceStatus.DRAFT, SalesInvoiceStatus.CANCELLED],
          },
        },
      }),

      // Total Received (Payments)
      prisma.salesPayment.aggregate({
        _sum: {
          amount: true,
        },
      }),

      // Total Outstanding (Balance Due on Invoices)
      prisma.salesInvoice.aggregate({
        _sum: {
          balanceDue: true,
        },
        where: {
          status: {
            notIn: [SalesInvoiceStatus.DRAFT, SalesInvoiceStatus.CANCELLED, SalesInvoiceStatus.PAID],
          },
        },
      }),
    ]);

    const totalSalesAmount = totalInvoices._sum.totalAmount?.toNumber() || 0;
    const totalReceivedAmount = totalPayments._sum.amount?.toNumber() || 0;
    const outstandingAmount = outstandingInvoices._sum.balanceDue?.toNumber() || 0;

    return {
      success: true,
      data: {
        totalOrders,
        totalSales: totalSalesAmount,
        totalReceived: totalReceivedAmount,
        outstandingAmount: outstandingAmount,
      },
    };
  } catch (error) {
    console.error("Error fetching sales dashboard summary:", error);
    return { success: false, error: "Failed to fetch sales dashboard summary" };
  }
}

export async function getSalesTrends() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get last 6 months
    const today = new Date();
    const sixMonthsAgo = subMonths(startOfMonth(today), 5);

    const orders = await prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
        status: {
          not: SalesOrderStatus.CANCELLED,
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
    console.error("Error fetching sales trends:", error);
    return { success: false, error: "Failed to fetch sales trends" };
  }
}

export async function getRecentSales() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const recentOrders = await prisma.salesOrder.findMany({
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
      customer: order.contact.name,
      date: order.createdAt,
      status: order.status,
      amount: order.totalAmount.toNumber(),
    }));

    return { success: true, data: formattedOrders };
  } catch (error) {
    console.error("Error fetching recent sales:", error);
    return { success: false, error: "Failed to fetch recent sales" };
  }
}
