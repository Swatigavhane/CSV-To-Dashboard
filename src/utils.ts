import { chartTypeMapping } from '@/constants';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ItransformData } from './context/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isCsvFile(file?: File): boolean {
  return Boolean(
    file &&
    (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')),
  );
}

export function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0);
}

export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

export function isValidObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0);
}

function parseNumericStrings(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(parseNumericStrings);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = parseNumericStrings(val);
      return acc;
    }, {} as Record<string, unknown>);
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    !isNaN(Number(value))
  ) {
    return Number(value);
  }

  return value;
}

export function transformLLMResponse(data: ItransformData[]) {
  if (Array.isArray(data) && isNonEmptyArray(data)) {
    return data.map((item) => {
      if (isValidObject(item)) {
        const transformedItem = parseNumericStrings(item) as ItransformData;

        return {
          ...transformedItem,
          chart_type:
            chartTypeMapping[transformedItem.chart_type as string] ??
            transformedItem.chart_type,
        };
      }

      return item;
    });
  }

  return data;
}

