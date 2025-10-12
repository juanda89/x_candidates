import { NextRequest, NextResponse } from 'next/server';
import { TwitterAPIClient } from '@/lib/twitter-client';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const userName = url.searchParams.get('userName') || undefined;
    const includeReplies = url.searchParams.get('includeReplies') === 'true';
    const cursor = url.searchParams.get('cursor') || undefined;

    if (!userId && !userName) {
      return NextResponse.json({ error: 'Provide userId or userName' }, { status: 400 });
    }

    const client = new TwitterAPIClient();
    const resp = await client.getUserTweets(userId, userName, cursor, includeReplies);
    const tweets = Array.isArray((resp as any)?.tweets) ? (resp as any).tweets : [];

    let firstRepliesSample: any = null;
    if (tweets[0]?.id) {
      try {
        const r = await client.getTweetReplies(tweets[0].id, undefined, 10);
        firstRepliesSample = {
          count: Array.isArray((r as any)?.replies) ? (r as any).replies.length : 0,
          sample: Array.isArray((r as any)?.replies) ? (r as any).replies.slice(0, 1) : [],
        };
      } catch (e: any) {
        firstRepliesSample = { error: e.message };
      }
    }

    return NextResponse.json({
      ok: true,
      params: { userId, userName, includeReplies, cursor },
      counts: { tweets: tweets.length },
      sample: tweets.slice(0, 2),
      firstRepliesSample,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

