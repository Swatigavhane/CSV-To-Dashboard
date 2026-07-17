import { InferenceClient } from '@huggingface/inference';
import 'dotenv/config';
import {
    extractSchemaKeys,
    safeParse,
} from './utils/utils.js';

const token = process.env.HUGGINGFACE_TOKEN;
console.log('Hugging Face Token:', token);
const client = token ? new InferenceClient(token) : new InferenceClient();

function sanitizeQueryString(query) {
    if (typeof query !== 'string') {
        return '';
    }

    return query.replace(/`+/g, '').trim();
}

function extractUserPromptText(reqBody) {
    const promptText = reqBody?.prompt;
    if (typeof promptText !== 'string') {
        return '';
    }

    const schemaSplitIndex = promptText.search(/\n\s*Schema\s*:/i);
    if (schemaSplitIndex === -1) {
        return promptText;
    }

    return promptText.slice(0, schemaSplitIndex).trim();
}

function detectTimeGrain(promptText) {
    if (typeof promptText !== 'string' || !promptText.trim()) {
        return null;
    }

    if (/\b(monthly|month\s*wise|by\s*month|month over month|mom)\b/i.test(promptText)) {
        return 'month';
    }

    if (/\b(weekly|week\s*wise|by\s*week|wow|week over week)\b/i.test(promptText)) {
        return 'week';
    }

    if (/\b(yearly|annual|year\s*wise|by\s*year|yoy|year over year)\b/i.test(promptText)) {
        return 'year';
    }

    if (/\b(daily|day\s*wise|by\s*day)\b/i.test(promptText)) {
        return 'day';
    }

    return null;
}

function extractSchemaMap(reqBody) {
    const promptText = reqBody?.prompt;
    if (typeof promptText !== 'string') {
        return {};
    }

    const schemaMatch = promptText.match(/Schema\s*:\s*(\{[\s\S]*\})\s*$/i);
    if (!schemaMatch?.[1]) {
        return {};
    }

    try {
        const parsed = JSON.parse(schemaMatch[1]);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }

        return parsed;
    } catch {
        return {};
    }
}

function quoteIdentifier(identifier) {
    const safe = String(identifier ?? '').replace(/"/g, '""').trim();
    return `"${safe}"`;
}

function isSchemaColumn(column, schemaKeys) {
    if (typeof column !== 'string' || !column.trim() || !Array.isArray(schemaKeys)) {
        return false;
    }

    const normalizedColumn = column.trim().toLowerCase();
    return schemaKeys.some((key) => String(key).toLowerCase() === normalizedColumn);
}

function isDateLikeColumn(column, schemaMap) {
    if (typeof column !== 'string' || !column.trim()) {
        return false;
    }

    const type = String(schemaMap?.[column] ?? '').toLowerCase();
    if (type === 'date') {
        return true;
    }

    return /date|time/i.test(column);
}

function resolveAggregateFromQuery(query) {
    if (typeof query !== 'string') {
        return 'SUM';
    }

    if (/\bcount\s*\(/i.test(query)) {
        return 'COUNT';
    }

    if (/\bavg\s*\(/i.test(query)) {
        return 'AVG';
    }

    return 'SUM';
}

function buildSimpleChartQuery(chart, schemaKeys, schemaMap = {}, timeGrain = null) {
    const availableKeys = Array.isArray(schemaKeys) ? schemaKeys : [];
    const fallbackDimension = availableKeys[0] ?? '';
    const fallbackMeasure = availableKeys.find((key) => key !== fallbackDimension) ?? fallbackDimension;

    const xAxis = isSchemaColumn(chart?.x_axis, availableKeys) ? chart.x_axis.trim() : fallbackDimension;
    const valueAxis = isSchemaColumn(chart?.value_axis, availableKeys) ? chart.value_axis.trim() : fallbackMeasure;
    const requestedAggregate = resolveAggregateFromQuery(chart?.query);
    const valueAxisType = String(schemaMap?.[valueAxis] ?? '').toLowerCase();
    const isNumericMeasure = valueAxisType === 'number';
    const aggregate = isNumericMeasure ? requestedAggregate : 'COUNT';
    const supportsTimeGrain = Boolean(timeGrain) && isDateLikeColumn(xAxis, schemaMap);

    const xAxisSql = quoteIdentifier(xAxis);
    const valueAxisSql = quoteIdentifier(valueAxis);
    const aggregateExpr = aggregate === 'COUNT' ? 'COUNT(*)' : `${aggregate}(${valueAxisSql})`;
    const outputValueAxis = aggregate === 'COUNT' ? 'count' : valueAxis;
    const outputValueAxisSql = quoteIdentifier(outputValueAxis);
    const outputXAxis = supportsTimeGrain ? timeGrain : xAxis;
    const outputXAxisSql = quoteIdentifier(outputXAxis);

    const timeDimensionExpr = supportsTimeGrain
        ? `date_trunc('${timeGrain}', CAST(${xAxisSql} AS DATE))`
        : xAxisSql;

    const orderClause = supportsTimeGrain ? 'ORDER BY 1 ASC' : 'ORDER BY 2 DESC';

    return {
        x_axis: outputXAxis,
        value_axis: outputValueAxis,
        query: `SELECT ${timeDimensionExpr} AS ${outputXAxisSql}, ${aggregateExpr} AS ${outputValueAxisSql} FROM csv_data GROUP BY 1 ${orderClause} LIMIT 100`,
    };
}

function splitSelectClause(selectClause) {
    const segments = [];
    let current = '';
    let depth = 0;

    for (const char of selectClause) {
        if (char === '(') {
            depth += 1;
        } else if (char === ')' && depth > 0) {
            depth -= 1;
        }

        if (char === ',' && depth === 0) {
            if (current.trim()) {
                segments.push(current.trim());
            }
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        segments.push(current.trim());
    }

    return segments;
}

function extractOutputColumnsFromQuery(query) {
    if (typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const selectMatch = query.match(/\bselect\b([\s\S]*?)\bfrom\b/i);
    if (!selectMatch?.[1]) {
        return [];
    }

    const selectItems = splitSelectClause(selectMatch[1]);
    const outputColumns = [];

    for (const item of selectItems) {
        const aliasMatch = item.match(/\bas\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/i);
        if (aliasMatch?.[1]) {
            outputColumns.push(aliasMatch[1]);
            continue;
        }

        const plainColumnMatch = item.match(/(?:^|\.)"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/);
        if (plainColumnMatch?.[1]) {
            outputColumns.push(plainColumnMatch[1]);
        }
    }

    return outputColumns;
}

function findInvalidAxisColumns(charts, schemaKeys) {
    if (!Array.isArray(charts) || !Array.isArray(schemaKeys) || schemaKeys.length === 0) {
        return [];
    }

    const invalid = new Set();

    for (const chart of charts) {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            continue;
        }

        const chartQuery = typeof chart.query === 'string' ? chart.query : '';
        const queryOutputColumns = extractOutputColumnsFromQuery(chartQuery);
        const allowedAxisNames = new Set([
            ...schemaKeys.map((key) => String(key).toLowerCase()),
            ...queryOutputColumns.map((key) => String(key).toLowerCase()),
        ]);

        const xAxis = typeof chart.x_axis === 'string' ? chart.x_axis.trim() : '';
        const valueAxis = typeof chart.value_axis === 'string' ? chart.value_axis.trim() : '';

        if (xAxis && !allowedAxisNames.has(xAxis.toLowerCase())) {
            invalid.add(xAxis);
        }

        if (valueAxis && !allowedAxisNames.has(valueAxis.toLowerCase())) {
            invalid.add(valueAxis);
        }
    }

    return [...invalid];
}

function findUnsupportedDuckDbQueries(charts) {
    if (!Array.isArray(charts)) {
        return [];
    }

    const unsupported = [];

    charts.forEach((chart, index) => {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            return;
        }

        const chartQuery = typeof chart.query === 'string' ? chart.query : '';
        if (/\bcumulative_agg\s*\(/i.test(chartQuery)) {
            unsupported.push(`chart_${index + 1}`);
        }
    });

    return unsupported;
}

function findComplexQueries(charts) {
    if (!Array.isArray(charts)) {
        return [];
    }

    const complex = [];
    const complexPattern = /\b(coalesce|case|when|over|partition|having|union|intersect|except|with)\b/i;

    charts.forEach((chart, index) => {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            return;
        }

        const chartQuery = typeof chart.query === 'string' ? chart.query : '';
        if (complexPattern.test(chartQuery)) {
            complex.push(`chart_${index + 1}`);
        }
    });

    return complex;
}

export async function suggestChart(reqBody) {
    console.log('Received reqBody:', reqBody);
    const prompt = reqBody;
    const schemaKeys = extractSchemaKeys(reqBody);
    const schemaMap = extractSchemaMap(reqBody);
    const userPromptText = extractUserPromptText(reqBody);
    const timeGrain = detectTimeGrain(userPromptText);
    const systemPrompt = `You are an expert Data Visualization Analyst.
                                    1. Analyze the CSV schema provided.
                                    2. For all chart types (including Pie Charts), you MUST return these EXACT keys:
                                    - "chart_type"
                                    - "title"
                                    - "subtitle"
                                    - "x_axis" (The categorical/dimension key)
                                    - "value_axis" (The numerical/measure key)
                                    - "query" (A DuckDB-compatible SQL query for this chart)
                                    - "reasoning"

                                    3. x_axis and value_axis MUST match output column names from that chart's query.
                                    3.1 If query uses AS alias (for example AS Month or AS Revenue), then x_axis/value_axis MUST use those alias names exactly.
                                    3.2 If query does not use alias, x_axis/value_axis should use the raw schema column names.
                                    3.3 Never return SQL expressions in x_axis/value_axis; return only column names (raw or alias).
                                    4. Recommend exactly 4 chart types from: 'Bar Chart', 'Line Chart', 'Pie Chart', 'Area Chart'.
                                    5. RETURN ONLY A VALID JSON ARRAY. No markdown, no conversational text.
                                    6. Each chart object must include its own "query" field.
                                    7. Each query MUST be a single simple DuckDB-compatible SELECT statement only.
                                    8. Do not use CTEs, joins, subqueries, window functions, or nested SQL.
                                    9. Use the table name csv_data.
                                    10. Do not return a top-level query line such as **query**: ... outside the JSON array.
                                    11. Keep all column names exactly as they appear in the schema.
                                    12. Keep query VERY SIMPLE.
                                    13. Allowed pattern: SELECT <dimension_column>, <aggregate>(<measure_column>) AS <alias> FROM csv_data GROUP BY 1 ORDER BY 2 DESC LIMIT 100.
                                    14. Use only simple aggregates: SUM, COUNT, AVG.
                                    14.1 Apply SUM/AVG only on numeric columns. For non-numeric columns, use COUNT(*) only.
                                    14.2 For monthly/weekly/yearly requests on date columns, use date_trunc('<grain>', CAST(<date_column> AS DATE)).
                                    15. Do not use window functions, CASE, COALESCE, HAVING, UNION, CTE, or nested logic.
                                    16. use only csv_data as the table name in the query
                                    17. Do not use backticks in query.
                                    18. Do not use cumulative_agg(...) in query because DuckDB does not support it.

                                    Example of expected output structure:
                                    [
                                        {
                                            "chart_type": "Pie Chart",
                                            "title": "Revenue by Product",
                                            "subtitle" : "Site visits over time",
                                            "x_axis": "Product",
                                            "value_axis": "Revenue",
                                            "query": "SELECT Product, SUM(Revenue) AS Revenue FROM csv_data GROUP BY 1 ORDER BY 2 DESC",
                                            "reasoning": "..."
                                        }
                                    ]
                                    `;

    try {
        const result = await client.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-7B-Instruct", // or 14B if you have access
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
                model: "Qwen/Qwen2.5-Coder-7B-Instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: JSON.stringify(reqBody, 2, null) },
                    { role: "assistant", content: responseText },
                    {
                        role: "user",
                        content: `${retryConstraints}\nRegenerate the full answer with VERY SIMPLE query only. Use pattern: SELECT <dimension>, <aggregate>(<measure>) AS <alias> FROM csv_data GROUP BY 1 ORDER BY 2 DESC LIMIT 100. Ensure x_axis/value_axis are valid output column names from each chart query. If a query has AS alias, use that alias exactly. Do not use backticks. Do not use cumulative_agg(...). Do not use date_trunc, strftime, CAST, CASE, COALESCE, HAVING, UNION, CTE, window functions, or nested SQL.`
                    }
                ]
            });

            responseText = retryResult.choices[0].message.content;
            parsedJson = safeParse(responseText);
        }

        const normalizedCharts = Array.isArray(parsedJson)
            ? parsedJson.map((chart) => {
                if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
                    return chart;
                }

                const simpleQuery = buildSimpleChartQuery(
                    {
                        ...chart,
                        query: sanitizeQueryString(chart.query),
                    },
                    schemaKeys,
                    schemaMap,
                    timeGrain,
                );

                return {
                    ...chart,
                    x_axis: simpleQuery.x_axis,
                    value_axis: simpleQuery.value_axis,
                    query: simpleQuery.query,
                };
            })
            : parsedJson;

        const fallbackQuery = Array.isArray(normalizedCharts)
            ? (typeof normalizedCharts[0]?.query === 'string' ? normalizedCharts[0].query : '')
            : '';

        console.log('Received suggestion:', responseText);
        console.log('Chart-wise queries normalized.');

        return {
            json: normalizedCharts,
            query: fallbackQuery,
        };
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        return null;
    }
}

