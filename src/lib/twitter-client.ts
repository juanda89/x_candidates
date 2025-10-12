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

  async getUserProfile(username: string): Promise<TwitterProfileResponse> {
    const url = `${this.baseURL}/user/profile?username=${encodeURIComponent(username)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Twitter profile error: ${res.status}`);
    return res.json();
  }

  async getUserTweets(userId: string, maxResults: number = 100): Promise<TwitterTweetsResponse> {
    const url = `${this.baseURL}/user/tweets?user_id=${encodeURIComponent(userId)}&max_results=${maxResults}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Twitter tweets error: ${res.status}`);
    return res.json();
  }

  async getTweetReplies(tweetId: string, maxResults: number = 100): Promise<{ data: Array<{ id: string; text: string; author_id: string; created_at: string }> }>
  {
    const url = `${this.baseURL}/tweet/replies?tweet_id=${encodeURIComponent(tweetId)}&max_results=${maxResults}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Twitter replies error: ${res.status}`);
    return res.json();
  }
}

