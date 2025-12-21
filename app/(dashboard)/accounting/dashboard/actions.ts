"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getDashboardSummary() {
  return authorizedAction("reports.view", async () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // 1. P&L for current month
    // We can reuse the logic: Sum JournalEntryLines for Revenue and Expense accounts
    const plAgg = await prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        journalEntry: {
          status: "posted",
          transactionDate: {
            gte: start,
            lte: end,
          },
        },
        account: {
          type: {
            in: ["revenue", "expense"],
          },
        },
      },
      _sum: {
        creditAmount: true,
        debitAmount: true,
      },
    });

    const accountTypes = await prisma.account.findMany({
      where: {
        id: { in: plAgg.map((p) => p.accountId) },
      },
      select: { id: true, type: true },
    });

    const typeMap = new Map(accountTypes.map((a) => [a.id, a.type]));

    let totalRevenue = 0;
    let totalExpenses = 0;

    plAgg.forEach((agg) => {
      const type = typeMap.get(agg.accountId);
      const credit = agg._sum.creditAmount?.toNumber() || 0;
      const debit = agg._sum.debitAmount?.toNumber() || 0;

      if (type === "revenue") {
        totalRevenue += credit - debit;
      } else if (type === "expense") {
        totalExpenses += debit - credit;
      }
    });

    const netIncome = totalRevenue - totalExpenses;

    // 2. Outstanding Invoices (Receivables) & Bills (Payables)
    // We calculate the cumulative balance for Asset accounts with "Receivable" and Liability accounts with "Payable"
    const arApAccounts = await prisma.account.findMany({
      where: {
        OR: [
          {
            name: { contains: "Receivable", mode: "insensitive" },
            type: "asset",
          },
          {
            name: { contains: "Payable", mode: "insensitive" },
            type: "liability",
          },
        ],
      },
      select: { id: true, name: true, type: true },
    });

    const arAccountIds = arApAccounts
      .filter((a) => a.type === "asset")
      .map((a) => a.id);
    const apAccountIds = arApAccounts
      .filter((a) => a.type === "liability")
      .map((a) => a.id);

    const balanceAgg = await prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        journalEntry: {
          status: "posted",
          // No date filter, we want cumulative balance
        },
        accountId: {
          in: [...arAccountIds, ...apAccountIds],
        },
      },
      _sum: {
        creditAmount: true,
        debitAmount: true,
      },
    });

    let accountsReceivable = 0;
    let accountsPayable = 0;

    balanceAgg.forEach((agg) => {
      const credit = agg._sum.creditAmount?.toNumber() || 0;
      const debit = agg._sum.debitAmount?.toNumber() || 0;

      if (arAccountIds.includes(agg.accountId)) {
        // Asset: Debit is positive
        accountsReceivable += debit - credit;
      } else if (apAccountIds.includes(agg.accountId)) {
        // Liability: Credit is positive
        accountsPayable += credit - debit;
      }
    });

    return {
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netIncome,
        accountsReceivable,
        accountsPayable,
      },
    };
  })();
}

export async function getFinancialTrends() {
  return authorizedAction("reports.view", async () => {
    const now = new Date();
    const months = 6;
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthLabel = format(date, "MMM yyyy");

      const agg = await prisma.journalEntryLine.groupBy({
        by: ["accountId"],
        where: {
          journalEntry: {
            status: "posted",
            transactionDate: {
              gte: start,
              lte: end,
            },
          },
          account: {
            type: {
              in: ["revenue", "expense"],
            },
          },
        },
        _sum: {
          creditAmount: true,
          debitAmount: true,
        },
      });

      const accountIds = agg.map((a) => a.accountId);
      const accounts = await prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, type: true },
      });
      const typeMap = new Map(accounts.map((a) => [a.id, a.type]));

      let revenue = 0;
      let expense = 0;

      agg.forEach((item) => {
        const type = typeMap.get(item.accountId);
        const credit = item._sum.creditAmount?.toNumber() || 0;
        const debit = item._sum.debitAmount?.toNumber() || 0;

        if (type === "revenue") {
          revenue += credit - debit;
        } else if (type === "expense") {
          expense += debit - credit;
        }
      });

      trends.push({
        name: monthLabel,
        revenue,
        expense,
      });
    }

    return { success: true, data: trends };
  })();
}

export async function getExpenseBreakdown() {
  return authorizedAction("reports.view", async () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const agg = await prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        journalEntry: {
          status: "posted",
          transactionDate: {
            gte: start,
            lte: end,
          },
        },
        account: {
          type: "expense",
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const accounts = await prisma.account.findMany({
      where: { id: { in: agg.map((a) => a.accountId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(accounts.map((a) => [a.id, a.name]));

    const breakdown = agg
      .map((item) => {
        const credit = item._sum.creditAmount?.toNumber() || 0;
        const debit = item._sum.debitAmount?.toNumber() || 0;
        const amount = debit - credit;
        return {
          name: nameMap.get(item.accountId) || "Unknown",
          value: amount,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 expenses

    return { success: true, data: breakdown };
  })();
}

export async function getRecentTransactions() {
  return authorizedAction("reports.view", async () => {
    const transactions = await prisma.journalEntry.findMany({
      take: 5,
      orderBy: { transactionDate: "desc" },
      where: { status: "posted" },
      include: {
        lines: {
          take: 2, // Just to show some details if needed
        },
      },
    });

    // We might want to format this for the frontend
    const formatted = transactions.map((t) => ({
      id: t.id,
      date: t.transactionDate,
      entryNumber: t.entryNumber,
      description: t.description,
      amount: t.lines.reduce(
        (sum, line) => sum + line.debitAmount.toNumber(),
        0
      ), // Total debit amount as proxy for size
    }));

    return { success: true, data: formatted };
  })();
}
