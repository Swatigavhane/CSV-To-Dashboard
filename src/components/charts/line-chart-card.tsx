import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

import { ChartCard, ChartCardProps } from '@/components/charts/chart-card';

const defaultColor = '#22c55e';

export type LineChartCardProps = ChartCardProps & {
    data: Record<string, any>[];
    xKey: string;
    valueKey: string;
    color?: string;
};

export function LineChartCard({
    data,
    xKey,
    valueKey,
    title,
    subtitle,
    color = defaultColor,
    className,
}: LineChartCardProps) {
    return (
        <ChartCard title={title} subtitle={subtitle} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey={String(xKey)} stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                    <Tooltip wrapperStyle={{ borderRadius: 12, border: 'none' }} />
                    <Line type="monotone" dataKey={String(valueKey)} stroke={color} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
