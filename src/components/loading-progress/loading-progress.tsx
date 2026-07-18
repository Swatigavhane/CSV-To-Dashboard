import * as React from 'react';

import { cn } from '@/utils';

const defaultMessages = [
    'Reading your data...',
    'Detecting key metrics and dimensions...',
    'Creating visualizations...',
    'Selecting the best charts for your data...',
    'Building your dashboard...',
];

export interface LoadingProgressProps {
    messages?: string[];
    intervalMs?: number;
    className?: string;
}

export function LoadingProgress({
    messages = defaultMessages,
    intervalMs = 1400,
    className,
}: LoadingProgressProps) {
    const [messageIndex, setMessageIndex] = React.useState(0);

    React.useEffect(() => {
        if (!messages.length) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, intervalMs);

        return () => window.clearInterval(intervalId);
    }, [intervalMs, messages]);

    if (!messages.length) {
        return null;
    }

    const activeMessage = messages[messageIndex];

    return (
        <div className={cn('text-xs text-slate-400', className)}>
            <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" aria-hidden="true" />
                <span key={`${messageIndex}-${activeMessage}`} className="loading-status-message">
                    {activeMessage}
                </span>
            </div>
        </div>
    );
}
