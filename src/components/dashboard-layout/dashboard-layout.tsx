import { cn } from '@/utils';

export interface DashboardLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function DashboardLayout({
    children,
    className,
}: DashboardLayoutProps) {
    return (
        <div
            className={cn(
                'min-h-[420px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/95 shadow-2xl',
                className,
            )}
        >
            <section className="overflow-auto bg-slate-950 p-4">
                {children}
            </section>
        </div>
    );
}