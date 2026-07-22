import * as React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip, Legend } from 'recharts';

import { ChartCard, ChartCardProps } from '@/components/charts/chart-card';

export type RadialChartCardProps = ChartCardProps & {
    data: Record<string, any>[];
    nameKey: string;
    valueKey: string;
};

export function RadialChartCard({
    data,
    nameKey,
    valueKey,
    title,
    subtitle,
    className,
}: RadialChartCardProps) {
    return (
        <ChartCard title={title} subtitle={subtitle} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="15%" outerRadius="100%" data={data} startAngle={180} endAngle={-180}>
                    <Tooltip wrapperStyle={{ borderRadius: 12, border: 'none' }} />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ color: '#cbd5e1' }} />
                    <RadialBar minAngle={15} label={{ position: 'insideStart', fill: '#fff' }} background clockWise dataKey={String(valueKey)} cornerRadius={10} />
                </RadialBarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
