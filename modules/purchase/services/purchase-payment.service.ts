import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { PurchasePaymentInput } from "@/app/(dashboard)/purchase/payments/types";

const OVERPAYMENT_TOLERANCE = 0.01;

type CreatePurchasePaymentInput = Omit<PurchasePaymentInput, "paymentNumber"> & {
    paymentNumber?: string;
};

export class PurchasePaymentService {
    static async create(data: CreatePurchasePaymentInput, userId: string) {
        const invoice = await prisma.purchaseInvoice.findUnique({
            where: { id: data.purchaseInvoiceId },
            include: { payments: true },
        });

        if (!invoice) throw new Error("Invoice not found");

        const cashAccount = await prisma.cashAccount.findUnique({
            where: { id: data.cashAccountId },
        });

        if (!cashAccount) throw new Error("Cash account not found");

        const totalPaid = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
        );
        const remaining = Number(invoice.totalAmount) - totalPaid;

        if (data.amount > remaining + OVERPAYMENT_TOLERANCE) {
            throw new Error(`Amount exceeds remaining balance of ${remaining}`);
        }

        const paymentNumber =
            data.paymentNumber || (await this.generatePaymentNumber());

        return await prisma.$transaction(async (tx) => {
            const payment = await tx.purchasePayment.create({
                data: {
                    paymentNumber,
                    contactId: data.contactId,
                    purchaseInvoiceId: data.purchaseInvoiceId,
                    paymentDate: data.paymentDate,
                    amount: data.amount,
                    reference: data.reference,
                    notes: data.notes,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    cashAccountId: data.cashAccountId,
                    attachments: {
                        connect: data.attachmentIds?.map((id) => ({ id })),
                    },
                },
            });

            const newTotalPaid = totalPaid + Number(data.amount);
            const newStatus =
                newTotalPaid >= Number(invoice.totalAmount) - OVERPAYMENT_TOLERANCE
                    ? "PAID"
                    : "PARTIALLY_PAID";

            await tx.purchaseInvoice.update({
                where: { id: invoice.id },
                data: { status: newStatus },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "purchase",
                type: "PURCHASE_PAYMENT_CREATED",
                aggregateType: "PurchasePayment",
                aggregateId: payment.id,
                payload: {
                    paymentId: payment.id,
                    paymentNumber: payment.paymentNumber,
                    amount: payment.amount.toString(),
                    purchaseInvoiceId: data.purchaseInvoiceId,
                    contactId: data.contactId,
                    userId,
                },
            });

            return payment;
        });
    }

    private static async generatePaymentNumber(): Promise<string> {
        const count = await prisma.purchasePayment.count();
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const sequence = (count + 1).toString().padStart(4, "0");
        return `PAY-OUT-${year}${month}-${sequence}`;
    }
}
