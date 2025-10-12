# Hoja de Ruta — Plataforma de Análisis de Perfiles de X

## Objetivo y Alcance
Construir una aplicación que analice perfiles de X/Twitter: ingesta de perfil y tweets, clasificación de posiciones con LLM, análisis de sentimiento de comentarios y métricas de “viralidad”. Tres vistas: Perfil, Análisis de Tweets y Comparativo de Cuentas. Meta: MVP funcional en 8 semanas.

## Stack y Arquitectura
- Frontend: Next.js 14 (App Router), React 18, Tailwind CSS.
- Backend: Supabase (Postgres, Auth, Storage; opcional Edge Functions) y `pgvector` para embeddings.
- Integraciones: API de Twitter (p. ej. twitterapi.io) y Google Gemini para análisis/embeddings.
- Configuración: usar `.env.local` y `.env.example` (no subir claves). Proyecto Supabase: `vizrrxubmyjkltssptln`.

## Esquema de Datos v1 (resumen)
- `profiles`: id, twitter_user_id, twitter_username, display_name, bio, métricas, timestamps.
- `tweets`: id, profile_id, tweet_id, text, métricas, flags (reply/retweet), `embedding vector(768)`.
- `political_categories`: profile_id, category_name (única por perfil), position_description, confidence_score, evidence_tweet_ids[], flags de edición.
- `tweet_analysis`: tweet_id, engagement_rate y tasas derivadas, desglose POS/NEG/NEU y `negative_reasons jsonb`.
- `virality_scores`: tweet_id, profile_id, métricas base, porcentajes, `normalized_score` y outliers.
- Índices: por `twitter_username`/`twitter_user_id`, `created_at_twitter`, `profile_id`; IVFFlat sobre `embedding`.
- Seguridad: RLS activa; lectura por rol; ingesta con Service Role; auditoría mínima.

## Plan por Sprints (8 semanas)
- S1–S2: Infra y BD (migraciones, `pgvector`, índices, RLS mínima), clientes API (Twitter/Gemini), scaffold de Next.js y SDK de Supabase; CI básica.
- S3–S4: Vista Perfil (input URL, ingesta/actualización, tabla de categorías políticas), manejo de errores y telemetría.
- S5: Vista Análisis (scroll de tweets, métricas y sentimiento por tweet, almacenamiento de resultados).
- S6: Vista Comparativo (hasta 3 cuentas, KPIs agregadas, orden configurable), optimización de consultas.
- S7: Seguridad, cuotas/rate limiting, pruebas E2E y documentación funcional.
- S8: QA, accesibilidad, checklist de lanzamiento y despliegue.

## Criterios de Aceptación (MVP)
- Ingesta correcta de perfil y 100 tweets recientes por username.
- Categorización política con confianza y evidencia persistidas.
- Panel de Análisis con engagement y sentimiento por tweet.
- Comparativo que calcula KPIs y ordena por “viralidad”.
- RLS activa, sin secretos en el repo, scripts de setup reproducibles.

## Comandos y Flujo de Trabajo
- BD: `supabase db push` (migraciones), `supabase gen types typescript --local` (tipos), `supabase start` (local).
- App: `npm run dev` / `pnpm dev`. Lint/tests: `npm run lint` y `npm test` (añadir en `package.json`).
- Config: mantener `.env.example` actualizado y documentar nuevas variables.

## Riesgos y Mitigaciones
- Límite/cambio de APIs externas: abstraer clientes, usar mocks/caché y feature flags.
- Costes de LLM/embeddings: batch, truncado, reuso de embeddings y jobs diferidos.
- Cumplimiento/privacidad: definir retención de contenido de X y términos de uso.

## Seguridad y Manejo de Secretos
- Nunca versionar credenciales; `.env.example` solo usa placeholders. Las claves reales viven en Vercel (Project Settings → Environment Variables).
- Rotación: regenerar claves si se exponen (Supabase: Anon/Service Role; Twitter; Gemini). Evitar usar Service Role en el cliente.
- RLS en tablas públicas; accesos de escritura solo desde server (rutas/Edge Functions) con Service Role.
- Auditoría mínima: logs de ingesta y cambios de categorías políticas.

## Próximos Pasos (acción)
1) Crear migraciones de tablas + índices + extensión `pgvector` y RLS básica.
2) Añadir `.env.example` y scripts de setup (incl. generación de tipos de Supabase).
3) Scaffold de páginas: `app/perfil`, `app/analisis`, `app/comparar` con diseño base.
4) Stubs de `lib/twitter-client.ts` y `lib/gemini-client.ts` con interfaces y mocks.
5) CI con lint y pruebas mínimas (incl. test de cliente y de BD).

## Descrioción sugerida del proyecto
Descripción del Proyecto: X Political Analyzer
🎯 Objetivo
Web app para analizar perfiles políticos de X (Twitter) usando IA, con diseño skeuomorphic moderno.
📚 Stack Tecnológico

Frontend: Next.js 14 + React 18 + TypeScript + Tailwind CSS
Backend: Supabase (PostgreSQL + pgvector)
Autenticación: Supabase Auth (Google OAuth)
APIs:

