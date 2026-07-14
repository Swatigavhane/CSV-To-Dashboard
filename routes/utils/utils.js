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