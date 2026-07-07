import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
    placeholder?: string;
    onSubmit: (payload: { text: string; file?: File }) => void;
    className?: string;
}

export function ChatInput({ placeholder = 'Type your message...', onSubmit, className }: ChatInputProps) {
    const [text, setText] = React.useState('');
    const [file, setFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!text.trim() && !file) {
            return;
        }

        onSubmit({ text: text.trim(), file: file ?? undefined });
        setText('');
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null;
        setFile(selectedFile);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                'rounded-3xl border border-slate-700 bg-slate-950/80 p-4 shadow-lg shadow-slate-950/20',
                className,
            )}
        >
            <div className="min-h-[200px] rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={placeholder}
                    className="min-h-[200px] w-full resize-none rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                />

                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Upload
                </Button>

                {file ? (
                    <div className="max-w-full truncate text-sm text-slate-300">
                        Selected file: {file.name}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No file selected</div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <Button type="submit">Send</Button>
                </div>
            </div>
        </form>
    );
}
