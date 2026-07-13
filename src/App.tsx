import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/ui/chat-input';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { DashboardChartsPanel } from '@/components/ui/dashboard-charts-panel';
import { createSchemaFromJson } from '@/lib/schema';
import { parseCsvFile } from '@/lib/csv';
import { executeDuckDbQuery, registerJsonRowsAsTable } from '@/duckdb';
import { isCsvFile, isNonEmptyArray } from '@/utils';
import { useDirectLLM } from '@/hooks/use-direct-llm';
import { LlmResponseProvider } from '@/context/llm-response-context';
import { DUCK_DB_TABLE_NAME } from '../src/constants';

export default function App() {
    const { response: llmResponse, AIQuery, loading: llmLoading, error: llmError, callDirectLLM } = useDirectLLM();
    const [parsedCsv, setParsedCsv] = useState<any[]>([]);
    const [queryResponse, setQueryResponse] = useState<Record<string, unknown>[]>([]);

    const queryUploadedFileAsJson = async (rows: Record<string, unknown>[], query: string) => {
        await registerJsonRowsAsTable(rows, DUCK_DB_TABLE_NAME);
        return executeDuckDbQuery(query);
    };

    useEffect(() => {
        if (!AIQuery || !parsedCsv.length) {
            setQueryResponse([]);
            return;
        }

        const runQuery = async () => {
            const updatedQuery = AIQuery.replace(/your_table_name/g, DUCK_DB_TABLE_NAME);
            const previewRows = await queryUploadedFileAsJson(parsedCsv as Record<string, unknown>[], updatedQuery);
            setQueryResponse(previewRows);
            console.log('DuckDB table uploaded_csv initialized. Preview rows:', previewRows);
        };

        void runQuery();
    }, [AIQuery, parsedCsv]);

    const handleSubmit = async ({ text, file }: { text: string; file?: File; }) => {
        try {
            if (file && isCsvFile(file)) {
                const parsedCsv = await parseCsvFile(file);
                setParsedCsv(parsedCsv);


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
            }
        } catch (error) {
            console.error('Submit error:', error);
        }
    };


    return (
        <LlmResponseProvider llmResponse={llmResponse} parsedCsv={(queryResponse.length ? queryResponse : parsedCsv) as any[]} >
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

