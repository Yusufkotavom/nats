"use server";

import { prisma } from "@/lib/prisma";
import { Account, AccountType } from "@prisma/client";

// --- Types ---

export type ReportDateRange = {
  startDate: string;
  endDate: string;
};

export type ReportAccountLine = {
  accountId: string;
  code: string;
  name: string;
  amount: number; // Positive for normal balance
  level: number;
  type: string;
  children?: ReportAccountLine[];
};

export type ProfitLossReport = {
  revenue: ReportAccountLine[];
  expenses: ReportAccountLine[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
};

export type BalanceSheetReport = {
  assets: ReportAccountLine[];
  liabilities: ReportAccountLine[];
  equity: ReportAccountLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
};

export type CashFlowReport = {
  operatingActivities: ReportAccountLine[];
  investingActivities: ReportAccountLine[];
  financingActivities: ReportAccountLine[];
  netCashProvidedByOperating: number;
  netCashProvidedByInvesting: number;
  netCashProvidedByFinancing: number;
  netIncreaseInCash: number;
  cashAtBeginning: number;
  cashAtEnd: number;
};

export type EquityChangeLine = {
  name: string;
  balanceBeginning: number;
  netIncome: number;
  additions: number;
  deductions: number;
  balanceEnding: number;
};

export type EquityChangeReport = {
  items: EquityChangeLine[];
  totalBeginning: number;
  totalNetIncome: number;
  totalAdditions: number;
  totalDeductions: number;
  totalEnding: number;
};

type AccountNode = Account & {
  amount: number;
  totalAmount: number;
  children: AccountNode[];
};

// --- Helper Functions ---

async function getAccountBalances(
  startDate: Date | null,
  endDate: Date,
  accountTypes?: AccountType[]
) {
  const whereClause = accountTypes ? { type: { in: accountTypes } } : {};
  const accounts = await prisma.account.findMany({
    where: {
      isActive: true,
      ...whereClause,
    },
    orderBy: { code: "asc" },
  });

  const dateFilter: { lte: Date; gte?: Date } = {
    lte: endDate,
  };
  if (startDate) {
    dateFilter.gte = startDate;
  }

  const balances = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        status: "posted",
        transactionDate: dateFilter,
      },
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  const balanceMap = new Map<string, { debit: number; credit: number }>();
  balances.forEach((b) => {
    balanceMap.set(b.accountId, {
      debit: b._sum.debitAmount?.toNumber() || 0,
      credit: b._sum.creditAmount?.toNumber() || 0,
    });
  });

  return { accounts, balanceMap };
}

function buildAccountHierarchy(
  accounts: Account[],
  balanceMap: Map<string, { debit: number; credit: number }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountTypeMultiplier: (type: string) => number
) {
  const nodeMap = new Map<string, AccountNode>();

  // Initialize
  accounts.forEach((acc) => {
    const bal = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
    let amount = 0;

    // Standard Accounting Logic:
    // Assets, Expenses: Debit is positive
    // Liabilities, Equity, Revenue: Credit is positive
    // BUT for reports, we often want everything positive if it's "normal".

    if (acc.type === "asset" || acc.type === "expense") {
      amount = bal.debit - bal.credit;
    } else {
      amount = bal.credit - bal.debit;
    }

    nodeMap.set(acc.id, {
      ...acc,
      amount,
      totalAmount: 0,
      children: [],
    });
  });

  // Build Tree
  const roots: AccountNode[] = [];

  accounts.forEach((acc) => {
    if (acc.parentId && nodeMap.has(acc.parentId)) {
      nodeMap.get(acc.parentId)!.children.push(nodeMap.get(acc.id)!);
    } else {
      roots.push(nodeMap.get(acc.id)!);
    }
  });

  // Calculate Totals
  function calculateTotal(node: AccountNode): number {
    let sum = node.amount;
    for (const child of node.children) {
      sum += calculateTotal(child);
    }
    node.totalAmount = sum;
    return sum;
  }

  roots.forEach((root) => calculateTotal(root));

  // Map to ReportAccountLine
  function mapToLine(node: AccountNode): ReportAccountLine {
    return {
      accountId: node.id,
      code: node.code,
      name: node.name,
      amount: node.totalAmount,
      level: node.level,
      type: node.type,
      children: node.children.map(mapToLine),
    };
  }

  return roots.map(mapToLine);
}

// --- Report Actions ---

export async function getProfitAndLoss(
  startDate: string,
  endDate: string
): Promise<ProfitLossReport> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const { accounts, balanceMap } = await getAccountBalances(start, end, [
    "revenue",
    "expense",
  ]);

  const revenueAccounts = accounts.filter((a) => a.type === "revenue");
  const expenseAccounts = accounts.filter((a) => a.type === "expense");

  const revenueTree = buildAccountHierarchy(
    revenueAccounts,
    balanceMap,
    () => 1
  );
  const expenseTree = buildAccountHierarchy(
    expenseAccounts,
    balanceMap,
    () => 1
  );

  const totalRevenue = revenueTree.reduce((sum, node) => sum + node.amount, 0);
  const totalExpenses = expenseTree.reduce((sum, node) => sum + node.amount, 0);

  return {
    revenue: revenueTree,
    expenses: expenseTree,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}

