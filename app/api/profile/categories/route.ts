import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { GeminiClient } from '@/lib/gemini-client';

function normHandle(raw: string): string {
  const t = raw.trim();
  const m = t.match(/(?:https?:\/\/)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i);
  const h = m ? m[1] : t.replace(/^@/, '');
  return h.toLowerCase();
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  try {
    const url = new URL(req.url);
    const username = normHandle(url.searchParams.get('username') || '');
    if (!username) return NextResponse.json({ error: 'username requerido' }, { status: 400 });

    const { data: prof, error: e1 } = await supabase
      .from('profiles')
      .select('id, twitter_username')
      .ilike('twitter_username', username)
      .maybeSingle();
    if (e1) throw e1;
    if (!prof) return NextResponse.json({ error: 'perfil no encontrado' }, { status: 404 });

    const { data: cats, error: e2 } = await supabase
      .from('political_categories')
      .select('*')
      .eq('profile_id', prof.id)
      .order('category_name', { ascending: true });
    if (e2) throw e2;

    return NextResponse.json({ ok: true, profile_id: prof.id, username: prof.twitter_username, categories: cats || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  try {
    const url = new URL(req.url);
    const username = normHandle(url.searchParams.get('username') || '');
    const n = Math.min(Math.max(parseInt(url.searchParams.get('n') || '100', 10) || 100, 20), 300);
    if (!username) return NextResponse.json({ error: 'username requerido' }, { status: 400 });

    // Perfil
    const { data: prof, error: e1 } = await supabase
      .from('profiles')
      .select('id, twitter_username')
      .ilike('twitter_username', username)
      .maybeSingle();
    if (e1) throw e1;
    if (!prof) return NextResponse.json({ error: 'perfil no encontrado; ejecute /api/profile/analyze primero' }, { status: 404 });

    // Últimos N tweets
    const tw = await supabase
      .from('tweets')
      .select('id, tweet_id, text')
      .eq('profile_id', prof.id)
      .order('created_at_twitter', { ascending: false })
      .limit(n);
    if (tw.error) throw tw.error;
    const tweets = tw.data || [];
    if (tweets.length === 0) return NextResponse.json({ error: 'sin tweets; ejecute analyze primero' }, { status: 400 });

    const texts = tweets.map((t) => t.text || '');
    const gemini = new GeminiClient();
    let analysis = await gemini.analyzePoliticalPositions(texts);
    // Normalizar nombre de categorías y fusionar duplicados
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const norm = require('@/lib/gemini-client');
    if (norm && typeof norm.normalizeCategoriesOutput === 'function') {
      analysis = norm.normalizeCategoriesOutput(analysis);
    }
    const now = new Date().toISOString();

    // Respetar ediciones del usuario: no tocar categorías con is_user_modified=true
    const { data: existing } = await supabase
      .from('political_categories')
      .select('category_name, is_user_modified')
      .eq('profile_id', prof.id);
    const protectedNames = new Set((existing || []).filter((r) => r.is_user_modified).map((r) => r.category_name));

    const payload = (analysis.categories || []).filter((c) => !protectedNames.has(c.name)).map((c) => ({
      profile_id: prof.id,
      category_name: c.name,
      position_description: c.position,
      confidence_score: typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : null,
      evidence_tweet_ids: Array.isArray(c.evidence_indices)
        ? c.evidence_indices
            .map((i: number) => tweets[i]?.tweet_id)
            .filter((v: string | undefined) => typeof v === 'string')
        : [],
      is_user_modified: false,
      created_by: process.env.GEMINI_API_KEY ? 'llm' : 'heuristic',
      created_at: now,
      updated_at: now,
    }));

    if (payload.length > 0) {
      const up = await supabase
        .from('political_categories')
        .upsert(payload, { onConflict: 'profile_id,category_name' });
      if (up.error) throw up.error;
    }

    const { data: cats, error: e3 } = await supabase
      .from('political_categories')
      .select('*')
      .eq('profile_id', prof.id)
      .order('category_name');
    if (e3) throw e3;

    return NextResponse.json({ ok: true, saved: payload.length, skipped_modified: protectedNames.size, categories: cats || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 });
  }
}
