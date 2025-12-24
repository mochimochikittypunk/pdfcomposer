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

        // Fetch HTML
        // Set User-Agent to avoid being blocked
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 10000, // 10s timeout
        });

        const html = response.data;
        const $ = cheerio.load(html);

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

        // Let's try to grab the content of the `meta[name="description"]` first, 
        // often it summarizes: "トヨタ自動車(7203)の配当金推移。2025年3月期の予想配当はXXX円..."
        const description = $('meta[name="description"]').attr('content');
        if (description) {
            // Regex to find "予想配当はXXX円"
            const match = description.match(/予想配当は([0-9.]+)円/);
            if (match && match[1]) {
                dividendValue = parseFloat(match[1]);
            }
        }

        if (!dividendValue || isNaN(dividendValue)) {
            // Fallback: Parse table
            // Find a cell with "予想" and get the value from the corresponding "1株配当" column.
            // This is complex to guess blind. 
            // Let's rely on the meta description usually being reliable for IR Bank.
            // If that fails, we return 0 or null to indicate "Unknown".

            // Another try: look for the most generic number in a "dividend" context.
            // (Omitted for safety to avoid garbage data)
        }

        // Also extract Company Name if possible
        let companyName = '';
        const title = $('title').text(); // "XXXX(code)の配当金..."
        if (title) {
            // Extract "XXXX" from "XXXX(code)..."
            const titleMatch = title.match(/^(.+)\([0-9]{4}\)/);
            if (titleMatch && titleMatch[1]) {
                companyName = titleMatch[1];
            }
        }

        return NextResponse.json({
            symbol: code,
            dividend: dividendValue, // 0 if not found
            companyName: companyName,
            source: 'IR Bank'
        });

    } catch (error) {
        console.error('Scraping error:', error);
        return NextResponse.json({ error: 'Failed to fetch dividend data' }, { status: 500 });
    }
}
