import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic'; // Ensure not cached statically if not desired

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Stock code is required' }, { status: 400 });
    }

    try {
        // IR Bank URL (e.g., https://irbank.net/7203/dividend)
        const url = `https://irbank.net/${code}/dividend`;

        // Fetch HTML as arraybuffer to handle potential Shift-JIS
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 10000,
            responseType: 'arraybuffer' // Important for encoding
        });

        const buffer = Buffer.from(response.data);
        // Detect encoding (IR Bank is often UTF-8 now but good to be safe, or headers might define it)
        // Convert to Unicode string
        // We use encoding-japanese just like in csv-utils
        const Encoding = require('encoding-japanese');
        const unicodeString = Encoding.convert(buffer, {
            to: 'UNICODE',
            type: 'string'
        });

        const $ = cheerio.load(unicodeString);

        // DEBUG: Log title to verify we got the page and it's readable
        const pageTitle = $('title').text();
        console.log(`[${code}] Fetched Title: "${pageTitle}" (Length: ${unicodeString.length})`);

        // DEBUG: Dump headers of first table to see what we are dealing with
        const firstHeader = $('th').first().text();
        console.log(`[${code}] First TH: "${firstHeader}"`);

        // Extraction Logic
        // IR Bank structure for dividend is often in a table with ID "ts" or similar, or just a generic table.
        // We look for a table headers containing "配当金" or "1株配当".
        // Then finding the row for "予想" (Forecast).

        // NOTE: Creating a robust scraper is hard without live inspection. 
        // Based on typical IR Bank structure:
        // There is usually a section or table for "配当金の推移".
        // We try to find the numeric value for the *latest* forecast.

        let dividendValue = 0;

        // Strategy 1: Look for specific meta tags or JSON logic if available? (Usually no)
        // Strategy 2: Table parsing.

        // Let's try to find the cell that corresponds to "Forecast" of "Dividend".
        // IR Bank usually lists years in columns or rows.

        // Simplified heuristic: 
        // Find all cells with text that might be the dividend forecast (e.g. following "202x年x月(予)").
        // Or look for the main "配当金" table.

        // Let's look for `td` containing "予想" and `td` containing "配当".
        // Accessing `https://irbank.net/[code]/dividend`
        // Usually there is a table with class `cs` or similar.

        // Let's try a generic approach:
        // Find text "配当金の推移" or similar headers.
        // In that table, look for the most recent "予想" row/column.

        // As a fallback/default for this implementation, we will search for the string pattern:
        // "配当金" ... followed by some number representing the forecast.

        // Less flaky approach (Cheerio):
        // Find all 'td' elements. 
        // Check if one contains "予想" (Forecast) and is near "配当".

        // NOTE for User: This is a best-effort scraper.

        // DEBUG: Logging
        console.log(`[${code}] DEBUG Title (re-check): "${$('title').text()}"`);
        const metaDesc = $('meta[name="description"]').attr('content');
        console.log(`[${code}] DEBUG Meta: "${metaDesc}"`);

        // Check if we even found any tables
        const tableCount = $('table').length;
        console.log(`[${code}] DEBUG Tables found: ${tableCount}`);
        if (tableCount > 0) {
            console.log(`[${code}] DEBUG Table 0 text (snippet):`, $('table').first().text().substring(0, 100).replace(/\s+/g, ' '));
        }

        // Strategy 1: Meta Description
        // Typical format: "トヨタ自動車(7203)の配当金推移。2025年3月期の予想配当は100円..."
        // Or sometimes: "予想配当は100円(前期比+10円)..."
        const description = $('meta[name="description"]').attr('content') || '';
        console.log(`[${code}] Description:`, description);

        // Try standard regex
        let match = description.match(/予想配当は([0-9.]+(?:,[0-9]{3})*)円/);
        if (match && match[1]) {
            dividendValue = parseFloat(match[1].replace(/,/g, ''));
            console.log(`[${code}] Found via Meta 1:`, dividendValue);
        }

        // Try extracting from text like "配当金は1株当たりXXX円" if meta fails
        if (!dividendValue) {
            match = description.match(/配当金は1株当たり([0-9.]+(?:,[0-9]{3})*)円/);
            if (match && match[1]) {
                dividendValue = parseFloat(match[1].replace(/,/g, ''));
                console.log(`[${code}] Found via Meta 2:`, dividendValue);
            }
        }

        // Strategy 2: Table Parsing (Relaxed Strictness)
        // Strategy 2: Table Parsing (Smart Column Indexing)
        if (!dividendValue) {
            $('table').each((index, table) => {
                // Check headers to find the "Total" or "Dividend" column index
                let dividendColIndex = -1;

                // Headers might be in thead or first row
                let headers = $(table).find('th');
                if (headers.length === 0) {
                    headers = $(table).find('tr').first().find('td');
                }

                headers.each((idx, el) => {
                    const text = $(el).text().replace(/\s+/g, '');
                    // '合計' is common for Total Dividend
                    if (text === '合計' || text.includes('配当金') || text === '1株配当') {
                        dividendColIndex = idx;
                    }
                });

                if (dividendColIndex !== -1) {
                    $(table).find('tr').each((rowIndex, row) => {
                        const cells = $(row).find('td');
                        if (cells.length === 0) return;

                        const firstCellText = cells.eq(0).text().trim();
                        // Check if first cell is a Year (e.g. 2025年3月)
                        const isYear = /[0-9]{4}年/.test(firstCellText);

                        // If it's a year, standard indexing.
                        // If NOT a year (e.g. "予想", "修正", "実績"), likely rowspan on Year, so partial row.
                        // However, we need to be careful. IR Bank rows usually are: [Year, Type, ...].
                        // If Year is spanned, [Type, ...]. So shift is -1.
                        const offset = isYear ? 0 : -1;

                        // Row validation: must contain Forecast/Revision/Actual AND likely be valid data
                        const rowText = $(row).text();
                        if (rowText.includes('予想') || rowText.includes('修正') || rowText.includes('(予)')) {

                            const targetIndex = dividendColIndex + offset;
                            if (targetIndex >= 0 && targetIndex < cells.length) {
                                const targetCell = cells.eq(targetIndex);
                                const cellText = targetCell.text().trim();

                                // Remove '円', ',', ' '
                                const cleanText = cellText.replace(/[円, ]/g, '');
                                const val = parseFloat(cleanText);

                                if (!isNaN(val) && val > 0) {
                                    // We keep matching to find the *latest* (bottom-most) valid entry
                                    // But we prefer "Forecast" or "Revision" over "Actual" if both exist for same year?
                                    // Actually, iterating top-down, the bottom-most is usually the latest data.
                                    dividendValue = val;
                                    console.log(`[${code}] Candidate dividend found: ${val} (Row ${rowIndex}, Type: ${isYear ? 'Year' : 'Partial'})`);
                                }
                            }
                        }
                    });
                }
            });
        }

        // Also extract Company Name
        let companyName = '';
        const title = $('title').text();
        if (title) {
            const titleMatch = title.match(/^(.+)\([0-9]{4}\)/);
            if (titleMatch && titleMatch[1]) {
                companyName = titleMatch[1];
            }
        }

        return NextResponse.json({
            symbol: code,
            dividend: dividendValue || 0,
            companyName: companyName,
            source: 'IR Bank'
        });

    } catch (error: any) {
        console.error(`Scraping error for code ${code}:`, error.message);
        // Return 0 dividend instead of 500 error to allow frontend to proceed gracefully
        return NextResponse.json({
            symbol: code,
            dividend: 0,
            error: error.message || 'Unknown error',
            companyName: ''
        }, { status: 200 });
    }
}
