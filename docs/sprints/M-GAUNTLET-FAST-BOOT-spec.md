# Sprint M-GAUNTLET-FAST-BOOT — Pré-cache de fontes para boot rápido

```
DEPENDE:    M-GAUNTLET-AUDITORIA fechada
            + M27.3 fechada (Suspense boundary)
BLOQUEIA:   nenhuma
ESTIMATIVA: 2-3h
PRIORIDADE: baixa (otimização de DX)
STATUS:     [todo]
```

## 1. Contexto

Auditoria 2026-05-04 item 26: useFonts SDK 54 web demora 30-60s
na primeira navegação fresh. Não há modo "fast boot". Cada sessão
do Gauntlet começa com essa espera.

## 2. Objetivo

Pré-cachear fontes JetBrainsMono em `public/fonts/` (servidas pelo
Metro web) e usar `<link rel="preload" as="font" crossorigin>` no
HTML inicial para eliminar a espera.

## 3. Entregáveis

- `public/fonts/JetBrainsMono-Regular.ttf` (copiado do node_modules).
- `public/fonts/JetBrainsMono-Medium.ttf`.
- Customização do `metro.config.js` ou `app.json` para servir
  arquivos estáticos do `public/`.
- `<link rel="preload">` injetado no HTML do bundle web (via
  `expo-router` / `app/+html.tsx` se existir).
- Documentação atualizada em `docs/GAUNTLET.md` (boot esperado:
  <5s).

## 4. Verificação

```bash
./gauntlet.sh
# Em browser: tempo de boot esperado: <5s.
# window.__gauntlet.tempoDeBoot() retorna < 5000.
```

## 5. Restrições

- Pré-cache só em web. Em mobile, useFonts continua como antes.
- Anonimato OK (fontes JetBrainsMono são open source).

Sprint pronta.
