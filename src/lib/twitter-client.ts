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
  private baseURL = process.env.TWITTER_API_BASE_URL || 'https://api.twitterapi.io/v1';
  // Optional override; if set to 'x-api-key' usamos ese header directamente
  private authStyle = (process.env.TWITTER_API_AUTH_STYLE || 'bearer').toLowerCase();

  private async request<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    if (!this.apiKey) throw new Error('Falta TWITTER_API_KEY');
    const qs = query
      ? '?' + Object.entries(query).filter(([,v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
      : '';
    const url = `${this.baseURL}${path}${qs}`;

    // Try configured style first
    const attempts: Array<Record<string, string>> = [];
    if (this.authStyle === 'bearer') attempts.push({ Authorization: `Bearer ${this.apiKey}` });
    if (this.authStyle === 'x-api-key') attempts.push({ 'X-API-Key': this.apiKey });
    if (this.authStyle === 'apikey') attempts.push({ apikey: this.apiKey });
    // Fallback attempts (try common variants)
    attempts.push({ 'X-API-Key': this.apiKey });
    attempts.push({ 'X-API-KEY': this.apiKey });
    attempts.push({ apikey: this.apiKey });
    attempts.push({ Authorization: `Bearer ${this.apiKey}` });

    let lastStatus = 0;
    for (const headers of attempts) {
      const res = await fetch(url, { headers });
      lastStatus = res.status;
      if (res.ok) return res.json();
      if (res.status !== 401 && res.status !== 403) {
        // Non-auth error; stop trying different header styles
        const text = await res.text().catch(()=>'');
        throw new Error(`Twitter API error ${res.status}${text?`: ${text.slice(0,200)}`:''}`);
      }
    }
    throw new Error(`Twitter API auth error: ${lastStatus}. Revisa TWITTER_API_KEY/TWITTER_API_BASE_URL o TWITTER_API_AUTH_STYLE.`);
  }

  async getUserProfile(username: string): Promise<TwitterProfileResponse> {
    return this.request('/user/profile', { username });
  }

  async getUserTweets(userId: string, maxResults: number = 100): Promise<TwitterTweetsResponse> {
    return this.request('/user/tweets', { user_id: userId, max_results: maxResults });
  }

  async getTweetReplies(tweetId: string, maxResults: number = 100): Promise<{ data: Array<{ id: string; text: string; author_id: string; created_at: string }> }>
  {
    return this.request('/tweet/replies', { tweet_id: tweetId, max_results: maxResults });
  }
}
