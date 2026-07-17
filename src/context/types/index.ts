
import { type ReactNode } from 'react';
export interface ItransformData {
    chart_type: string;
    x_axis: string;
    y_axis: string;
    [key: string]: any; // Allow other properties
}
export interface LlmResponseContextValue {
    chartResponses: ItransformData[];
    parsedCsv: any[];
}

export interface IContextProviderProps {
    children: ReactNode;
    chartResponses: ItransformData[];
    parsedCsv: any[]; // Adjust the type based on your CSV data structure
}
