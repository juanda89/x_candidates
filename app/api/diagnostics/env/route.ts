import { NextResponse } from 'next/server';

export async function GET() {
  const present = (k: string) => (process.env[k] ? true : false);
  return NextResponse.json({
    ok: true,
    runtime: {
      node: process.versions.node,
      platform: process.platform,
    },
    env_present: {
      TWITTER_API_KEY: present('TWITTER_API_KEY'),
      TWITTER_API_BASE_URL: present('TWITTER_API_BASE_URL'),
      TWITTER_API_AUTH_STYLE: process.env.TWITTER_API_AUTH_STYLE || null,
      TWITTER_API_PROFILE_PATH: process.env.TWITTER_API_PROFILE_PATH || null,
      TWITTER_API_TWEETS_PATH: process.env.TWITTER_API_TWEETS_PATH || null,
      TWITTER_API_REPLIES_PATH: process.env.TWITTER_API_REPLIES_PATH || null,
      NEXT_PUBLIC_SUPABASE_URL: present('NEXT_PUBLIC_SUPABASE_URL'),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: present('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: present('SUPABASE_SERVICE_ROLE_KEY'),
    },
    now: new Date().toISOString(),
  });
}

