'use client';
import { useState } from 'react';

type CompareResult = {
  username: string;
  profile_id?: string;
  status: 'ok' | 'missing' | 'error';
  error?: string;
  totals?: { reach: number; likes: number; retweets: number; replies: number; tweets_considered: number };
  rates?: { retweet_rate: number; comment_rate: number; like_rate: number; engagement_rate: number };
  score_avg?: number;
  top?: Array<{ tweet_id: string; url?: string; text?: string; score?: number; created_at?: string }>;
};

export default function CompararPage() {
  const [users, setUsers] = useState('');
  const [n, setN] = useState(100);
  const [autofill, setAutofill] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompareResult[] | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const params = new URLSearchParams({ users, n: String(n), autofill: autofill ? '1' : '0' });
      const res = await fetch(`/api/compare?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error comparando');
      setResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Comparativo de Cuentas</h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <input
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          placeholder="@user1, @user2 o URLs de X"
          style={{ flex: 1, padding: 8 }}
        />
        <input
          type="number"
          min={10}
          max={500}
          value={n}
          onChange={(e) => setN(parseInt(e.target.value || '100', 10))}
          title="Cantidad de tweets a considerar"
          style={{ width: 90, padding: 8 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={autofill} onChange={(e) => setAutofill(e.target.checked)} />
          Auto-analizar faltantes
        </label>
        <button disabled={loading} type="submit" style={{ padding: '8px 16px' }}>
          {loading ? 'Comparando…' : 'Comparar'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {results && (
        <div style={{ marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Usuario</th>
                <th>Reach</th>
                <th>RT rate %</th>
                <th>Comment rate %</th>
                <th>Like rate %</th>
                <th>Engagement %</th>
                <th>Score promedio</th>
                <th>Top 3</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.username} style={{ borderTop: '1px solid #eee' }}>
                  <td>@{r.username} {r.status !== 'ok' && <em style={{ color: '#c00' }}>({r.status})</em>}</td>
                  <td style={{ textAlign: 'right' }}>{r.totals?.reach ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{r.rates?.retweet_rate ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{r.rates?.comment_rate ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{r.rates?.like_rate ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{r.rates?.engagement_rate ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{r.score_avg ?? '-'}</td>
                  <td>
                    {r.top && r.top.length > 0 ? (
                      <ol style={{ margin: 0, paddingLeft: 16 }}>
                        {r.top.map((t) => (
                          <li key={t.tweet_id}>
                            <a href={t.url} target="_blank" rel="noreferrer">
                              {t.text?.slice(0, 60) || t.tweet_id}
                            </a>{' '}
                            <small>({t.score?.toFixed(2)})</small>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

