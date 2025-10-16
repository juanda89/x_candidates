# Visual QA con Playwright MCP

Objetivo: tras cambios de frontend, capturar screenshots del “buscador” (vista Perfil) y validar rápidamente que el diseño cumple lo solicitado.

## Requisitos
- MCP Playwright configurado en `~/.codex/config.toml`:
  
  [mcp_servers.playwright]
  command = "npx"
  args = ["@playwright/mcp@latest"]
- URL a probar (`BASE_URL`) del entorno (Vercel o local). Ej.: https://x-candidates.vercel.app
- Rutas objetivo: `/perfil` (buscador). Opcional: `/analisis`, `/comparar`, `/categorias`.

## Viewports y rutas
- Desktop: 1280×800 → `artifacts/screenshots/buscador-desktop.png`
- Mobile: 390×844 (iPhone 12 aprox.) → `artifacts/screenshots/buscador-mobile.png`

## Flujo con MCP (sugerido)
1) Solicita capacidades del servidor Playwright (tools disponibles). El agente listará acciones (abrir página, setViewport, screenshot, etc.).
2) Pide al agente ejecutar estos pasos por viewport:
   - Abrir `BASE_URL/perfil`.
   - Establecer viewport `[ancho, alto]`.
   - Esperar a que el input del buscador sea visible (placeholder “https://x.com/usuario o @usuario”).
   - Quitar barras/overlays si las hubiera (aceptar banners, etc.).
   - Capturar screenshot de `body` a `artifacts/screenshots/buscador-<desktop|mobile>.png`.
3) Descarga/visualiza los archivos generados.

Ejemplo de petición al agente
- “Playwright MCP: abre {BASE_URL}/perfil con 1280×800, espera el input del buscador y guarda screenshot en artifacts/screenshots/buscador-desktop.png. Repite con 390×844 en .../buscador-mobile.png. Confirma rutas de salida.”

## Criterios de aceptación rápidos
- El input del buscador debe ser visible, sin desbordes ni solapamientos.
- Botón “Analizar” visible y habilitable.
- En mobile (390×844), el layout no debe provocar scroll horizontal.

## Baselines y actualización
- Carpeta de Baselines: `docs/visual-qa/baseline/` (opcional). Guarda aquí el “diseño aprobado”.
- Carpeta de Capturas actuales: `artifacts/screenshots/` (no versionado en CI por defecto). Compara manualmente con el baseline o usa una herramienta externa.

## Notas
- Si MCP no está disponible en CI, puedes usar Playwright CLI local: `npx playwright test` con un spec que haga `page.goto` y `page.screenshot`. Mantén la salida en `artifacts/screenshots/`.
- Si hay banners de cookies u otros overlays, añade pasos para cerrarlos antes de la captura.
