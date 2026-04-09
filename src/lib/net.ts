export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

export async function withTimeout<T>(
  run: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([run(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function retryAsync<T>(run: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const timeoutMs = options.timeoutMs;

  let lastError: unknown = new Error("Retry operation failed.");

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (timeoutMs && timeoutMs > 0) {
        return await withTimeout(
          run,
          timeoutMs,
          `Operation timed out after ${timeoutMs}ms`
        );
      }
      return await run();
    } catch (error) {
      lastError = error;
      const shouldRetry =
        attempt < retries &&
        (options.shouldRetry ? options.shouldRetry(error, attempt) : true);
      if (!shouldRetry) throw error;

      options.onRetry?.(error, attempt + 1);
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function fetchWithTimeoutRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 12_000;

  return retryAsync(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        if (!response.ok && isRetryableStatus(response.status)) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      retries,
      baseDelayMs: options.baseDelayMs ?? 250,
      maxDelayMs: options.maxDelayMs ?? 2000,
      shouldRetry: (error: unknown, attempt: number) => {
        if (options.shouldRetry) return options.shouldRetry(error, attempt);
        return true;
      },
      onRetry: options.onRetry,
    }
  );
}
