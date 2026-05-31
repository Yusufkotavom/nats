"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import {
    SalesInvoiceStatus,
    PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/enums";
import { getSession } from "@/lib/auth/auth";

const CANCELLED_SALES_STATUSES: SalesInvoiceStatus[] = [SalesInvoiceStatus.CANCELLED];
const CANCELLED_PURCHASE_STATUSES: PurchaseInvoiceStatus[] = [PurchaseInvoiceStatus.CANCELED];
const OUTSTANDING_SALES_STATUSES: SalesInvoiceStatus[] = [
    SalesInvoiceStatus.ISSUED,
    SalesInvoiceStatus.PARTIALLY_PAID,
    SalesInvoiceStatus.OVERDUE,
];
const OUTSTANDING_PURCHASE_STATUSES: PurchaseInvoiceStatus[] = [
    PurchaseInvoiceStatus.BILLED,
    PurchaseInvoiceStatus.PARTIALLY_PAID,
];
const RECENT_ORDERS_LIMIT = 5;
const MONTHLY_TREND_MONTHS = 6;

function getMonthDateRange(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

function getMonthLabel(date: Date): string {
    return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export async function getMainDashboardStats() {
    const session = await getSession();
    if (!session?.activeCompanyId) {
        return {
            totalRevenue: 0,
            totalExpenses: 0,
            accountsReceivable: 0,
            accountsPayable: 0,
            recentSalesOrders: [],
            recentPurchaseOrders: [],
            monthlyTrend: [],
        };
    }

    const companyId = session.activeCompanyId;
    const now = new Date();
    const { start: monthStart, end: monthEnd } = getMonthDateRange(now);

    const [
        salesRevenueResult,
        purchaseExpenseResult,
        accountsReceivableResult,
        accountsPayableResult,
        recentSalesOrders,
        recentPurchaseOrders,
        monthlyTrend,
    ] = await Promise.all([
        getSalesRevenueThisMonth(companyId, monthStart, monthEnd),
        getPurchaseExpenseThisMonth(companyId, monthStart, monthEnd),
        getAccountsReceivable(companyId),
        getAccountsPayable(companyId),
        getRecentSalesOrders(companyId),
        getRecentPurchaseOrders(companyId),
        getMonthlyTrend(companyId, now),
    ]);

    return {
        totalRevenue: salesRevenueResult,
        totalExpenses: purchaseExpenseResult,
        accountsReceivable: accountsReceivableResult,
        accountsPayable: accountsPayableResult,
        recentSalesOrders: serializePrisma(recentSalesOrders),
        recentPurchaseOrders: serializePrisma(recentPurchaseOrders),
        monthlyTrend,
    };
}

async function getSalesRevenueThisMonth(companyId: string, monthStart: Date, monthEnd: Date) {
    const result = await prisma.salesInvoice.aggregate({
        where: {
            companyId,
            invoiceDate: { gte: monthStart, lte: monthEnd },
            status: { notIn: CANCELLED_SALES_STATUSES },
        },
        _sum: { totalAmount: true },
    });
    return Number(result._sum?.totalAmount ?? 0);
}

async function getPurchaseExpenseThisMonth(companyId: string, monthStart: Date, monthEnd: Date) {
    const result = await prisma.purchaseInvoice.aggregate({
        where: {
            companyId,
            invoiceDate: { gte: monthStart, lte: monthEnd },
            status: { notIn: CANCELLED_PURCHASE_STATUSES },
        },
        _sum: { totalAmount: true },
    });
    return Number(result._sum?.totalAmount ?? 0);
}

async function getAccountsReceivable(companyId: string) {
    const result = await prisma.salesInvoice.aggregate({
        where: { companyId, status: { in: OUTSTANDING_SALES_STATUSES } },
        _sum: { balanceDue: true },
    });
    return Number(result._sum?.balanceDue ?? 0);
}

async function getAccountsPayable(companyId: string) {
    const result = await prisma.purchaseInvoice.aggregate({
        where: { companyId, status: { in: OUTSTANDING_PURCHASE_STATUSES } },
        _sum: { totalAmount: true },
    });
    return Number(result._sum?.totalAmount ?? 0);
}

async function getRecentSalesOrders(companyId: string) {
    return prisma.salesOrder.findMany({
        where: { companyId },
        include: { contact: true },
        orderBy: { orderDate: "desc" },
        take: RECENT_ORDERS_LIMIT,
    });
}

async function getRecentPurchaseOrders(companyId: string) {
    return prisma.purchaseOrder.findMany({
        where: { companyId },
        include: { contact: true },
        orderBy: { orderDate: "desc" },
        take: RECENT_ORDERS_LIMIT,
    });
}

async function getMonthlyTrend(companyId: string, now: Date) {
    const months: { month: string; revenue: number; expenses: number }[] = [];

    for (let i = MONTHLY_TREND_MONTHS - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const { start, end } = getMonthDateRange(date);

        const [salesAgg, purchaseAgg] = await Promise.all([
            prisma.salesInvoice.aggregate({
                where: {
                    companyId,
                    invoiceDate: { gte: start, lte: end },
                    status: { notIn: CANCELLED_SALES_STATUSES },
                },
                _sum: { totalAmount: true },
            }),
            prisma.purchaseInvoice.aggregate({
                where: {
                    companyId,
                    invoiceDate: { gte: start, lte: end },
                    status: { notIn: CANCELLED_PURCHASE_STATUSES },
                },
                _sum: { totalAmount: true },
            }),
        ]);

        months.push({
            month: getMonthLabel(date),
            revenue: Number(salesAgg._sum?.totalAmount ?? 0),
            expenses: Number(purchaseAgg._sum?.totalAmount ?? 0),
        });
    }

    return months;
}
