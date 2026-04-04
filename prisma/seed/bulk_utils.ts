import { faker } from "@faker-js/faker";

export const SEED_COUNT = 1000;

export function getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

export function getRandomItems<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export async function runInChunks<T>(
    items: T[],
    chunkSize: number,
    processor: (chunk: T[]) => Promise<void>
) {
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await processor(chunk);
        console.log(`  Processed ${Math.min(i + chunkSize, items.length)} / ${items.length}`);
    }
}

const sessionSuffix = faker.string.alphanumeric(4).toUpperCase();

export function generateUniqueSKU(prefix: string, index: number): string {
    return `${prefix}-${sessionSuffix}-${String(index).padStart(6, '0')}`;
}
