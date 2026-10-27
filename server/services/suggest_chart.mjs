import Groq from 'groq-sdk';
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

export async function suggestChart(reqBody) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY is not configured for this deployment');
        }
        if (typeof reqBody?.prompt !== 'string' || !reqBody.prompt.trim()) {
            throw new Error('Request body must include a non-empty prompt');
        }

        const client = new Groq({ apiKey });
        const schemaKeys = extractSchemaKeys(reqBody);
        const schemaMap = extractSchemaMap(reqBody);
        const userPromptText = extractUserPromptText(reqBody);
        const timeGrain = detectTimeGrain(userPromptText);
        const systemPrompt = await loadAndRenderPrompt(SUGGEST_CHART_PROMPT_TEMPLATE, {
            chart_types: SUGGEST_CHART_TYPES,
            table_name: SUGGEST_CHART_TABLE_NAME,
        });

        const result = await client.chat.completions.create({
            model: SUGGEST_CHART_MODEL,
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                { role: "user", content: JSON.stringify(reqBody, 2, null) }
            ]
        });

        let responseText = result.choices?.[0]?.message?.content;
        if (typeof responseText !== 'string' || !responseText.trim()) {
            throw new Error('Groq returned an empty chart suggestion');
        }
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

            const retryResult = await client.chat.completions.create({
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

            responseText = retryResult.choices?.[0]?.message?.content;
            if (typeof responseText !== 'string' || !responseText.trim()) {
                throw new Error('Groq returned an empty chart suggestion after retry');
            }
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
        throw error;
    }
}
