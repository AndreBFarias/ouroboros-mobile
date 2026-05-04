# Sprint M-GAUNTLET-FAST-BOOT-FOLLOWUP — Aplicar +html.tsx em build web

```
DEPENDE:    M-GAUNTLET-FAST-BOOT fechada (infra pronta)
BLOQUEIA:   nenhuma (otimizacao residual)
ESTIMATIVA: 1-2h
PRIORIDADE: baixa
STATUS:     [ok] -- NAO-FIX documentado (2026-05-04)
```

## 0. Resolucao (2026-05-04) -- NAO-FIX documentado

Investigacao executada conforme spec. Resultado:

- **Caminho A (`web.output: "static"`)** -- inviavel. Reproduzido o
  erro original em `npx expo export --platform web`:
  ```
  TypeError: Cannot destructure property '__extends' of 'n.default'
  as it is undefined.
    at factory (node_modules/tslib/modules/index.js:3:5)
    at factory (node_modules/framer-motion/dist/es/render/dom/motion.mjs:1:1)
  ```
  Causa raiz: SSR Node de `framer-motion` (transitiva via `moti@0.30`)
  via `expo-router 6.0.23` SSG nao resolve `default` de `tslib`
  corretamente. Nao e bug do codigo de aplicacao.
- **Caminho B (`web.output: "single"`)** -- export funciona (5.73 MB
  bundle JS, 10.8 KB CSS). Mas o `index.html` gerado e o template
  padrao do `expo-router/cli` -- `+html.tsx` **NAO e lido**. Sem
  ganho.
- **Caminho C (injecao JS no `_layout`)** -- a fonte so comecaria
  a baixar apos o bundle JS parsear, anulando o ganho de paralelismo
  (que e a razao de existir o preload).

**Decisao:** NAO-FIX. Aguardar Expo SDK 55+ ou release `moti` que
nao quebre SSR.

**Sem regressao:** os arquivos de M-GAUNTLET-FAST-BOOT permanecem
versionados (`public/fonts/JetBrainsMono_*.ttf`,
`public/styles/flash-inicial.css`, `app/+html.tsx`) e servidos pelo
Metro em dev. Quando uma futura sprint retomar o caminho A apos fix
upstream, os preload tags voltam a ser efetivos imediatamente.

**Documentacao:**
- `app/+html.tsx` -- comentario expandido com motivo e tracking.
- `VALIDATOR_BRIEF.md` §4 -- armadilha **A23** registrada com
  causa raiz e decisao.
- `CHANGELOG.md` `[Unreleased]` -- entrada com aritmetica completa.
- `ROADMAP.md` -- status `[ok]`.

**Aritmetica:** 1293 -> 1293 testes. 145 suites. tsc 0. anonimato 0.
Bundle Hermes nao reexecutado (esta sprint nao tocou em runtime).

## 1. Achado (M-GAUNTLET-FAST-BOOT 2026-05-04)

`app/+html.tsx` foi criado com `<link rel="preload">` para
`JetBrainsMono` em `public/fonts/`. Validacao revelou:

- Em modo dev (`./run.sh --web` / `./gauntlet.sh`): Metro injeta
  HTML padrao, ignora `+html.tsx`. **Esperado** -- documentacao
  Expo Router confirma que `+html.tsx` so aplica em static
  rendering ou export.
- Em `npx expo export --platform web`: build gera `index.html`
  padrao SEM as preload tags. Tentativa de habilitar
  `web.output: "static"` em `app.json` quebrou build (exit 1).

## 2. Investigacao necessaria

1. Por que `web.output: "static"` falhou:
   - Pode ser rota `[/_dev/*]` ou `app/share-receive/` com
     getStaticPaths nao configurado.
   - Pode ser `expo-router` 6.0.23 ainda nao suporta SSG full
     com Expo SDK 54.
   - Investigar via `npx expo export --platform web --dump-assetmap`
     e ler erros no log.

2. Alternativa A: `web.output: "single"` (SPA sem static
   rendering) com `+html.tsx` funcionando -- alguns documentos
   sugerem que single mode tambem aplica `+html.tsx`. Testar.

3. Alternativa B: customizar `metro.config.js` para injetar
   preload via post-processing do bundle.

4. Alternativa C: mover preload para um script JS no `_layout.tsx`
   que adiciona `<link>` ao `<head>` no primeiro mount em web.
   Funcionaria em dev e em build, mas perderia o ganho do parallel
   download (font so comeca a baixar apos JS bundle parsear).

## 3. Estado parcial entregue por M-GAUNTLET-FAST-BOOT

- `public/fonts/JetBrainsMono_400Regular.ttf` (115 KB).
- `public/fonts/JetBrainsMono_500Medium.ttf` (115 KB).
- `public/styles/flash-inicial.css` (CSS de fundo Dracula
  pre-React).
- `app/+html.tsx` (preparado, aguarda investigacao).

Servidos pelo Metro em dev (`fetch('/fonts/...')` retorna 200).

## 4. Verificacao

```bash
./gauntlet.sh
# Validar que window.__gauntlet.tempoDeBoot() < 5000 em sessao
# fresh do Chrome (Ctrl+Shift+R com DevTools network throttling
# 'Slow 3G' para simular mobile).
```

Sprint pronta para investigacao posterior.
