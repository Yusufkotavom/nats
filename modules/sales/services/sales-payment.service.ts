import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SalesPaymentInput } from "@/app/[locale]/(dashboard)/sales/payments/types";
import { generateDocumentNumber } from "@/lib/document-numbering";

const OVERPAYMENT_TOLERANCE = 0.01;

type CreateSalesPaymentInput = Omit<SalesPaymentInput, "paymentNumber"> & {
    paymentNumber?: string;
};

export class SalesPaymentService {
    static async create(data: CreateSalesPaymentInput, userId: string) {
        const invoice = await prisma.salesInvoice.findUnique({
            where: { id: data.salesInvoiceId },
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
            const payment = await tx.salesPayment.create({
                data: {
                    paymentNumber,
                    contactId: data.contactId,
                    salesInvoiceId: data.salesInvoiceId,
                    paymentDate: data.paymentDate,
                    amount: data.amount,
                    reference: data.reference,
                    notes: data.notes,
                    method: data.method,
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

            await tx.salesInvoice.update({
                where: { id: invoice.id },
                data: { status: newStatus },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "sales",
                type: "SALES_PAYMENT_CREATED",
                aggregateType: "SalesPayment",
                aggregateId: payment.id,
                payload: {
                    paymentId: payment.id,
                    paymentNumber: payment.paymentNumber,
                    amount: payment.amount.toString(),
                    salesInvoiceId: data.salesInvoiceId,
                    contactId: data.contactId,
                    userId,
                },
            });

            return payment;
        });
    }

    private static async generatePaymentNumber(): Promise<string> {
        return await generateDocumentNumber("SALES_PAYMENT", "Sales Payment", "PAY-IN-");
    }
}
