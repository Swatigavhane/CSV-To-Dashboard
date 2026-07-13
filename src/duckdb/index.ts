import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdbMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdbEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

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

type QueryRow = Record<string, unknown>;

let dbInitPromise: Promise<duckdb.AsyncDuckDB> | null = null;

function quoteIdentifier(name: string) {
    return `"${name.replace(/"/g, '""')}"`;
}

function quoteSqlString(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}

function normalizeTableName(tableName: string) {
    const trimmed = tableName.trim();
    if (!trimmed) {
        throw new Error('Table name cannot be empty');
    }
    return trimmed;
}

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

export async function registerJsonRowsAsTable(
    rows: Record<string, unknown>[],
    tableName = 'uploaded_csv',
) {
    const db = await getDuckDbInstance();
    const conn = await db.connect();
    const normalizedTableName = normalizeTableName(tableName);
    const virtualFileName = `${normalizedTableName}-${Date.now()}.json`;

    try {
        const jsonText = JSON.stringify(rows ?? []);
        const jsonBytes = new TextEncoder().encode(jsonText);
        await db.registerFileBuffer(virtualFileName, jsonBytes);

        await conn.query(
            `CREATE OR REPLACE TABLE ${quoteIdentifier(normalizedTableName)} AS
             SELECT *
             FROM read_json_auto(${quoteSqlString(virtualFileName)});`,
        );
    } finally {
        await conn.close();
    }
}

export async function executeDuckDbQuery(query: string): Promise<QueryRow[]> {
    const db = await getDuckDbInstance();
    const conn = await db.connect();

    try {
        const result = await conn.query(query);
        return result.toArray().map((row) => row.toJSON() as QueryRow);
    } finally {
        await conn.close();
    }
}
