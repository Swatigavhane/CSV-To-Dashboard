export type SchemaType = 'string' | 'number' | 'date' | 'boolean';

const datePatterns = [
  /^\d{4}-\d{2}-\d{2}$/, // ISO date
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/, // ISO datetime
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
  /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
];

function isValidDateString(value: string) {
  const normalized = value.trim();
  const patternMatches = datePatterns.some((pattern) => pattern.test(normalized));
  if (!patternMatches) {
    return false;
  }

  const parsed = new Date(normalized);
  return !Number.isNaN(parsed.getTime());
}

function isNumericString(value: string) {
  const normalized = value.trim();
  if (normalized === '') {
    return false;
  }

  return /^-?\d+(\.\d+)?$/.test(normalized);
}

function isBooleanString(value: string) {
  return /^(true|false)$/i.test(value.trim());
}

export function inferSchemaType(value: unknown): SchemaType {
  if (value === null || value === undefined) {
    return 'string';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return 'number';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 'string';
    }

    if (isBooleanString(trimmed)) {
      return 'boolean';
    }

    if (isValidDateString(trimmed)) {
      return 'date';
    }

    if (isNumericString(trimmed)) {
      return 'number';
    }

    return 'string';
  }

  return 'string';
}

export type JsonRecord = Record<string, unknown>;

export function createSchemaFromJson(
  records: JsonRecord[] | null | undefined,
): Record<string, SchemaType> | null {
  if (!records || records.length === 0) {
    return null;
  }

  const recordTemp = records[0];
  const schema: Record<string, SchemaType> = {};

  for (const key of Object.keys(recordTemp)) {
    schema[key] = inferSchemaType(recordTemp[key]);
  }

  return schema;
}