export async function getBalanceSheet(
  date: string
): Promise<BalanceSheetReport> {
  const asOf = new Date(date);

  // 1. Get Asset, Liability, Equity balances (Cumulative)
  const { accounts, balanceMap } = await getAccountBalances(null, asOf, [
    "asset",
    "liability",
    "equity",
  ]);

  // 2. Calculate Retained Earnings
  const { accounts: plAccounts, balanceMap: plBalanceMap } =
    await getAccountBalances(null, asOf, ["revenue", "expense"]);

  let retainedEarnings = 0;
  plAccounts.forEach((acc) => {
    const bal = plBalanceMap.get(acc.id) || { debit: 0, credit: 0 };
    if (acc.type === "revenue") {
      retainedEarnings += bal.credit - bal.debit;
    } else {
      retainedEarnings -= bal.debit - bal.credit;
    }
  });

  const assetTree = buildAccountHierarchy(
    accounts.filter((a) => a.type === "asset"),
    balanceMap,
    () => 1
  );
  const liabilityTree = buildAccountHierarchy(
    accounts.filter((a) => a.type === "liability"),
    balanceMap,
    () => 1
  );
  const equityTree = buildAccountHierarchy(
    accounts.filter((a) => a.type === "equity"),
    balanceMap,
    () => 1
  );

  const totalAssets = assetTree.reduce((sum, node) => sum + node.amount, 0);
  const totalLiabilities = liabilityTree.reduce(
    (sum, node) => sum + node.amount,
    0
  );
  let totalEquity = equityTree.reduce((sum, node) => sum + node.amount, 0);

  const retainedEarningsLine: ReportAccountLine = {
    accountId: "calculated-retained-earnings",
    code: "99999",
    name: "Retained Earnings / Net Income",
    amount: retainedEarnings,
    level: 0,
    type: "equity",
    children: [],
  };

  equityTree.push(retainedEarningsLine);
  totalEquity += retainedEarnings;

  return {
    assets: assetTree,
    liabilities: liabilityTree,
    equity: equityTree,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
  };
}

export async function getCashFlowStatement(
  startDate: string,
  endDate: string
): Promise<CashFlowReport> {
  const start = new Date(startDate);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const end = new Date(endDate);

  // Operating Activities
  const pl = await getProfitAndLoss(startDate, endDate);
  const netIncome = pl.netIncome;

  const operatingActivities: ReportAccountLine[] = [
    {
      accountId: "net-income",
      code: "",
      name: "Net Income",
      amount: netIncome,
      level: 0,
      type: "operating",
    },
  ];

  // Depreciation Add-back
  function findDepreciation(nodes: ReportAccountLine[]): number {
    let sum = 0;
    for (const node of nodes) {
      if (node.name.toLowerCase().includes("depreciation")) {
        sum += node.amount;
      }
      if (node.children) sum += findDepreciation(node.children);
    }
    return sum;
  }
  const depreciationAddBack = findDepreciation(pl.expenses);
  if (depreciationAddBack !== 0) {
    operatingActivities.push({
      accountId: "depreciation-add-back",
      code: "",
      name: "Depreciation & Amortization",
      amount: depreciationAddBack,
      level: 0,
      type: "operating",
    });
  }

  // Changes in Working Capital
  const balanceSheetStart = await getBalanceSheet(
    new Date(start.getTime() - 86400000).toISOString().split("T")[0]
  );
  const balanceSheetEnd = await getBalanceSheet(endDate);

  let changeInReceivables = 0;
  let changeInPayables = 0;

  function flatten(nodes: ReportAccountLine[]): ReportAccountLine[] {
    let res: ReportAccountLine[] = [];
    for (const node of nodes) {
      res.push(node);
      if (node.children) res = res.concat(flatten(node.children));
    }
    return res;
  }

  const startAssets = flatten(balanceSheetStart.assets);
  const endAssets = flatten(balanceSheetEnd.assets);
  const startLiabilities = flatten(balanceSheetStart.liabilities);
  const endLiabilities = flatten(balanceSheetEnd.liabilities);

  // Receivables
  const arAccounts = endAssets.filter((a) =>
    a.name.toLowerCase().includes("receivable")
  );
  arAccounts.forEach((endAcc) => {
    const startAcc = startAssets.find((a) => a.accountId === endAcc.accountId);
    const startVal = startAcc ? startAcc.amount : 0;
    const change = endAcc.amount - startVal;
    changeInReceivables -= change;
  });

  if (changeInReceivables !== 0) {
    operatingActivities.push({
      accountId: "change-ar",
      code: "",
      name: "Change in Accounts Receivable",
      amount: changeInReceivables,
      level: 0,
      type: "operating",
    });
  }

  // Payables
  const apAccounts = endLiabilities.filter((a) =>
    a.name.toLowerCase().includes("payable")
  );
  apAccounts.forEach((endAcc) => {
    const startAcc = startLiabilities.find(
      (a) => a.accountId === endAcc.accountId
    );
    const startVal = startAcc ? startAcc.amount : 0;
    const change = endAcc.amount - startVal;
    changeInPayables += change;
  });

  if (changeInPayables !== 0) {
    operatingActivities.push({
      accountId: "change-ap",
      code: "",
      name: "Change in Accounts Payable",
      amount: changeInPayables,
      level: 0,
      type: "operating",
    });
  }

  const netCashProvidedByOperating = operatingActivities.reduce(
    (s, i) => s + i.amount,
    0
  );

  // Cash at Beginning and End
  const cashStartNodes = startAssets.filter((a) =>
    a.name.toLowerCase().includes("cash")
  );
  const cashEndNodes = endAssets.filter((a) =>
    a.name.toLowerCase().includes("cash")
  );

  const cashAtBeginning = cashStartNodes.reduce((s, a) => s + a.amount, 0);
  const cashAtEnd = cashEndNodes.reduce((s, a) => s + a.amount, 0);

  return {
    operatingActivities,
    investingActivities: [],
    financingActivities: [],
    netCashProvidedByOperating,
    netCashProvidedByInvesting: 0,
    netCashProvidedByFinancing: 0,
    netIncreaseInCash: netCashProvidedByOperating,
    cashAtBeginning,
    cashAtEnd,
  };
}

