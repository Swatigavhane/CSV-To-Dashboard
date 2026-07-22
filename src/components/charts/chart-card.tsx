import * as React from 'react';

import { cn } from '@/utils';

export interface ChartCardProps {
    title?: string;
    subtitle?: string;
    className?: string;
    children: React.ReactNode;
}

export function ChartCard({ title, subtitle, className, children }: ChartCardProps) {
    return (
        <div
            className={cn(
                'rounded-3xl border border-slate-800 bg-slate-950/90 p-3 shadow-sm',
                className,
            )}
        >
            {(title || subtitle) && (
                <div className="mb-3">
                    {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
                    {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
                </div>
            )}
            <div className="h-64 w-full">{children}</div>
        </div>
    );
}
