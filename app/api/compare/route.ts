import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

function normHandle(raw: string): string {
  const t = raw.trim();
  const m = t.match(/(?:https?:\/\/)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i);
  const h = m ? m[1] : t.replace(/^@/, '');
  return h.toLowerCase();
}

type CompareItem = {
  username: string;
  profile_id?: string;
  status: 'ok' | 'missing' | 'error';
  error?: string;
  totals?: {
    reach: number;
    likes: number;
    retweets: number;
    replies: number;
    tweets_considered: number;
  };
  rates?: {
    retweet_rate: number; // %
    comment_rate: number; // %
    like_rate: number; // %
    engagement_rate: number; // %
  };
  score_avg?: number;
  top?: Array<{ tweet_id: string; url?: string; text?: string; score?: number; created_at?: string }>;
};

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  try {
    const url = new URL(req.url);
    const users = (url.searchParams.get('users') || '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normHandle);
    const uniqueUsers = Array.from(new Set(users));
    if (uniqueUsers.length === 0) {
      return NextResponse.json({ ok: false, error: 'Provide ?users=a,b or space-separated list' }, { status: 400 });
    }

    const n = Math.min(Math.max(parseInt(url.searchParams.get('n') || '100', 10) || 100, 10), 500);
    const autofill = url.searchParams.get('autofill') === '1' || url.searchParams.get('autofill') === 'true';

    const origin = `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`;

    const results: CompareItem[] = [];

    for (const u of uniqueUsers) {
      try {
        // Find profile (case-insensitive)
        let { data: prof, error: e1 } = await supabase
          .from('profiles')
          .select('id, twitter_username')
          .ilike('twitter_username', u)
          .maybeSingle();
        if (e1) throw e1;

        // Optionally populate by invoking the analyzer if missing
        if (!prof && autofill) {
          const r = await fetch(`${origin}/api/profile/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u }),
          });
          if (!r.ok) {
            const txt = await r.text().catch(() => '');
            results.push({ username: u, status: 'error', error: `analyze failed: ${r.status} ${txt.slice(0, 200)}` });
            continue;
          }
          // re-query profile
          const re = await supabase
            .from('profiles')
            .select('id, twitter_username')
            .ilike('twitter_username', u)
            .maybeSingle();
          prof = re.data || null;
        }

        if (!prof) {
          results.push({ username: u, status: 'missing' });
          continue;
        }

        // Pull latest N tweets for this profile
        const twRes = await supabase
          .from('tweets')
          .select('id, tweet_id, text, url, created_at_twitter')
          .eq('profile_id', prof.id)
          .order('created_at_twitter', { ascending: false })
          .limit(n);
        if (twRes.error) throw twRes.error;
        const tweets = twRes.data || [];
        const ids = tweets.map((t) => t.id);

        // If none, return zeros
        if (ids.length === 0) {
          results.push({
            username: prof.twitter_username,
            profile_id: prof.id,
            status: 'ok',
            totals: { reach: 0, likes: 0, retweets: 0, replies: 0, tweets_considered: 0 },
            rates: { retweet_rate: 0, comment_rate: 0, like_rate: 0, engagement_rate: 0 },
            score_avg: 0,
            top: [],
          });
          continue;
        }

        // Fetch analysis and scores in bulk
        const [anRes, scRes] = await Promise.all([
          supabase
            .from('tweet_analysis')
            .select('tweet_id, views_count, likes_count, retweets_count, replies_count, like_rate, retweet_rate, reply_rate, engagement_rate')
            .in('tweet_id', ids),
          supabase
            .from('virality_scores')
            .select('tweet_id, normalized_score')
            .in('tweet_id', ids),
        ]);
        if (anRes.error) throw anRes.error;
        if (scRes.error) throw scRes.error;

        const analyses = anRes.data || [];
        const scores = scRes.data || [];

        // Aggregate
        let views = 0,
          likes = 0,
          rts = 0,
          replies = 0,
          likeRateSum = 0,
          rtRateSum = 0,
          replyRateSum = 0,
          engageSum = 0;
        analyses.forEach((a) => {
          views += a.views_count || 0;
          likes += a.likes_count || 0;
          rts += a.retweets_count || 0;
          replies += a.replies_count || 0;
          likeRateSum += a.like_rate || 0;
          rtRateSum += a.retweet_rate || 0;
          replyRateSum += a.reply_rate || 0;
          engageSum += a.engagement_rate || 0;
        });
        const k = analyses.length || 1;
        const like_rate = Math.round((likeRateSum / k) * 100) / 100;
        const retweet_rate = Math.round((rtRateSum / k) * 100) / 100;
        const comment_rate = Math.round((replyRateSum / k) * 100) / 100;
        const engagement_rate = Math.round((engageSum / k) * 100) / 100;

        const scoreMap = new Map<string, number>();
        scores.forEach((s) => scoreMap.set(s.tweet_id, s.normalized_score || 0));
        const score_avg = scores.length
          ? Math.round((scores.reduce((acc, s) => acc + (s.normalized_score || 0), 0) / scores.length) * 100) / 100
          : 0;

        // Top 3 by normalized_score
        const enriched = tweets.map((t) => ({
          tweet_id: t.id,
          url: t.url,
          text: t.text,
          created_at: t.created_at_twitter,
          score: scoreMap.get(t.id) || 0,
        }));
        enriched.sort((a, b) => (b.score || 0) - (a.score || 0));
        const top = enriched.slice(0, 3);

        results.push({
          username: prof.twitter_username,
          profile_id: prof.id,
          status: 'ok',
          totals: {
            reach: views,
            likes,
            retweets: rts,
            replies,
            tweets_considered: analyses.length,
          },
          rates: { retweet_rate, comment_rate, like_rate, engagement_rate },
          score_avg,
          top,
        });
      } catch (e: any) {
        results.push({ username: u, status: 'error', error: e.message || 'unknown_error' });
      }
    }

    return NextResponse.json({ ok: true, n, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'internal_error' }, { status: 500 });
  }
}

