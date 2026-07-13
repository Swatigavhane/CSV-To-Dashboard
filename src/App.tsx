import { useState } from 'react';
import { ChatInput } from '@/components/ui/chat-input';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { DashboardChartsPanel } from '@/components/ui/dashboard-charts-panel';
import { createSchemaFromJson } from '@/lib/schema';
import { parseCsvFile } from '@/lib/csv';
import { isCsvFile, isNonEmptyArray, isNonEmptyObject } from '@/utils';
import { useDirectLLM } from '@/hooks/use-direct-llm';
import { LlmResponseProvider } from '@/context/llm-response-context';

export default function App() {
    const { response: llmResponse, loading: llmLoading, error: llmError, callDirectLLM } = useDirectLLM();
    const [parsedCsv, setParsedCsv] = useState<any[]>([]);

    const handleSubmit = async ({ text, file }: { text: string; file?: File; }) => {
        let parsedCsv;

        try {
            if (file && isCsvFile(file)) {
                parsedCsv = await parseCsvFile(file);
                setParsedCsv(parsedCsv);
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
        }
    };


    return (
        <LlmResponseProvider llmResponse={llmResponse} parsedCsv={parsedCsv} >
            <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
                <div className="mx-auto max-w-8xl">
                    {isNonEmptyArray(llmResponse) ? (
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
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </LlmResponseProvider>
    );
}

