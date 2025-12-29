"use server";

import { prisma } from "@/lib/prisma";
import { Account } from "@/prisma/generated/prisma/client";
import { AccountType } from "@/prisma/generated/prisma/enums";

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
  previousAmount?: number;
  change?: number;
  changePercentage?: number;
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
  previousTotalRevenue?: number;
  previousTotalExpenses?: number;
  previousNetIncome?: number;
};

export type BalanceSheetReport = {
  assets: ReportAccountLine[];
  liabilities: ReportAccountLine[];
  equity: ReportAccountLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  previousTotalAssets?: number;
  previousTotalLiabilities?: number;
  previousTotalEquity?: number;
  previousTotalLiabilitiesAndEquity?: number;
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
  previousNetCashProvidedByOperating?: number;
  previousNetCashProvidedByInvesting?: number;
  previousNetCashProvidedByFinancing?: number;
  previousNetIncreaseInCash?: number;
  previousCashAtBeginning?: number;
  previousCashAtEnd?: number;
};

export type EquityChangeLine = {
  name: string;
  balanceBeginning: number;
  netIncome: number;
  additions: number;
  deductions: number;
  balanceEnding: number;
  // Comparative fields (optional)
  previousBalanceEnding?: number;
  change?: number;
  changePercentage?: number;
};

export type EquityChangeReport = {
  items: EquityChangeLine[];
  totalBeginning: number;
  totalNetIncome: number;
  totalAdditions: number;
  totalDeductions: number;
  totalEnding: number;
  previousTotalEnding?: number;
  change?: number;
  changePercentage?: number;
};

