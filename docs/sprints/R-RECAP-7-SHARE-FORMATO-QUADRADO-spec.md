# R-RECAP-7-SHARE-FORMATO-QUADRADO — Compartilhar slide Memórias em formato quadrado (feed) além de stories

**Tipo**: feature
**Prioridade**: P3-low
**Estimativa**: 1-2h
**Tranche**: R-RECAP

## Fonte canônica

`_BACKLOG.md` (contingente "formato de share social adicional"). O R-RECAP-6 (`011004a`)
entregou o compartilhamento do slide Memórias como PNG **1080×1920** (stories). Esta sprint
adiciona o formato **quadrado 1080×1080** (feed/post), escolhível antes do share.

## Hipóteses técnicas (validar via grep)

1. O share vive no slideshow Memórias (`app/recap-memorias.tsx`) + helper
   `src/lib/midia/exportarSlideMemorias.ts` (R-RECAP-6) que usa `react-native-view-shot`
   `captureRef` com `width/height` forçados 1080×1920 + `expo-sharing`.
2. O parametrizável é o tamanho do capture; a UI oferece escolha de formato antes de capturar.

## Entregáveis

- `src/lib/midia/exportarSlideMemorias.ts` — aceitar `formato: 'stories' | 'quadrado'`
  (1080×1920 | 1080×1080); default 'stories' (retrocompat).
- `app/recap-memorias.tsx` — ao tocar Compartilhar, oferecer escolha (sheet/2 botões:
  "Stories" / "Post quadrado") antes do capture. Tom ADR-0005, sem exclamação.
- Testes: `tests/lib/midia/exportarSlideMemorias.test.ts` — dimensões por formato.

## OFF-LIMITS
- Pode: `exportarSlideMemorias.ts`, `app/recap-memorias.tsx`, teste. Não: outros recaps;
  `package.json`.

## Restrições
- UI PT-BR Sentence case + acento; sem emoji; export efêmero (não persiste no Vault, como
  R-RECAP-6). Atualizar `docs/FEATURES-CANONICAS.md` §7.1. Worktree.

## Verificação canônica
```bash
./scripts/bootstrap-worktree.sh && npx tsc --noEmit
npm test --silent -- --testPathPattern="exportarSlideMemorias|recap-memorias"
./scripts/smoke.sh
```
Validação visual Gauntlet (escolha de formato) — captura real é Nível B/C (view-shot nativo).

## Proof-of-work
1. diff. 2. jest verde. 3. smoke. 4. hash+branch. 5. achados→sprint.
