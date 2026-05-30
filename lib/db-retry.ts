type AsyncFn<T> = () => Promise<T>;
type RetryOptions = {
  retries?: number;
  onRetry?: (error: unknown, attempt: number) => Promise<void> | void;
};

const TRANSIENT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "57P01",
  "57P03",
]);

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code && TRANSIENT_ERROR_CODES.has(code)) return true;
  const message = (error as { message?: string }).message ?? "";
  return /timeout|connection|temporar/i.test(message);
}

export async function withDbRetry<T>(
  fn: AsyncFn<T>,
  retriesOrOptions: number | RetryOptions = 2,
): Promise<T> {
  const retries =
    typeof retriesOrOptions === "number" ? retriesOrOptions : (retriesOrOptions.retries ?? 2);
  const onRetry =
    typeof retriesOrOptions === "number" ? undefined : retriesOrOptions.onRetry;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === retries) {
        throw error;
      }
      if (onRetry) {
        await onRetry(error, attempt + 1);
      }
      const waitMs = 150 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt += 1;
    }
  }

  throw lastError;
}
