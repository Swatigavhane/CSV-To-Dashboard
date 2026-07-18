import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/chat-input/chat-input';
import { Button } from '@/components/button/button';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';
import { DashboardChartsPanel } from '@/components/dashboard-charts-panel/dashboard-charts-panel';
import { LlmResponseStatus } from '@/components/llm-response-status/llm-response-status';
import { createSchemaFromJson } from '@/lib/schema';
import { parseCsvFile } from '@/lib/csv';
import { runChartQueries } from '@/lib/run-chart-queries';
import { executeDuckDbQuery } from '@/duckdb';
import { isCsvFile, isNonEmptyArray } from '@/utils';
import { useDirectLLM } from '@/hooks/use-direct-llm';
import { LlmResponseProvider } from '@/context/llm-response-context';
import { DUCK_DB_TABLE_NAME } from '../src/constants';

export default function App() {
    const { response: llmResponse, loading: llmLoading, error: llmError, callDirectLLM, resetDirectLLM } = useDirectLLM();
    const [parsedCsv, setParsedCsv] = useState<any[]>([]);
    const [chartResponses, setChartResponses] = useState<any[]>([]);

    const queryUploadedFileAsJson = async (rows: Record<string, unknown>[], query: string) => {
        return executeDuckDbQuery(rows, DUCK_DB_TABLE_NAME, query);
    };

    useEffect(() => {
        if (!isNonEmptyArray(llmResponse) || !parsedCsv.length) {
            setChartResponses([]);
            return;
        }

        const runQueries = async () => {
            const nextChartResponses = await runChartQueries({
                llmResponse,
                parsedCsv,
                queryUploadedFileAsJson,
            });

            setChartResponses(nextChartResponses);
            console.log('DuckDB queries completed for charts:', nextChartResponses);
        };

        void runQueries();
    }, [llmResponse, parsedCsv]);

    const handleSubmit = async ({ text, file }: { text: string; file?: File; }) => {
        try {
            if (file && isCsvFile(file)) {
                const parsedCsv = await parseCsvFile(file);
                setParsedCsv(parsedCsv);

                const inferredSchema = createSchemaFromJson(parsedCsv);
                if (!inferredSchema) {
                    console.error('Failed to infer schema from CSV data');
                    return;
                }

                const prompt = `${text}\n\nSchema: ${JSON.stringify(inferredSchema, null, 2)}`;

                await callDirectLLM(prompt);
            }
        } catch (error) {
            console.error('Submit error:', error);
        }
    };

    const handleTryAnotherCsv = () => {
        setParsedCsv([]);
        setChartResponses([]);
        resetDirectLLM();
    };

    return (
        <LlmResponseProvider chartResponses={(chartResponses.length ? chartResponses : llmResponse) as any[]} parsedCsv={parsedCsv as any[]} >
            <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
                <div className="mx-auto max-w-8xl">
                    {isNonEmptyArray(chartResponses) ? (
                        <>
                            <div className="mb-4 flex justify-end">
                                <Button type="button" variant="outline" onClick={handleTryAnotherCsv}>
                                    Try Another CSV
                                </Button>
                            </div>
                            <DashboardLayout>
                                <DashboardChartsPanel />
                            </DashboardLayout>
                        </>
                    ) : (
                        <div className="mx-auto max-w-3xl">
                            <ChatInput
                                placeholder="Ask anything or upload a file..."
                                onSubmit={handleSubmit}
                            />
                            <LlmResponseStatus llmLoading={llmLoading} llmError={llmError} />
                        </div>
                    )}
                </div>
            </main>
        </LlmResponseProvider>
    );
}

