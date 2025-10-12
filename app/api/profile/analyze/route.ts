import { NextRequest, NextResponse } from 'next/server';
import { TwitterAPIClient } from '@/lib/twitter-client';
import { createAdminClient } from '@/lib/supabase-admin';

function extractUsername(raw: string): string {
  const trimmed = raw.trim();
  const m = trimmed.match(/(?:https?:\/\/)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i);
  return m ? m[1] : trimmed.replace(/^@/, '');
}

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username requerido' }, { status: 400 });
    }
    const handle = extractUsername(username);

    const twitter = new TwitterAPIClient();
    const supabase = createAdminClient();

    // 1) Obtener perfil
    const profile = await twitter.getUserProfile(handle);
    const p: any = profile as any;
    const base = p?.data?.user ?? p?.data ?? p?.user ?? p?.result ?? p;
    const normUserId = base?.id ?? base?.user_id ?? base?.id_str ?? base?.userId;
    const normUsername = base?.username ?? base?.userName ?? base?.screen_name ?? base?.handle ?? handle;
    const normName = base?.name ?? base?.display_name ?? null;
    const normImage = base?.profile_image_url ?? base?.profile_image ?? base?.profileImageUrl ?? null;
    const normBio = base?.description ?? base?.bio ?? null;
    const metrics = base?.public_metrics ?? {
      followers_count: base?.followers_count ?? base?.followersCount ?? null,
      following_count: base?.following_count ?? base?.followingCount ?? null,
      tweet_count: base?.tweet_count ?? base?.tweetsCount ?? null,
    };

    if (!normUserId) {
      return NextResponse.json({ error: 'No se pudo obtener el user_id del perfil' }, { status: 502 });
    }

    // 2) Upsert perfil
    const { data: upsertedProfile, error: upsertErr } = await supabase
      .from('profiles')
      .upsert({
        twitter_user_id: String(normUserId),
        twitter_username: String(normUsername),
        display_name: normName,
        profile_image_url: normImage,
        bio: normBio,
        followers_count: metrics?.followers_count ?? null,
        following_count: metrics?.following_count ?? null,
        tweet_count: metrics?.tweet_count ?? null,
        verified: base?.verified ?? base?.isVerified ?? null,
        created_at_twitter: (base?.created_at || base?.createdAt)
          ? new Date(base?.created_at || base?.createdAt).toISOString()
          : null,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'twitter_user_id' })
      .select('*')
      .single();
    if (upsertErr) throw upsertErr;

    // 3) Obtener tweets (100)
    const tweetsResp = await twitter.getUserTweets(profile.id, 100, profile.username);
    // twitterapi.io may return tweets array under different keys
    // @ts-ignore
    const tweetList: any[] = tweetsResp?.data || tweetsResp?.tweets || tweetsResp?.items || [];

    // Map y upsert tweets
    const tweetRows = tweetList.map((t) => {
      const pm = t.public_metrics || {} as any;
      const views = pm.impression_count ?? pm.impressions ?? pm.view_count ?? 0;
      const likes = pm.like_count ?? 0;
      const rts = pm.retweet_count ?? 0;
      const replies = pm.reply_count ?? 0;
      return {
        profile_id: upsertedProfile.id,
        tweet_id: t.id,
        text: t.text,
        created_at_twitter: new Date(t.created_at || t.createdAt || t.time || Date.now()).toISOString(),
        views_count: views,
        likes_count: likes,
        retweets_count: rts,
        replies_count: replies,
        quotes_count: pm.quote_count ?? pm.quotes_count ?? 0,
        url: `https://x.com/${profile.username}/status/${t.id}`,
        is_reply: false,
        is_retweet: false,
        language: null as string | null,
      };
    });

    // Upsert por lote en chunks (Supabase limita tamaño de payload)
    const chunkSize = 100;
    const allTweetIds: string[] = [];
    for (let i = 0; i < tweetRows.length; i += chunkSize) {
      const chunk = tweetRows.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('tweets')
        .upsert(chunk, { onConflict: 'tweet_id' })
        .select('id,tweet_id');
      if (error) throw error;
      data?.forEach((r) => allTweetIds.push(r.id));
    }

    // Leer tweets de este perfil para obtener sus UUIDs
    const { data: savedTweets, error: fetchTweetsErr } = await supabase
      .from('tweets')
      .select('id,tweet_id,views_count,likes_count,retweets_count,replies_count')
      .eq('profile_id', upsertedProfile.id)
      .order('created_at_twitter', { ascending: false })
      .limit(100);
    if (fetchTweetsErr) throw fetchTweetsErr;

    // 4) Analítica derivada + virality score
    const analyses = [] as any[];
    const scores = [] as any[];
    const rawScores: number[] = [];
    for (const t of savedTweets || []) {
      const views = t.views_count ?? 0;
      const likes = t.likes_count ?? 0;
      const rts = t.retweets_count ?? 0;
      const replies = t.replies_count ?? 0;
      const likeRate = views > 0 ? (likes / views) * 100 : 0;
      const retweetRate = views > 0 ? (rts / views) * 100 : 0;
      const replyRate = views > 0 ? (replies / views) * 100 : 0;
      const engagement = likeRate + retweetRate + replyRate;
      const raw = retweetRate * 0.4 + replyRate * 0.4 + likeRate * 0.2;
      rawScores.push(raw);

      analyses.push({
        tweet_id: t.id,
        views_count: views,
        likes_count: likes,
        retweets_count: rts,
        replies_count: replies,
        like_rate: round2(likeRate),
        retweet_rate: round2(retweetRate),
        reply_rate: round2(replyRate),
        engagement_rate: round2(engagement),
        total_comments: replies,
        positive_comments: 0,
        negative_comments: 0,
        neutral_comments: replies,
        negative_reasons: {},
      });

      scores.push({
        tweet_id: t.id,
        profile_id: upsertedProfile.id,
        views_count: views,
        likes_count: likes,
        retweets_count: rts,
        replies_count: replies,
        comment_rate: round2(replyRate),
        retweet_rate: round2(retweetRate),
        like_rate: round2(likeRate),
        raw_score: round2(raw),
        normalized_score: 0,
      });
    }

    const avgRaw = rawScores.length ? rawScores.reduce((a, b) => a + b, 0) / rawScores.length : 0;
    if (avgRaw > 0) {
      scores.forEach((s) => (s.normalized_score = round2(s.raw_score / avgRaw)));
    }

    // Upserts
    for (let i = 0; i < analyses.length; i += chunkSize) {
      const chunk = analyses.slice(i, i + chunkSize);
      const { error } = await supabase.from('tweet_analysis').upsert(chunk, { onConflict: 'tweet_id' });
      if (error) throw error;
    }
    for (let i = 0; i < scores.length; i += chunkSize) {
      const chunk = scores.slice(i, i + chunkSize);
      const { error } = await supabase.from('virality_scores').upsert(chunk, { onConflict: 'tweet_id' });
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      username: profile.username,
      profile_id: upsertedProfile.id,
      tweets_processed: savedTweets?.length ?? 0,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 });
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
