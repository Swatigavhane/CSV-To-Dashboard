import * as React from 'react';

import uploadIcon from '@/assets/icons/upload.svg';
import sendIcon from '@/assets/icons/send.svg';
import { Button } from '@/components/button/button';
import { FileInput } from '@/components/file-input/file-input';
import { cn } from '@/utils';

export interface ChatInputProps {
    placeholder?: string;
    onSubmit: (payload: { text: string; file?: File; parsedCsv?: Record<string, any>[] }) => void;
    className?: string;
}

export function ChatInput({ placeholder = 'Type your message...', onSubmit, className }: ChatInputProps) {
    const [promptText, setPromptText] = React.useState('');
    const [file, setFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const canSend = Boolean(file);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSend) {
            return;
        }

        onSubmit({ text: promptText.trim(), file: file ?? undefined });
        setPromptText('');
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null;
        if (!selectedFile) {
            setFile(null);
            return;
        }

        const acceptedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        const acceptedExtensions = ['.csv', '.xls', '.xlsx'];
        const fileName = selectedFile.name.toLowerCase();
        const isAcceptedType = acceptedTypes.includes(selectedFile.type);
        const isAcceptedExtension = acceptedExtensions.some((ext) => fileName.endsWith(ext));

        if (!isAcceptedType && !isAcceptedExtension) {
            setFile(null);
            return;
        }

        setFile(selectedFile);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                'overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/90 shadow-lg shadow-slate-950/20 transition focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20',
                className,
            )}
        >
            <div className="min-h-[110px] bg-slate-900/80">
                <textarea
                    value={promptText}
                    onChange={(event) => setPromptText(event.target.value)}
                    placeholder={placeholder}
                    className="min-h-[110px] w-full resize-none border-0 bg-transparent px-5 py-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
                />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900/70 px-3 py-3 sm:flex-row sm:items-center">
                <FileInput
                    inputRef={fileInputRef}
                    accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                />

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border-slate-600 bg-slate-950/60"
                >
                    <img src={uploadIcon} alt="" aria-hidden="true" className="h-4 w-4" />
                    Upload
                </Button>

                {file ? (
                    <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                        Selected file: {file.name}
                    </div>
                ) : (
                    <div className="min-w-0 flex-1 rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-500">
                        No file selected
                    </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <Button type="submit" disabled={!canSend} className="rounded-xl px-5">
                        <img src={sendIcon} alt="" aria-hidden="true" className="h-4 w-4" />
                        Submit
                    </Button>
                </div>
            </div>
        </form>
    );
}