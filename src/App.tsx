import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/chat-input/chat-input';
import { Button } from '@/components/button/button';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';
import { DashboardChartsPanel } from '@/components/dashboard-charts-panel/dashboard-charts-panel';
import { LlmResponseStatus } from '@/components/llm-response-status/llm-response-status';
import { isNonEmptyArray } from '@/utils';
import { useDirectLLM } from '@/hooks/use-direct-llm';
import { LlmResponseProvider } from '@/context/llm-response-context';
import { runDashboardQueries, submitCsvForDashboard } from '@/services/dashboard-workflow';

export default function App() {
    const { response: llmResponse, loading: llmLoading, error: llmError, callDirectLLM, resetDirectLLM } = useDirectLLM();
    const [parsedCsv, setParsedCsv] = useState<any[]>([]);
    const [chartResponses, setChartResponses] = useState<any[]>([]);

    useEffect(() => {
        const runQueries = async () => {
            const nextChartResponses = await runDashboardQueries({
                llmResponse: llmResponse as any,
                parsedCsv,
            });

            setChartResponses(nextChartResponses);
            console.log('DuckDB queries completed for charts:', nextChartResponses);
        };

        void runQueries();
    }, [llmResponse, parsedCsv]);

    const handleSubmit = async ({ text, file }: { text: string; file?: File; }) => {
        try {
            const { parsedCsv } = await submitCsvForDashboard({
                file,
                text,
                callDirectLLM,
            });

            setParsedCsv(parsedCsv);
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
                <div className="mx-auto max-w-6xl">
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
                            <div className="hero-block mb-6 text-center">
                                <h1 className="hero-heading text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
                                    Generate Interactive Dashboards from CSV Files
                                </h1>
                                <p className="hero-subheading mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                                    Stop spending hours reformatting data in Excel. Upload your CSV, get an AI-generated dashboard in less than a minute, and actually understand what your data is telling you.
                                </p>
                            </div>
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

