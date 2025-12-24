import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { portfolio } = body;

        if (!portfolio || !Array.isArray(portfolio)) {
            return NextResponse.json({ error: 'Invalid portfolio data' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                error: 'API Key not configured',
                details: 'Please set GOOGLE_GEMINI_API_KEY in .env.local'
            }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use the alias 'gemini-flash-latest' to ensure we get a valid model for this key
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Prepare context for Gemini
        // We limit to top 20 holdings to keep prompt concise
        const holdingsSummary = portfolio.slice(0, 20).map((item: any) => {
            return `- ${item.name} (${item.code}): Ratio ${item.ratio.toFixed(1)}%, Yield ${item.dps > 0 && item.currentPrice > 0 ? ((item.dps / item.currentPrice) * 100).toFixed(2) : 'Unknown'}%`;
        }).join('\n');

        const prompt = `
あなたは日本株に精通したプロのファイナンシャルアドバイザーです。
以下の日本株ポートフォリオを分析してください:

${holdingsSummary}

タスク:
1. このポートフォリオの「重心（時価総額規模）」を推定してください（大型株寄り、中型株寄り、小型株寄りなど）。
2. その規模感に基づき、バランスを維持しつつ配当利回りを向上させるための、ポートフォリオに含まれていない**別の**日本株を3つ推奨してください。
    - 直近の配当利回りが高い銘柄（目安3.5%以上）を選んでください。
3. 各推奨銘柄について、銘柄コード、銘柄名、予想配当利回り（概算）、および簡潔な推奨理由（1文）を提供してください。

**重要: すべて日本語で回答してください。**

以下のJSON形式のみを返してください（Markdownや余計なテキストは含めないでください）:
{
  "marketCapAnalysis": "ポートフォリオの規模感バイアスの簡単な分析（例: 銀行や商社などの大型株が中心で安定感がある...）",
  "recommendations": [
    {
      "code": "1234",
      "name": "銘柄名",
      "yield": "3.8%",
      "reason": "通信事業による安定したキャッシュフローが見込めるため..."
    }
  ]
}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown code blocks if present
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const data = JSON.parse(jsonString);
            return NextResponse.json(data);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText);
            return NextResponse.json({
                error: 'Failed to parse AI response',
                raw: responseText
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('AI Recommendation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
