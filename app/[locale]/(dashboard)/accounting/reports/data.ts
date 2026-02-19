import {
  getProfitAndLoss,
  getBalanceSheet,
  getCashFlowStatement,
  getStatementOfChangesInEquity,
  getFinancialRatios,
} from "./actions";

// Wrappers for Reporting Service that return raw data and throw errors
// This is because the Server Actions return { success: boolean, data: ... }
// but the Reporting Service expects data or throws.

export const fetchProfitLossData = async (input: {
  startDate: string;
  endDate: string;
  comparativeStartDate?: string;
  comparativeEndDate?: string;
}) => {
  const result = await getProfitAndLoss(
    input.startDate,
    input.endDate,
    input.comparativeStartDate,
    input.comparativeEndDate
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch Profit & Loss data");
  }
  return { ...result.data, ...input };
};

export const fetchBalanceSheetData = async (input: {
  date: string;
  comparativeDate?: string;
}) => {
  const result = await getBalanceSheet(input.date, input.comparativeDate);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch Balance Sheet data");
  }
  return { ...result.data, ...input };
};

export const fetchCashFlowData = async (input: {
  startDate: string;
  endDate: string;
  comparativeStartDate?: string;
  comparativeEndDate?: string;
}) => {
  const result = await getCashFlowStatement(
    input.startDate,
    input.endDate,
    input.comparativeStartDate,
    input.comparativeEndDate
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch Cash Flow data");
  }
  return { ...result.data, ...input };
};

export const fetchEquityData = async (input: {
  startDate: string;
  endDate: string;
  comparativeStartDate?: string;
  comparativeEndDate?: string;
}) => {
  const result = await getStatementOfChangesInEquity(
    input.startDate,
    input.endDate,
    input.comparativeStartDate,
    input.comparativeEndDate
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch Equity data");
  }
  return { ...result.data, ...input };
};

export const fetchRatiosData = async (input: { date: string }) => {
  const result = await getFinancialRatios(input.date);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch Financial Ratios");
  }
  return { ...result.data, ...input };
};
