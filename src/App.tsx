import * as React from 'react';
import { ChatInput } from '@/components/ui/chat-input';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { DashboardChartsPanel } from '@/components/ui/dashboard-charts-panel';

export default function App() {
    const [hasSubmitted, setHasSubmitted] = React.useState(false);

    const handleSubmit = ({ text, file }: { text: string; file?: File }) => {
        console.log('Submitted text:', text, 'file:', file);
        setHasSubmitted(true);
    };

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
            <div className="mx-auto max-w-8xl">
                {hasSubmitted ? (
                    <DashboardLayout
                        left={<DashboardChartsPanel />}
                        right={
                            <ChatInput
                                placeholder="Ask anything or upload a file..."
                                onSubmit={handleSubmit}
                            />
                        }
                        initialLeftWidth={40}
                        minLeft={30}
                        minRight={30}
                    />
                ) : (
                    <div className="mx-auto max-w-3xl">
                        <ChatInput
                            placeholder="Ask anything or upload a file..."
                            onSubmit={handleSubmit}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}

