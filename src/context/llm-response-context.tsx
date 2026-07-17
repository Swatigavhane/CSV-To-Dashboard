import { createContext, useContext } from 'react';
import { IContextProviderProps, LlmResponseContextValue } from './types';

const LlmResponseContext = createContext<LlmResponseContextValue | undefined>(undefined);

export function LlmResponseProvider({ children, chartResponses, parsedCsv }: IContextProviderProps) {
    return (
        <LlmResponseContext.Provider value={{ chartResponses, parsedCsv }}>
            {children}
        </LlmResponseContext.Provider>
    );
}

export function useLlmResponseContext() {
    const context = useContext(LlmResponseContext);

    if (!context) {
        throw new Error('useLlmResponseContext must be used within an LlmResponseProvider');
    }

    return context;
}
