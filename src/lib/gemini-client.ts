export interface PoliticalAnalysisResponse {
  categories: Array<{
    name: string;
    position: string;
    confidence: number;
    evidence_indices: number[];
  }>;
}

export interface SentimentAnalysisResponse {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  negative_reasons: Record<string, number>;
  classifications: Array<{
    index: number;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    reason?: string;
  }>;
}

// Placeholder stub. Implement with Google Generative AI SDK or REST when ready.
export class GeminiClient {
  constructor(private apiKey = process.env.GEMINI_API_KEY) {}

  async analyzePoliticalPositions(tweets: string[]): Promise<PoliticalAnalysisResponse> {
    // TODO: Replace with actual call to Gemini
    return { categories: [] };
  }

  async analyzeCommentsSentiment(comments: string[]): Promise<SentimentAnalysisResponse> {
    // TODO: Replace with actual call to Gemini
    return {
      total: comments.length,
      positive: 0,
      negative: 0,
      neutral: comments.length,
      negative_reasons: {},
      classifications: comments.map((_, i) => ({ index: i, sentiment: 'NEUTRAL' })),
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Replace with embedding endpoint
    return [];
  }
}

