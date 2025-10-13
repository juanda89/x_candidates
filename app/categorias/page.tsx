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
    <main style={{ padding: 24 }}>
      <h1>Categorías Políticas</h1>
      {username && <p>Usuario: <b>@{username}</b></p>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <input type="number" min={20} max={300} value={n} onChange={(e) => setN(parseInt(e.target.value || '100', 10))} style={{ width: 100, padding: 6 }} />
        <button onClick={onRegenerate} disabled={loading} style={{ padding: '6px 12px' }}>Generar con LLM</button>
      </div>
      {loading && <p>Cargando…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Categoría</th>
            <th style={{ textAlign: 'left' }}>Posición</th>
            <th>Conf.</th>
            <th>Evidencia</th>
            <th>Modificada</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <CategoryRow key={c.id} cat={c} onSave={onSave} />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !loading && <p>No hay categorías aún. Pulsa “Generar con LLM”.</p>}
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

