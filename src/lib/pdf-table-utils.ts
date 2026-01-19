// PDF.js library will be loaded dynamically on client side only
// This avoids SSR issues with DOMMatrix not being defined

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjsLib() {
    if (typeof window === 'undefined') {
        throw new Error('PDF.js can only be used in browser environment');
    }

    if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    return pdfjsLib;
}

export interface TextItem {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MergedTextItem {
    text: string;
    x: number;
    y: number;
    width: number;
}

export interface TableRow {
    y: number;
    cells: MergedTextItem[];
}

export interface ExtractedPage {
    pageNumber: number;
    width: number;
    height: number;
    rows: TableRow[];
}

/**
 * Extract text items with position from a PDF page
 */
async function extractTextItems(page: any): Promise<TextItem[]> {
    const textContent = await page.getTextContent();
    const items: TextItem[] = [];

    for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
            items.push({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width || 0,
                height: item.height || 10,
            });
        }
    }

    return items;
}

/**
 * Merge adjacent characters into words/phrases
 * Characters within X_THRESHOLD pixels are merged
 */
function mergeAdjacentChars(items: TextItem[], xThreshold: number = 12): MergedTextItem[] {
    if (items.length === 0) return [];

    // Sort by Y (descending - top to bottom in PDF coords), then X
    const sorted = [...items].sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.x - b.x;
    });

    const merged: MergedTextItem[] = [];
    let current: MergedTextItem | null = null;

    for (const item of sorted) {
        if (!current) {
            current = { text: item.text, x: item.x, y: item.y, width: item.width };
            continue;
        }

        // Check if item should be merged with current
        const sameRow = Math.abs(current.y - item.y) < 5;
        const adjacent = item.x - (current.x + current.width) < xThreshold;

        if (sameRow && adjacent) {
            // Merge: append text and extend width
            current.text += item.text;
            current.width = (item.x + item.width) - current.x;
        } else {
            // Push current and start new
            merged.push(current);
            current = { text: item.text, x: item.x, y: item.y, width: item.width };
        }
    }

    if (current) {
        merged.push(current);
    }

    return merged;
}

/**
 * Group merged items into rows by Y coordinate
 */
function groupIntoRows(items: MergedTextItem[], yThreshold: number = 8): TableRow[] {
    if (items.length === 0) return [];

    // Group by approximate Y
    const rowMap = new Map<number, MergedTextItem[]>();

    for (const item of items) {
        // Round Y to nearest threshold
        const rowY = Math.round(item.y / yThreshold) * yThreshold;

        if (!rowMap.has(rowY)) {
            rowMap.set(rowY, []);
        }
        rowMap.get(rowY)!.push(item);
    }

    // Convert to array and sort by Y (descending - top first)
    const rows: TableRow[] = [];
    const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
        const cells = rowMap.get(y)!.sort((a, b) => a.x - b.x);
        rows.push({ y, cells });
    }

    return rows;
}

/**
 * Extract and process a single PDF page
 */
async function extractPage(
    pdfDoc: any,
    pageNum: number
): Promise<ExtractedPage> {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    const textItems = await extractTextItems(page);
    const mergedItems = mergeAdjacentChars(textItems);
    const rows = groupIntoRows(mergedItems);

    return {
        pageNumber: pageNum,
        width: viewport.width,
        height: viewport.height,
        rows,
    };
}

/**
 * Main function: Load PDF and extract all pages
 */
export async function extractPdfToTable(file: File): Promise<ExtractedPage[]> {
    const pdfjs = await getPdfjsLib();
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const pages: ExtractedPage[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pageData = await extractPage(pdfDoc, i);
        pages.push(pageData);
    }

    return pages;
}

/**
 * Convert extracted pages to 2D string array for CSV export
 */
export function pagesToCsvData(pages: ExtractedPage[]): string[][] {
    const allRows: string[][] = [];

    for (const page of pages) {
        // Add page separator
        if (pages.length > 1) {
            allRows.push([`--- Page ${page.pageNumber} ---`]);
        }

        for (const row of page.rows) {
            const rowData = row.cells.map(cell => cell.text);
            allRows.push(rowData);
        }
    }

    return allRows;
}

/**
 * Convert 2D array to CSV string with BOM for Excel/Numbers compatibility
 */
export function toCsvWithBom(data: string[][]): string {
    const BOM = '\uFEFF';

    const csvContent = data.map(row =>
        row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = cell.replace(/"/g, '""');
            if (/[,"\n\r]/.test(cell)) {
                return `"${escaped}"`;
            }
            return escaped;
        }).join(',')
    ).join('\r\n');

    return BOM + csvContent;
}

/**
 * Download CSV file
 */
export function downloadCsv(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
