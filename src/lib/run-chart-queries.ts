import { formatTimestampToDDMMYYYY, isLikelyTimestamp } from '@/utils';

export type QueryFn = (rows: Record<string, unknown>[], query: string) => Promise<Record<string, unknown>[]>;

export type RunChartQueriesParams = {
    llmResponse: any[];
    parsedCsv: any[];
    queryUploadedFileAsJson: QueryFn;
};

export async function runChartQueries({
    llmResponse,
    parsedCsv,
    queryUploadedFileAsJson,
}: RunChartQueriesParams) {
    const nextChartResponses = await Promise.all(
        llmResponse.map(async (chart) => {
            const chartQuery = typeof chart?.query === 'string' ? chart.query.trim() : '';

            if (!chartQuery) {
                return chart;
            }

            try {
                const previewRows = await queryUploadedFileAsJson(parsedCsv as Record<string, unknown>[], chartQuery);
                const formattedPreviewRows = previewRows.map((row) => {
                    return Object.fromEntries(
                        Object.entries(row).map(([key, value]) => {
                            if (isLikelyTimestamp(value)) {
                                return [key, formatTimestampToDDMMYYYY(value)];
                            }

                            return [key, value];
                        }),
                    );
                });

                return {
                    ...chart,
                    query_data: formattedPreviewRows,
                };
            } catch (error) {
                console.error('Query execution failed for chart:', chart?.title, error);
                return chart;
            }
        }),
    );

    return nextChartResponses;
}
