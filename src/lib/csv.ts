import Papa from 'papaparse';

export async function parseCsvFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(results.errors);
          return;
        }
        resolve(results.data);
      },
      error: (error) => reject(error),
    });
  });
}
