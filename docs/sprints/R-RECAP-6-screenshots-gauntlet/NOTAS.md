# R-RECAP-6 — Notas de validação visual

Sprint: R-RECAP-6 (botão Compartilhar no slideshow Memórias)
Executor: agente em worktree `agent-abf1e98d74d7069dc`
Data: 2026-05-16

## Estado da validação Gauntlet

**Captura visual impossível neste ciclo de executor. Validação humana
pós-merge obrigatória.**

### Tentativa 1 (CLI X11 / scrot+xdotool)

- DISPLAY=:1, XDG_SESSION_TYPE=x11 (sessão X11 ativa, ferramentas
  disponíveis: scrot, import, xdotool, wmctrl).
- Janela "Ouroboros - Google Chrome" encontrada, mas conteúdo
  apresentado é de outro worktree (`agent-a8730672bac010bb7`), não
  reflete a alteração desta sprint.

### Tentativa 2 (claude-in-chrome MCP)

- Extensão pareada com Chrome, mas o app rodando é do worktree
  paralelo. Captura mostraria código antigo, gerando evidência
  enganosa.

### Tentativa 3 (playwright MCP em porta alternativa)

- Subi Metro próprio em `localhost:8082` apontando para este
  worktree (export `EXPO_ROUTER_APP_ROOT` + `EXPO_PROJECT_ROOT`).
- Metro respondeu, mas o bundle falhou ao resolver
  `react-native-view-shot`:

  ```
  Import stack:
   src/lib/midia/exportarSlideMemorias.ts
   | import "react-native-view-shot"
   app/recap-memorias.tsx
   | import "@/lib/midia/exportarSlideMemorias"
  ```

  Causa: o pacote `react-native-view-shot@4.0.3` está declarado em
  `package.json`, mas `node_modules` é symlink compartilhado com o
  repo principal e o pacote ainda não foi instalado fisicamente
  (instalação real acontece no `npm install` pós-merge ou no
  `expo prebuild` da próxima APK).

  Mexer no `node_modules` compartilhado afetaria outros worktrees
  ativos — fora do escopo deste executor.

### Caminho aprovado: validação humana pós-merge

1. **No main pós-merge**: `npm install` (resolve `react-native-view-shot@4.0.3`).
2. **Build APK** (preview ou dev-client) ou Gauntlet web local.
3. Abrir Recap > Memórias no Xiaomi.
4. Confirmar 2 ícones no header: Pausar (esquerda) + Compartilhar
   (Share2, ao lado direito do Pausar, left=64dp).
5. Tap em Compartilhar → toast "Preparando…" + share sheet do
   Android abre.
6. Selecionar app destino (WhatsApp/Instagram/Telegram).
7. Confirmar PNG 1080×1920 chega com layout correto.

## Coverage testual

Como a captura visual está bloqueada, a evidência funcional está em
testes unidade/componente:

- `tests/lib/midia/exportarSlideMemorias.test.ts`: 13 testes
  - dimensões 1080×1920 forçadas
  - captureRef com format=png, quality=1, result=tmpfile
  - cleanup do tmpfile origem após copy
  - fallback se copyAsync falhar
  - erro de captura devolve `{ uri: null, motivo: 'erro' }`
  - web devolve `{ uri: null, motivo: 'web' }` sem chamar captureRef
  - compartilharSlidePng: dialogTitle="Compartilhar",
    mimeType=image/png
  - removerSlidePngTemp: idempotent=true, silencia erro
- `tests/app/recap-memorias-share.test.tsx`: 5 testes
  - botão Share renderiza ao lado do botão Pausar
  - tap pausa slideshow + chama exportarSlideMemorias
  - erro de captura não trava UI
  - web não chama share
  - double-tap não dispara captura concorrente

Total: +18 testes, 0 falhas.
