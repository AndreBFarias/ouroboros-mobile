# Sprint M-GAUNTLET-FAST-BOOT-FOLLOWUP — Aplicar +html.tsx em build web

```
DEPENDE:    M-GAUNTLET-FAST-BOOT fechada (infra pronta)
BLOQUEIA:   nenhuma (otimizacao residual)
ESTIMATIVA: 1-2h
PRIORIDADE: baixa
STATUS:     [todo]
```

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
