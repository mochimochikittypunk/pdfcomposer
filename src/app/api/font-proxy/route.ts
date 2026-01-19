
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';


export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Font URL is required' }, { status: 400 });
    }

    // Security check: only allow allowed domains
    const allowedDomains = ['raw.githubusercontent.com', 'fonts.gstatic.com'];
    try {
        const parsedUrl = new URL(url);
        if (!allowedDomains.includes(parsedUrl.hostname)) {
            return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
        });

        // Determine content type based on extension or default to font/ttf
        const contentType = url.endsWith('.otf') ? 'font/otf' : 'font/ttf';

        return new NextResponse(response.data, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error('Font fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch font' }, { status: 500 });
    }
}
