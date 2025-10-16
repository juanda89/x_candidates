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

### MCP Servers y Tools Disponibles
- Supabase MCP (`npx @supabase/mcp-server-supabase`)
  - Tools: `apply_migration`, `create_branch`, `delete_branch`, `deploy_edge_function`, `execute_sql`, `generate_typescript_types`, `get_advisors`, `get_anon_key`, `get_edge_function`, `get_logs`, `get_project_url`, `list_branches`, `list_edge_functions`, `list_extensions`, `list_migrations`, `list_tables`, `merge_branch`, `rebase_branch`, `reset_branch`, `search_docs`.
- Context7 MCP (`npx @upstash/context7-mcp`)
  - Tools: `resolve-library-id`, `get-library-docs`.
- Playwright MCP (agregado) (`npx @playwright/mcp@latest`)
  - Tools: automatización de navegador y testing (p. ej. navegación, acciones, capturas, evaluación). El conjunto exacto depende de la versión del servidor MCP; consultar sus capacidades al inicio de sesión.
- Codex CLI (built-in)
  - `shell` (lectura/diagnóstico), `apply_patch` (edición de archivos), `update_plan` (plan de trabajo), `view_image` (adjuntar imágenes locales).

### Runbook MCP (cómo listar y probar)
- Ver MCPs cargados: revisa `~/.codex/config.toml` (secciones `[mcp_servers.*]`).
- Comprobación rápida (Supabase):
  - `get_project_url` para verificar conectividad.
  - `list_tables` para listar tablas; `execute_sql` para un `select 1`.
- Descubrir herramientas disponibles:
  - Pídele al agente: “muestra las tools del MCP <nombre>” (el agente puede introspectar y enumerarlas).
  - Para Supabase y Context7, el agente puede invocar directamente funciones (`supabase__list_tables`, `context7__resolve-library-id`, etc.).
- Ejemplos útiles:
  - Supabase
    - Buscar docs: `search_docs` con query GraphQL (útil para API y errores).
    - Seguridad/health: `get_advisors` para avisos y remediaciones.
    - Tipos TS: `generate_typescript_types` para sincronizar tipos.
  - Context7
    - `resolve-library-id` con el nombre del paquete y luego `get-library-docs` para traer docs de un tema concreto.
  - Playwright
    - Abrir página, navegar y capturar pantalla (las herramientas exactas varían por versión; solicita “capabilities” al servidor Playwright y luego usa `page.goto`, `page.screenshot`, `locator.click`, etc.).

### Visual QA con Playwright MCP (procedimiento)
- Documentación: `docs/visual-qa/playwright-mcp.md` (flujo, viewports, rutas de salida) y `docs/visual-qa/checklist.md` (lista breve).
- Carpeta de baselines (opcional): `docs/visual-qa/baseline/`.
- Carpeta de capturas actuales: `artifacts/screenshots/`.
- Petición tipo al agente: “Playwright MCP: abre {BASE_URL}/perfil 1280×800, espera el input y guarda screenshot en artifacts/screenshots/buscador-desktop.png; repite 390×844 en .../buscador-mobile.png”.

### Operativa
- Local: `npm i && npm run dev`. Crear `.env.local` (no versionado).
- Despliegue: push a `main` → Vercel. Configurar variables en Project Settings.
- Debug: activar “Debug” en `/perfil` o usar endpoints de diagnóstico. Considerar deshabilitarlos en producción o detrás de “feature flag”.

### Próximos Pasos Recomendados
- KPIs ponderadas por views en `/api/compare` y ventanas temporales (30/90 días).
- Paginación con `cursor` en last_tweets y límite configurable de replies.
- Estabilizar prompts de Gemini y normalizar nombres de categorías.
- Rate limiting y caché de proveedor; flags para ocultar endpoints de diagnóstico en prod.
