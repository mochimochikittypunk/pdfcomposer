const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testFallback(code, name) {
    const apiKey = "AIzaSyCg9Rl9mFcGEFXhiwZ9STMqtZGpLVsVu04";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    console.log(`\n--- Testing ${code} (${name}) ---`);

    const prompt = `
You are a financial data assistant.
I need the **Annual Dividend Forecast** (or Trailing 12-Month Distribution) in **YEN (¥)** for:
Code: ${code}
Name: ${name || 'Unknown'}

Instructions:
1. **Identify the Security Type**:
   - If it is a **Stock** (e.g. 8604, 8601), provide the **Latest Annual Dividend Forecast** (Fiscal Year 2025 or 2024).
     - If forecast is undecided, provide the **Last Full Year Actual** dividend.
     - *Sanity Check*: For most Japanese large caps (Nomura, Daiwa, etc.), dividend is usually between 10 JPY and 200 JPY. If you are suggesting >500 JPY or <1 JPY, verify if it is correct.
   - If it is an **ETF/REIT** (e.g. 1660, 1489), provide the **Sum of Distributions over the last 12 months** (Trailing 12M) in Yen per unit.
     - *Note*: High Yield J-REIT ETFs often distribute 100-5000 JPY per unit annually depending on price.

2. **Strict Output Format**:
   - Return **ONLY the numeric value** (e.g. 57.0, 56.0, 1200).
   - Do NOT output share price.
   - Do NOT output yield percentage (e.g. do not output 4.0 for 4%).
   - Do NOT include text, currency symbols, or explanations.
   - If completely unknown, return 0.
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("Raw Response:", text);

        const cleanVal = parseFloat(text.replace(/[^0-9.]/g, ''));
        console.log("Parsed Value:", cleanVal);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

async function run() {
    await testFallback('8604', '野村ホールディングス');
    await testFallback('8601', '大和証券グループ本社');
    await testFallback('1660', 'MAXIS 高利回りJリート上場投信');
}

run();
