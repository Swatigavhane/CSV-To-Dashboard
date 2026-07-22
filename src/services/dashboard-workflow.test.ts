import { describe, expect, it } from 'vitest';
import { submitCsvForDashboard } from './dashboard-workflow';

describe('submitCsvForDashboard', () => {
    it('rejects non-CSV uploads', async () => {
        await expect(
            submitCsvForDashboard({
                file: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
                text: 'Create a chart',
                callDirectLLM: async () => undefined,
            }),
        ).rejects.toThrow('Please upload a valid CSV file.');
    });
});
