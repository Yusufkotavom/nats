import { ReportDefinition } from "./types";

class ReportRegistry {
  private static instance: ReportRegistry;
  private reports: Map<string, ReportDefinition> = new Map();

  private constructor() {}

  public static getInstance(): ReportRegistry {
    if (!ReportRegistry.instance) {
      ReportRegistry.instance = new ReportRegistry();
    }
    return ReportRegistry.instance;
  }

  public register(report: ReportDefinition) {
    if (this.reports.has(report.code)) {
      console.warn(`Report with code ${report.code} is already registered. Overwriting.`);
    }
    this.reports.set(report.code, report);
  }

  public get(code: string): ReportDefinition | undefined {
    return this.reports.get(code);
  }

  public getAll(): ReportDefinition[] {
    return Array.from(this.reports.values());
  }
}

export const reportRegistry = ReportRegistry.getInstance();
