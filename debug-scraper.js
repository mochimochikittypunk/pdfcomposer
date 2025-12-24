const axios = require('axios');
const cheerio = require('cheerio');
const encoding = require('encoding-japanese');

async function testScrape(code) {
    const url = `https://irbank.net/${code}/dividend`;
    console.log(`\n--- Testing ${code} ---`);

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const buffer = Buffer.from(response.data);
        const unicodeString = encoding.convert(buffer, {
            to: 'UNICODE',
            from: 'AUTO',
            type: 'string'
        });

        const $ = cheerio.load(unicodeString);

        // Log title to confirm page load
        console.log('Title:', $('title').text().trim());

        // Check for "予想配当" (Forecast)
        let dividend = 0;

        // 1. Try finding the table with dividends
        // Loop through all 'th' to find "配当" column
        $('table').each((tableIdx, table) => {
            const headers = [];
            let dividendColIndex = -1;

            // Analyze headers
            $(table).find('tr').first().find('th').each((i, th) => {
                const text = $(th).text().trim();
                headers.push(text);
                if (text.includes('配当') && (text.includes('金') || text.includes('1株') || text.includes('円'))) {
                    dividendColIndex = i;
                }
            });

            if (dividendColIndex !== -1) {
                console.log(`Found candidate table at index ${tableIdx}. Headers:`, headers);
                console.log(`Dividend Column Index: ${dividendColIndex}`);

                // Scan rows
                $(table).find('tr').each((rowIdx, row) => {
                    const firstCell = $(row).find('td, th').first().text().trim();

                    // Logic to handle rowspan offset
                    // If first cell doesn't look like a year (e.g. contains "年" or "20.."), 
                    // and we are NOT in header, it might be a split row from rowspan.
                    // Simple heuristic: check if first cell is "予想" or "修正"

                    if (firstCell.includes('予想') || firstCell.includes('修正')) {
                        // If the first cell IS the data label, the actual standard indices might be shifted left by 1
                        // because the "Year" cell is in the previous row (rowspan).
                        // Standard row: [Year] [Label] [Val1] [Val2] ...
                        // Split row:    [Label] [Val1] [Val2] ...

                        // BUT, we need to know if it IS a split row.

                        let targetIndex = dividendColIndex;

                        // Check if this row has fewer cells than headers?
                        const cells = $(row).find('td');
                        if (cells.length < headers.length) {
                            targetIndex = dividendColIndex - 1;
                        }

                        const val = $(cells[targetIndex]).text().trim();
                        console.log(`  Row ${rowIdx} [${firstCell}]: Found value '${val}' at index ${targetIndex}`);

                        // Clean value
                        const num = parseFloat(val.replace(/,/g, '').replace('円', ''));
                        if (!isNaN(num)) {
                            dividend = num; // Keep updating to found latest
                        }
                    }
                });
            }
        });

        console.log(`=> Extracted Dividend for ${code}: ${dividend}`);

    } catch (e) {
        console.error(`Failed to fetch ${code}:`, e.message);
    }
}

async function runTests() {
    await testScrape('8604'); // Nomura
    await testScrape('8601'); // Daiwa
    await testScrape('1660'); // MXS High Yield J-REIT
}

runTests();
