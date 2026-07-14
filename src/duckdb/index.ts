import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdbMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdbEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import {
    buildDuckDbCreateTableSql,
    coerceDuckDbRows,
    extractAggregateAliasMap,
    normalizeTableName,
    quoteIdentifier,
    quoteSqlString,
    type QueryRow,
} from './utils';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdbMvpWasm,
        mainWorker: duckdbMvpWorker,
    },
    eh: {
        mainModule: duckdbEhWasm,
        mainWorker: duckdbEhWorker,
    },
};

let dbInitPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function getDuckDbInstance() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
            const worker = new Worker(bundle.mainWorker!);
            const logger = new duckdb.ConsoleLogger();
            const db = new duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            return db;
        })();
    }

    return dbInitPromise;
}

function normalizeQueryResultAliases(rows: QueryRow[], query: string) {
    const aliasMap = extractAggregateAliasMap(query);
    if (!Object.keys(aliasMap).length) {
        return rows;
    }

    const caseInsensitiveAliasMap = Object.entries(aliasMap).reduce((acc, [alias, sourceColumn]) => {
        acc[alias.toLowerCase()] = sourceColumn;
        return acc;
    }, {} as Record<string, string>);

    return rows.map((row) => {
        const normalizedRow: QueryRow = {};

        for (const [key, value] of Object.entries(row)) {
            const nextKey = caseInsensitiveAliasMap[key.toLowerCase()] ?? key;
            normalizedRow[nextKey] = value;
        }

        return normalizedRow;
    });
}

export async function registerCsvFileAsTable(file: File, tableName = 'uploaded_csv') {
    const db = await getDuckDbInstance();
    const conn = await db.connect();
    const normalizedTableName = normalizeTableName(tableName);
    const virtualFileName = `${normalizedTableName}-${Date.now()}.csv`;

    try {
        const csvText = await file.text();
        const csvBytes = new TextEncoder().encode(csvText);
        await db.registerFileBuffer(virtualFileName, csvBytes);

        await conn.query(
            `CREATE OR REPLACE TABLE ${quoteIdentifier(normalizedTableName)} AS
       SELECT *
       FROM read_csv_auto(${quoteSqlString(virtualFileName)}, HEADER = TRUE);`,
        );
    } finally {
        await conn.close();
    }
}

export async function executeDuckDbQuery(
    rows: Record<string, unknown>[],
    tableName = 'uploaded_csv',
    query = ""
) {
    const normalizedTableName = normalizeTableName(tableName);

    if (query.trim() === "") {
        query = `SELECT * FROM ${quoteIdentifier(normalizedTableName)}`;
    }

    const db = await getDuckDbInstance();
    const conn = await db.connect();

    try {
        const normalizedRows = coerceDuckDbRows(rows);
        const createTableSql = buildDuckDbCreateTableSql(normalizedRows, normalizedTableName);
        await conn.query(createTableSql);

        const updatedQuery = query.replace(/\b(csv_data|your_table_name|table_name)\b/gi, quoteIdentifier(normalizedTableName));
        console.log('Executing DuckDB query:', updatedQuery);
        const queryResult = await conn.query(updatedQuery);

        const queryResultArr = queryResult.toArray().map((row) => row.toJSON() as QueryRow);
        const aliasNormalizedRows = normalizeQueryResultAliases(queryResultArr, updatedQuery);
        return aliasNormalizedRows;
    } catch (error) {
        console.error('Error executing DuckDB query:', error);
        throw error;
    } finally {
        await conn.close();
    }
}

