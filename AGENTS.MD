## AGENTS – Estado, Decisiones y Lecciones

Este archivo documenta lo que ya funciona, cómo lo implementamos y cómo resolvimos los errores que aparecieron durante el desarrollo y el despliegue en Vercel.

### Stack y Despliegue
- Frontend: Next.js 14 (App Router), React 18.
- Backend de datos: Supabase (Postgres + RLS + pgvector). Despliegue en Vercel.
- Integraciones: twitterapi.io (cabecera `X-API-Key`) y stub de Gemini.
- Variables: se gestionan en Vercel (no en el repo). `.env.example` tiene placeholders.

### Esquema de Datos y Seguridad
- Tablas: `profiles`, `tweets` (texto completo + métricas), `tweet_analysis`, `virality_scores`, `political_categories`.
- RLS: lectura pública para `anon` (SELECT) y escritura mediante Service Role desde rutas API.
- Migraciones aplicadas al proyecto Supabase (`vizrrxubmyjkltssptln`).

### Endpoints Implementados
- `POST /api/profile/analyze`
  - Normaliza `username`/URL, consulta twitterapi.io (`/twitter/user/info`, `userName`) y guarda el perfil.
  - Trae últimos tweets (`/twitter/user/last_tweets`, `userId|userName`, `includeReplies=false`).
  - Trae replies por tweet (concurrencia 5) y calcula KPIs: `like_rate`, `retweet_rate`, `reply_rate`, `engagement_rate`.
  - Calcula `raw_score` y `normalized_score`, y upserta en `tweet_analysis` y `virality_scores`.
  - Modo debug: `?debug=1` devuelve `twitter_calls`, `tweets_received`, `upsert_stats`, `saved_after_upsert` y shape de respuesta.
- `GET /api/compare?users=a,b&n=100&autofill=1`
  - Agregados por cuenta: `reach` (views), tasas promedio y `score_avg`. Top 3 tweets.
  - `autofill=1` dispara `analyze` si el perfil falta.
- Diagnóstico:
  - `GET /api/diagnostics/env` (presencia de env vars en server).
  - `GET /api/diagnostics/twitter/raw_last_tweets?userName=...` (respuesta cruda del proveedor).
  - `GET /api/diagnostics/twitter/paths?username=...` (descubrimiento de paths/base) y `/api/diagnostics/twitter` (estilos de auth).

### Errores y Cómo se Resolvían
- Next.js build
  - Falta de layout raíz: se añadió `app/layout.tsx` y `app/page.tsx`.
  - Tipos TS: se añadió `@types/react`, `@types/react-dom`, `@types/node`.
  - `useSearchParams` sin Suspense: se encapsuló en `<Suspense>` en `/analisis`.
  - Alias de imports: se corrigió de `@/src/...` a `@/...` y `@/types`.
- Integración twitterapi.io
  - 401: se adoptó `X-API-Key` y se agregó selector `TWITTER_API_AUTH_STYLE`.
  - 404/Not Found: se implementaron fallbacks de base (`root` y `/v1`) y overrides de path por env.
  - Shape de respuestas: el perfil viene como `{ data: {...} }` (usa `userName`, `profilePicture`, `followers`, `statusesCount`, etc.); los tweets como `{ status, data: { tweets: [...] } }`. El analizador soporta ambas formas (`resp.tweets` o `resp.data.tweets`).
  - `.map is not a function`: guardas con `Array.isArray`.
- Supabase / RLS
  - “Perfil no encontrado” en `/analisis`: faltaban políticas `anon` de lectura; se añadieron.
  - `twitter_username` nulo: se normalizó desde `data.userName`.
- Seguridad
  - Se eliminaron secretos de `.env.example`, se recomendó rotación y se reescribió el historial (`git filter-branch`); se forzó push.

### Flujo de Trabajo
- Desarrollo local: `npm i && npm run dev`. Configurar `.env.local` (no versionado).
- Despliegue: conectar repo en Vercel y configurar env vars (Supabase y twitterapi.io). Cada push a `main` despliega.
- Debug operativo:
  - En `/perfil` activar “Debug” para ver `twitter_calls` y conteos en la respuesta de `analyze` (DevTools → Network).
  - Usar `/api/diagnostics/env` y `/api/diagnostics/twitter/raw_last_tweets` si hay dudas de entorno o proveedor.

### Siguientes Pasos Sugeridos
- Paginación por `cursor` (varias páginas) y opción `includeReplies` en UI.
- Integrar categorías políticas con Gemini (guardar en `political_categories`).
- Estilos (Tailwind) y tasas ponderadas por `views` en el comparativo.

