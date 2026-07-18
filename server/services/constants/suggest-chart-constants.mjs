export const SUGGEST_CHART_MODEL = 'Qwen/Qwen2.5-Coder-7B-Instruct';
export const SUGGEST_CHART_PROMPT_TEMPLATE = 'suggest-chart/system.v1.txt';
export const SUGGEST_CHART_TYPES = "'Bar Chart', 'Line Chart', 'Pie Chart', 'Area Chart'";
export const SUGGEST_CHART_TABLE_NAME = 'csv_data';

export const SUGGEST_CHART_RETRY_INSTRUCTION =
    'Regenerate the full answer with VERY SIMPLE query only. Use pattern: SELECT <dimension>, <aggregate>(<measure>) AS <alias> FROM csv_data GROUP BY 1 ORDER BY 2 DESC LIMIT 100. Ensure x_axis/value_axis are valid output column names from each chart query. If a query has AS alias, use that alias exactly. Do not use backticks. Do not use cumulative_agg(...). Do not use date_trunc, strftime, CAST, CASE, COALESCE, HAVING, UNION, CTE, window functions, or nested SQL.';

export const SQL_BACKTICKS_REGEX = /`+/g;
export const PROMPT_SCHEMA_SPLIT_REGEX = /\n\s*Schema\s*:/i;
export const PROMPT_SCHEMA_OBJECT_REGEX = /Schema\s*:\s*(\{[\s\S]*\})\s*$/i;

export const TIME_GRAIN_REGEX = {
    month: /\b(monthly|month\s*wise|by\s*month|month over month|mom)\b/i,
    week: /\b(weekly|week\s*wise|by\s*week|wow|week over week)\b/i,
    year: /\b(yearly|annual|year\s*wise|by\s*year|yoy|year over year)\b/i,
    day: /\b(daily|day\s*wise|by\s*day)\b/i,
};

export const DATE_LIKE_COLUMN_REGEX = /date|time/i;
export const COUNT_FUNCTION_REGEX = /\bcount\s*\(/i;
export const AVG_FUNCTION_REGEX = /\bavg\s*\(/i;

export const SELECT_FROM_REGEX = /\bselect\b([\s\S]*?)\bfrom\b/i;
export const SELECT_ALIAS_REGEX = /\bas\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/i;
export const SELECT_PLAIN_COLUMN_REGEX = /(?:^|\.)"?([A-Za-z_][A-Za-z0-9_]*)"?\s*$/;

export const UNSUPPORTED_DUCKDB_REGEX = /\bcumulative_agg\s*\(/i;
export const COMPLEX_QUERY_REGEX = /\b(coalesce|case|when|over|partition|having|union|intersect|except|with)\b/i;

export const DEFAULT_AGGREGATE = 'SUM';
export const COUNT_AGGREGATE = 'COUNT';
export const AVG_AGGREGATE = 'AVG';
export const NUMBER_TYPE = 'number';
export const DATE_TYPE = 'date';
export const COUNT_ALIAS = 'count';
export const ORDER_BY_TIME = 'ORDER BY 1 ASC';
export const ORDER_BY_VALUE = 'ORDER BY 2 DESC';
export const QUERY_LIMIT = 100;