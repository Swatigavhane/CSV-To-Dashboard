import { useState } from 'react';
import { ChatInput } from '@/components/ui/chat-input';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { DashboardChartsPanel } from '@/components/ui/dashboard-charts-panel';
import { createSchemaFromJson } from '@/lib/schema';
import { useLLM } from '@/hooks/use-llm';
import { llamaTGIModel, type LlamaOptions } from '@/lib/llama';
import { parseCsvFile } from '@/lib/csv';
import { isCsvFile } from '@/lib/utils';

export default function App() {
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Configure a local Llama endpoint and model name here.
    // Update `baseUrl` and `modelName` to match your local LLM server.
    const model = llamaTGIModel('llama-2-7b', 'http://localhost:8080');

    const { response: llmResponse, loading: llmLoading, error: llmError, callLLM } = useLLM<string, LlamaOptions>(
        model,
    );

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

            const llmOutput = await callLLM(prompt, { max_tokens: 256 });
            console.log('LLM output:', llmOutput);
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
                                <div className="text-red-400">{String(llmError.message)}</div>
                            ) : (
                                <pre className="whitespace-pre-wrap text-xs">{String(llmResponse ?? '')}</pre>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

