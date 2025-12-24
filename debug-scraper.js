
const axios = require('axios');
const cheerio = require('cheerio');
const Encoding = require('encoding-japanese');

async function testScrape(code) {
    console.log(`Testing scraper for code: ${code}`);
    const url = `https://irbank.net/${code}/dividend`;

    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 10000,
            responseType: 'arraybuffer'
        });

        console.log(`Status: ${response.status}`);
        const buffer = Buffer.from(response.data);
        const unicodeString = Encoding.convert(buffer, {
            to: 'UNICODE',
            type: 'string'
        });

        console.log(`HTML Length: ${unicodeString.length}`);
        const $ = cheerio.load(unicodeString);

        console.log(`Page Title: "${$('title').text()}"`);

        const tables = $('table');
        console.log(`Tables found: ${tables.length}`);

        tables.each((i, table) => {
            console.log(`--- Table ${i} ---`);
            const headers = $(table).find('th').map((_i, el) => $(el).text().replace(/\s+/g, '')).get();
            console.log(`Headers: ${headers.join(', ')}`);

            // Check all rows
            $(table).find('tr').each((ri, row) => {
                const cells = $(row).find('td').map((_i, el) => $(el).text().trim()).get();
                if (cells.length > 0) {
                    console.log(`Row ${ri}: ${cells.join(' | ')}`);
                }
            });
        });

    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Test with known stock
testScrape('8354');
