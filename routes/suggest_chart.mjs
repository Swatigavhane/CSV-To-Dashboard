import { InferenceClient } from '@huggingface/inference';
import 'dotenv/config';
import {
    extractQueryFromResponse,
    extractSchemaKeys,
    normalizeQueryColumnCasing,
    safeParse,
} from './utils/utils.js';

const token = process.env.HUGGINGFACE_TOKEN;
console.log('Hugging Face Token:', token);
const client = token ? new InferenceClient(token) : new InferenceClient();

export async function suggestChart(reqBody) {
    console.log('Received reqBody:', reqBody);
    const prompt = reqBody;
    const schemaKeys = extractSchemaKeys(reqBody);

    try {
        const result = await client.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-7B-Instruct", // or 14B if you have access
            messages: [
                {
                    role: "system",
                    content: `You are an expert Data Visualization Analyst.
                                    1. Analyze the CSV schema provided.
                                    2. For all chart types (including Pie Charts), you MUST return these EXACT keys:
                                    - "chart_type"
                                    - "title"
                                    - "subtitle"
                                    - "x_axis" (The categorical/dimension key)
                                    - "value_axis" (The numerical/measure key)
                                    - "reasoning"

                                    3. For 'x_axis', 'value_axis', and SQL query columns, YOU MUST USE ONLY THE EXACT KEYS provided in the user's schema, preserving original casing exactly.
                                    4. Recommend exactly 4 chart types from: 'Bar Chart', 'Line Chart', 'Pie Chart', 'Area Chart'.
                                    5. RETURN ONLY A VALID JSON ARRAY. No markdown, no conversational text.
                                    6. Also return one SQL query based on the user prompt.
                                    7. The query MUST be a single simple DuckDB-compatible SELECT statement only.
                                    8. Do not use CTEs, joins, subqueries, window functions, or nested SQL.
                                    9. Use the table name csv_data.
                                    10. The query line MUST be returned in this exact format every time (lowercase key): **query**: sample query.
                                    11. Do not use any other query label formats such as Query:, **Query:**, or backticks around the query.
                                    12. Keep all column names exactly as they appear in the schema.
                                    13. When the user asks for monthly, weekly, or yearly analysis on a full date column, use DuckDB syntax such as date_trunc('month', CAST(Date AS DATE)) or strftime(CAST(Date AS DATE), '%Y-%m').
                                    14. If grouping by a date period, always include the truncated date expression in SELECT and GROUP BY, and keep the query as a single simple SELECT statement.
                                    15. Example: SELECT date_trunc('month', CAST(Date AS DATE)) AS month, SUM(Revenue) AS Revenue FROM csv_data GROUP BY 1 ORDER BY 1;
                                    16. use only csv_data as the table name in the query

                                    Example of expected output structure:
                                    [
                                        {
                                            "chart_type": "Pie Chart",
                                            "title": "Revenue by Product",
                                            "subtitle" : "Site visits over time",
                                            "x_axis": "Product",
                                            "value_axis": "Revenue",
                                            "reasoning": "..."
                                        }
                                    ]
                                    **query**: sample query
                                    `
                },
                { role: "user", content: JSON.stringify(reqBody, 2, null) }
            ]
        });


        const responseText = result.choices[0].message.content;
        const extractedQuery = extractQueryFromResponse(responseText);
        const normalizedQuery = normalizeQueryColumnCasing(extractedQuery, schemaKeys);
        const parsedJson = safeParse(responseText);
        console.log('Received suggestion:', responseText);
        console.log('Extracted query:', extractedQuery);
        console.log('Normalized query:', normalizedQuery);

        return {
            json: parsedJson,
            query: normalizedQuery,
        };
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        return null;
    }
}

