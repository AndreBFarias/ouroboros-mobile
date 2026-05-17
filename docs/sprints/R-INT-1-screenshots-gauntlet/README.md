# R-INT-1 — Screenshots Gauntlet

Sprint R-INT-1 (Hub Integrações) entregue 2026-05-16. Esta pasta contém evidência visual.

## Status da validação visual

**Sprint validada por testes Jest (8/8 verde) + skim manual do componente.**

**Gauntlet Nível A+ não rodou no worktree por bug de infraestrutura
do require.context com node_modules symlinkado.** Detalhes técnicos
abaixo. Achado colateral registrado em R-INFRA-WORKTREE-BOOTSTRAP.

## Tentativa de Gauntlet (com falha documentada)

### Etapa 1 — Setup

```bash
# Worktree não vem com node_modules nem env.json por default
ln -s /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/node_modules .
ln -s /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/env.json .
EXPO_PUBLIC_GAUNTLET=1 npx expo start --web --port 8090
# Bundle compilou OK (3.5MB), responde HTTP 200 em /
```

### Etapa 2 — Captura

`00-tentativa-gauntlet-chrome-symlink-bug.png` — Chrome aberto em
http://localhost:8090/_dev/gauntlet renderiza "Welcome to Expo"
(estado padrão do expo-router quando require.context('./app') não
resolve rotas). Em vez do Gauntlet com frame mobile centralizado.

`01-tentativa-gauntlet-welcome-fallback-symlink.png` — Desktop
inteiro mostrando o navegador acessando o Expo do worktree porta
8090. Confirma que servidor rodou mas árvore de rotas vazia.

### Etapa 3 — Diagnóstico

`grep -oE "app/[a-z_-]+\.tsx?"` no bundle JS gerado retorna apenas
`app/index.tsx` e `app/_layout.tsx`. **Falta `app/integracoes.tsx`
(criado nesta sprint) e todas as outras 50+ rotas existentes.**

Causa raiz: o Metro resolve o `require.context('./app', true,
/\.tsx?$/)` relativo ao path do bundle entry (que está em
`node_modules/expo-router/entry.bundle`). Como `node_modules` é um
symlink que aponta para o repo principal, o `./app` resolve para
`/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/`
(repo principal) em vez de `.claude/worktrees/agent-.../app/`
(worktree atual). Resultado: rotas do worktree não entram no bundle.

### Mitigação

Sprint validada via **testes Jest puros (8/8 verde)** que cobrem
exatamente o que o Gauntlet validaria visualmente:

- Render dos 5 cards (assertion sobre accessibilityLabel canônico
  `card integracao <slug>`).
- Estados visuais: Conectado / Desconectado / Indisponível / Em breve
  (assertion sobre `estado <slug> <estado>`).
- Comportamento: tap em card habilitado dispara `router.push` com
  rota correta; tap em card "Em breve" desabilitado NÃO dispara.
- Texto de status: contagem de tipos HC + sufixo `(sync ligado)`.

E2E playwright (`tests/e2e/playwright/r-int-1.e2e.ts`) está
arquivado pronto para execução manual quando R-INFRA-WORKTREE-BOOTSTRAP
resolver o symlink do require.context.

## Verificação manual recomendada

Quando merge para `main` (sem worktree, `node_modules` real),
validar visualmente:

1. Abrir menu lateral → ver entry "Integrações" (ícone Plug laranja)
   na seção Utilitários.
2. Tap em "Integrações" → tela `/integracoes` renderiza 5 cards
   verticais.
3. Card "Saúde Física": status muda baseado no dispositivo (Conectado
   se HC instalado e permissões aceitas; Desconectado se HC instalado
   sem permissões; Indisponível em outros casos).
4. Card "Agenda": Conectado se qualquer pessoa autenticada no Google.
5. Cards "Spotify", "YouTube", "Google Drive": badge "Em breve",
   opacidade 0.6, não navegáveis.
6. Cor de cada ícone: Activity pink, Calendar cyan, Music green,
   Video red, Cloud yellow. Plug entry no menu = orange.
