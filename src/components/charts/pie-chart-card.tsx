import * as React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

import { ChartCard, ChartCardProps } from '@/components/charts/chart-card';

const defaultColors = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#f43f5e'];

export type PieChartCardProps = ChartCardProps & {
    data: Record<string, any>[];
    nameKey: string;
    valueKey: string;
};

export function PieChartCard({
    data,
    nameKey,
    valueKey,
    title,
    subtitle,
    className,
}: PieChartCardProps) {
    return (
        <ChartCard title={title} subtitle={subtitle} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip wrapperStyle={{ borderRadius: 12, border: 'none' }} />
                    <Pie
                        data={data}
                        dataKey={String(valueKey)}
                        nameKey={String(nameKey)}
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={4}
                        stroke="transparent"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
