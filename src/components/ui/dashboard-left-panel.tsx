import * as React from 'react';

export interface DashboardLeftPanelProps {
    messages?: string[];
}

export function DashboardLeftPanel({
    messages = [
        'Hello! How can I help you today?',
        'Upload a CSV and I’ll help build a dashboard.',
    ],
}: DashboardLeftPanelProps) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-slate-100">
                <h2 className="text-xl font-semibold">Conversation</h2>
                <p className="mt-2 text-sm text-slate-400">
                    Use the input on the right to send a prompt or upload a file.
                </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-slate-100">
                <h3 className="text-lg font-medium">Recent messages</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {messages.map((message, index) => (
                        <li key={index} className="rounded-2xl bg-slate-950/80 p-3">
                            {message}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
