import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  try {
    const body = await req.json();
    const { username, profile_id, category_name, position_description, is_user_modified } = body || {};
    if (!category_name) return NextResponse.json({ error: 'category_name requerido' }, { status: 400 });

    let pid = profile_id as string | undefined;
    if (!pid && username) {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('twitter_username', String(username))
        .maybeSingle();
      if (error) throw error;
      if (!prof) return NextResponse.json({ error: 'perfil no encontrado' }, { status: 404 });
      pid = prof.id;
    }
    if (!pid) return NextResponse.json({ error: 'profile_id o username requerido' }, { status: 400 });

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof position_description === 'string') update.position_description = position_description;
    if (typeof is_user_modified === 'boolean') update.is_user_modified = is_user_modified;

    const { data, error: e1 } = await supabase
      .from('political_categories')
      .update(update)
      .eq('profile_id', pid)
      .eq('category_name', category_name)
      .select('*')
      .maybeSingle();
    if (e1) throw e1;

    return NextResponse.json({ ok: true, category: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 });
  }
}

