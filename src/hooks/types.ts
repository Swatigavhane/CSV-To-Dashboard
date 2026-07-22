export type LLMModelOptions = object & { signal?: AbortSignal };

export type LLMModelFunction = (input: string, options?: LLMModelOptions) => Promise<any>;

export interface UseLLMResult {
    response: any | null;
    loading: boolean;
    error: Error | null;
    callLLM: (input: string, options?: Record<string, any>) => Promise<any | void>;
    abort: () => void;
}

export interface DirectLlmApiResponse {
    data?: any;
    query?: any;
}

export type UseLLMHook = (model: LLMModelFunction) => UseLLMResult;

export interface RetryOptions {
    maxRetries?: number;
    delayMs?: number;
}
