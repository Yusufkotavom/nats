"use server";

import { authorizedAction } from "@/lib/permissions/protected-action";
import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { serverRegistry } from "@/lib/reporting/server-registry";

const MODULE_BY_CODE_PREFIX: Array<{ prefix: string; module: string }> = [
  { prefix: "SALES_", module: "SALES" },
  { prefix: "PURCHASE_", module: "PURCHASE" },
  { prefix: "POS_", module: "POS" },
  { prefix: "SERVICE_", module: "SERVICE" },
  { prefix: "JOURNAL_", module: "ACCOUNTING" },
  { prefix: "PROFIT_", module: "ACCOUNTING" },
  { prefix: "BALANCE_", module: "ACCOUNTING" },
  { prefix: "CASH_", module: "ACCOUNTING" },
  { prefix: "EQUITY_", module: "ACCOUNTING" },
  { prefix: "FINANCIAL_", module: "ACCOUNTING" },
  { prefix: "BUDGET_", module: "BUDGETING" },
];

function inferModule(code: string) {
  return MODULE_BY_CODE_PREFIX.find((item) => code.startsWith(item.prefix))?.module || "GENERAL";
}

export const getDocumentTemplateSettings = authorizedAction(
  "company.settings",
  async () => {
    const codes = Object.keys(serverRegistry);

    for (const code of codes) {
      await prisma.reportTemplate.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: code.replaceAll("_", " "),
          module: inferModule(code),
          description: `Template for ${code.replaceAll("_", " ")}`,
          isSystem: true,
          isActive: true,
          config: {
            pageSize: "A4",
            orientation: "portrait",
            theme: "default",
          },
        },
      });
    }

    const templates = await prisma.reportTemplate.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    return { success: true, data: SuperJSON.serialize(templates) };
  },
);

export const updateDocumentTemplateSetting = authorizedAction(
  "company.settings",
  async (
    id: string,
    payload: {
      name: string;
      description?: string;
      isActive: boolean;
      pageSize: string;
      orientation: "portrait" | "landscape";
      theme: string;
    },
  ) => {
    const result = await prisma.reportTemplate.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description || null,
        isActive: payload.isActive,
        config: {
          pageSize: payload.pageSize,
          orientation: payload.orientation,
          theme: payload.theme,
        },
      },
    });

    revalidateLocalizedPath("/admin/settings/documents");
    revalidateLocalizedPath("/reporting/preview");
    return { success: true, data: SuperJSON.serialize(result) };
  },
);
