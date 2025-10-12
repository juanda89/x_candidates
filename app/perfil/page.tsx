'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/profile/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error analizando el perfil');
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
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/usuario o @usuario"
          style={{ flex: 1, padding: 8 }}
        />
        <button disabled={loading} type="submit" style={{ padding: '8px 16px' }}>
          {loading ? 'Analizando…' : 'Analizar'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  );
}
