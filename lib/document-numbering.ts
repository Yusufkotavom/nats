import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { formatSequence } from "@/lib/utils/format-sequence";

/**
 * Ensures a document numbering format exists for an entity type or creates the default.
 */
export async function getOrCreateDocumentNumbering(
    entityType: string,
    defaultName: string = entityType,
    defaultPrefix: string = ""
) {
    let docFormat = await prisma.documentNumbering.findUnique({
        where: { entityType },
    });

    if (!docFormat) {
        // We try to create if it doesn't exist, safely catching uniqueness constraint violations
        // if another request does this concurrently.
        try {
            docFormat = await prisma.documentNumbering.create({
                data: {
                    entityType,
                    name: defaultName,
                    prefix: defaultPrefix,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                docFormat = await prisma.documentNumbering.findUniqueOrThrow({
                    where: { entityType },
                });
            } else {
                throw error;
            }
        }
    }

    return docFormat;
}

/**
 * Atomically generates the next formatted sequence number for the given entity type.
 */
export async function generateDocumentNumber(
    entityType: string,
    defaultName?: string,
    defaultPrefix?: string
): Promise<string> {
    // Ensure the settings row exists.
    await getOrCreateDocumentNumbering(entityType, defaultName ?? entityType, defaultPrefix ?? "");

    // Use a transaction to lock the row and dynamically increment or reset the sequence.
    // Note: For raw SQL level concurrency control relying purely on Prisma's sequential operations or atomic increments
    // Prisma's increment does not allow conditional updates based on other row columns easily via Prisma client level updates.
    // Since we need to check the date for resets, we use a $transaction with read and update.

    const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch the current settings. In a high concurrency environment, 
        // we would ideally use a database level lock here if multiple generators clash.
        const format = await tx.documentNumbering.findUniqueOrThrow({
            where: { entityType },
        });

        const now = new Date();
        let isYearReset = false;
        let isMonthReset = false;

        if (format.lastGeneratedAt) {
            if (format.resetYearly && format.lastGeneratedAt.getFullYear() !== now.getFullYear()) {
                isYearReset = true;
            }
            if (format.resetMonthly && format.lastGeneratedAt.getMonth() !== now.getMonth()) {
                isMonthReset = true;
            }
        }

        const newSequence = (isYearReset || isMonthReset) ? 1 : format.currentSequence + 1;

        // 2. Perform the update
        const updatedFormat = await tx.documentNumbering.update({
            where: {
                entityType,
                // Optional Optimistic Concurrency: ensures nobody updated between our read and write
                currentSequence: format.currentSequence
            },
            data: {
                currentSequence: newSequence,
                lastGeneratedAt: now,
            }
        });

        // 3. Format the result string
        return formatSequence(
            updatedFormat.currentSequence,
            updatedFormat.prefix,
            updatedFormat.suffix,
            updatedFormat.sequenceDigits,
            updatedFormat.includeYear,
            updatedFormat.yearFormat,
            updatedFormat.includeMonth,
            now
        );
        // To handle very high concurrency retries, we might need a specific retry loop
        // but Prisma's isolated transactions generally buffer this well for normal app usage.
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 5000, // wait up to 5s for the lock
        timeout: 10000 // transaction timeout
    });

    return result;
}
