'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    const run = async () => {
      if (!username) return;
      setLoading(true);
      setError(null);
      try {
        // 1) Get profile id by username
        const { data: prof, error: e1 } = await supabase
          .from('profiles')
          .select('id')
          .eq('twitter_username', username)
          .maybeSingle();
        if (e1) throw e1;
        if (!prof) throw new Error('Perfil no encontrado. Corre el análisis primero.');

        // 2) Fetch tweets
        const { data: tw, error: e2 } = await supabase
          .from('tweets')
          .select('id,tweet_id,text,created_at_twitter,views_count,likes_count,retweets_count,replies_count')
          .eq('profile_id', prof.id)
          .order('created_at_twitter', { ascending: false })
          .limit(100);
        if (e2) throw e2;
        setTweets(tw || []);

        const tweetUUIDs = (tw || []).map((t) => t.id);
        if (tweetUUIDs.length) {
          // 3) Analysis
          const { data: an, error: e3 } = await supabase
            .from('tweet_analysis')
            .select('tweet_id,like_rate,retweet_rate,reply_rate,engagement_rate')
            .in('tweet_id', tweetUUIDs);
          if (e3) throw e3;
          const mapA: Record<string, AnalysisRow> = {};
          (an || []).forEach((r) => { if (r.tweet_id) mapA[r.tweet_id] = r; });
          setAnalysis(mapA);

          // 4) Scores
          const { data: sc, error: e4 } = await supabase
            .from('virality_scores')
            .select('tweet_id,normalized_score,comment_rate,retweet_rate,like_rate')
            .in('tweet_id', tweetUUIDs);
          if (e4) throw e4;
          const mapS: Record<string, ScoreRow> = {};
          (sc || []).forEach((r) => { if (r.tweet_id) mapS[r.tweet_id] = r; });
          setScores(mapS);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [username]);

  const rows = useMemo(() => {
    return tweets.map((t) => ({
      ...t,
      a: analysis[t.id],
      s: scores[t.id],
    }));
  }, [tweets, analysis, scores]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Análisis de Tweets</h1>
      {username && <p>Usuario: <b>@{username}</b></p>}
      {loading && <p>Cargando…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No hay datos. Ve a Perfil y ejecuta un análisis.</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Fecha</th>
            <th style={{ textAlign: 'left' }}>Texto</th>
            <th>Views</th>
            <th>Likes</th>
            <th>RTs</th>
            <th>Replies</th>
            <th>Eng%</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{new Date(r.created_at_twitter).toLocaleString()}</td>
              <td style={{ maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.text}</td>
              <td style={{ textAlign: 'right' }}>{r.views_count ?? 0}</td>
              <td style={{ textAlign: 'right' }}>{r.likes_count ?? 0}</td>
              <td style={{ textAlign: 'right' }}>{r.retweets_count ?? 0}</td>
              <td style={{ textAlign: 'right' }}>{r.replies_count ?? 0}</td>
              <td style={{ textAlign: 'right' }}>{r.a?.engagement_rate ?? '-'}</td>
              <td style={{ textAlign: 'right' }}>{r.s?.normalized_score ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
