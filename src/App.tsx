import { ChatInput } from '@/components/ui/chat-input';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { DashboardLeftPanel } from '@/components/ui/dashboard-left-panel';

export default function App() {
    return (
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
            <div className="mx-auto max-w-6xl">
                <DashboardLayout
                    left={<DashboardLeftPanel />}
                    right={
                        <ChatInput
                            placeholder="Ask anything or upload a file..."
                            onSubmit={({ text, file }) => {
                                console.log('Submitted text:', text, 'file:', file);
                            }}
                        />
                    }
                    initialLeftWidth={40}
                    minLeft={30}
                    minRight={30}
                />
            </div>
        </main>
    );
}

