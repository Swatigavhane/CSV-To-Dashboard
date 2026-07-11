import { useState, useRef, useCallback, useEffect } from 'react';

export type LLMModelOptions = object & { signal?: AbortSignal };

export type LLMModelFunction<
  TResponse = unknown,
  TOptions extends LLMModelOptions = LLMModelOptions,
> = (input: string, options?: TOptions) => Promise<TResponse>;

export interface UseLLMResult<TResponse = unknown> {
  response: TResponse | null;
  loading: boolean;
  error: Error | null;
  callLLM: (input: string, options?: Record<string, unknown>) => Promise<TResponse | void>;
  abort: () => void;
}

export function useLLM<TResponse = unknown, TOptions extends LLMModelOptions = LLMModelOptions>(
  model: LLMModelFunction<TResponse, TOptions>,
): UseLLMResult<TResponse> {
  const [response, setResponse] = useState<TResponse | null>(null);
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
        const result = await model(input, { ...(options ?? {}), signal: controller.signal } as TOptions);
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
