import * as React from 'react';
import { AreaChartCard, BarChartCard, PieChartCard, LineChartCard } from '@/components/charts';
import { useLlmResponseContext } from '@/context/llm-response-context';
import { isNonEmptyArray, transformLLMResponse } from '../../utils';
import { ItransformData } from '@/context/types';

// 1. The Registry (Catalog)
const widgetRegistry = {
    "BarChart": BarChartCard,
    "LineChart": LineChartCard,
    "PieChart": PieChartCard,
    "AreaChart": AreaChartCard,
};

const sampleChartData = [
    { name: 'Jan', value: 40, amount: 24 },
    { name: 'Feb', value: 55, amount: 32 },
    { name: 'Mar', value: 75, amount: 45 },
    { name: 'Apr', value: 60, amount: 38 },
    { name: 'May', value: 90, amount: 55 },
    { name: 'Jun', value: 80, amount: 48 },
];

const samplePieData = [
    { name: 'Product A', value: 400 },
    { name: 'Product B', value: 300 },
    { name: 'Product C', value: 300 },
    { name: 'Product D', value: 200 },
]

export function DashboardChartsPanel() {


    const context = useLlmResponseContext();
    const transformChartData: ItransformData[] = transformLLMResponse(context.llmResponse);
    const parsedCsv: ItransformData[] = transformLLMResponse(context.parsedCsv);

    console.log({ parsedCsv })
    console.log('transformChartData', transformChartData);
    return (
        <div className="grid gap-6">
            <div className="col-span-full rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-slate-100 shadow-sm">
                <h2 className="text-2xl font-semibold">Revenue growth and channel insights</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Explore the latest revenue growth metrics across channels, and see how top-performing products contribute to overall business momentum.
                </p>
            </div>
            <>
                {
                    isNonEmptyArray(transformChartData) && (
                        <div className="grid grid-cols-2 gap-6">
                            {
                                transformChartData.map((chart) => {
                                    const { x_axis, value_axis, title , subtitle } = chart;
                                    if (chart.chart_type === 'PieChart') {
                                        return <PieChartCard
                                            title={title}
                                            subtitle={subtitle}
                                            data={parsedCsv}
                                            nameKey={x_axis}
                                            valueKey={value_axis}
                                        />
                                    }

                                    const ChartComponent = widgetRegistry[chart.chart_type as keyof typeof widgetRegistry];
                                    if (ChartComponent) {
                                        return <ChartComponent
                                            title={title}
                                            subtitle={subtitle}
                                            data={parsedCsv}
                                            xKey={x_axis}
                                            valueKey={value_axis}
                                            color="#38bdf8"
                                        />
                                    }
                                })
                            }
                            {/* <BarChartCard
                    title="Monthly Active Users"
                    subtitle="New active users per month"
                    data={sampleChartData}
                    xKey="name"
                    valueKey="value"
                    color="#38bdf8"
                />

                <LineChartCard
                    title="Traffic"
                    subtitle="Site visits over time"
                    data={sampleChartData}
                    xKey="name"
                    valueKey="value"
                    color="#22c55e"
                />

                <AreaChartCard
                    title="Recurring Revenue"
                    subtitle="Revenue trend over the first half of the year"
                    data={sampleChartData}
                    xKey="name"
                    valueKey="amount"
                    color="#f97316"
                />

                <PieChartCard
                    title="Product Mix"
                    subtitle="Revenue share by product"
                    data={samplePieData}
                    nameKey="name"
                    valueKey="value"
                /> */}
                        </div>
                    )}
            </>
        </div>
    );
}
