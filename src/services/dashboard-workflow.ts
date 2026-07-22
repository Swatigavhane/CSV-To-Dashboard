import { createSchemaFromJson } from '@/lib/schema';
import { parseCsvFile } from '@/lib/csv';
import { runChartQueries } from '@/lib/run-chart-queries';
import { executeDuckDbQuery } from '@/duckdb';
import { isCsvFile, isNonEmptyArray } from '@/utils';
import { DEFAULT_CSV_REPORT_PROMPT, DUCK_DB_TABLE_NAME } from '@/constants';
import type { ItransformData } from '@/context/types';

export interface DashboardWorkflowResult {
    parsedCsv: Record<string, unknown>[];
    chartResponses: ItransformData[];
}

export async function submitCsvForDashboard({
    file,
    text,
    callDirectLLM,
}: {
    file?: File;
    text: string;
    callDirectLLM: (prompt: string) => Promise<unknown>;
}): Promise<DashboardWorkflowResult> {
    if (!file || !isCsvFile(file)) {
        throw new Error('Please upload a valid CSV file.');
    }

    const parsedCsv = await parseCsvFile(file);
    const inferredSchema = createSchemaFromJson(parsedCsv);

    if (!inferredSchema) {
        throw new Error('Failed to infer schema from CSV data');
    }

    const userPrompt = text.trim() || DEFAULT_CSV_REPORT_PROMPT;
    const prompt = `${userPrompt}\n\nSchema: ${JSON.stringify(inferredSchema, null, 2)}`;

    await callDirectLLM(prompt);

    return {
        parsedCsv,
        chartResponses: [],
    };
}

export async function runDashboardQueries({
    llmResponse,
    parsedCsv,
}: {
    llmResponse: ItransformData[];
    parsedCsv: Record<string, unknown>[];
}): Promise<ItransformData[]> {
    if (!isNonEmptyArray(llmResponse) || !parsedCsv.length) {
        return [];
    }

    const queryUploadedFileAsJson = async (rows: Record<string, unknown>[], query: string) => {
        return executeDuckDbQuery(rows, DUCK_DB_TABLE_NAME, query);
    };

    return runChartQueries({
        llmResponse,
        parsedCsv,
        queryUploadedFileAsJson,
    });
}
