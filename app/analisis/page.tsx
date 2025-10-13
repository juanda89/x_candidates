'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

type TweetRow = {
  id: string;
  tweet_id: string;
  text: string;
  created_at_twitter: string;
  views_count: number | null;
  likes_count: number | null;
  retweets_count: number | null;
  replies_count: number | null;
};

type AnalysisRow = {
  tweet_id: string | null;
  like_rate: number | null;
  retweet_rate: number | null;
  reply_rate: number | null;
  engagement_rate: number | null;
};

type ScoreRow = {
  tweet_id: string | null;
  normalized_score: number | null;
  comment_rate: number | null;
  retweet_rate: number | null;
  like_rate: number | null;
};

function AnalisisInner() {
  const params = useSearchParams();
  const username = params.get('username') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tweets, setTweets] = useState<TweetRow[]>([]);
  const [analysis, setAnalysis] = useState<Record<string, AnalysisRow>>({});
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 30;

  useEffect(() => {
    // reset when username changes
    setTweets([]); setAnalysis({}); setScores({}); setHasMore(true); setPage(0);
  }, [username]);

  useEffect(() => {
    const run = async () => {
      if (!username || !hasMore) return;
      setLoading(true);
      setError(null);
      try {
        const { data: prof, error: e1 } = await supabase
          .from('profiles')
          .select('id')
          .ilike('twitter_username', username)
          .maybeSingle();
        if (e1) throw e1;
        if (!prof) throw new Error('Perfil no encontrado. Corre el análisis primero.');

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data: tw, error: e2 } = await supabase
          .from('tweets')
          .select('id,tweet_id,text,created_at_twitter,views_count,likes_count,retweets_count,replies_count')
          .eq('profile_id', prof.id)
          .order('created_at_twitter', { ascending: false })
          .range(from, to);
        if (e2) throw e2;
        const newTweets = tw || [];
        setTweets((prev) => [...prev, ...newTweets]);
        if (newTweets.length < PAGE_SIZE) setHasMore(false);

        const tweetUUIDs = newTweets.map((t) => t.id);
        if (tweetUUIDs.length) {
          const [{ data: an }, { data: sc }] = await Promise.all([
            supabase
              .from('tweet_analysis')
              .select('tweet_id,like_rate,retweet_rate,reply_rate,engagement_rate')
              .in('tweet_id', tweetUUIDs),
            supabase
              .from('virality_scores')
              .select('tweet_id,normalized_score,comment_rate,retweet_rate,like_rate')
              .in('tweet_id', tweetUUIDs),
          ]);
          setAnalysis((prev) => {
            const map = { ...prev } as Record<string, AnalysisRow>;
            (an || []).forEach((r) => { if (r.tweet_id) map[r.tweet_id] = r; });
            return map;
          });
          setScores((prev) => {
            const map = { ...prev } as Record<string, ScoreRow>;
            (sc || []).forEach((r) => { if (r.tweet_id) map[r.tweet_id] = r; });
            return map;
          });
        }
      } catch (err: any) {
        setError(err.message);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [username, page]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setPage((p) => p + 1);
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelRef.current]);

  const rows = useMemo(() => {
    return tweets.map((t) => ({
      ...t,
      a: analysis[t.id],
      s: scores[t.id],
    }));
  }, [tweets, analysis, scores]);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Análisis de Tweets</h1>
      {username && <p className="text-sm text-[var(--muted)]">Usuario: <b>@{username}</b></p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No hay datos. Ve a Perfil y ejecuta un análisis.</p>}

      <div className="card mt-4 overflow-auto">
        <table className="w-full text-sm table-sticky">
          <thead>
            <tr className="text-left border-b border-white/5">
              <th className="py-2 px-3">Fecha</th>
              <th className="py-2 px-3">Texto</th>
              <th className="py-2 px-3 text-right">Views</th>
              <th className="py-2 px-3 text-right">Likes</th>
              <th className="py-2 px-3 text-right">RTs</th>
              <th className="py-2 px-3 text-right">Replies</th>
              <th className="py-2 px-3 text-right">Eng%</th>
              <th className="py-2 px-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2 px-3 whitespace-nowrap">{new Date(r.created_at_twitter).toLocaleString()}</td>
                <td className="py-2 px-3 max-w-[40rem] truncate">{r.text}</td>
                <td className="py-2 px-3 text-right">{r.views_count ?? 0}</td>
                <td className="py-2 px-3 text-right">{r.likes_count ?? 0}</td>
                <td className="py-2 px-3 text-right">{r.retweets_count ?? 0}</td>
                <td className="py-2 px-3 text-right">{r.replies_count ?? 0}</td>
                <td className="py-2 px-3 text-right">{r.a?.engagement_rate ?? '-'}</td>
                <td className="py-2 px-3 text-right">{r.s?.normalized_score ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div ref={sentinelRef} className="h-10" />
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="ml-2 text-sm text-[var(--muted)]">Cargando…</span>
          </div>
        )}
        {!hasMore && rows.length > 0 && (
          <div className="text-center py-4 text-xs text-[var(--muted)]">Fin de la lista</div>
        )}
      </div>
    </main>
  );
}

export default function AnalisisPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Cargando análisis…</main>}>
      <AnalisisInner />
    </Suspense>
  );
}
