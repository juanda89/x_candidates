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

export interface TweetItem {
  id: string;
  url?: string;
  text: string;
  createdAt?: string;
  created_at?: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  viewCount?: number;
  isReply?: boolean;
}

export interface LastTweetsResponse {
  tweets: TweetItem[];
  has_next_page?: boolean;
  next_cursor?: string;
  status?: string;
  message?: string;
}

export interface RepliesResponse {
  replies: TweetItem[];
  has_next_page?: boolean;
  next_cursor?: string;
  status?: string;
  message?: string;
}

export class TwitterAPIClient {
  private apiKey = process.env.TWITTER_API_KEY;
  private baseURL = process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io';
  // Prefer x-api-key by default per diagnostics
  private authStyle = (process.env.TWITTER_API_AUTH_STYLE || 'x-api-key').toLowerCase();
  private profilePathOverride = process.env.TWITTER_API_PROFILE_PATH;
  private tweetsPathOverride = process.env.TWITTER_API_TWEETS_PATH;
  private repliesPathOverride = process.env.TWITTER_API_REPLIES_PATH;
  private logs: Array<{ url: string; headerStyle: string; status: number; bodySample?: string; error?: string }>= [];

  private record(url: string, headers: Record<string,string>, status: number, body?: string, error?: string) {
    const sampleLen = parseInt(process.env.DEBUG_TWITTER_BODY_LEN || '400', 10);
    const headerStyle = headers['X-API-Key'] ? 'x-api-key'
      : headers['X-API-KEY'] ? 'x-api-key'
      : headers['Authorization'] ? 'bearer'
      : headers['apikey'] ? 'apikey'
      : 'unknown';
    this.logs.push({ url, headerStyle, status, bodySample: body ? body.slice(0, sampleLen) : undefined, error });
  }

  public consumeLogs() {
    const out = this.logs.slice();
    this.logs = [];
    return out;
  }

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
        try {
          const res = await fetch(url, { headers });
          const txt = await res.text().catch(()=> '');
          this.record(url, headers, res.status, txt);
          if (res.ok) return JSON.parse(txt || '{}');
          errs.push(`${res.status} ${url}`);
        } catch (e: any) {
          this.record(url, headers, 0, undefined, e.message);
          errs.push(`err ${url}: ${e.message}`);
        }
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
            const url = `${base}${path}?${qs}`;
            const res = await fetch(url, { headers: h });
            const txt = await res.text().catch(()=> '');
            this.record(url, h, res.status, txt);
            if (res.ok) return JSON.parse(txt || '{}');
            errs.push(`${res.status} ${base}${path}?${Object.keys(p).join(',')}`);
          } catch (e: any) {
            errs.push(`err ${base}${path}: ${e.message}`);
          }
        }
      }
    }
    throw new Error(`Twitter profile error: tried ${errs.join(' | ')}`);
  }

  async getUserTweets(
    userId: string | null,
    userName?: string,
    cursor?: string,
    includeReplies: boolean = false
  ): Promise<LastTweetsResponse> {
    // Per docs: GET /twitter/user/last_tweets with userId or userName, optional cursor/includeReplies
    const pathCandidates = [
      this.tweetsPathOverride,
      '/twitter/user/last_tweets',
    ].filter(Boolean) as string[];

    const headerSets = this.buildHeaderAttempts();

    const paramsList: Array<Record<string, string | number | boolean | undefined>> = [
      { userId: userId || undefined, userName: undefined, cursor, includeReplies },
      { userId: undefined, userName, cursor, includeReplies },
    ];

    const errs: string[] = [];
    for (const base of this.getBaseCandidates()) {
      for (const h of headerSets) {
        for (const path of pathCandidates) {
          for (const p of paramsList) {
            try {
              const entries = Object.entries(p).filter(([, v]) => v !== undefined);
              const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
              const url = `${base}${path}?${qs}`;
              const res = await fetch(url, { headers: h });
              const txt = await res.text().catch(()=> '');
              this.record(url, h, res.status, txt);
              if (res.ok) return JSON.parse(txt || '{}');
              errs.push(`${res.status} ${url}`);
            } catch (e: any) {
              errs.push(`err ${base}${path}: ${e.message}`);
            }
          }
        }
      }
    }
    throw new Error(`Twitter tweets error: tried ${errs.join(' | ')}`);
  }

  async getTweetReplies(tweetId: string, cursor?: string, count?: number): Promise<RepliesResponse> {
    const path = this.repliesPathOverride || '/twitter/tweet/replies';
    const headerSets = this.buildHeaderAttempts();
    const errs: string[] = [];
    for (const base of this.getBaseCandidates()) {
      for (const h of headerSets) {
        const params: Record<string, string | number> = { tweet_id: tweetId };
        if (cursor) params.cursor = cursor;
        if (typeof count === 'number') params.count = count;
        const qs = Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&');
        const url = `${base}${path}?${qs}`;
        const res = await fetch(url, { headers: h });
        const txt = await res.text().catch(()=> '');
        this.record(url, h, res.status, txt);
        if (res.ok) return JSON.parse(txt || '{}');
        errs.push(`${res.status} ${base}${path}?${Object.keys(params).join(',')}`);
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
