import { useCallback, useState } from 'react';
import { LLM_ENDPOINT } from '@/constants';
import { isNonEmptyObject } from '@/utils';
import type { ItransformData } from '@/context/types';

interface DirectLlmApiResponse {
    data?: unknown;
    query?: unknown;
}

export function useDirectLLM() {
    const [response, setResponse] = useState<ItransformData[]>([]);
    const [AIQuery, setAIQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callDirectLLM = useCallback(async (prompt: string) => {
        setLoading(true);
        setError(null);
        setResponse([]);
        setAIQuery('');

        try {
            const res = await fetch(LLM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Request failed: ${res.status} ${text}`);
            }

            const data: DirectLlmApiResponse = await res.json();
            if (!isNonEmptyObject(data)) {
                return setError(new Error('Invalid response from LLM endpoint'));
            }

            const { data: chartSuggestions, query } = data;

            const chartPayload = Array.isArray(chartSuggestions) ? (chartSuggestions as ItransformData[]) : [];
            const normalizedQuery = typeof query === 'string' ? query : '';

            setResponse(chartPayload);
            setAIQuery(normalizedQuery);

            return {
                data: chartPayload,
                query: normalizedQuery,
            };
        } catch (err) {
            const nextError = err instanceof Error ? err : new Error(String(err));
            setError(nextError);
            throw nextError;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        response,
        AIQuery,
        loading,
        error,
        callDirectLLM,
    };
}
