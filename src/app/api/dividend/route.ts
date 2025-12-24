import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
// Gemini removed as per user request

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Stock code is required' }, { status: 400 });
    }

    let dividendValue = 0;
    let source = 'IR Bank';
    let companyName = '';

    try {
        // IR Bank URL (e.g., https://irbank.net/7203/dividend)
        const url = `https://irbank.net/${code}/dividend`;

        // Fetch HTML
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 10000,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);
        const Encoding = require('encoding-japanese');
        const unicodeString = Encoding.convert(buffer, {
            to: 'UNICODE',
            type: 'string'
        });

        const $ = cheerio.load(unicodeString);

        // DEBUG: Log title
        const pageTitle = $('title').text();
        console.log(`[${code}] Fetched Title: "${pageTitle}"`);

        // Extract Company Name
        if (pageTitle) {
            const titleMatch = pageTitle.match(/^(.+)\([0-9]{4}\)/);
            if (titleMatch && titleMatch[1]) {
                companyName = titleMatch[1].trim();
            }
        }

        // Strategy 1: Meta Description
        const description = $('meta[name="description"]').attr('content') || '';
        let match = description.match(/予想配当は([0-9.]+(?:,[0-9]{3})*)円/);
        if (match && match[1]) {
            dividendValue = parseFloat(match[1].replace(/,/g, ''));
            console.log(`[${code}] Found via Meta 1:`, dividendValue);
        }

        if (!dividendValue) {
            match = description.match(/配当金は1株当たり([0-9.]+(?:,[0-9]{3})*)円/);
            if (match && match[1]) {
                dividendValue = parseFloat(match[1].replace(/,/g, ''));
                console.log(`[${code}] Found via Meta 2:`, dividendValue);
            }
        }

        // Strategy 2: Table Parsing
        if (!dividendValue) {
            $('table').each((index, table) => {
                let dividendColIndex = -1;
                let headers = $(table).find('th');
                if (headers.length === 0) {
                    headers = $(table).find('tr').first().find('td');
                }

                headers.each((idx, el) => {
                    const text = $(el).text().replace(/\s+/g, '');
                    if (text === '合計' || text.includes('配当金') || text === '1株配当') {
                        dividendColIndex = idx;
                    }
                });

                if (dividendColIndex !== -1) {
                    $(table).find('tr').each((rowIndex, row) => {
                        const cells = $(row).find('td');
                        if (cells.length === 0) return;

                        const firstCellText = cells.eq(0).text().trim();
                        const isYear = /[0-9]{4}年/.test(firstCellText);
                        const offset = isYear ? 0 : -1;
                        const rowText = $(row).text();

                        if (rowText.includes('予想') || rowText.includes('修正') || rowText.includes('(予)')) {
                            const targetIndex = dividendColIndex + offset;
                            if (targetIndex >= 0 && targetIndex < cells.length) {
                                const targetCell = cells.eq(targetIndex);
                                const cleanText = targetCell.text().replace(/[円, ]/g, '').trim();
                                const val = parseFloat(cleanText);

                                if (!isNaN(val) && val > 0) {
                                    dividendValue = val;
                                    console.log(`[${code}] Candidate dividend found: ${val}`);
                                }
                            }
                        }
                    });
                }
            });
        }

        // --- YAHOO FINANCE FALLBACK ---
        if ((!dividendValue || dividendValue === 0)) {
            try {
                // Delay to be polite (simple check to ensure we don't spam if multiple requests come in fast, though per-request this is just a 1s wait)
                // await new Promise(resolve => setTimeout(resolve, 1000));

                console.log(`[${code}] IR Bank failed. Trying Yahoo Finance...`);
                const yahooUrl = `https://finance.yahoo.co.jp/quote/${code}.T`;
                const yRes = await axios.get(yahooUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 8000
                });

                const $y = cheerio.load(yRes.data);

                // Approach: Yahoo Finance often puts data in 'dl > dt (label) / dd (value)' or similar lists.
                // We look for any element containing "1株配当" or "配当利回り" and find the nearby number.

                // 1. Try "1株配当" (DPS) first as it gives the exact Yen amount
                let foundY = false;
                $y('dt, span, th, td').each((_, el) => {
                    if (foundY) return;
                    const text = $y(el).text().trim();
                    if (text.includes('1株配当') && !text.includes('表示しません')) {
                        // Look for the value in siblings or next/parent constructs
                        // Yahoo structure varies (DataListItem etc). 
                        // Often: <span ...>1株配当</span> <span ...>57.00</span>

                        // Try Next Sibling
                        let next = $y(el).next();
                        // Try Parent's Next Sibling (common in DL/DT/DD)
                        if (next.length === 0) next = $y(el).parent().next();

                        let valText = next.text().trim();
                        // If empty, search recursively in the 'next' element
                        if (!valText) valText = next.find('span').text().trim();

                        // Clean the text: it often looks like "44.00(2026/03)" or "---(2026/03)"
                        // We must remove the date part in parentheses.
                        const cleanText = valText.split(/[\(（]/)[0]; // Take part before '(' or '（'

                        // Remove '円', ',', ' '
                        const num = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
                        console.log(`[${code}] Yahoo Candidate DPS (Parsed): ${valText} -> ${cleanText} -> ${num}`);

                        // Sanity Check: Dividend shouldn't clearly be a date (e.g. 202503) or massive relative to typical JP stocks
                        // Most dividends are < 1000 yen (except some ETFs/Keyence). 
                        // If it matches YYYYMM pattern > 2000, probably a date leak if split failed?
                        // But strictly taking split[0] should solve the user's "202603" issue.

                        if (!isNaN(num) && num > 0 && num < 200000) {
                            dividendValue = num;
                            source = 'Yahoo Finance';
                            foundY = true;
                        }
                    }
                });

                // 2. If DPS missing, try "配当利回り" (Yield) and calculate from Price? 
                // Too risky (needs accurate price). Stick to DPS.

                if (!foundY) {
                    // Try a more generic strategy for tables (common in older Yahoo layouts or if A/B tested)
                    $y('td').each((_, el) => {
                        if (foundY) return;
                        if ($y(el).text().includes('1株配当')) {
                            const nextTd = $y(el).next('td');

                            // Strict parsing here too
                            const raw = nextTd.text().trim();
                            const clean = raw.split(/[\(（]/)[0];
                            const num = parseFloat(clean.replace(/[^0-9.]/g, ''));

                            if (!isNaN(num) && num > 0 && num < 200000) {
                                dividendValue = num;
                                source = 'Yahoo Finance';
                                foundY = true;
                            }
                        }
                    });
                }

            } catch (yErr: any) {
                console.error(`[${code}] Yahoo Fallback Error:`, yErr.message);
            }
        }

        return NextResponse.json({
            symbol: code,
            dividend: dividendValue || 0,
            companyName: companyName,
            source: source
        });

    } catch (error: any) {
        console.error(`Scraping error for code ${code}:`, error.message);
        return NextResponse.json({
            symbol: code,
            dividend: 0,
            error: error.message || 'Unknown error',
            companyName: companyName || ''
        }, { status: 200 });
    }
}
