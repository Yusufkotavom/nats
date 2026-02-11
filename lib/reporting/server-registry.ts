import { getSalesOrderData } from "./reports/sales-order/data";

export const serverRegistry = {
  "SALES_ORDER": {
    fetchData: getSalesOrderData
  }
} as const;

export type ReportCode = keyof typeof serverRegistry;
