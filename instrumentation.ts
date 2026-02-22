export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // @ts-expect-error - next-logger might not have types
        await import('next-logger');
    }
}
