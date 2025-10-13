'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

type Category = {
  id: string;
  profile_id: string | null;
  category_name: string;
  position_description: string;
  confidence_score: number | null;
  evidence_tweet_ids: string[] | null;
  is_user_modified: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export default function CategoriasPage() {
  const params = useSearchParams();
  const username = params.get('username') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [n, setN] = useState(100);

  const fetchCategories = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/categories?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCats(data.categories || []);
      setProfileId(data.profile_id || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const onRegenerate = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/categories?username=${encodeURIComponent(username)}&n=${n}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCats(data.categories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (category_name: string, newText: string, newModified?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/categories/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, category_name, position_description: newText, is_user_modified: newModified ?? true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCats((prev) => prev.map((c) => (c.category_name === category_name ? { ...(c as any), ...data.category } : c)) as Category[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => cats, [cats]);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Categorías Políticas</h1>
      {username && <p className="text-sm text-[var(--muted)]">Usuario: <b>@{username}</b></p>}
      <div className="mt-3 flex items-center gap-3">
        <input type="number" min={20} max={300} value={n} onChange={(e) => setN(parseInt(e.target.value || '100', 10))} className="input w-24" />
        <button onClick={onRegenerate} disabled={loading} className="btn">Generar con LLM</button>
        <a href={`/analisis?username=${encodeURIComponent(username)}`} className="btn">Ver análisis</a>
      </div>
      {loading && <p className="text-sm text-[var(--muted)] mt-2">Cargando…</p>}
      {error && <p className="text-red-400 mt-2">{error}</p>}

      <div className="card mt-4 overflow-auto">
        <table className="w-full text-sm table-sticky">
          <thead>
            <tr className="text-left border-b border-white/5">
              <th className="py-2 px-3">Categoría</th>
              <th className="py-2 px-3">Posición</th>
              <th className="py-2 px-3 text-right">Conf.</th>
              <th className="py-2 px-3 text-right">Evidencia</th>
              <th className="py-2 px-3 text-center">Modificada</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CategoryRow key={c.id} cat={c} onSave={onSave} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && <p className="p-4">No hay categorías aún. Pulsa “Generar con LLM”.</p>}
      </div>
    </main>
  );
}

function CategoryRow({ cat, onSave }: { cat: Category; onSave: (name: string, text: string, modified?: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(cat.position_description || '');
  const [modified, setModified] = useState(!!cat.is_user_modified);

  const submit = () => {
    onSave(cat.category_name, text, modified);
    setEditing(false);
  };

  return (
    <tr style={{ borderTop: '1px solid #eee' }}>
      <td style={{ verticalAlign: 'top' }}>{cat.category_name}</td>
      <td style={{ verticalAlign: 'top' }}>
        {editing ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ width: '100%' }} />
        ) : (
          <div style={{ maxWidth: 600 }}>{cat.position_description}</div>
        )}
      </td>
      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{cat.confidence_score ?? '-'}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{cat.evidence_tweet_ids?.length ?? 0}</td>
      <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
        <input type="checkbox" checked={modified} onChange={(e) => setModified(e.target.checked)} />
      </td>
      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
        {!editing ? (
          <button onClick={() => setEditing(true)}>Editar</button>
        ) : (
          <>
            <button onClick={submit} style={{ marginRight: 8 }}>Guardar</button>
            <button onClick={() => { setEditing(false); setText(cat.position_description || ''); setModified(!!cat.is_user_modified); }}>Cancelar</button>
          </>
        )}
      </td>
    </tr>
  );
}
