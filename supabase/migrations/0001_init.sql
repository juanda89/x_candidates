-- Initial schema for X/Twitter analysis platform
-- Extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  twitter_username text unique not null,
  twitter_user_id text unique not null,
  display_name text,
  profile_image_url text,
  bio text,
  followers_count integer,
  following_count integer,
  tweet_count integer,
  verified boolean default false,
  created_at_twitter timestamptz,
  last_synced timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (twitter_username);
create index if not exists idx_profiles_user_id on public.profiles (twitter_user_id);

-- Tweets
create table if not exists public.tweets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  tweet_id text unique not null,
  text text not null,
  created_at_twitter timestamptz not null,
  views_count integer default 0,
  likes_count integer default 0,
  retweets_count integer default 0,
  replies_count integer default 0,
  quotes_count integer default 0,
  url text,
  is_reply boolean default false,
  is_retweet boolean default false,
  language varchar(10),
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tweets_profile_id on public.tweets (profile_id);
create index if not exists idx_tweets_tweet_id on public.tweets (tweet_id);
create index if not exists idx_tweets_created_at on public.tweets (created_at_twitter);
create index if not exists idx_tweets_embedding on public.tweets using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Political categories
create table if not exists public.political_categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  category_name text not null,
  position_description text not null,
  confidence_score numeric(3,2),
  evidence_tweet_ids text[],
  is_user_modified boolean default false,
  created_by text default 'llm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, category_name)
);

create index if not exists idx_political_categories_profile on public.political_categories (profile_id);

-- Tweet analysis
create table if not exists public.tweet_analysis (
  id uuid primary key default gen_random_uuid(),
  tweet_id uuid references public.tweets(id) on delete cascade unique,
  views_count integer,
  likes_count integer,
  retweets_count integer,
  replies_count integer,
  engagement_rate numeric(5,2),
  like_rate numeric(5,2),
  retweet_rate numeric(5,2),
  reply_rate numeric(5,2),
  total_comments integer default 0,
  positive_comments integer default 0,
  negative_comments integer default 0,
  neutral_comments integer default 0,
  negative_reasons jsonb,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_tweet_analysis_tweet on public.tweet_analysis (tweet_id);

-- Virality scores
create table if not exists public.virality_scores (
  id uuid primary key default gen_random_uuid(),
  tweet_id uuid references public.tweets(id) on delete cascade unique,
  profile_id uuid references public.profiles(id) on delete cascade,
  views_count integer,
  likes_count integer,
  retweets_count integer,
  replies_count integer,
  comment_rate numeric(5,2),
  retweet_rate numeric(5,2),
  like_rate numeric(5,2),
  raw_score numeric(10,2),
  normalized_score numeric(5,2),
  is_outlier_positive boolean default false,
  is_outlier_negative boolean default false,
  calculated_at timestamptz not null default now()
);

create index if not exists idx_virality_scores_profile on public.virality_scores (profile_id);
create index if not exists idx_virality_scores_normalized on public.virality_scores (normalized_score);

-- RLS: enable and allow read-only for authenticated users. writes are via service role.
alter table public.profiles enable row level security;
alter table public.tweets enable row level security;
alter table public.political_categories enable row level security;
alter table public.tweet_analysis enable row level security;
alter table public.virality_scores enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'read_authenticated'
  ) then
    create policy read_authenticated on public.profiles for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tweets' and policyname = 'read_authenticated'
  ) then
    create policy read_authenticated on public.tweets for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'political_categories' and policyname = 'read_authenticated'
  ) then
    create policy read_authenticated on public.political_categories for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tweet_analysis' and policyname = 'read_authenticated'
  ) then
    create policy read_authenticated on public.tweet_analysis for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'virality_scores' and policyname = 'read_authenticated'
  ) then
    create policy read_authenticated on public.virality_scores for select to authenticated using (true);
  end if;
end $$;

