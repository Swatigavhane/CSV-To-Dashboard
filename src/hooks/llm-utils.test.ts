import { describe, expect, it, vi } from 'vitest';
import { executeWithRetry } from './llm-utils';

describe('executeWithRetry', () => {
    it('retries transient failures and resolves', async () => {
        const operation = vi
            .fn()
            .mockRejectedValueOnce(new Error('temporary failure'))
            .mockResolvedValueOnce('ok');

        await expect(executeWithRetry(operation, { maxRetries: 1, delayMs: 0 })).resolves.toBe('ok');
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('fails after the configured retry budget is exhausted', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('still failing'));

        await expect(executeWithRetry(operation, { maxRetries: 1, delayMs: 0 })).rejects.toThrow('still failing');
        expect(operation).toHaveBeenCalledTimes(2);
    });
});
