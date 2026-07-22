import type { LLMModelFunction } from '@/hooks/types';

export interface LlamaOptions {
  max_tokens?: number;
  temperature?: number;
}

function getEndpoint(baseUrl: string, modelName: string) {
  return `${baseUrl.replace(/\/$/, '')}/v1/models/${modelName}/generate`;
}

function isConnectionError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('fetch') || message.includes('refused') || message.includes('network');
  }

  return false;
}

// Adapter for text-generation-inference (TGI) style endpoints.
// Defaults to http://localhost:8080; adjust `baseUrl` to your server.
export function llamaTGIModel(
  modelName: string,
  baseUrl = 'http://localhost:8080',
): LLMModelFunction {
  return async (input: string, options?: LlamaOptions & { signal?: AbortSignal }) => {
    const body = {
      inputs: input,
      parameters: {
        max_new_tokens: options?.max_tokens ?? 256,
        temperature: options?.temperature ?? 0.2,
      },
    };

    const endpoint = getEndpoint(baseUrl, modelName);

    try {
      const res = await fetch(endpoint, {
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
      const generated = data?.results?.[0]?.generated_text ?? data?.generated_text;
      if (typeof generated === 'string') return generated as any;

      return JSON.stringify(data) as any;
    } catch (error) {
      if (isConnectionError(error)) {
        return `LLM server is unavailable at ${endpoint}. Start a local inference server or update the endpoint in App.tsx.\n\nInput received: ${input}` as any;
      }

      throw error;
    }
  };
}

// Simple adapter for text-generation-webui (if you run that server)
export function llamaWebUIModel(
  baseUrl = 'http://127.0.0.1:5000',
): LLMModelFunction {
  return async (input: string, options?: LlamaOptions & { signal?: AbortSignal }) => {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input, max_new_tokens: options?.max_tokens ?? 256 }),
      signal: options?.signal,
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data?.results?.[0]?.text ?? JSON.stringify(data);
  };
}
