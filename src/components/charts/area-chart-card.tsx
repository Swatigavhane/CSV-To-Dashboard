import * as React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

import { ChartCard, ChartCardProps } from '@/components/charts/chart-card';

const defaultColor = '#f97316';

export type AreaChartCardProps = ChartCardProps & {
    data: Record<string, any>[];
    xKey: string;
    valueKey: string;
    color?: string;
};

export function AreaChartCard({
    data,
    xKey,
    valueKey,
    title,
    subtitle,
    color = defaultColor,
    className,
}: AreaChartCardProps) {
    return (
        <ChartCard title={title} subtitle={subtitle} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.15} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey={String(xKey)} stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                    <Tooltip wrapperStyle={{ borderRadius: 12, border: 'none' }} />
                    <Area type="monotone" dataKey={String(valueKey)} stroke={color} fill="url(#areaGradient)" fillOpacity={1} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