Twitter: twitterapi.io con key: new1_4f875bf23c9147419bc4fc21e2f59220
LLM: Google Gemini con key: AIzaSyBH57-LR4YqbYLN7qBXY3PHi4_-tqV7dNs


Deployment: Vercel + GitHub
Actualización: Vercel Cron Jobs (cada hora)


🏗️ Arquitectura
Base de Datos (Supabase)
Tablas principales:

profiles - Perfiles de X analizados (asociados a usuarios)
tweets - Tweets con embeddings vectorizados
political_categories - Categorías políticas y posiciones
tweet_analysis - Análisis de engagement y comentarios
comparison_accounts - Cuentas en comparación (max 25 por usuario)
virality_scores - Scores de viralidad calculados por perfil

Sistema de Actualización Automática

Frecuencia: Cada hora (Vercel Cron)
Lógica: Solo traer tweets publicados después de last_synced
Afecta a: Perfil principal + cuentas en comparación
Recalcula: Scores de viralidad por perfil cuando hay nuevos tweets


📱 Vistas de la Aplicación
Vista 1: Perfil
Propósito: Analizar el perfil principal del usuario
Flujo:

Usuario ingresa URL de perfil de X
Sistema extrae:

Foto de perfil
Datos básicos (nombre, bio, seguidores, etc.)
Últimos 100 tweets


Análisis con LLM (Gemini):

Vectoriza los 100 tweets (embeddings)
Genera categorías políticas relevantes:

Categorías base: Matrimonio gay, aborto, empresas, impuestos
Categorías adicionales: Las que LLM considere relevantes


Para cada categoría: descripción de la posición + nivel de confianza


Guarda todo en base de datos
Usuario puede:

Editar posiciones existentes
Agregar nuevas categorías
Cambios se guardan en BD



Importante: Este es el único perfil que se analiza en profundidad (100 tweets + análisis político)

Vista 2: Análisis de Tweets
Propósito: Revisar tweets individuales del perfil principal
Diseño:

Scroll vertical con efecto futurista
Cards de tweets con blur en las cards superiores/inferiores
Al detenerse el scroll en una card, se muestra el análisis

Panel de Análisis (lado derecho):

Métricas básicas:

Total de vistas
% comentarios (replies/vistas × 100)
% likes (likes/vistas × 100)
% retweets (retweets/vistas × 100)


Análisis de comentarios (LLM):

Total de comentarios analizados (máximo 100 aleatorios si hay más)
Clasificación: Positivos, Negativos, Neutrales
Razones de negatividad: Por qué son negativos (usando LLM)



Fuente de datos: Solo tweets del perfil principal

Vista 3: Comparativo de Cuentas
Propósito: Comparar viralidad de múltiples cuentas políticas
Interfaz:

Botón "Agregar Cuenta"
Scroll horizontal con cards de cuentas (max 25)
Cada cuenta muestra últimos 10 tweets

Score de Viralidad:
javascript// Fórmula de score bruto
raw_score = (0.4 × comment_rate) + (0.4 × retweet_rate) + (0.2 × like_rate)

// Normalización POR PERFIL
profile_mean_score = media de raw_scores del perfil
normalized_score = raw_score / profile_mean_score

// Ejemplo: 2.5X significa 2.5 veces más viral que la media del perfil
IMPORTANTE:

Cada perfil tiene su propia media
Los tweets de un perfil NO afectan los scores de otros perfiles
Cuando hay nuevos tweets, se recalcula la media del perfil y por lo tanto todos los normalized_scores de ese perfil

Tablas de Outliers:

Tabla Positiva: Tweets con normalized_score > 1.5X
Tabla Negativa: Tweets con normalized_score < 0.5X

Cada tabla muestra:

Usuario
Texto del tweet (truncado)
Score (ej: 3.2X)
% comentarios, % retweets, % likes
Total de vistas

Persistencia: Las cuentas agregadas se guardan y actualizan automáticamente cada hora

🔄 Sistema de Actualización
Vercel Cron Job (cada hora)
Endpoint: /api/cron/update-tweets
Frecuencia: 0 * * * * (cada hora)
Proceso:

Identifica perfiles a actualizar:

Perfil principal (is_main_profile = true)
Perfiles en comparación


Para cada perfil:

Consulta Twitter API con start_time = last_synced
Trae solo tweets después de esa fecha
Perfil principal: hasta 100 tweets
Comparación: hasta 10 tweets


Guarda nuevos tweets en BD
Genera embeddings con Gemini (mostrar loading)
Si es perfil principal: actualiza análisis político
Recalcula scores de viralidad:

Obtiene TODOS los tweets del perfil
Calcula nueva media del perfil
Actualiza normalized_score de todos los tweets del perfil


Actualiza last_synced del perfil


🎨 Diseño Skeuomorphic
Características visuales:

Sombras realistas con efecto 3D
Texturas y profundidad en cards y botones
Efecto de presión en botones al hacer click
Blur/difuminado en cards no activas
Animaciones suaves en transiciones
Paleta oscura futurista

Elementos clave:

