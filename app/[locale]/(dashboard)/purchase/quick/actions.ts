"use server";

import { addDays } from "date-fns";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import { SuperJSONResult } from "superjson";
import { createPurchaseReceive, updatePurchaseReceive } from "../receives/actions";
import { createPurchaseInvoice, postPurchaseInvoice } from "../invoices/actions";
import { createPurchasePayment, postPurchasePayment } from "../payments/actions";
import { QuickPurchaseInput, QuickPurchaseResult } from "./types";

type QuickPurchaseFormData = {
  vendors: { id: string; name: string }[];
  products: { id: string; name: string; sku: string; cost: number }[];
  cashAccounts: { id: string; name: string }[];
};

export async function getQuickPurchaseFormData(): Promise<SuperJSONResult> {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "purchase.view")) {
    return SuperJSON.serialize<QuickPurchaseFormData>({
      vendors: [],
      products: [],
      cashAccounts: [],
    });
  }

  const [vendors, products, cashAccounts] = await Promise.all([
    prisma.contact.findMany({
      where: { type: "VENDOR", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, cost: true },
    }),
    prisma.cashAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return SuperJSON.serialize<QuickPurchaseFormData>({
    vendors,
    products: products.map((p) => ({ ...p, cost: Number(p.cost) })),
    cashAccounts,
  });
}

export const createQuickPurchase = authorizedAction(
  "purchase.create",
  async (data: QuickPurchaseInput) => {
    try {
      if (!data.contactId) throw new Error("Vendor is required");
      if (!data.items || data.items.length === 0) throw new Error("At least one item is required");
      if (data.mode === "CASH_DAILY" && !data.cashAccountId) {
        throw new Error("Cash account is required for cash daily");
      }

      const productIds = data.items.map((i) => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p.name]));

      const receivePayload = {
        contactId: data.contactId,
        receiveDate: data.transactionDate,
        notes: data.notes,
        departmentId: data.departmentId,
        projectId: data.projectId,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const receiveCreateResult = await createPurchaseReceive(receivePayload);
      if (!receiveCreateResult.success || !receiveCreateResult.data) {
        throw new Error(receiveCreateResult.error || "Failed to create receive");
      }

      const createdReceive = SuperJSON.deserialize<{ id: string }>(
        receiveCreateResult.data as SuperJSONResult,
      );

      const receiveCompleteResult = await updatePurchaseReceive(createdReceive.id, {
        ...receivePayload,
        status: "COMPLETED",
      });
      if (!receiveCompleteResult.success) {
        throw new Error(receiveCompleteResult.error || "Failed to complete receive");
      }

      const dueDate =
        data.mode === "MONTHLY_CREDIT"
          ? data.dueDate || addDays(data.transactionDate, 30)
          : data.transactionDate;

      const invoicePayload = {
        contactId: data.contactId,
        invoiceDate: data.transactionDate,
        dueDate,
        notes: data.notes,
        departmentId: data.departmentId,
        projectId: data.projectId,
        globalDiscount: 0,
        totalTax: 0,
        shippingCost: 0,
        handlingCost: 0,
        items: data.items.map((item) => ({
          description: productMap.get(item.productId) || "Item",
          quantity: item.quantity,
          unitPrice: item.unitCost,
          discount: 0,
          tax: 0,
          productId: item.productId,
        })),
      };

      const invoiceCreateResult = await createPurchaseInvoice(invoicePayload as any);
      if (!invoiceCreateResult.success || !invoiceCreateResult.data) {
        throw new Error(invoiceCreateResult.error || "Failed to create invoice");
      }

      const createdInvoice = SuperJSON.deserialize<{ id: string; totalAmount: number }>(
        invoiceCreateResult.data as SuperJSONResult,
      );

      const postInvoiceResult = await postPurchaseInvoice(createdInvoice.id);
      if (!postInvoiceResult.success) {
        throw new Error(postInvoiceResult.error || "Failed to post invoice");
      }

      let paymentId: string | undefined;
      let postedPayment = false;

      if (data.mode === "CASH_DAILY") {
        const paymentCreateResult = await createPurchasePayment({
          paymentNumber: "",
          contactId: data.contactId,
          purchaseInvoiceId: createdInvoice.id,
          paymentDate: data.transactionDate,
          amount: Number(createdInvoice.totalAmount),
          reference: "Quick Purchase Cash",
          notes: data.notes,
          cashAccountId: data.cashAccountId!,
          departmentId: data.departmentId,
          projectId: data.projectId,
        } as any);

        if (!paymentCreateResult.success || !paymentCreateResult.data) {
          throw new Error(paymentCreateResult.error || "Failed to create payment");
        }

        const createdPayment = SuperJSON.deserialize<{ id: string }>(
          paymentCreateResult.data as SuperJSONResult,
        );
        paymentId = createdPayment.id;

        const postPaymentResult = await postPurchasePayment(createdPayment.id);
        if (!postPaymentResult.success) {
          throw new Error(postPaymentResult.error || "Failed to post payment");
        }
        postedPayment = true;
      }

      const result: QuickPurchaseResult = {
        receiveId: createdReceive.id,
        invoiceId: createdInvoice.id,
        paymentId,
        postedInvoice: true,
        postedPayment: data.mode === "CASH_DAILY" ? postedPayment : undefined,
      };

      revalidatePath("/purchase/receives");
      revalidatePath("/purchase/invoices");
      revalidatePath("/purchase/payments");
      revalidatePath("/purchase/quick");

      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed quick purchase:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process quick purchase",
      };
    }
  },
);

