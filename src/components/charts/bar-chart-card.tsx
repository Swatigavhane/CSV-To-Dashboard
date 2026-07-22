import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

import { ChartCard, ChartCardProps } from '@/components/charts/chart-card';

const defaultColor = '#38bdf8';

export type BarChartCardProps = ChartCardProps & {
    data: Record<string, any>[];
    xKey: string;
    valueKey: string;
    color?: string;
};

export function BarChartCard({
    data,
    xKey,
    valueKey,
    title,
    subtitle,
    color = defaultColor,
    className,
}: BarChartCardProps) {
    return (
        <ChartCard title={title} subtitle={subtitle} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey={String(xKey)} stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                    <Tooltip wrapperStyle={{ borderRadius: 12, border: 'none' }} />
                    <Bar dataKey={String(valueKey)} fill={color} radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
