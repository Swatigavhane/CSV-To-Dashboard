
import { type ReactNode } from 'react';
export interface ItransformData {
    chart_type: string;
    x_axis: string;
    y_axis: string;
    [key: string]: any; // Allow other properties
}
export interface LlmResponseContextValue {
    llmResponse: ItransformData[];
    parsedCsv: any[];
}

export interface IContextProviderProps {
    children: ReactNode;
    llmResponse: ItransformData[];
    parsedCsv: any[]; // Adjust the type based on your CSV data structure
}
