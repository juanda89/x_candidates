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
    <main>
      <h1 className="text-2xl font-semibold">Comparativo de Cuentas</h1>
      <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
        <input
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          placeholder="@user1, @user2 o URLs de X"
          className="input flex-1"
        />
        <input
          type="number"
          min={10}
          max={500}
          value={n}
          onChange={(e) => setN(parseInt(e.target.value || '100', 10))}
          title="Cantidad de tweets a considerar"
          className="input w-24"
        />
        <label className="text-xs text-[var(--muted)] flex items-center gap-2">
          <input type="checkbox" className="accent-[var(--accent)]" checked={autofill} onChange={(e) => setAutofill(e.target.checked)} />
          Auto-analizar faltantes
        </label>
        <button disabled={loading} type="submit" className="btn">
          {loading ? 'Comparando…' : 'Comparar'}
        </button>
      </form>
      {error && <p className="text-red-400 mt-2">{error}</p>}

      {results && (
        <div className="card mt-4 overflow-auto">
          <table className="w-full text-sm table-sticky">
            <thead>
              <tr className="text-left border-b border-white/5">
                <th className="py-2 px-3">Usuario</th>
                <th className="py-2 px-3 text-right">Reach</th>
                <th className="py-2 px-3 text-right">RT rate %</th>
                <th className="py-2 px-3 text-right">Comment rate %</th>
                <th className="py-2 px-3 text-right">Like rate %</th>
                <th className="py-2 px-3 text-right">Engagement %</th>
                <th className="py-2 px-3 text-right">Score promedio</th>
                <th className="py-2 px-3">Top 3</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.username} className="border-t border-white/5">
                  <td className="py-2 px-3">@{r.username} {r.status !== 'ok' && <em className="text-red-400">({r.status})</em>}</td>
                  <td className="py-2 px-3 text-right">{r.totals?.reach ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{r.rates?.retweet_rate ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{r.rates?.comment_rate ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{r.rates?.like_rate ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{r.rates?.engagement_rate ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{r.score_avg ?? '-'}</td>
                  <td className="py-2 px-3">
                    {r.top && r.top.length > 0 ? (
                      <ol className="m-0 pl-4 list-decimal">
                        {r.top.map((t) => (
                          <li key={t.tweet_id}>
                            <a href={t.url} target="_blank" rel="noreferrer" className="underline">
                              {t.text?.slice(0, 60) || t.tweet_id}
                            </a>{' '}
                            <span className="badge">{t.score?.toFixed(2)}</span>
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