export async function getStatementOfChangesInEquity(
  startDate: string,
  endDate: string
): Promise<EquityChangeReport> {
  const start = new Date(startDate);
  const dayBeforeStart = new Date(start.getTime() - 86400000)
    .toISOString()
    .split("T")[0];

  const bsStart = await getBalanceSheet(dayBeforeStart);
  const pl = await getProfitAndLoss(startDate, endDate);
  const bsEnd = await getBalanceSheet(endDate);

  function flatten(nodes: ReportAccountLine[]): ReportAccountLine[] {
    let res: ReportAccountLine[] = [];
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        res = res.concat(flatten(node.children));
      } else {
        res.push(node);
      }
    }
    return res;
  }

  const startEquity = flatten(bsStart.equity);
  const endEquity = flatten(bsEnd.equity);

  const map = new Map<string, EquityChangeLine>();

  startEquity.forEach((acc) => {
    if (acc.accountId === "calculated-retained-earnings") return;
    map.set(acc.accountId, {
      name: acc.name,
      balanceBeginning: acc.amount,
      netIncome: 0,
      additions: 0,
      deductions: 0,
      balanceEnding: 0,
    });
  });

  endEquity.forEach((acc) => {
    if (acc.accountId === "calculated-retained-earnings") return;
    if (!map.has(acc.accountId)) {
      map.set(acc.accountId, {
        name: acc.name,
        balanceBeginning: 0,
        netIncome: 0,
        additions: 0,
        deductions: 0,
        balanceEnding: acc.amount,
      });
    } else {
      const line = map.get(acc.accountId)!;
      line.balanceEnding = acc.amount;
      const diff = line.balanceEnding - line.balanceBeginning;
      if (diff > 0) line.additions = diff;
      else line.deductions = -diff;
    }
  });

  const startRE =
    startEquity.find((a) => a.accountId === "calculated-retained-earnings")
      ?.amount || 0;
  const endRE =
    endEquity.find((a) => a.accountId === "calculated-retained-earnings")
      ?.amount || 0;
  const netIncome = pl.netIncome;

  const reDiff = endRE - (startRE + netIncome);

  map.set("retained-earnings", {
    name: "Retained Earnings",
    balanceBeginning: startRE,
    netIncome: netIncome,
    additions: reDiff > 0 ? reDiff : 0,
    deductions: reDiff < 0 ? -reDiff : 0,
    balanceEnding: endRE,
  });

  const reportItems = Array.from(map.values());

  return {
    items: reportItems,
    totalBeginning: reportItems.reduce((s, i) => s + i.balanceBeginning, 0),
    totalNetIncome: reportItems.reduce((s, i) => s + i.netIncome, 0),
    totalAdditions: reportItems.reduce((s, i) => s + i.additions, 0),
    totalDeductions: reportItems.reduce((s, i) => s + i.deductions, 0),
    totalEnding: reportItems.reduce((s, i) => s + i.balanceEnding, 0),
  };
}
