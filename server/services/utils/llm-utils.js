export function safeParse(llmOutput) {
    // 1. Remove everything before the first '[' or '{' and after the last ']' or '}'
    const startIndex = llmOutput.indexOf('['); // or '{'
    const endIndex = llmOutput.lastIndexOf(']'); // or '}'

    if (startIndex === -1 || endIndex === -1) {
        throw new Error("No JSON structure found in output");
    }

    const cleanJson = llmOutput.substring(startIndex, endIndex + 1);

    // 2. Parse
    return JSON.parse(cleanJson);
}

export function extractQueryFromResponse(text) {
    if (typeof text !== 'string' || !text.trim()) {
        return null;
    }

    // Normalize both variants: **Query:** ... and **Query**: ... to Query: ...
    const normalizedText = text
        .replace(/\*\*\s*query\s*:\s*\*\*/ig, 'query:')
        .replace(/\*\*\s*query\s*\*\*\s*:/ig, 'query:');

    // Matches: Query: `SELECT ...;`
    const backtickMatch = normalizedText.match(/(?:^|\n)\s*query\s*:\s*`([^`]+)`/i);
    console.log('Extracted query from response (backticks):', backtickMatch);
    if (backtickMatch?.[1]) {
        return backtickMatch[1].trim();
    }

    // Matches: Query: SELECT ...; or Query: sample query
    const plainMatch = normalizedText.match(/(?:^|\n)\s*query\s*:\s*([^\n\r]+)/i);
    console.log('Extracted query from response (plain):', plainMatch);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim();
    }

    return null;
}

export function extractSchemaKeys(reqBody) {
    const promptText = reqBody?.prompt;
    if (typeof promptText !== 'string') {
        return [];
    }

    const schemaMatch = promptText.match(/Schema\s*:\s*(\{[\s\S]*\})\s*$/i);
    if (!schemaMatch?.[1]) {
        return [];
    }

    try {
        const parsed = JSON.parse(schemaMatch[1]);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return [];
        }
        return Object.keys(parsed);
    } catch {
        return [];
    }
}

export function normalizeQueryColumnCasing(query, schemaKeys) {
    if (typeof query !== 'string' || !query.trim() || !Array.isArray(schemaKeys) || schemaKeys.length === 0) {
        return query;
    }

    let normalized = query;
    for (const key of schemaKeys.sort((a, b) => b.length - a.length)) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), key);
    }

    return normalized;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function getSourceColumnFromExpression(expression, schemaKeys) {
    if (!Array.isArray(schemaKeys) || schemaKeys.length === 0) {
        return null;
    }

    for (const key of [...schemaKeys].sort((a, b) => b.length - a.length)) {
        const keyPattern = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
        if (keyPattern.test(expression)) {
            return key;
        }
    }

    return null;
}

function extractAxisAliasMappings(query, schemaKeys) {
    if (typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const selectMatch = query.match(/\bselect\b([\s\S]*?)\bfrom\b/i);
    if (!selectMatch?.[1]) {
        return [];
    }

    const mappings = [];
    const selectItems = splitSelectClause(selectMatch[1]);

    for (const item of selectItems) {
        const aliasMatch = item.match(/\bas\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/i);
        if (!aliasMatch?.[1]) {
            continue;
        }

        const alias = aliasMatch[1];
        const expression = item.slice(0, aliasMatch.index).trim();
        const sourceColumn = getSourceColumnFromExpression(expression, schemaKeys);

        if (!sourceColumn || sourceColumn.toLowerCase() === alias.toLowerCase()) {
            continue;
        }

        mappings.push({ sourceColumn, alias });
    }

    return mappings;
}

function replaceAxisWithAlias(axisValue, mappings) {
    if (typeof axisValue !== 'string' || !Array.isArray(mappings) || mappings.length === 0) {
        return axisValue;
    }

    let nextValue = axisValue;
    for (const { sourceColumn, alias } of mappings) {
        const sourcePattern = new RegExp(`\\b${escapeRegex(sourceColumn)}\\b`, 'gi');
        nextValue = nextValue.replace(sourcePattern, alias);
    }

    return nextValue;
}

export function alignChartAxesWithQueryPeriod(charts, query, schemaKeys = []) {
    if (!Array.isArray(charts) || typeof query !== 'string' || !query.trim()) {
        return charts;
    }

    const aliasMappings = extractAxisAliasMappings(query, schemaKeys);
    if (aliasMappings.length === 0) {
        return charts;
    }

    return charts.map((chart) => {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            return chart;
        }

        return {
            ...chart,
            x_axis: replaceAxisWithAlias(chart.x_axis, aliasMappings),
            value_axis: replaceAxisWithAlias(chart.value_axis, aliasMappings),
        };
    });
}

export function stripSelectAliases(query) {
    if (typeof query !== 'string' || !query.trim()) {
        return query;
    }

    const selectMatch = query.match(/\bselect\b([\s\S]*?)\bfrom\b/i);
    if (!selectMatch?.[1]) {
        return query;
    }

    const selectItems = splitSelectClause(selectMatch[1]);
    const withoutAliases = selectItems.map((item) => {
        const aliasMatch = item.match(/\bas\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/i);
        if (!aliasMatch) {
            return item.trim();
        }

        return item.slice(0, aliasMatch.index).trim();
    });

    return query.replace(/\bselect\b([\s\S]*?)\bfrom\b/i, `SELECT ${withoutAliases.join(', ')} FROM`);
}

function resolveSchemaKeyFromText(text, schemaKeys) {
    if (typeof text !== 'string' || !Array.isArray(schemaKeys) || schemaKeys.length === 0) {
        return null;
    }

    for (const key of [...schemaKeys].sort((a, b) => b.length - a.length)) {
        const keyPattern = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
        if (keyPattern.test(text)) {
            return key;
        }
    }

    return null;
}

export function forceChartAxesToSchemaColumns(charts, schemaKeys = [], query = '') {
    if (!Array.isArray(charts) || !Array.isArray(schemaKeys) || schemaKeys.length === 0) {
        return charts;
    }

    const schemaKeyMap = new Map(schemaKeys.map((key) => [key.toLowerCase(), key]));
    const aliasMappings = extractAxisAliasMappings(query, schemaKeys);
    const aliasToSource = new Map(aliasMappings.map(({ sourceColumn, alias }) => [alias.toLowerCase(), sourceColumn]));

    const normalizeAxis = (axisValue) => {
        if (typeof axisValue !== 'string') {
            return axisValue;
        }

        const directSchemaMatch = schemaKeyMap.get(axisValue.trim().toLowerCase());
        if (directSchemaMatch) {
            return directSchemaMatch;
        }

        const aliasMatch = aliasToSource.get(axisValue.trim().toLowerCase());
        if (aliasMatch) {
            return aliasMatch;
        }

        const containedSchemaMatch = resolveSchemaKeyFromText(axisValue, schemaKeys);
        if (containedSchemaMatch) {
            return containedSchemaMatch;
        }

        return axisValue;
    };

    return charts.map((chart) => {
        if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
            return chart;
        }

        return {
            ...chart,
            x_axis: normalizeAxis(chart.x_axis),
            value_axis: normalizeAxis(chart.value_axis),
        };
    });
}