import { useCallback, useState } from 'react';
import { LLM_ENDPOINT } from '@/constants';

export function useDirectLLM() {
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const callDirectLLM = useCallback(async (prompt: string) => {
        setLoading(true);
        setError(null);
        setResponse('');

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

            const data = await res.json();
            console.log('Direct LLM response data:', data);
            const parsedReponse = data?.data ? JSON.parse(data.data) : null;
            console.log('Parsed response:', parsedReponse);
            setResponse(parsedReponse);
            return parsedReponse;
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
        loading,
        error,
        callDirectLLM,
    };
}
