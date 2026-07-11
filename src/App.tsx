import { useState } from 'react';
import { ChatInput } from '@/components/ui/chat-input';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { DashboardChartsPanel } from '@/components/ui/dashboard-charts-panel';
import { createSchemaFromJson } from '@/lib/schema';
import { parseCsvFile } from '@/lib/csv';
import { isCsvFile } from '@/lib/utils';

const LLM_ENDPOINT = 'http://localhost:8080/v1/models/llama-2-7b/generate';

export default function App() {
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [llmResponse, setLlmResponse] = useState('');
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setLlmError] = useState<string | null>(null);

    const callDirectLLM = async (prompt: string) => {
        setLlmLoading(true);
        setLlmError(null);
        setLlmResponse('');

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
            const generated = data?.results?.[0]?.generated_text ?? data?.generated_text ?? JSON.stringify(data);
            setLlmResponse(typeof generated === 'string' ? generated : JSON.stringify(generated));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setLlmError(message);
        } finally {
            setLlmLoading(false);
        }
    };

    const handleSubmit = async ({ text, file }: { text: string; file?: File; }) => {
        let parsedCsv;

        try {
            if (file && isCsvFile(file)) {
                parsedCsv = await parseCsvFile(file);
            }

            console.log('Submitted text:', text, 'file:', file, { parsedCsv });

            const inferredSchema = createSchemaFromJson(parsedCsv);
            if (!inferredSchema) {
                console.error('Failed to infer schema from CSV data');
                return;
            }

            console.log('Inferred schema:', inferredSchema);

            const prompt = `${text}\n\nSchema: ${JSON.stringify(inferredSchema, null, 2)}`;

            await callDirectLLM(prompt);
            console.log('Prompt sent to direct LLM endpoint');
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setHasSubmitted(true);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
            <div className="mx-auto max-w-8xl">
                {hasSubmitted ? (
                    <DashboardLayout
                        left={<DashboardChartsPanel />}
                        right={
                            <ChatInput
                                placeholder="Ask anything or upload a file..."
                                onSubmit={handleSubmit}
                            />
                        }
                        initialLeftWidth={40}
                        minLeft={30}
                        minRight={30}
                    />
                ) : (
                    <div className="mx-auto max-w-3xl">
                        <ChatInput
                            placeholder="Ask anything or upload a file..."
                            onSubmit={handleSubmit}
                        />
                        <div className="mt-4 rounded-md bg-slate-900 p-3 text-sm">
                            <div className="font-medium">LLM Response</div>
                            {llmLoading ? (
                                <div className="text-xs text-slate-400">Thinking...</div>
                            ) : llmError ? (
                                <div className="text-red-400">{llmError}</div>
                            ) : (
                                <pre className="whitespace-pre-wrap text-xs">{llmResponse}</pre>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

