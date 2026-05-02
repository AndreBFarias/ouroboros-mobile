# M10 Mini Humor — Adendo da spec

Este adendo complementa `docs/sprints/M10-spec.md` com aritmética
explícita de testes e nota de validação de hipótese. A spec original
permanece autoritativa em todo o resto.

## Aritmética de testes (obrigatório validar antes de iniciar)

- **Baseline confirmado**: `npm test --silent` retorna `Tests: 889
  passed, 889 total` e `Test Suites: 100 passed, 100 total` em
  2026-05-01.
- **Testes adicionados pela M10** (mínimo 12, distribuídos em 3
  suítes novas):
  - `tests/lib/schemas/humor_heatmap_cache.test.ts` — pelo menos 4
    casos: schema válido (fixture do cache real), `schema_version` 2
    rejeitado, `humor` fora de 1-5 rejeitado, `autor` desconhecido
    rejeitado.
  - `tests/lib/cache/humor-heatmap.test.ts` — pelo menos 4 casos:
    cache válido lê e parseia, cache ausente devolve `null`, cache
    com schema desconhecido devolve `Error`, JSON malformado devolve
    `Error`.
  - `tests/components/data/HumorHeatmap.test.tsx` — pelo menos 4
    casos: render de cores corretas por nível 1..5 e sem registro,
    estado vazio sem células, modo sobreposto renderiza dois layers,
    tap em quadrado emite `onSelectDia(date)`.
- **Projeção pós-sprint**: `Tests: 901 passed, 901 total` (889 + 12
  mínimo) com `Test Suites: 103 passed, 103 total`. Pode ficar
  acima se executor adicionar casos extras.
- **Veto**: PR com regressão (`< 889`) é bloqueada. Aumento sem
  novas suítes também é suspeito — investigar.

## Hipótese implementacional confirmada

Todos os 8 arquivos referenciados como "modificáveis" ou
"reutilizáveis" pela spec foram validados via `ls`:

- `src/lib/vault/paths.ts` (com `VAULT_FOLDERS.cache =
  '.ouroboros/cache'` na linha 217)
- `src/lib/schemas/index.ts`
- `app/(tabs)/_layout.tsx`
- `src/lib/vault/permissions.ts`
- `src/lib/stores/pessoa.ts`
- `src/components/ui/index.ts` (exporta `Chip`, `ChipGroup`,
  `EmptyState`, `BottomSheet`, `PersonAvatar`, `Screen`, `Header`,
  `Button`, `Toast`)
- `src/lib/motion.ts`
- `src/theme/tokens.ts`

Cache real existe em
`~/Protocolo-Ouroboros/.ouroboros/cache/humor-heatmap.json` com
`schema_version: 1`, contendo 1 célula `pessoa_a` em 2026-04-29
(humor 4). Validação Nível A pode usar este cache real.

## Validação visual obrigatória

- **Nível A (Chrome MCP)** rodando ao longo da sprint, prints a cada
  marco visual: heatmap renderizado, modo sobreposto, modal de dia,
  empty state simulado.
- **Nível C (APK no celular físico)** ao final, com cache real
  sincronizado via Syncthing. Capturar screenshots em
  `docs/sprints/M10-screenshots/`.

## Push automático

Smoke verde + tests verdes + tsc verde + expo export verde =
`git push origin main` direto (autorização durável dada em M05).
