export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const Env = {
  SUPABASE_URL: () => requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  TWITTER_API_KEY: () => requireEnv('TWITTER_API_KEY'),
  TWITTER_API_BASE_URL: () => process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io/v1',
  GEMINI_API_KEY: () => process.env.GEMINI_API_KEY || '',
};

