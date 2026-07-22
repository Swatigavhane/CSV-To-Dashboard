import type { RetryOptions } from './types';

export async function executeWithRetry(operation: () => Promise<any>, options: RetryOptions = {}) {
    const { maxRetries = 2, delayMs = 300 } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt >= maxRetries) {
                throw error;
            }

            if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
