'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

export default function PerfilPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [kpis, setKpis] = useState<{ engagement?: number; retweet?: number; reply?: number; like?: number } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/analyze${debug ? '?debug=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error analizando el perfil');
      if (debug) {
        // Muestra información básica de debug en consola
        // Revisa Network tab para ver twitter_calls completos
        // eslint-disable-next-line no-console
        console.log('analyze debug', data.debug);
      }
      setUsername(String(data.username));
      await hydrate(String(data.username));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  async function hydrate(u: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id,twitter_username,display_name,profile_image_url,followers_count,tweet_count')
      .ilike('twitter_username', u)
      .maybeSingle();
    setProfile(prof || null);
    if (!prof) return;

    const { data: tw } = await supabase
      .from('tweets')
      .select('id')
      .eq('profile_id', prof.id)
      .order('created_at_twitter', { ascending: false })
      .limit(50);
    const ids = (tw || []).map((t) => t.id);
    if (ids.length) {
      const { data: an } = await supabase
        .from('tweet_analysis')
        .select('like_rate,retweet_rate,reply_rate,engagement_rate')
        .in('tweet_id', ids);
      const k = (an || []).length || 1;
      const sum = (key: keyof NonNullable<typeof an>[number]) => (an || []).reduce((acc, r) => acc + (r[key] || 0), 0);
      setKpis({
        like: Math.round((sum('like_rate') / k) * 100) / 100,
        retweet: Math.round((sum('retweet_rate') / k) * 100) / 100,
        reply: Math.round((sum('reply_rate') / k) * 100) / 100,
        engagement: Math.round((sum('engagement_rate') / k) * 100) / 100,
      });
    }

    const res = await fetch(`/api/profile/categories?username=${encodeURIComponent(u)}`);
    const json = await res.json();
    setCategories(json.categories || []);
  }

  const canShow = useMemo(() => !!profile, [profile]);

  return (
    <main>
      {/* Nav tabs */}
      <div className="mb-6 flex gap-3">
        <a href="/perfil" className="chip">View 1</a>
        <a href="/analisis" className="chip">View 2</a>
        <a href="/comparar" className="chip">View 3</a>
        {username && <a href={`/categorias?username=${encodeURIComponent(username)}`} className="chip">View 4</a>}
      </div>

      <div className="card-light p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: categories list */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Categorías políticas</h2>
            <div className="space-y-3">
              {categories.map((c) => (
                <div key={c.id} className="grid grid-cols-7 gap-2 items-start">
                  <div className="col-span-2"><span className="chip bg-black/5 border-black/10">{c.category_name}</span></div>
                  <div className="col-span-4 text-sm text-[var(--light-muted)]">{c.position_description}</div>
                  <div className="col-span-1 text-right">
                    <a href={`/categorias?username=${encodeURIComponent(username || '')}`} className="text-xs underline">editar</a>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-[var(--light-muted)]">No hay categorías aún.</p>
              )}
            </div>
          </div>

          {/* Right: avatar, input, stats */}
          <div>
            <div className="flex items-center gap-6">
              <div className="h-28 w-28 rounded-full bg-black/5 border border-[var(--light-border)] overflow-hidden">
                {profile?.profile_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profile_image_url} alt="avatar" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <form onSubmit={onSubmit} className="flex items-center gap-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://x.com/usuario o @usuario"
                    className="input-light flex-1"
                  />
                  <button disabled={loading} type="submit" className="btn-light">SET</button>
                  <label className="text-xs text-[var(--light-muted)] flex items-center gap-2">
                    <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> Debug
                  </label>
                </form>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </div>
            </div>

            <div className="mt-6 text-sm text-[var(--light-muted)] space-y-1">
              {profile && (
                <>
                  <div>followers: <b className="text-[var(--light-fg)]">{profile.followers_count ?? '-'}</b></div>
                  <div>tweets: <b className="text-[var(--light-fg)]">{profile.tweet_count ?? '-'}</b></div>
                </>
              )}
              {kpis && (
                <div>
                  KPIs: <span className="chip">eng {kpis.engagement ?? 0}%</span>{' '}
                  <span className="chip">rt {kpis.retweet ?? 0}%</span>{' '}
                  <span className="chip">cm {kpis.reply ?? 0}%</span>{' '}
                  <span className="chip">lk {kpis.like ?? 0}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
