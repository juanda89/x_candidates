export interface TwitterProfileResponse {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  description?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
  };
  verified?: boolean;
  created_at?: string;
}

export interface TwitterTweetsResponse {
  data: Array<{
    id: string;
    text: string;
    created_at: string;
    public_metrics?: {
      retweet_count?: number;
      reply_count?: number;
      like_count?: number;
      quote_count?: number;
      impression_count?: number;
    };
  }>;
  meta?: { result_count?: number; next_token?: string };
}

export class TwitterAPIClient {
  private apiKey = process.env.TWITTER_API_KEY;
  private baseURL = process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io';
  // Prefer x-api-key by default per diagnostics
  private authStyle = (process.env.TWITTER_API_AUTH_STYLE || 'x-api-key').toLowerCase();
  private profilePathOverride = process.env.TWITTER_API_PROFILE_PATH;
  private tweetsPathOverride = process.env.TWITTER_API_TWEETS_PATH;
  private repliesPathOverride = process.env.TWITTER_API_REPLIES_PATH;

  private async request<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    if (!this.apiKey) throw new Error('Falta TWITTER_API_KEY');
    const qs = query
      ? '?' + Object.entries(query).filter(([,v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
      : '';
    const bases = this.getBaseCandidates();
    const headerSets = this.buildHeaderAttempts();
    const errs: string[] = [];
    for (const base of bases) {
      for (const headers of headerSets) {
        const url = `${base}${path}${qs}`;
        const res = await fetch(url, { headers });
        if (res.ok) return res.json();
        errs.push(`${res.status} ${url}`);
      }
    }
    throw new Error(`Twitter API request failed: ${errs.join(' | ')}`);
  }

  async getUserProfile(username: string): Promise<TwitterProfileResponse> {
    // Definitive endpoint: /twitter/user/info with param userName
    const path = this.profilePathOverride || '/twitter/user/info';
    const headerSets = this.buildHeaderAttempts();
    const paramsVariants = [
      { userName: username },
      { username },
      { screen_name: username },
      { handle: username },
    ];
    const errs: string[] = [];
    for (const base of this.getBaseCandidates()) {
      for (const h of headerSets) {
        for (const p of paramsVariants) {
          try {
            const qs = Object.entries(p).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
            const res = await fetch(`${base}${path}?${qs}`, { headers: h });
            if (res.ok) return res.json();
            errs.push(`${res.status} ${base}${path}?${Object.keys(p).join(',')}`);
          } catch (e: any) {
            errs.push(`err ${base}${path}: ${e.message}`);
          }
        }
      }
    }
    throw new Error(`Twitter profile error: tried ${errs.join(' | ')}`);
  }

  async getUserTweets(userId: string, count: number = 100, username?: string): Promise<TwitterTweetsResponse> {
    // Definitive endpoint: /twitter/user/last_tweets with user_id or username and count
    const path = this.tweetsPathOverride || '/twitter/user/last_tweets';
    const headerSets = this.buildHeaderAttempts();
    const candidates: Array<Record<string, string | number | undefined>> = [
      { user_id: userId, count },
      { username, count },
    ];
    const errs: string[] = [];
    for (const base of this.getBaseCandidates()) {
      for (const h of headerSets) {
        for (const p of candidates) {
          try {
            const qs = Object.entries(p)
              .filter(([,v]) => v !== undefined)
              .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
              .join('&');
            const res = await fetch(`${base}${path}?${qs}`, { headers: h });
            if (res.ok) return res.json();
            errs.push(`${res.status} ${base}${path}?${Object.keys(p).join(',')}`);
          } catch (e: any) {
            errs.push(`err ${base}${path}: ${e.message}`);
          }
        }
      }
    }
    throw new Error(`Twitter tweets error: tried ${errs.join(' | ')}`);
  }

  async getTweetReplies(tweetId: string, maxResults: number = 100): Promise<{ data: Array<{ id: string; text: string; author_id: string; created_at: string }> }>
  {
    const path = this.repliesPathOverride || '/twitter/tweet/replies';
    // Try param names commonly used by providers
    const headerSets = this.buildHeaderAttempts();
    const candidates: Array<Record<string,string|number>> = [
      { tweetId, max_results: maxResults },
      { tweet_id: tweetId, max_results: maxResults },
      { id: tweetId, max_results: maxResults },
    ];
    const errs: string[] = [];
    for (const base of this.getBaseCandidates()) {
      for (const h of headerSets) {
        for (const p of candidates) {
          const qs = Object.entries(p).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
          const res = await fetch(`${base}${path}?${qs}`, { headers: h });
          if (res.ok) return res.json();
          errs.push(`${res.status} ${base}${path}?${Object.keys(p).join(',')}`);
        }
      }
    }
    throw new Error(`Twitter replies error: tried ${errs.join(' | ')}`);
  }

  private buildHeaderAttempts() {
    const attempts: Array<Record<string, string>> = [];
    if (this.authStyle === 'x-api-key') attempts.push({ 'X-API-Key': this.apiKey! });
    if (this.authStyle === 'bearer') attempts.push({ Authorization: `Bearer ${this.apiKey}` });
    if (this.authStyle === 'apikey') attempts.push({ apikey: this.apiKey! });
    attempts.push({ 'X-API-Key': this.apiKey! });
    attempts.push({ 'X-API-KEY': this.apiKey! });
    attempts.push({ Authorization: `Bearer ${this.apiKey}` });
    attempts.push({ apikey: this.apiKey! });
    return attempts;
  }

  private getBaseCandidates(): string[] {
    const base = (this.baseURL || '').replace(/\/$/, '');
    const bases = new Set<string>();
    if (base) bases.add(base);
    // Try versioned and unversioned variants
    if (base.endsWith('/v1')) bases.add(base.replace(/\/v1$/, ''));
    else bases.add(base + '/v1');
    // Always include defaults
    bases.add('https://api.twitterapi.io');
    bases.add('https://api.twitterapi.io/v1');
    return Array.from(bases.values());
  }
}
