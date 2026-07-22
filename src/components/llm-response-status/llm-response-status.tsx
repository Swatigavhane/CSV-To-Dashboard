import { LoadingProgress } from '@/components/loading-progress/loading-progress';

export interface LlmResponseStatusProps {
    llmLoading: boolean;
    llmError: unknown;
}

export function LlmResponseStatus({ llmLoading, llmError }: LlmResponseStatusProps) {
    return llmLoading || llmError ? (
        <div className="mt-4 rounded-md bg-slate-900 p-3 text-sm">
            {llmLoading ? (
                <LoadingProgress />
            ) : llmError ? (
                <div className="text-red-400">{llmError instanceof Error ? llmError.message : String(llmError)}</div>
            ) : null}
        </div>
    ) : null;
}
