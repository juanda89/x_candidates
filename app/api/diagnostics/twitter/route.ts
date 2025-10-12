import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io/v1';
const KEY = process.env.TWITTER_API_KEY || '';

const headerVariants: Array<Record<string, string>> = [
  { Authorization: `Bearer ${KEY}` },
  { 'X-API-Key': KEY },
  { 'X-API-KEY': KEY },
  { apikey: KEY },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || 'jack';
    const url = `${BASE}/user/profile?username=${encodeURIComponent(username)}`;

    const results: Array<{ header: Record<string, string>; status: number; body?: string }> = [];
    for (const h of headerVariants) {
      const res = await fetch(url, { headers: h });
      const text = await res.text().catch(() => '');
      results.push({ header: h, status: res.status, body: text.slice(0, 300) });
      if (res.ok) break;
    }
    return NextResponse.json({ base: BASE, tried: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 });
  }
}

