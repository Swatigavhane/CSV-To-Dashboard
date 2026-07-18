import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/chat-input/chat-input';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';
import { DashboardChartsPanel } from '@/components/dashboard-charts-panel/dashboard-charts-panel';
import { createSchemaFromJson } from '@/lib/schema';
import { parseCsvFile } from '@/lib/csv';
import { executeDuckDbQuery } from '@/duckdb';
import { formatTimestampToDDMMYYYY, isCsvFile, isLikelyTimestamp, isNonEmptyArray } from '@/utils';
import { useDirectLLM } from '@/hooks/use-direct-llm';
import { LlmResponseProvider } from '@/context/llm-response-context';
import { DUCK_DB_TABLE_NAME } from '../src/constants';

export default function App() {
    const { response: llmResponse, loading: llmLoading, error: llmError, callDirectLLM } = useDirectLLM();
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
            const nextChartResponses = await Promise.all(
                llmResponse.map(async (chart) => {
                    const chartQuery = typeof chart?.query === 'string' ? chart.query.trim() : '';

                    if (!chartQuery) {
                        return chart;
                    }

                    try {
                        const previewRows = await queryUploadedFileAsJson(parsedCsv as Record<string, unknown>[], chartQuery);
                        const formattedPreviewRows = previewRows.map((row) => {
                            return Object.fromEntries(
                                Object.entries(row).map(([key, value]) => {
                                    if (isLikelyTimestamp(value)) {
                                        return [key, formatTimestampToDDMMYYYY(value)];
                                    }

                                    return [key, value];
                                }),
                            );
                        });

                        return {
                            ...chart,
                            query_data: formattedPreviewRows,
                        };
                    } catch (error) {
                        console.error('Query execution failed for chart:', chart?.title, error);
                        return chart;
                    }
                }),
            );

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

    console.log({ chartResponses });
    return (
        <LlmResponseProvider chartResponses={(chartResponses.length ? chartResponses : llmResponse) as any[]} parsedCsv={parsedCsv as any[]} >
            <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
                <div className="mx-auto max-w-8xl">
                    {isNonEmptyArray(chartResponses) ? (<DashboardLayout>
                        <DashboardChartsPanel />
                    </DashboardLayout>
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
                                    <div className="text-red-400">{llmError instanceof Error ? llmError.message : String(llmError)}</div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </LlmResponseProvider>
    );
}

