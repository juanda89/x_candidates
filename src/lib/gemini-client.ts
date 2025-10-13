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
    // Try real Gemini first
    if (this.apiKey) {
      try {
        // Dynamic import to avoid build issues if package not present locally
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' });
        const prompt = this.buildCategoriesPrompt(tweets);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed?.categories)) return parsed;
      } catch (_) {
        // fall through to heuristic
      }
    }
    // Heuristic fallback (keyword-based) to keep the feature usable without API key
    return this.heuristicCategories(tweets);
  }

  async analyzeCommentsSentiment(comments: string[]): Promise<SentimentAnalysisResponse> {
    // Simple neutral fallback
    return {
      total: comments.length,
      positive: 0,
      negative: 0,
      neutral: comments.length,
      negative_reasons: {},
      classifications: comments.map((_, i) => ({ index: i, sentiment: 'NEUTRAL' })),
    };
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    return [];
  }

  private buildCategoriesPrompt(tweets: string[]) {
    return `Analiza los siguientes ${tweets.length} tweets de un perfil político y extrae categorías políticas.
Responde SOLO con JSON válido:
{
  "categories": [
    { "name": "string", "position": "string", "confidence": number, "evidence_indices": number[] }
  ]
}
Tweets:\n${tweets.map((t, i) => `[${i}] ${t}`).join('\n\n')}`;
  }

  private heuristicCategories(tweets: string[]): PoliticalAnalysisResponse {
    const text = tweets.join('\n').toLowerCase();
    const defs = [
      { name: 'aborto', keys: ['aborto', 'provida', 'pro-vida', 'pro choice', 'pro-choice'] },
      { name: 'matrimonio_gay', keys: ['matrimonio igualitario', 'matrimonio gay', 'lgbt', 'igualdad'] },
      { name: 'impuestos', keys: ['impuesto', 'tributo', 'iva', 'renta', 'tasas'] },
      { name: 'empresas', keys: ['empresa', 'negocios', 'emprend', 'pymes'] },
      { name: 'seguridad', keys: ['seguridad', 'delincuencia', 'crimen', 'policía'] },
      { name: 'educacion', keys: ['educaci', 'escuela', 'universidad', 'colegio'] },
      { name: 'salud', keys: ['salud', 'hospital', 'sanitari', 'eps'] },
    ];
    const categories: PoliticalAnalysisResponse['categories'] = [];
    defs.forEach((d) => {
      const hit = d.keys.some((k) => text.includes(k));
      if (hit) {
        // Choose evidence by first indices that match
        const ev: number[] = [];
        tweets.forEach((t, i) => {
          if (d.keys.some((k) => t.toLowerCase().includes(k))) ev.push(i);
        });
        categories.push({
          name: d.name,
          position: `Mención/referencia encontrada sobre ${d.name}.`,
          confidence: Math.min(0.8, Math.max(0.4, ev.length / Math.max(3, tweets.length))),
          evidence_indices: ev.slice(0, 5),
        });
      }
    });
    return { categories };
  }
}
