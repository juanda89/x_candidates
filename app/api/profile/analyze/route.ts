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
    // Según la especificación recibida, la forma es { data: { ...usuario } }
    const base = p?.data ?? p;
    const normUserId = String(base?.id ?? '');
    const normUsername = String(base?.userName ?? handle);
    const normName = base?.name ?? null;
    const normImage = base?.profilePicture ?? null;
    const normBio = base?.description ?? base?.profile_bio?.description ?? null;
    const metrics = {
      followers_count: base?.followers ?? null,
      following_count: base?.following ?? null,
      tweet_count: base?.statusesCount ?? null,
    };

    if (!normUserId) {
      return NextResponse.json({ error: 'No se pudo obtener el user_id del perfil' }, { status: 502 });
    }

    // 2) Upsert perfil
    const { data: upsertedProfile, error: upsertErr } = await supabase
      .from('profiles')
      .upsert({
        twitter_user_id: normUserId,
        twitter_username: normUsername,
        display_name: normName,
        profile_image_url: normImage,
        bio: normBio,
        followers_count: metrics?.followers_count ?? null,
        following_count: metrics?.following_count ?? null,
        tweet_count: metrics?.tweet_count ?? null,
        verified: base?.isBlueVerified ?? null,
        created_at_twitter: (base?.createdAt)
          ? new Date(base?.createdAt).toISOString()
          : null,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'twitter_user_id' })
      .select('*')
      .single();
    if (upsertErr) throw upsertErr;

    // 3) Obtener tweets (100)
    const tweetsResp = await twitter.getUserTweets(normUserId, normUsername, undefined, false);
    // twitterapi.io returns { tweets: [...] } for last_tweets
    // but keep fallbacks for safety
    // @ts-ignore
    const tweetList: any[] = tweetsResp?.tweets || tweetsResp?.data || tweetsResp?.items || [];

    // Map y upsert tweets
    const tweetRows = tweetList.map((t) => {
      const views = t.viewCount ?? t.impression_count ?? t.impressions ?? t.view_count ?? 0;
      const likes = t.likeCount ?? t.likes ?? 0;
      const rts = t.retweetCount ?? t.retweets ?? 0;
      const replies = t.replyCount ?? t.replies ?? 0;
      return {
        profile_id: upsertedProfile.id,
        tweet_id: t.id,
        text: t.text,
        created_at_twitter: new Date(t.createdAt || t.created_at || t.time || Date.now()).toISOString(),
        views_count: views,
        likes_count: likes,
        retweets_count: rts,
        replies_count: replies,
        quotes_count: t.quoteCount ?? 0,
        url: t.url || `https://x.com/${normUsername}/status/${t.id}`,
        is_reply: t.isReply ?? false,
        is_retweet: false,
        language: (t.lang ?? null) as string | null,
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
