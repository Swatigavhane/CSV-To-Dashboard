import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdbMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdbEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export type QueryRow = Record<string, unknown>;
export type DuckDbColumnType = 'DOUBLE' | 'BOOLEAN' | 'VARCHAR';
export type QueryAliasMap = Record<string, string>;

export const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdbMvpWasm,
        mainWorker: duckdbMvpWorker,
    },
    eh: {
        mainModule: duckdbEhWasm,
        mainWorker: duckdbEhWorker,
    },
};

export function quoteIdentifier(name: string) {
    return `"${name.replace(/"/g, '""')}"`;
}

export function quoteSqlString(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}

export function normalizeTableName(tableName: string) {
    const trimmed = tableName.trim();
    if (!trimmed) {
        throw new Error('Table name cannot be empty');
    }
    return trimmed;
}

export function coerceDuckDbValue(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (trimmed === '') {
        return value;
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        const numericValue = Number(trimmed);
        return Number.isNaN(numericValue) ? value : numericValue;
    }

    return value;
}

export function coerceDuckDbRows(rows: Record<string, unknown>[]) {
    return (rows ?? []).map((row) => {
        const nextRow: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(row ?? {})) {
            nextRow[key] = coerceDuckDbValue(value);
        }

        return nextRow;
    });
}

function isNumericString(value: string) {
    return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function isBooleanString(value: string) {
    return /^(true|false)$/i.test(value.trim());
}

function isDateLikeString(value: string) {
    const normalized = value.trim();
    return (
        /^\d{4}-\d{2}-\d{2}$/.test(normalized)
        || /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(normalized)
        || /^\d{2}\/\d{2}\/\d{4}$/.test(normalized)
        || /^\d{2}-\d{2}-\d{4}$/.test(normalized)
    );
}

export function inferDuckDbColumnType(values: unknown[]): DuckDbColumnType {
    const meaningfulValues = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');

    if (meaningfulValues.length === 0) {
        return 'VARCHAR';
    }

    if (meaningfulValues.every((value) => typeof value === 'boolean' || (typeof value === 'string' && isBooleanString(value)))) {
        return 'BOOLEAN';
    }

    if (meaningfulValues.every((value) => typeof value === 'number' || (typeof value === 'string' && isNumericString(value)))) {
        return 'DOUBLE';
    }

    if (meaningfulValues.every((value) => typeof value === 'string' && isDateLikeString(value))) {
        return 'VARCHAR';
    }

    return 'VARCHAR';
}

function escapeSqlValue(value: string) {
    return value.replace(/'/g, "''");
}

export function formatDuckDbValue(value: unknown, columnType: DuckDbColumnType) {
    if (value === null || value === undefined || value === '') {
        return 'NULL';
    }

    if (columnType === 'DOUBLE') {
        const numericValue = Number(value);
        return Number.isNaN(numericValue) ? 'NULL' : String(numericValue);
    }

    if (columnType === 'BOOLEAN') {
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }

        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'true') {
            return 'TRUE';
        }

        if (normalized === 'false') {
            return 'FALSE';
        }

        return 'NULL';
    }

    return `'${escapeSqlValue(String(value))}'`;
}

export function buildDuckDbCreateTableSql(
    rows: Record<string, unknown>[],
    tableName: string,
) {
    const normalizedRows = rows ?? [];
    if (normalizedRows.length === 0) {
        return `CREATE OR REPLACE TABLE ${quoteIdentifier(tableName)} AS SELECT * FROM (SELECT NULL) WHERE FALSE;`;
    }

    const columns = Object.keys(normalizedRows[0] ?? {});
    const columnTypes = columns.map((column) => ({
        name: column,
        type: inferDuckDbColumnType(normalizedRows.map((row) => row?.[column])),
    }));

    const valuesRows = normalizedRows.map((row) => {
        const values = columnTypes.map(({ name, type }) => formatDuckDbValue(row?.[name], type));
        return `(${values.join(', ')})`;
    });

    const selectList = columnTypes
        .map(({ name, type }) => `${quoteIdentifier(name)}::${type} AS ${quoteIdentifier(name)}`)
        .join(', ');

    return `CREATE OR REPLACE TABLE ${quoteIdentifier(tableName)} AS
SELECT ${selectList}
FROM (VALUES ${valuesRows.join(', ')}) AS t(${columnTypes.map(({ name }) => quoteIdentifier(name)).join(', ')});`;
}

export function extractAggregateAliasMap(query: string): QueryAliasMap {
    const aliasMap: QueryAliasMap = {};
    if (typeof query !== 'string' || !query.trim()) {
        return aliasMap;
    }

    const aggregateRegex = /sum\s*\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)\s*(?:as\s+"?([A-Za-z_][A-Za-z0-9_]*)"?)?/gi;
    let match: RegExpExecArray | null;

    while ((match = aggregateRegex.exec(query)) !== null) {
        const sourceColumn = match[1];
        const alias = match[2] ?? sourceColumn;
        aliasMap[alias] = sourceColumn;
    }

    return aliasMap;
}