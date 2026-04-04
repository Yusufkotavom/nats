"use server";

import { serverRegistry } from "@/lib/reporting/server-registry";
import { prisma } from "@/lib/prisma";
import { managementPrisma } from "@/lib/prisma/management";
import { getSession } from "@/lib/auth/auth";
import { SuperJSON } from "@/lib/superjson";
import { ReportFormat } from "@/lib/reporting/types";

export async function getReportData(code: string, input: any) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const reportDef = serverRegistry[code as keyof typeof serverRegistry];
    if (!reportDef) {
      throw new Error(`Report with code ${code} not found`);
    }

    // Fetch Data
    const data = await reportDef.fetchData(input);

    // Fetch Context Info
    const companyProfile = await prisma.companyProfile.findFirst();
    const user = await managementPrisma.user.findUnique({ where: { id: session.userId } });

    // Fetch Template Config from DB
    const reportTemplate = await prisma.reportTemplate.findUnique({
      where: { code },
    });

    const config = {
      ...(reportTemplate?.config as Record<string, any> || {}),
    };

    const context = {
      data,
      user: {
        name: user?.name || "Unknown User",
        email: user?.email || "",
      },
      company: {
        name: companyProfile?.name || "My Company",
        address: companyProfile?.address || "",
        phone: companyProfile?.phone || "",
        email: companyProfile?.email || "",
        website: companyProfile?.website || "",
        dateFormat: companyProfile?.dateFormat || "MMM dd, yyyy",
        currency: companyProfile?.currency || "USD",
        currencySymbol: companyProfile?.currencySymbol || "$",
        currencyFormat: companyProfile?.currencyFormat || "standard",
        locale: companyProfile?.locale || "en-US",
      },
      config,
    };

    // Log success
    // We do this asynchronously or just await it. 
    // Since this is a server action, awaiting is safer.
    if (reportTemplate) {
      await prisma.reportLog.create({
        data: {
          templateId: reportTemplate.id,
          userId: session.userId,
          status: "SUCCESS",
          format: "PDF", // Defaulting to PDF for now as that's what we primarily support
          parameters: input,
          executionTimeMs: Date.now() - startTime,
        }
      });
    }

    return { success: true, data: SuperJSON.serialize(context) };

  } catch (error: any) {
    console.error("Report Generation Error:", error);

    // Try to log failure if we have a session
    try {
      const session = await getSession();
      if (session) {
        const reportTemplate = await prisma.reportTemplate.findUnique({
          where: { code },
        });
        if (reportTemplate) {
          await prisma.reportLog.create({
            data: {
              templateId: reportTemplate.id,
              userId: session.userId,
              status: "FAILED",
              format: "PDF",
              parameters: input,
              executionTimeMs: Date.now() - startTime,
              errorMessage: error.message
            }
          });
        }
      }
    } catch (logError) {
      // Ignore log error
    }

    return { success: false, error: error.message };
  }
}
