import { AreaChartCard, BarChartCard, PieChartCard, LineChartCard } from '@/components/charts';
import { useLlmResponseContext } from '@/context/llm-response-context';
import { ItransformData } from '@/context/types';
import { isNonEmptyArray, transformLLMResponse } from '@/utils';

const widgetRegistry = {
    BarChart: BarChartCard,
    LineChart: LineChartCard,
    PieChart: PieChartCard,
    AreaChart: AreaChartCard,
};

export function DashboardChartsPanel() {
    const context = useLlmResponseContext();
    const transformChartData: ItransformData[] = transformLLMResponse(context.chartResponses);
    const parsedCsv: ItransformData[] = transformLLMResponse(context.parsedCsv);

    console.log('transformChartData', transformChartData);
    return (
        <div className="grid gap-6">
            <div className="col-span-full rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-slate-100 shadow-sm">
                <h2 className="text-2xl font-semibold">Your Dashboard is ready!</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Explore the latest revenue growth metrics across channels, and see how top-performing products contribute to overall business momentum.
                </p>
            </div>
            <>
                {isNonEmptyArray(transformChartData) && (
                    <div className="grid grid-cols-2 gap-6">
                        {transformChartData.map((chart) => {
                            const { x_axis, value_axis, title, subtitle } = chart;
                            const chartData = isNonEmptyArray(chart.query_data) ? chart.query_data : parsedCsv;
                            if (chart.chart_type === 'PieChart') {
                                return (
                                    <PieChartCard
                                        key={`${title}-${value_axis}`}
                                        title={title}
                                        subtitle={subtitle}
                                        data={chartData}
                                        nameKey={x_axis}
                                        valueKey={value_axis}
                                    />
                                );
                            }

                            const ChartComponent = widgetRegistry[chart.chart_type as keyof typeof widgetRegistry];
                            if (ChartComponent) {
                                return (
                                    <ChartComponent
                                        key={`${title}-${value_axis}`}
                                        title={title}
                                        subtitle={subtitle}
                                        data={chartData}
                                        xKey={x_axis}
                                        valueKey={value_axis}
                                        color="#38bdf8"
                                    />
                                );
                            }

                            return null;
                        })}
                    </div>
                )}
            </>
        </div>
    );
}