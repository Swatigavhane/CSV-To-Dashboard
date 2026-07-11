import type { LLMModelFunction } from '@/hooks/use-llm';

export interface LlamaOptions {
  max_tokens?: number;
  temperature?: number;
}

// Adapter for text-generation-inference (TGI) style endpoints.
// Defaults to http://localhost:8080; adjust `baseUrl` to your server.
export function llamaTGIModel(
  modelName: string,
  baseUrl = 'http://localhost:8080',
): LLMModelFunction<string, LlamaOptions> {
  return async (input: string, options?: LlamaOptions & { signal?: AbortSignal }) => {
    const body = {
      inputs: input,
      parameters: {
        max_new_tokens: options?.max_tokens ?? 256,
        temperature: options?.temperature ?? 0.2,
      },
    };

    const res = await fetch(`${baseUrl}/v1/models/${modelName}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM request failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    // TGI commonly returns { results: [{ generated_text }] }
    const generated = data?.results?.[0]?.generated_text ?? data?.generated_text;
    if (typeof generated === 'string') return generated as any;

    // Fallback: return JSON string
    return JSON.stringify(data) as any;
  };
}

// Simple adapter for text-generation-webui (if you run that server)
export function llamaWebUIModel(
  baseUrl = 'http://127.0.0.1:5000',
): LLMModelFunction<string, LlamaOptions> {
  return async (input: string, options?: LlamaOptions & { signal?: AbortSignal }) => {
    const res = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input, max_new_tokens: options?.max_tokens ?? 256 }),
      signal: options?.signal,
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    // webui returns { results: [{ text }] }
    return data?.results?.[0]?.text ?? JSON.stringify(data);
  };
}