Inputs con sombra interna
Botones con gradientes y relieve
Cards con sombras elevadas
Tablas con separación entre filas
Efectos hover sutiles


🔐 Autenticación
Sistema: Supabase Auth con Google OAuth
Flujo:

Usuario hace click en "Continuar con Google"
Redirige a Google OAuth
Al autorizar, crea cuenta en Supabase
Redirige a /perfil

Protección de rutas:

Middleware verifica sesión
Sin sesión → redirige a /login
Con sesión en /login → redirige a /perfil

Datos de usuario:

Cada usuario tiene sus propios perfiles
RLS (Row Level Security) en todas las tablas
Solo puede ver/editar sus propios datos


🚀 Deployment
GitHub

Repositorio con código fuente
.gitignore estándar para Next.js
README con instrucciones de setup
Estructura de carpetas organizada

Vercel

Conectar repositorio de GitHub
Deploy automático en cada push a main
Variables de entorno configuradas en dashboard
Cron jobs automáticos

Variables de entorno necesarias:
bashNEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWITTER_API_KEY=new1_4f875bf23c9147419bc4fc21e2f59220
GEMINI_API_KEY=AIzaSyBH57-LR4YqbYLN7qBXY3PHi4_-tqV7dNs
CRON_SECRET=

📊 Datos Clave
Límites y Cantidades

Perfil principal: 100 tweets analizados
Perfiles de comparación: 10 tweets cada uno
Máximo cuentas en comparación: 25
Comentarios analizados por tweet: 100 (aleatorios si hay más)
Frecuencia de actualización: 1 hora
Umbral outlier positivo: >1.5X de la media
Umbral outlier negativo: <0.5X de la media

Pesos del Score

Comentarios: 40%
Retweets: 40%
Likes: 20%

Idioma

UI: Español
Análisis LLM: Español
Documentación: Español


🔧 Implementación Técnica
Estructura del Proyecto
x-political-analyzer/
├── app/
│   ├── api/
│   │   ├── cron/update-tweets/route.ts
│   │   ├── profile/analyze/route.ts
│   │   ├── tweets/[id]/analysis/route.ts
│   │   └── comparison/add-account/route.ts
│   ├── auth/callback/route.ts
│   ├── login/page.tsx
│   ├── perfil/page.tsx
│   ├── analisis/page.tsx
│   ├── comparativo/page.tsx
│   └── layout.tsx
├── components/
│   ├── ProfileURLInput.tsx
│   ├── PoliticalCategoriesTable.tsx
│   ├── TweetCardScroll.tsx
│   ├── TweetAnalysisPanel.tsx
│   ├── AddAccountButton.tsx
│   └── OutliersTable.tsx
├── lib/
│   ├── supabase-client.ts
│   ├── auth-provider.tsx
│   ├── twitter-client.ts
│   ├── gemini-client.ts
│   └── virality-calculator.ts
├── styles/
│   └── skeuomorphic.css
├── middleware.ts
├── vercel.json
└── package.json
APIs a Implementar
Twitter Client:

getUserProfile(username) - Obtener datos de perfil
getUserTweetsSince(userId, maxResults, sinceDate) - Tweets después de fecha
getTweetReplies(tweetId) - Obtener comentarios

Gemini Client:

analyzePoliticalPositions(tweets[]) - Análisis político
analyzeCommentsSentiment(comments[]) - Clasificar sentimiento
generateEmbedding(text) - Generar vector embedding

Virality Calculator:

calculateProfileScores(profileId) - Calcular todos los scores del perfil


✅ Checklist de Desarrollo
Setup (30 min)

 Crear repo en GitHub
 Inicializar proyecto Next.js
 Configurar Supabase
 Configurar variables de entorno

Base de Datos (1h)

 Crear tablas en Supabase
 Configurar RLS policies
 Activar pgvector

Autenticación (1h)

 Supabase Auth con Google
 Middleware de protección
 Página de login

Vista Perfil (3h)

 Input de URL
 Integración Twitter API
 Análisis con Gemini
 Tabla de categorías editable

Vista Análisis (2h)

 Scroll vertical con blur
 Panel de análisis
 Análisis de comentarios

Vista Comparativo (3h)

 Agregar/quitar cuentas
 Cálculo de viralidad
 Tablas de outliers

Actualización Automática (2h)

 Cron job en Vercel
 Lógica de actualización incremental
 Recálculo de scores

Diseño (2h)

 CSS skeuomorphic
 Animaciones
 Responsive

Deploy (1h)

 Conectar GitHub con Vercel
 Configurar variables de entorno
 Testing en producción

Tiempo total estimado: 15 horas

🎯 Puntos Críticos

Scores por perfil independientes: Cada perfil calcula su propia media
Actualización incremental: Solo traer tweets nuevos (optimización)
100 comentarios aleatorios: Si hay más, seleccionar aleatoriamente
Loading en embeddings: Proceso puede tomar tiempo
Categorías dinámicas: LLM decide categorías relevantes
Max 25 cuentas: Límite en comparación
Solo perfil principal en análisis: Vista 2 solo muestra perfil principal
Persistencia: Cuentas de comparación se guardan y actualizan automáticamente
