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
    const allowed = [
      'aborto','matrimonio_gay','impuestos','empresas','seguridad','educacion','salud','medio_ambiente','corrupcion','migracion','drogas','armas','energia','transporte','vivienda','economia','justicia'
    ];
    return `Analiza los siguientes ${tweets.length} tweets de un perfil y extrae categorías políticas.
Reglas:
- Usa SOLO estos nombres si aplican (no inventes otros): ${allowed.join(', ')}.
- Si un tema no aparece, OMITE la categoría.
- "position" debe ser una frase breve, clara y basada en los tweets.
- "confidence" entre 0 y 1.
- "evidence_indices" son índices de los tweets (0..${tweets.length - 1}).
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

// --- Normalización de nombres de categorías ---
const CANONICAL = [
  'aborto','matrimonio_gay','impuestos','empresas','seguridad','educacion','salud','medio_ambiente','corrupcion','migracion','drogas','armas','energia','transporte','vivienda','economia','justicia'
] as const;
type Canonical = typeof CANONICAL[number];

const SYNONYMS: Record<Canonical, string[]> = {
  aborto: ['aborto','interrupcion del embarazo','derecho a decidir','pro choice','pro-choice','provida','pro vida'],
  matrimonio_gay: ['matrimonio igualitario','matrimonio homosexual','parejas del mismo sexo','lgbt','igualdad matrimonial','matrimonio gay'],
  impuestos: ['impuesto','tributo','iva','renta','tasas','fiscal','impositivo'],
  empresas: ['empresa','negocios','emprend','pymes','sector privado'],
  seguridad: ['seguridad','delincuencia','crimen','criminalidad','policia','seguridad ciudadana'],
  educacion: ['educaci','escuela','universidad','colegio','educativo'],
  salud: ['salud','hospital','sanidad','eps','sistema de salud'],
  medio_ambiente: ['medio ambiente','ambiental','ecologia','ecológico','clima','cambio climatico','sostenible','sustentable'],
  corrupcion: ['corrupcion','transparencia','soborno','coimas'],
  migracion: ['migracion','inmigracion','migrantes','refugiados'],
  drogas: ['drogas','narcotrafico','legalizacion','marihuana','cocaina','cocaína'],
  armas: ['armas','porte de armas','control de armas'],
  energia: ['energia','petróleo','petroleo','gas','renovables','solar','eolica','eólica','nuclear'],
  transporte: ['transporte','movilidad','carreteras','metro','trenes','infraestructura vial'],
  vivienda: ['vivienda','alquiler','hipoteca','acceso a vivienda'],
  economia: ['economia','inflacion','crecimiento','recesion','pib','empleo'],
  justicia: ['justicia','judicial','fiscales','cortes','carceles','cárceles'],
};

function stripDiacritics(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizePoliticalCategoryName(input: string): Canonical | string {
  const raw = stripDiacritics(String(input || '').toLowerCase()).trim();
  // exact canonical match
  if ((CANONICAL as readonly string[]).includes(raw)) return raw as Canonical;
  // try synonyms
  for (const key of CANONICAL) {
    const syns = SYNONYMS[key] || [];
    if (syns.some((k) => raw.includes(stripDiacritics(k.toLowerCase())))) return key;
  }
  // sanitize to snake_case
  return raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeCategoriesOutput(resp: PoliticalAnalysisResponse): PoliticalAnalysisResponse {
  const byName = new Map<string, { name: string; position: string; confidence: number; evidence_indices: number[] }>();
  (resp.categories || []).forEach((c) => {
    const name = normalizePoliticalCategoryName(c.name);
    const prev = byName.get(name);
    const mergedEvidence = Array.from(new Set([...(prev?.evidence_indices || []), ...(c.evidence_indices || [])])).slice(0, 10);
    const pick = !prev || (c.confidence || 0) > (prev.confidence || 0) ? c : prev;
    byName.set(name, { name, position: pick.position, confidence: Math.max(prev?.confidence || 0, c.confidence || 0), evidence_indices: mergedEvidence });
  });
  return { categories: Array.from(byName.values()) };
}
