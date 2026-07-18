import { InferenceClient } from '@huggingface/inference';
import 'dotenv/config';
import {
    extractSchemaKeys,
    safeParse,
} from './utils/llm-utils.js';
import {
    detectTimeGrain,
    extractSchemaMap,
    extractUserPromptText,
    findComplexQueries,
    findInvalidAxisColumns,
    findUnsupportedDuckDbQueries,
    normalizeChartsWithSimpleQueries,
} from './utils/suggest-chart-utils.mjs';
import { loadAndRenderPrompt } from './utils/prompt-loader.mjs';
import {
    SUGGEST_CHART_MODEL,
    SUGGEST_CHART_PROMPT_TEMPLATE,
    SUGGEST_CHART_RETRY_INSTRUCTION,
    SUGGEST_CHART_TABLE_NAME,
    SUGGEST_CHART_TYPES,
} from './constants/suggest-chart-constants.mjs';

const token = process.env.HUGGINGFACE_TOKEN;
const client = token ? new InferenceClient(token) : new InferenceClient();

export async function suggestChart(reqBody) {
    console.log('Received reqBody:', reqBody);
    const schemaKeys = extractSchemaKeys(reqBody);
    const schemaMap = extractSchemaMap(reqBody);
    const userPromptText = extractUserPromptText(reqBody);
    const timeGrain = detectTimeGrain(userPromptText);

    try {
        const systemPrompt = await loadAndRenderPrompt(SUGGEST_CHART_PROMPT_TEMPLATE, {
            chart_types: SUGGEST_CHART_TYPES,
            table_name: SUGGEST_CHART_TABLE_NAME,
        });

        const result = await client.chatCompletion({
            model: SUGGEST_CHART_MODEL, // or 14B if you have access
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                { role: "user", content: JSON.stringify(reqBody, 2, null) }
            ]
        });


        let responseText = result.choices[0].message.content;
        let parsedJson = safeParse(responseText);
        const invalidAxes = findInvalidAxisColumns(parsedJson, schemaKeys);
        const unsupportedQueries = findUnsupportedDuckDbQueries(parsedJson);
        const complexQueries = findComplexQueries(parsedJson);

        if (invalidAxes.length > 0 || unsupportedQueries.length > 0 || complexQueries.length > 0) {
            console.warn('Invalid axis columns from LLM:', invalidAxes);
            console.warn('Unsupported DuckDB query functions detected:', unsupportedQueries);
            console.warn('Complex query patterns detected:', complexQueries);

            const retryConstraints = [
                invalidAxes.length > 0
                    ? `Invalid x_axis/value_axis values: ${invalidAxes.join(', ')}.`
                    : '',
                unsupportedQueries.length > 0
                    ? `Unsupported function cumulative_agg(...) detected in: ${unsupportedQueries.join(', ')}.`
                    : '',
                complexQueries.length > 0
                    ? `Complex SQL detected in: ${complexQueries.join(', ')}.`
                    : '',
            ].filter(Boolean).join('\n');

            const retryResult = await client.chatCompletion({
                model: SUGGEST_CHART_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: JSON.stringify(reqBody, 2, null) },
                    { role: "assistant", content: responseText },
                    {
                        role: "user",
                        content: `${retryConstraints}\n${SUGGEST_CHART_RETRY_INSTRUCTION}`
                    }
                ]
            });

            responseText = retryResult.choices[0].message.content;
            parsedJson = safeParse(responseText);
        }

        const normalizedCharts = normalizeChartsWithSimpleQueries(
            parsedJson,
            schemaKeys,
            schemaMap,
            timeGrain,
        );

        const fallbackQuery = Array.isArray(normalizedCharts)
            ? (typeof normalizedCharts[0]?.query === 'string' ? normalizedCharts[0].query : '')
            : '';

        console.log('Received suggestion:', responseText);

        return {
            json: normalizedCharts,
            query: fallbackQuery,
        };
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        return null;
    }
}

