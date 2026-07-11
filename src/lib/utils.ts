import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isCsvFile(file?: File): boolean {
  return Boolean(
    file &&
      (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')),
  );
}
