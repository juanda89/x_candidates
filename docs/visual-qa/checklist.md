# Checklist Visual – Buscador (/perfil)

- [ ] Definir `BASE_URL` del entorno (Vercel/staging/local)
- [ ] Pedir al agente: listar capacidades del MCP Playwright
- [ ] Captura Desktop (1280×800) → `artifacts/screenshots/buscador-desktop.png`
- [ ] Captura Mobile (390×844) → `artifacts/screenshots/buscador-mobile.png`
- [ ] Validar criterios: input visible, botón “Analizar”, sin scroll horizontal en mobile
- [ ] Comparar con baseline si existe (`docs/visual-qa/baseline/`)
- [ ] Adjuntar imágenes al PR (o subir a artefactos de CI)
