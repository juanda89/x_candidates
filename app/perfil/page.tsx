'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
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
      router.push(`/analisis?username=${encodeURIComponent(data.username)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Perfil</h1>
      <p>Ingresa una URL o @usuario de X/Twitter para analizar el perfil.</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/usuario o @usuario"
          style={{ flex: 1, padding: 8 }}
        />
        <button disabled={loading} type="submit" style={{ padding: '8px 16px' }}>
          {loading ? 'Analizando…' : 'Analizar'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
          Debug
        </label>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  );
}
