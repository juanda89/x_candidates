'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [lastUser, setLastUser] = useState<string | null>(null);
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
      setLastUser(String(data.username));
      router.push(`/analisis?username=${encodeURIComponent(data.username)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1 className="text-2xl font-semibold">Perfil</h1>
      <p className="text-sm text-[var(--muted)]">Ingresa una URL o @usuario de X/Twitter para analizar el perfil.</p>
      <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/usuario o @usuario"
          className="input flex-1"
        />
        <button disabled={loading} type="submit" className="btn">
          {loading ? 'Analizando…' : 'Analizar'}
        </button>
        <label className="text-xs text-[var(--muted)] flex items-center gap-2">
          <input type="checkbox" className="accent-[var(--accent)]" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
          Debug
        </label>
      </form>
      {error && <p className="text-red-400 mt-2">{error}</p>}

      {lastUser && (
        <div className="mt-4 flex gap-2">
          <a href={`/analisis?username=${encodeURIComponent(lastUser)}`} className="btn">Ver análisis</a>
          <a href={`/categorias?username=${encodeURIComponent(lastUser)}`} className="btn">Ver categorías</a>
          <a href={`/comparar`} className="btn">Ir a comparativo</a>
        </div>
      )}
    </main>
  );
}