type AccountNode = Account & {
  amount: number;
  totalAmount: number;
  previousAmount: number;
  previousTotalAmount: number;
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
  previousBalanceMap: Map<string, { debit: number; credit: number }> | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountTypeMultiplier: (type: string) => number
) {
  const nodeMap = new Map<string, AccountNode>();

  // Initialize
  accounts.forEach((acc) => {
    const bal = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
    const prevBal = previousBalanceMap?.get(acc.id) || { debit: 0, credit: 0 };

    let amount = 0;
    let previousAmount = 0;

    // Standard Accounting Logic:
    // Assets, Expenses: Debit is positive
    // Liabilities, Equity, Revenue: Credit is positive
    if (acc.type === "asset" || acc.type === "expense") {
      amount = bal.debit - bal.credit;
      previousAmount = prevBal.debit - prevBal.credit;
    } else {
      amount = bal.credit - bal.debit;
      previousAmount = prevBal.credit - prevBal.debit;
    }

    nodeMap.set(acc.id, {
      ...acc,
      amount,
      totalAmount: 0,
      previousAmount,
      previousTotalAmount: 0,
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
  function calculateTotal(node: AccountNode) {
    let sum = node.amount;
    let prevSum = node.previousAmount;

    for (const child of node.children) {
      calculateTotal(child);
      sum += child.totalAmount;
      prevSum += child.previousTotalAmount;
    }
    node.totalAmount = sum;
    node.previousTotalAmount = prevSum;
  }

  roots.forEach((root) => calculateTotal(root));

  // Map to ReportAccountLine
  function mapToLine(node: AccountNode): ReportAccountLine {
    const change = previousBalanceMap
      ? node.totalAmount - node.previousTotalAmount
      : undefined;
    const changePercentage =
      previousBalanceMap && node.previousTotalAmount !== 0
        ? (change! / Math.abs(node.previousTotalAmount)) * 100
        : 0;

    return {
      accountId: node.id,
      code: node.code,
      name: node.name,
      amount: node.totalAmount,
      previousAmount: previousBalanceMap ? node.previousTotalAmount : undefined,
      change,
      changePercentage,
      level: node.level,
      type: node.type,
      children: node.children.map(mapToLine),
    };
  }

  return roots.map(mapToLine);
}

import { authorizedAction } from "@/lib/permissions/protected-action";

/**
 * Generate Profit & Loss (Income Statement) report.
 * Shows Revenue, Expenses, and Net Income for a specific period.
 * Supports comparative analysis with a previous period.
 * Permission: "reports.view"
 *
 * @param startDate            - Start date of the period
 * @param endDate              - End date of the period
 * @param comparativeStartDate - Optional start date for comparison
 * @param comparativeEndDate   - Optional end date for comparison
 * @returns                    - Hierarchical report data
 */
export async function getProfitAndLoss(
  startDate: string,
  endDate: string,
  comparativeStartDate?: string,
  comparativeEndDate?: string
) {
  return authorizedAction(
    "reports.view",
    async (
      startDate: string,
      endDate: string,
      comparativeStartDate?: string,
      comparativeEndDate?: string
    ) => {
      try {
        const data = await _getProfitAndLoss(
          startDate,
          endDate,
          comparativeStartDate,
          comparativeEndDate
        );
        return { success: true, data };
      } catch (error) {
        console.error(error);
        return {
          success: false,
          error: "Failed to generate Profit & Loss report",
        };
      }
    }
  )(startDate, endDate, comparativeStartDate, comparativeEndDate);
}

async function _getProfitAndLoss(
  startDate: string,
  endDate: string,
  comparativeStartDate?: string,
  comparativeEndDate?: string
): Promise<ProfitLossReport> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const { accounts, balanceMap } = await getAccountBalances(start, end, [
    "revenue",
    "expense",
  ]);

  let previousBalanceMap: Map<
    string,
    { debit: number; credit: number }
  > | null = null;
  if (comparativeStartDate && comparativeEndDate) {
    const prevStart = new Date(comparativeStartDate);
    const prevEnd = new Date(comparativeEndDate);
    const prevResult = await getAccountBalances(prevStart, prevEnd, [
      "revenue",
      "expense",
    ]);
    previousBalanceMap = prevResult.balanceMap;
  }

  const revenueAccounts = accounts.filter((a) => a.type === "revenue");
  const expenseAccounts = accounts.filter((a) => a.type === "expense");

  const revenueTree = buildAccountHierarchy(
    revenueAccounts,
    balanceMap,
    previousBalanceMap,
    () => 1
  );
  const expenseTree = buildAccountHierarchy(
    expenseAccounts,
    balanceMap,
    previousBalanceMap,
    () => 1
  );

  const totalRevenue = revenueTree.reduce((sum, node) => sum + node.amount, 0);
  const totalExpenses = expenseTree.reduce((sum, node) => sum + node.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  let previousTotalRevenue: number | undefined;
  let previousTotalExpenses: number | undefined;
  let previousNetIncome: number | undefined;

  if (previousBalanceMap) {
    previousTotalRevenue = revenueTree.reduce(
      (sum, node) => sum + (node.previousAmount || 0),
      0
    );
    previousTotalExpenses = expenseTree.reduce(
      (sum, node) => sum + (node.previousAmount || 0),
      0
    );
    previousNetIncome = previousTotalRevenue - previousTotalExpenses;
  }

  return {
    revenue: revenueTree,
    expenses: expenseTree,
    totalRevenue,
    totalExpenses,
    netIncome,
    previousTotalRevenue,
    previousTotalExpenses,
    previousNetIncome,
  };
}

export async function getBalanceSheet(date: string, comparativeDate?: string) {
  return authorizedAction(
    "reports.view",
    async (date: string, comparativeDate?: string) => {
      try {
        const data = await _getBalanceSheet(date, comparativeDate);
        return { success: true, data };
      } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate Balance Sheet" };
      }
    }
  )(date, comparativeDate);
}

async function _getBalanceSheet(
  date: string,
  comparativeDate?: string
): Promise<BalanceSheetReport> {
  const asOf = new Date(date);

  // 1. Get Asset, Liability, Equity balances (Cumulative)
  const { accounts, balanceMap } = await getAccountBalances(null, asOf, [
    "asset",
    "liability",
    "equity",
  ]);

  let previousBalanceMap: Map<
    string,
    { debit: number; credit: number }
  > | null = null;
  if (comparativeDate) {
    const prevAsOf = new Date(comparativeDate);
    const prevResult = await getAccountBalances(null, prevAsOf, [
      "asset",
      "liability",
      "equity",
    ]);
    previousBalanceMap = prevResult.balanceMap;
  }

  // 2. Calculate Retained Earnings
  const { accounts: plAccounts, balanceMap: plBalanceMap } =
    await getAccountBalances(null, asOf, ["revenue", "expense"]);

  let prevPlBalanceMap: Map<string, { debit: number; credit: number }> | null =
    null;
  if (comparativeDate) {
    const prevAsOf = new Date(comparativeDate);
    const prevPlResult = await getAccountBalances(null, prevAsOf, [
      "revenue",
      "expense",
    ]);
    prevPlBalanceMap = prevPlResult.balanceMap;
  }

  function calculateRE(
    accounts: Account[],
    balMap: Map<string, { debit: number; credit: number }>
  ) {
    let re = 0;
    accounts.forEach((acc) => {
      const bal = balMap.get(acc.id) || { debit: 0, credit: 0 };
      if (acc.type === "revenue") {
        re += bal.credit - bal.debit;
      } else {
        re -= bal.debit - bal.credit;
      }
    });
    return re;
  }

  const retainedEarnings = calculateRE(plAccounts, plBalanceMap);
  const previousRetainedEarnings = prevPlBalanceMap
    ? calculateRE(plAccounts, prevPlBalanceMap)
    : 0;

  const assetTree = buildAccountHierarchy(
    accounts.filter((a) => a.type === "asset"),
    balanceMap,
    previousBalanceMap,
    () => 1
  );
  const liabilityTree = buildAccountHierarchy(
    accounts.filter((a) => a.type === "liability"),
    balanceMap,
    previousBalanceMap,
    () => 1
  );
  const equityTree = buildAccountHierarchy(
    accounts.filter((a) => a.type === "equity"),
    balanceMap,
    previousBalanceMap,
    () => 1
  );

  const totalAssets = assetTree.reduce((sum, node) => sum + node.amount, 0);
  const totalLiabilities = liabilityTree.reduce(
    (sum, node) => sum + node.amount,
    0
  );
  let totalEquity = equityTree.reduce((sum, node) => sum + node.amount, 0);

  const previousTotalAssets = previousBalanceMap
    ? assetTree.reduce((sum, node) => sum + (node.previousAmount || 0), 0)
    : undefined;
  const previousTotalLiabilities = previousBalanceMap
    ? liabilityTree.reduce((sum, node) => sum + (node.previousAmount || 0), 0)
    : undefined;
  let previousTotalEquity = previousBalanceMap
    ? equityTree.reduce((sum, node) => sum + (node.previousAmount || 0), 0)
    : undefined;

  const retainedEarningsLine: ReportAccountLine = {
    accountId: "calculated-retained-earnings",
    code: "99999",
    name: "Retained Earnings / Net Income",
    amount: retainedEarnings,
    previousAmount: previousBalanceMap ? previousRetainedEarnings : undefined,
    level: 0,
    type: "equity",
    children: [],
  };

  // Add change fields for RE
  if (previousBalanceMap) {
    retainedEarningsLine.change = retainedEarnings - previousRetainedEarnings;
    retainedEarningsLine.changePercentage =
      previousRetainedEarnings !== 0
        ? (retainedEarningsLine.change / Math.abs(previousRetainedEarnings)) *
          100
        : 0;
  }

  equityTree.push(retainedEarningsLine);
  totalEquity += retainedEarnings;
  if (previousTotalEquity !== undefined) {
    previousTotalEquity += previousRetainedEarnings;
  }

  return {
    assets: assetTree,
    liabilities: liabilityTree,
    equity: equityTree,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    previousTotalAssets,
    previousTotalLiabilities,
    previousTotalEquity,
    previousTotalLiabilitiesAndEquity:
      previousTotalLiabilities !== undefined &&
      previousTotalEquity !== undefined
        ? previousTotalLiabilities + previousTotalEquity
        : undefined,
  };
}

export async function getCashFlowStatement(
  startDate: string,
  endDate: string,
  comparativeStartDate?: string,
  comparativeEndDate?: string
) {
  return authorizedAction(
    "reports.view",
    async (
      startDate: string,
      endDate: string,
      comparativeStartDate?: string,
      comparativeEndDate?: string
    ) => {
      try {
        const data = await _getCashFlowStatement(
          startDate,
          endDate,
          comparativeStartDate,
          comparativeEndDate
        );
        return { success: true, data };
      } catch (error) {
        console.error(error);
        return {
          success: false,
          error: "Failed to generate Cash Flow Statement",
        };
      }
    }
  )(startDate, endDate, comparativeStartDate, comparativeEndDate);
}

async function _getCashFlowStatement(
  startDate: string,
  endDate: string,
  comparativeStartDate?: string,
  comparativeEndDate?: string
): Promise<CashFlowReport> {
  // Base Report
  const current = await calculateCashFlowForPeriod(startDate, endDate);

  let previous: Partial<CashFlowReport> = {};
  if (comparativeStartDate && comparativeEndDate) {
    previous = await calculateCashFlowForPeriod(
      comparativeStartDate,
      comparativeEndDate
    );
  }

  // Merge (Operating Activities mostly)
  // For Cash Flow, row-by-row comparison is tricky because rows are dynamic (e.g. "Change in AR").
  // However, we can map them by name or ID.

  const mergeLines = (
    curr: ReportAccountLine[],
    prev: ReportAccountLine[]
  ): ReportAccountLine[] => {
    return curr.map((line) => {
      const prevLine = prev.find((p) => p.name === line.name); // Using name as key for dynamic rows
      const prevAmount = prevLine ? prevLine.amount : 0;
      const change = line.amount - prevAmount;
      const changePercentage =
        prevAmount !== 0 ? (change / Math.abs(prevAmount)) * 100 : 0;

      return {
        ...line,
        previousAmount: comparativeStartDate ? prevAmount : undefined,
        change: comparativeStartDate ? change : undefined,
        changePercentage: comparativeStartDate ? changePercentage : undefined,
      };
    });
  };

  return {
    ...current,
    operatingActivities: mergeLines(
      current.operatingActivities,
      previous.operatingActivities || []
    ),
    investingActivities: mergeLines(
      current.investingActivities,
      previous.investingActivities || []
    ),
    financingActivities: mergeLines(
      current.financingActivities,
      previous.financingActivities || []
    ),

    previousNetCashProvidedByOperating: previous.netCashProvidedByOperating,
    previousNetCashProvidedByInvesting: previous.netCashProvidedByInvesting,
    previousNetCashProvidedByFinancing: previous.netCashProvidedByFinancing,
    previousNetIncreaseInCash: previous.netIncreaseInCash,
    previousCashAtBeginning: previous.cashAtBeginning,
    previousCashAtEnd: previous.cashAtEnd,
  };
}

async function calculateCashFlowForPeriod(
  startDate: string,
  endDate: string
): Promise<CashFlowReport> {
  const start = new Date(startDate);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const end = new Date(endDate);

  // Operating Activities
  const pl = await _getProfitAndLoss(startDate, endDate);
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
  const balanceSheetStart = await _getBalanceSheet(
    new Date(start.getTime() - 86400000).toISOString().split("T")[0]
  );
  const balanceSheetEnd = await _getBalanceSheet(endDate);

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

/**
 * Generate Statement of Changes in Equity.
 * Shows movement in equity accounts over a period.
 * Permission: "reports.view"
 *
 * @param startDate            - Start date of the period
 * @param endDate              - End date of the period
 * @param comparativeStartDate - Optional start date for comparison
 * @param comparativeEndDate   - Optional end date for comparison
 * @returns                    - Equity change report data
 */
export async function getStatementOfChangesInEquity(
  startDate: string,
  endDate: string,
  comparativeStartDate?: string,
  comparativeEndDate?: string
) {
  return authorizedAction(
    "reports.view",
    async (
      startDate: string,
      endDate: string,
      comparativeStartDate?: string,
      comparativeEndDate?: string
    ) => {
      try {
        const data = await _getStatementOfChangesInEquity(
          startDate,
          endDate,
          comparativeStartDate,
          comparativeEndDate
        );
        return { success: true, data };
      } catch (error) {
        console.error(error);
        return {
          success: false,
          error: "Failed to generate Statement of Changes in Equity",
        };
      }
    }
  )(startDate, endDate, comparativeStartDate, comparativeEndDate);
}

async function _getStatementOfChangesInEquity(
  startDate: string,
  endDate: string,
  comparativeStartDate?: string,
  comparativeEndDate?: string
): Promise<EquityChangeReport> {
  const start = new Date(startDate);
  const dayBeforeStart = new Date(start.getTime() - 86400000)
    .toISOString()
    .split("T")[0];

  const bsStart = await _getBalanceSheet(dayBeforeStart);
  const pl = await _getProfitAndLoss(startDate, endDate);
  const bsEnd = await _getBalanceSheet(endDate);

  let bsPrevEnd: BalanceSheetReport | null = null;
  if (comparativeEndDate) {
    bsPrevEnd = await _getBalanceSheet(comparativeEndDate);
  }

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
  const prevEndEquity = bsPrevEnd ? flatten(bsPrevEnd.equity) : [];

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

    // Find previous ending balance
    const prevAcc = prevEndEquity.find((a) => a.accountId === acc.accountId);
    const previousBalanceEnding = prevAcc ? prevAcc.amount : undefined;

    let line = map.get(acc.accountId);
    if (!line) {
      line = {
        name: acc.name,
        balanceBeginning: 0,
        netIncome: 0,
        additions: 0,
        deductions: 0,
        balanceEnding: acc.amount,
        previousBalanceEnding,
      };
      map.set(acc.accountId, line);
    } else {
      line.balanceEnding = acc.amount;
      line.previousBalanceEnding = previousBalanceEnding;
      const diff = line.balanceEnding - line.balanceBeginning;
      if (diff > 0) line.additions = diff;
      else line.deductions = -diff;
    }

    if (bsPrevEnd) {
      const change = line.balanceEnding - (line.previousBalanceEnding || 0);
      const changePercentage =
        line.previousBalanceEnding && line.previousBalanceEnding !== 0
          ? (change / Math.abs(line.previousBalanceEnding)) * 100
          : 0;
      line.change = change;
      line.changePercentage = changePercentage;
    }
  });

  const startRE =
    startEquity.find((a) => a.accountId === "calculated-retained-earnings")
      ?.amount || 0;
  const endRE =
    endEquity.find((a) => a.accountId === "calculated-retained-earnings")
      ?.amount || 0;

  const prevEndRE = bsPrevEnd
    ? prevEndEquity.find((a) => a.accountId === "calculated-retained-earnings")
        ?.amount
    : undefined;

  const netIncome = pl.netIncome;

  const reDiff = endRE - (startRE + netIncome);

  const reLine: EquityChangeLine = {
    name: "Retained Earnings",
    balanceBeginning: startRE,
    netIncome: netIncome,
    additions: reDiff > 0 ? reDiff : 0,
    deductions: reDiff < 0 ? -reDiff : 0,
    balanceEnding: endRE,
    previousBalanceEnding: prevEndRE,
  };

  if (bsPrevEnd) {
    const change = reLine.balanceEnding - (reLine.previousBalanceEnding || 0);
    const changePercentage =
      reLine.previousBalanceEnding && reLine.previousBalanceEnding !== 0
        ? (change / Math.abs(reLine.previousBalanceEnding)) * 100
        : 0;
    reLine.change = change;
    reLine.changePercentage = changePercentage;
  }

  map.set("retained-earnings", reLine);

  const items = Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const totalEnding = items.reduce((s, i) => s + i.balanceEnding, 0);
  const previousTotalEnding = bsPrevEnd
    ? items.reduce((s, i) => s + (i.previousBalanceEnding || 0), 0)
    : undefined;

  let change: number | undefined;
  let changePercentage: number | undefined;

  if (bsPrevEnd && previousTotalEnding !== undefined) {
    change = totalEnding - previousTotalEnding;
    changePercentage =
      previousTotalEnding !== 0
        ? (change / Math.abs(previousTotalEnding)) * 100
        : 0;
  }

  return {
    items,
    totalBeginning: items.reduce((s, i) => s + i.balanceBeginning, 0),
    totalNetIncome: items.reduce((s, i) => s + i.netIncome, 0),
    totalAdditions: items.reduce((s, i) => s + i.additions, 0),
    totalDeductions: items.reduce((s, i) => s + i.deductions, 0),
    totalEnding,
    previousTotalEnding,
    change,
    changePercentage,
  };
}
