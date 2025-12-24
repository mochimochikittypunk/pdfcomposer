import Papa from 'papaparse';
import Encoding from 'encoding-japanese';

export interface SbiPortfolioRow {
    code: string;
    name: string;
    count: number;
    avgPrice: number;
    currentPrice: number;
}

/**
 * Reads a file as an ArrayBuffer, detects encoding (expecting Shift-JIS),
 * decodes to string, and parses CSV.
 */
export async function loadSbiCsv(file: File): Promise<SbiPortfolioRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const buffer = e.target?.result as ArrayBuffer;
                if (!buffer) {
                    reject('Expected ArrayBuffer');
                    return;
                }

                // Detect and Convert Encoding (Shift-JIS -> Unicode)
                const uint8Array = new Uint8Array(buffer);
                const unicodeString = Encoding.convert(uint8Array, {
                    to: 'UNICODE',
                    from: 'SJIS', // SBI CSV is Shift-JIS
                    type: 'string',
                });

                // Parse CSV
                Papa.parse(unicodeString, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const data = results.data as Record<string, any>[];
                        const portfolio: SbiPortfolioRow[] = [];

                        // Mapping Logic
                        // SBI Header Examples: "コード", "銘柄", "保有株数", "取得単価", "現在値"
                        // Note: SBI CSV sometimes has extra header lines or footer text. 
                        // PapaParse might treat them as keys if 'header: true'.
                        // Simple validation: check if 'コード' exists in row.

                        for (const row of data) {
                            // Basic check to see if this is a valid data row
                            if (!row['コード'] || !row['銘柄']) continue;

                            // Helper to clean numbers (remove commas, handle localized formats if any)
                            const parseNum = (val: string) => {
                                if (typeof val !== 'string') return 0;
                                return parseFloat(val.replace(/,/g, ''));
                            };

                            portfolio.push({
                                code: row['コード'],
                                name: row['銘柄'],
                                count: parseNum(row['保有株数'] || '0'),
                                avgPrice: parseNum(row['取得単価'] || '0'),
                                currentPrice: parseNum(row['現在値'] || '0'),
                            });
                        }

                        resolve(portfolio);
                    },
                    error: (err: any) => {
                        reject(err);
                    }
                });

            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

export function generatePortfolioCsv(data: SbiPortfolioRow[]): string {
    // Generate new CSV content
    // Format: 銘柄コード, 銘柄名称, 株数, 取得価格, 現在値
    const headers = ['銘柄コード', '銘柄名称', '株数', '取得価格', '現在値'];

    // Map data to array of arrays for simple encoding
    const rows = data.map(item => [
        item.code,
        item.name,
        item.count,
        item.avgPrice,
        item.currentPrice
    ]);

    const csv = Papa.unparse({
        fields: headers,
        data: rows
    });

    return csv;
}
