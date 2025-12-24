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

                // Parse CSV without assuming first row is header
                Papa.parse(unicodeString, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const rawData = results.data as string[][];
                        const portfolio: SbiPortfolioRow[] = [];

                        // 1. Find the header row
                        // Look for a row that contains "コード" and "銘柄"
                        let headerRowIndex = -1;
                        let colMap: Record<string, number> = {};

                        for (let i = 0; i < rawData.length; i++) {
                            const row = rawData[i];
                            // Check if this row looks like the header
                            // We look for 'コード' and '銘柄' as key indicators
                            const codeIndex = row.findIndex(cell => cell.includes('コード'));
                            const nameIndex = row.findIndex(cell => cell.includes('銘柄'));

                            if (codeIndex !== -1 && nameIndex !== -1) {
                                headerRowIndex = i;

                                // Create a column map for robust extraction
                                // We iterate the header row to find indices of required columns
                                row.forEach((cell, idx) => {
                                    if (cell.includes('コード')) colMap['code'] = idx;
                                    else if (cell.includes('銘柄')) colMap['name'] = idx;
                                    else if (cell.includes('保有株数') || cell.includes('数量')) colMap['count'] = idx;
                                    else if (cell.includes('取得単価')) colMap['avgPrice'] = idx;
                                    else if (cell.includes('現在値')) colMap['currentPrice'] = idx;
                                });
                                break;
                            }
                        }

                        if (headerRowIndex === -1) {
                            // Fallback: Log raw data for debugging context (visible in console)
                            console.warn("Could not find header row. Raw first 3 rows:", rawData.slice(0, 3));
                            // Try standard hardcoded indices if we can't find header? 
                            // No, it's safer to return empty and let error handler catch it.
                            resolve([]);
                            return;
                        }

                        // 2. Extract Data
                        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                            const row = rawData[i];

                            // Start processing checks
                            // We need at least code and name to be valid
                            if (colMap['code'] === undefined || !row[colMap['code']]) continue;

                            // Helper
                            const cleanNum = (val: string | undefined): number => {
                                if (!val) return 0;
                                // Remove commas, quotes, spaces
                                const cleaned = val.replace(/[,"]/g, '').trim();
                                const num = parseFloat(cleaned);
                                return isNaN(num) ? 0 : num;
                            };

                            portfolio.push({
                                code: row[colMap['code']] || '',
                                name: row[colMap['name']] || '',
                                count: cleanNum(row[colMap['count']]),
                                avgPrice: cleanNum(row[colMap['avgPrice']]),
                                currentPrice: cleanNum(row[colMap['currentPrice']]),
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

/**
 * Reads the formatted "portfolio.csv" (UTF-8, specific headers).
 */
export async function loadPortfolioCsv(file: File): Promise<SbiPortfolioRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) {
                    reject('Empty file');
                    return;
                }

                // Check for minimal headers to accept this format
                // If it doesn't look like our targeted CSV, reject so we can fall back to loadSbiCsv
                // Common tokens: "コード", "銘柄", "保有"
                if (!text.includes('コード') && !text.includes('銘柄')) {
                    resolve([]); // Not a recognizable format, let fallback handle it
                    return;
                }

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    delimitersToGuess: [',', '\t', '|', ';', ' '], // Aggressive guessing
                    transformHeader: (h) => h.trim(), // Ensure headers are trimmed
                    complete: (results) => {
                        const data = results.data as Record<string, any>[];
                        const portfolio: SbiPortfolioRow[] = [];

                        // DEBUG: Log first row to help diagnose header issues
                        if (data.length > 0) {
                            console.log('Parsed CSV First Row keys:', Object.keys(data[0]));
                            console.log('Parsed CSV First Row sample:', data[0]);
                        }

                        for (const row of data) {
                            // Try to find Code
                            const code = row['銘柄コード'] || row['コード'] || row['code'] || row['Symbol'];
                            if (!code) continue;

                            // Try to find Name
                            const name = row['銘柄名称'] || row['銘柄名'] || row['銘柄'] || row['Name'] || '';

                            const parseNum = (keys: string[]) => {
                                let val: any = undefined;
                                for (const key of keys) {
                                    if (row[key] !== undefined) {
                                        val = row[key];
                                        break;
                                    }
                                }
                                if (!val) return 0;
                                if (typeof val === 'number') return val;
                                // Remove everything that is NOT a digit, dot, or minus sign
                                // This handles '¥1,234' -> '1234', '1,234円' -> '1234'
                                const str = String(val).replace(/[^0-9.-]/g, '');
                                const num = parseFloat(str);
                                return isNaN(num) ? 0 : num;
                            };

                            // Support various headers for formatted CSV
                            const count = parseNum(['株数', '保有株数', '保有数', '数量', 'Quantity', 'Shares']);
                            const avgPrice = parseNum(['取得価格', '取得単価', '平均取得単価', 'Price', 'Avg Price']);
                            const currentPrice = parseNum(['現在値', '時価', '現在価格', 'Current Value', 'Close']);

                            portfolio.push({
                                code: String(code).trim(),
                                name: String(name).trim(),
                                count,
                                avgPrice,
                                currentPrice,
                            });
                        }
                        resolve(portfolio);
                    },
                    error: (err: any) => reject(err)
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
}
