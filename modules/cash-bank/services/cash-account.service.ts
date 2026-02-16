import { prisma } from "@/lib/prisma";
import { CashAccountFormData } from "@/app/(dashboard)/cash-bank/types";

export class CashAccountService {
    static async createAccount(data: CashAccountFormData) {
        return await prisma.cashAccount.create({
            data: {
                name: data.name,
                type: data.type,
                accountNumber: data.accountNumber,
                bankName: data.bankName,
                description: data.description,
                glAccountId: data.glAccountId,
            },
        });
    }

    static async updateAccount(id: string, data: CashAccountFormData) {
        return await prisma.cashAccount.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type,
                accountNumber: data.accountNumber,
                bankName: data.bankName,
                description: data.description,
                glAccountId: data.glAccountId,
            },
        });
    }

    static async deleteAccount(id: string) {
        // Check if there are any transfers associated with this account
        const transfers = await prisma.cashTransfer.findFirst({
            where: {
                OR: [{ fromAccountId: id }, { toAccountId: id }],
            },
        });

        if (transfers) {
            throw new Error("Cannot delete account with existing transfers.");
        }

        await prisma.cashAccount.delete({
            where: { id },
        });
    }

    static async getAccount(id: string) {
        return await prisma.cashAccount.findUnique({
            where: { id },
            include: {
                glAccount: true,
            },
        });
    }

    static async getAllAccounts() {
        return await prisma.cashAccount.findMany({
            include: {
                glAccount: true,
            },
            orderBy: {
                name: "asc",
            },
        });
    }
}
