import { useState, useRef, useCallback, useEffect } from 'react';
import type { LLMModelFunction, LLMModelOptions, UseLLMHook, UseLLMResult } from './types';
import { executeWithRetry } from './llm-utils';

export type { LLMModelFunction, LLMModelOptions, UseLLMHook, UseLLMResult } from './types';

function useLLMImpl(model: LLMModelFunction): UseLLMResult {
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  const callLLM = useCallback(
    async (input: string, options?: Record<string, unknown>) => {
      abort();
      const controller = new AbortController();
      abortController.current = controller;

      setLoading(true);
      setError(null);
      setResponse(null);

      try {
        const result = await executeWithRetry(async () => {
          if (controller.signal.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
          }

          return model(input, { ...(options ?? {}), signal: controller.signal } as LLMModelOptions);
        }, { maxRetries: 2, delayMs: 300 });

        if (controller.signal.aborted) {
          return;
        }

        setResponse(result);
        return result;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
        const nextError = err instanceof Error ? err : new Error(String(err));
        setError(nextError);
        throw nextError;
      } finally {
        setLoading(false);
        abortController.current = null;
      }
    },
    [abort, model],
  );

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { response, loading, error, callLLM, abort };
}

export const useLLM: UseLLMHook = useLLMImpl;
