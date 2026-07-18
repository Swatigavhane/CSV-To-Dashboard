import {
    AVG_AGGREGATE,
    AVG_FUNCTION_REGEX,
    COMPLEX_QUERY_REGEX,
    COUNT_AGGREGATE,
    COUNT_ALIAS,
    COUNT_FUNCTION_REGEX,
    DATE_LIKE_COLUMN_REGEX,
    DATE_TYPE,
    DEFAULT_AGGREGATE,
    NUMBER_TYPE,
    ORDER_BY_TIME,
    ORDER_BY_VALUE,
    PROMPT_SCHEMA_OBJECT_REGEX,
    PROMPT_SCHEMA_SPLIT_REGEX,
    QUERY_LIMIT,
    SUGGEST_CHART_TABLE_NAME,
    SELECT_ALIAS_REGEX,
    SELECT_FROM_REGEX,
    SELECT_PLAIN_COLUMN_REGEX,
    SQL_BACKTICKS_REGEX,
    TIME_GRAIN_REGEX,
    UNSUPPORTED_DUCKDB_REGEX,
} from '../constants/suggest-chart-constants.mjs';

export function sanitizeQueryString(query) {
    if (typeof query !== 'string') {
        return '';
    }

    return query.replace(SQL_BACKTICKS_REGEX, '').trim();
}

export function extractUserPromptText(reqBody) {
    const promptText = reqBody?.prompt;
    if (typeof promptText !== 'string') {
        return '';
    }

    const schemaSplitIndex = promptText.search(PROMPT_SCHEMA_SPLIT_REGEX);
    if (schemaSplitIndex === -1) {
        return promptText;
    }

    return promptText.slice(0, schemaSplitIndex).trim();
}

export function detectTimeGrain(promptText) {
    if (typeof promptText !== 'string' || !promptText.trim()) {
        return null;
    }

    if (TIME_GRAIN_REGEX.month.test(promptText)) {
        return 'month';
    }

    if (TIME_GRAIN_REGEX.week.test(promptText)) {
        return 'week';
    }

    if (TIME_GRAIN_REGEX.year.test(promptText)) {
        return 'year';
    }

    if (TIME_GRAIN_REGEX.day.test(promptText)) {
        return 'day';
    }

    return null;
}

export function extractSchemaMap(reqBody) {
    const promptText = reqBody?.prompt;
    if (typeof promptText !== 'string') {
        return {};
    }

    const schemaMatch = promptText.match(PROMPT_SCHEMA_OBJECT_REGEX);
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
    if (type === DATE_TYPE) {
        return true;
    }

    return DATE_LIKE_COLUMN_REGEX.test(column);
}

function resolveAggregateFromQuery(query) {
    if (typeof query !== 'string') {
        return DEFAULT_AGGREGATE;
    }

    if (COUNT_FUNCTION_REGEX.test(query)) {
        return COUNT_AGGREGATE;
    }

    if (AVG_FUNCTION_REGEX.test(query)) {
        return AVG_AGGREGATE;
    }

    return DEFAULT_AGGREGATE;
}

export function buildSimpleChartQuery(chart, schemaKeys, schemaMap = {}, timeGrain = null) {
    const availableKeys = Array.isArray(schemaKeys) ? schemaKeys : [];
    const fallbackDimension = availableKeys[0] ?? '';
    const fallbackMeasure = availableKeys.find((key) => key !== fallbackDimension) ?? fallbackDimension;

    const xAxis = isSchemaColumn(chart?.x_axis, availableKeys) ? chart.x_axis.trim() : fallbackDimension;
    const valueAxis = isSchemaColumn(chart?.value_axis, availableKeys) ? chart.value_axis.trim() : fallbackMeasure;
    const requestedAggregate = resolveAggregateFromQuery(chart?.query);
    const valueAxisType = String(schemaMap?.[valueAxis] ?? '').toLowerCase();
    const isNumericMeasure = valueAxisType === NUMBER_TYPE;
    const aggregate = isNumericMeasure ? requestedAggregate : COUNT_AGGREGATE;
    const supportsTimeGrain = Boolean(timeGrain) && isDateLikeColumn(xAxis, schemaMap);

    const xAxisSql = quoteIdentifier(xAxis);
    const valueAxisSql = quoteIdentifier(valueAxis);
    const aggregateExpr = aggregate === COUNT_AGGREGATE ? 'COUNT(*)' : `${aggregate}(${valueAxisSql})`;
    const outputValueAxis = aggregate === COUNT_AGGREGATE ? COUNT_ALIAS : valueAxis;
    const outputValueAxisSql = quoteIdentifier(outputValueAxis);
    const outputXAxis = supportsTimeGrain ? timeGrain : xAxis;
    const outputXAxisSql = quoteIdentifier(outputXAxis);

    const timeDimensionExpr = supportsTimeGrain
        ? `date_trunc('${timeGrain}', CAST(${xAxisSql} AS DATE))`
        : xAxisSql;

    const orderClause = supportsTimeGrain ? ORDER_BY_TIME : ORDER_BY_VALUE;

    return {
        x_axis: outputXAxis,
        value_axis: outputValueAxis,
        query: `SELECT ${timeDimensionExpr} AS ${outputXAxisSql}, ${aggregateExpr} AS ${outputValueAxisSql} FROM ${SUGGEST_CHART_TABLE_NAME} GROUP BY 1 ${orderClause} LIMIT ${QUERY_LIMIT}`,
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

    const selectMatch = query.match(SELECT_FROM_REGEX);
    if (!selectMatch?.[1]) {
        return [];
    }

    const selectItems = splitSelectClause(selectMatch[1]);
    const outputColumns = [];

    for (const item of selectItems) {
        const aliasMatch = item.match(SELECT_ALIAS_REGEX);
        if (aliasMatch?.[1]) {
            outputColumns.push(aliasMatch[1]);
            continue;
        }

        const plainColumnMatch = item.match(SELECT_PLAIN_COLUMN_REGEX);
        if (plainColumnMatch?.[1]) {
            outputColumns.push(plainColumnMatch[1]);
        }
    }

    return outputColumns;
}

export function findInvalidAxisColumns(charts, schemaKeys) {
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

export function findUnsupportedDuckDbQueries(charts) {
    if (!Array.isArray(charts)) {
        return [];
    }

    const unsupported = [];

    charts.forEach((chart, index) => {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            return;
        }

        const chartQuery = typeof chart.query === 'string' ? chart.query : '';
        if (UNSUPPORTED_DUCKDB_REGEX.test(chartQuery)) {
            unsupported.push(`chart_${index + 1}`);
        }
    });

    return unsupported;
}

export function findComplexQueries(charts) {
    if (!Array.isArray(charts)) {
        return [];
    }

    const complex = [];
    charts.forEach((chart, index) => {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            return;
        }

        const chartQuery = typeof chart.query === 'string' ? chart.query : '';
        if (COMPLEX_QUERY_REGEX.test(chartQuery)) {
            complex.push(`chart_${index + 1}`);
        }
    });

    return complex;
}

export function normalizeChartsWithSimpleQueries(parsedJson, schemaKeys, schemaMap, timeGrain) {
    if (!Array.isArray(parsedJson)) {
        return parsedJson;
    }

    return parsedJson.map((chart) => {
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
    });
}
