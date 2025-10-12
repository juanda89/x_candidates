import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io/v1';
const KEY = process.env.TWITTER_API_KEY || '';

const headerVariants: Record<string, string>[] = KEY
  ? [
      { 'X-API-Key': KEY },
      { Authorization: `Bearer ${KEY}` },
    ]
  : [];

const candidates: Array<{ path: string; mode: 'query'|'path'; key?: string }> = [
  { path: '/twitter/user/info', mode: 'query', key: 'userName' },
  { path: '/twitter/user/info', mode: 'query', key: 'username' },
  { path: '/twitter/user/info', mode: 'query', key: 'screen_name' },
  { path: '/twitter/user/profile', mode: 'query', key: 'username' },
  { path: '/user/profile', mode: 'query', key: 'username' },
  { path: '/users/by/username', mode: 'path' },
  { path: '/twitter/users/by/username', mode: 'path' },
  { path: '/users/profile', mode: 'query', key: 'username' },
  // Replies path candidates
  { path: '/twitter/tweet/replies', mode: 'query', key: 'tweet_id' },
  { path: '/twitter/tweet/replies', mode: 'query', key: 'tweetId' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || 'jack';
    const results: any[] = [];
    for (const h of headerVariants) {
      for (const c of candidates) {
        const url = c.mode === 'path'
          ? `${BASE}${c.path}/${encodeURIComponent(username)}`
          : `${BASE}${c.path}?${encodeURIComponent(c.key || 'username')}=${encodeURIComponent(username)}`;
        const res = await fetch(url, { headers: h });
        const body = await res.text().catch(()=> '');
        results.push({ header: Object.keys(h)[0], path: c.path, mode: c.mode, status: res.status, sample: body.slice(0, 300) });
        if (res.ok) return NextResponse.json({ ok: true, url, header: Object.keys(h)[0], status: res.status, sample: body.slice(0, 300) });
      }
    }
    return NextResponse.json({ ok: false, base: BASE, tried: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 });
  }
}
