import { Prisma } from "@/prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";
import { JournalService } from "@/modules/accounting/services/journal.service";

type AssetWithCategory = Prisma.AssetGetPayload<{
  include: { category: true };
}>;

export class AssetService {
  /**
   * Calculate depreciation schedule for an asset
   */
  static calculateDepreciationSchedule(
    cost: Decimal,
    residualValue: Decimal,
    usefulLifeMonths: number,
    method: "STRAIGHT_LINE" | "DECLINING_BALANCE" | "DOUBLE_DECLINING_BALANCE" | "UNITS_OF_PRODUCTION" | "NO_DEPRECIATION",
    startDate: Date
  ): { date: Date; amount: Decimal; bookValueAfter: Decimal }[] {
    const schedule: { date: Date; amount: Decimal; bookValueAfter: Decimal }[] = [];
    let currentBookValue = cost;
    const depreciableAmount = cost.minus(residualValue);

    if (method === "NO_DEPRECIATION" || usefulLifeMonths <= 0) {
      return [];
    }

    if (method === "STRAIGHT_LINE") {
      const monthlyDepreciation = depreciableAmount.div(usefulLifeMonths);

      for (let i = 1; i <= usefulLifeMonths; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);

        // Handle last month adjustment to match residual value exactly
        let amount = monthlyDepreciation;
        if (i === usefulLifeMonths) {
          amount = currentBookValue.minus(residualValue);
        }

        // Ensure we don't go below residual value
        if (currentBookValue.minus(amount).lessThan(residualValue)) {
          amount = currentBookValue.minus(residualValue);
        }

        if (amount.lessThanOrEqualTo(0)) break;

        currentBookValue = currentBookValue.minus(amount);

        schedule.push({
          date,
          amount,
          bookValueAfter: currentBookValue,
        });
      }
    } else if (method === "DOUBLE_DECLINING_BALANCE") {
      // DDB Rate = 2 / Life in Years.
      // Monthly Rate = (Rate) / 12
      // Simplified monthly: Rate = 2 / usefulLifeMonths

      const rate = new Decimal(2).div(usefulLifeMonths);

      for (let i = 1; i <= usefulLifeMonths; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);

        let amount = currentBookValue.times(rate);

        if (currentBookValue.minus(amount).lessThan(residualValue)) {
          amount = currentBookValue.minus(residualValue);
        }

        if (amount.lessThanOrEqualTo(0)) break;

        currentBookValue = currentBookValue.minus(amount);

        schedule.push({
          date,
          amount,
          bookValueAfter: currentBookValue,
        });
      }
    }

    return schedule;
  }

  /**
   * Post depreciation for a schedule item
   */
  static async postDepreciation(scheduleId: string, userId: string) {
    const schedule = await prisma.depreciationSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        asset: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!schedule) throw new Error("Schedule not found");
    if (schedule.isPosted) throw new Error("Already posted");

    const { asset, amount, date } = schedule;
    const { category } = asset;

    // Create Journal Entry
    // Dr Depreciation Expense
    // Cr Accumulated Depreciation

    const entryNumber = `DEP-${asset.code}-${schedule.date.toISOString().slice(0, 10)}`;

    await prisma.$transaction(async (tx) => {
      const je = await JournalService.createJournalEntry({
        entryNumber,
        transactionDate: date,
        description: `Depreciation for ${asset.name} (${asset.code})`,
        lines: [
          {
            accountId: category.depreciationExpenseAccountId,
            debitAmount: new Decimal(amount).toNumber(),
            creditAmount: 0,
            description: "Depreciation Expense",
          },
          {
            accountId: category.accumDepreciationAccountId,
            debitAmount: 0,
            creditAmount: new Decimal(amount).toNumber(),
            description: "Accumulated Depreciation",
          },
        ],
      }, userId, tx);

      await JournalService.postJournalEntry(je.id, tx);

      // Update Schedule
      await tx.depreciationSchedule.update({
        where: { id: scheduleId },
        data: {
          isPosted: true,
          postedAt: new Date(),
          journalEntryId: je.id,
        },
      });

      // Update Asset Current Book Value
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          currentBookValue: schedule.bookValueAfter,
        },
      });
    });
  }
}
