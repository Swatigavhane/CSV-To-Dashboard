import { cn } from '@/lib/utils';
import { useResizableSplit } from '@/hooks/use-resizable-split';

export interface DashboardLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    initialLeftWidth?: number;
    minLeft?: number;
    minRight?: number;
    className?: string;
}

export function DashboardLayout({
    left,
    right,
    initialLeftWidth = 50,
    minLeft = 20,
    minRight = 20,
    className,
}: DashboardLayoutProps) {
    const { containerRef, leftWidth, onPointerDown } = useResizableSplit({
        initialLeftWidth,
        minLeft,
        minRight,
    });

    return (
        <div
            ref={containerRef}
            className={cn(
                'grid min-h-[420px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/95 shadow-2xl',
                className,
            )}
            style={{ gridTemplateColumns: `${leftWidth}% 1.5rem minmax(0, ${100 - leftWidth}%)` }}
        >
            <section className="overflow-auto border-r border-slate-800 bg-slate-950 p-4">
                {left}
            </section>

            <div
                role="separator"
                aria-orientation="vertical"
                className="flex cursor-col-resize items-center justify-center bg-slate-900 transition-colors hover:bg-slate-800"
                onPointerDown={onPointerDown}
            >
                <div className="h-12 w-1 rounded-full bg-slate-600" />
            </div>

            <section className="overflow-auto bg-slate-950 p-4">
                {right}
            </section>
        </div>
    );
}
