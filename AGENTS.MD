## AGENTS – Estado Actual, Decisiones y Lecciones

Este documento resume lo que ya funciona, cómo se resolvió cada incidencia y cómo operar/seguir extendiendo el proyecto.

### Stack y Despliegue
- Next.js 14 (App Router) + React 18. Tailwind CSS aplicado en vistas principales.
- Supabase (Postgres + RLS + pgvector). Proyecto: `vizrrxubmyjkltssptln`.
- Integraciones: twitterapi.io (cabecera `X-API-Key`), Gemini (opcional) con fallback heurístico.
- Variables en Vercel; `.env.example` solo placeholders. Se eliminó historial con secretos y se recomendó rotación.

### Esquema y Seguridad
- Tablas: `profiles`, `tweets` (texto completo + métricas), `tweet_analysis`, `virality_scores`, `political_categories`.
- RLS: lectura `anon` habilitada (SELECT) para vistas públicas; escritura vía Service Role desde API.

### Funcionalidad Implementada
- `POST /api/profile/analyze`
  - Normaliza handle/URL. Perfil desde `/twitter/user/info` (param `userName`).
  - Últimos tweets desde `/twitter/user/last_tweets` (con `userId|userName` + `includeReplies`), soporta formas `{ data: { tweets } }` y `{ tweets }`.
  - Replies por tweet (concurrencia 5). KPIs: like/retweet/reply/engagement rate; `raw_score` y `normalized_score`.
  - Debug `?debug=1`: `twitter_calls`, `tweets_received`, `upsert_stats`, `saved_after_upsert`, shape recibido.
- `GET /api/compare?users=a,b&n=100&autofill=1`
  - Agregados por cuenta: reach (suma views), tasas promedio, `score_avg`, top 3 por score.
  - `autofill=1` dispara `analyze` si falta el perfil.
- Categorías políticas (Gemini)
  - `GET/POST /api/profile/categories?username=...&n=100`: genera con Gemini (o heurística) y guarda en `political_categories` respetando `is_user_modified`.
  - `POST /api/profile/categories/update`: edita `position_description` y/o `is_user_modified`.
- Diagnóstico
  - `/api/diagnostics/env` (presencia de env en server), `/api/diagnostics/twitter/raw_last_tweets` (respuesta cruda), `/api/diagnostics/twitter/paths` (descubrimiento de base/path).

### UI y UX
- Tailwind: tokens en `app/globals.css` (+ helpers `.card`, `.btn`, `.input`, `.badge`, `.table-sticky`).
- `/perfil`: formulario + toggle de Debug; botones de salto a `/analisis`, `/categorias` y `/comparar` tras analizar.
- `/analisis`: tabla con sticky header e infinite scroll (IntersectionObserver, page-size 30).
- `/comparar`: formulario y tabla con KPIs y Top 3 enlazados.
- `/categorias`: tabla editable con persistencia; botón “Generar con LLM” y enlace a análisis.

### Incidencias Resueltas (principales)
- Next/TS: faltaba layout raíz y tipos (`@types/*`); alias `@/src` → `@/`; tsconfig ajustado por Next (telemetría). SWC lockfile: aviso informativo.
- Suspense: `useSearchParams` envuelto en `<Suspense>` en `/analisis` y `/categorias` para evitar CSR bailout.
- twitterapi.io: 401 (se forzó `X-API-Key`), 404/base (`root`/`/v1`), override de PATHs por env.
- Parsing: perfil `{ data: {...} }`; tweets `{ status, data: { tweets: [...] } }`; se soportan ambas.
- Supabase/RLS: lectura `anon` añadida; normalización de `twitter_username` desde `data.userName`.
- TS: nullables (`tweet_id`, `url`) protegidos en `/api/compare`.

### Variables Relevantes
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Twitter: `TWITTER_API_KEY`, `TWITTER_API_BASE_URL` (root; se prueba también `/v1`), `TWITTER_API_AUTH_STYLE=x-api-key`, overrides: `TWITTER_API_PROFILE_PATH`, `TWITTER_API_TWEETS_PATH`, `TWITTER_API_REPLIES_PATH`.
- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL` (opcional; si falta se usa heurística).

### Operativa
- Local: `npm i && npm run dev`. Crear `.env.local` (no versionado).
- Despliegue: push a `main` → Vercel. Configurar variables en Project Settings.
- Debug: activar “Debug” en `/perfil` o usar endpoints de diagnóstico. Considerar deshabilitarlos en producción o detrás de “feature flag”.

### Próximos Pasos Recomendados
- KPIs ponderadas por views en `/api/compare` y ventanas temporales (30/90 días).
- Paginación con `cursor` en last_tweets y límite configurable de replies.
- Estabilizar prompts de Gemini y normalizar nombres de categorías.
- Rate limiting y caché de proveedor; flags para ocultar endpoints de diagnóstico en prod.
