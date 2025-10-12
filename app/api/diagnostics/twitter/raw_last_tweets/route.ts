import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const base = (process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io').replace(/\/$/, '');
    const path = process.env.TWITTER_API_TWEETS_PATH || '/twitter/user/last_tweets';
    const key = process.env.TWITTER_API_KEY || '';

    const urlIn = new URL(req.url);
    const userId = urlIn.searchParams.get('userId') || undefined;
    const userName = urlIn.searchParams.get('userName') || undefined;
    const includeReplies = urlIn.searchParams.get('includeReplies') === 'true' ? 'true' : 'false';

    if (!userId && !userName) {
      return NextResponse.json({ error: 'Provide userId or userName' }, { status: 400 });
    }

    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (userName) params.set('userName', userName);
    params.set('includeReplies', includeReplies);

    const url = `${base}${path}?${params.toString()}`;
    const res = await fetch(url, { headers: { 'X-API-Key': key } });
    const text = await res.text();

    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      url,
      base,
      path,
      usedHeader: 'X-API-Key',
      bodySample: text.slice(0, 1200),
      parsedKeys: parsed ? Object.keys(parsed) : null,
      tweetsCount: parsed?.tweets ? (Array.isArray(parsed.tweets) ? parsed.tweets.length : -1) : null,
    }, { status: res.ok ? 200 : res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

