import { createClient } from '@supabase/supabase-js';
import { Env } from './env';
import type { Database } from '@/types/supabase';

export function createAdminClient() {
  return createClient<Database>(Env.SUPABASE_URL(), Env.SUPABASE_SERVICE_ROLE_KEY(), {
    auth: { persistSession: false },
  });
}
