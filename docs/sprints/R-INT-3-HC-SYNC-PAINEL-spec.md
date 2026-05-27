# R-INT-3-HC-SYNC-PAINEL — Painel de sync HC em Settings (status última sync + botão manual + telemetria)

**Tipo**: feature
**Prioridade**: P3-low
**Estimativa**: 2-3h
**Tranche**: R-INT (Onda 3P)

## Fonte canônica

Consolida 3 achados contingentes do `_BACKLOG.md` que tocam a MESMA superfície
(`app/settings/integracoes.tsx`) — agrupados em 1 sprint para evitar 3x conflito de merge:
- **R-INT-3-HC-SETTINGS-STATUS** — UI "Última sync HC" por tipo.
- **R-INT-3-HC-AUTOPULL-UI-MANUAL** — botão "Sincronizar agora".
- **R-INT-3-HC-AUTOPULL-TELEMETRIA** — contagem de records da última rodada.

## Hipóteses técnicas (validar via grep)

1. `src/lib/stores/settings.ts` já tem `hcAutopullUltimaSync: Record<TipoHC, string|null>`
   (linha ~126) — fonte do "última sync por tipo". Telemetria (novos por rodada) exige campo
   novo `hcAutopullUltimaRodada?: { rodadoEm: string; novos: number; erros: number }`.
2. `orquestrarHCAutopull(puxadores)` (`autopullScheduler.ts`) retorna `{rodadoEm, tipos[]}`
   — o botão manual chama ele com os 5 puxadores (mesmo array do `_layout`) e grava a rodada.
3. `app/settings/integracoes.tsx` é a tela; render condicional ao `featureToggles.healthConnectSync`.

## Entregáveis

- `app/settings/integracoes.tsx` — bloco "Sincronização" no card HC: lista "Última sync:
  <tipo> há N" (de `hcAutopullUltimaSync`), botão "Sincronizar agora" (dispara orquestrar +
  toast), linha "Última rodada: N novos" (telemetria).
- `src/lib/stores/settings.ts` — campo `hcAutopullUltimaRodada` + setter.
- `src/lib/health/autopullScheduler.ts` — gravar a telemetria da rodada (ou no caller).
- Helper PT-BR "há N dias/horas" — reusar de datetime se existir (`src/lib/datetime/`).
- Testes + E2E Gauntlet (`tests/e2e/playwright/`) do painel.

## OFF-LIMITS
- Pode: `app/settings/integracoes.tsx`, `settings.ts` (campo novo), `autopullScheduler.ts`
  (telemetria), componentes settings, testes. Não: puxadores, bridge.

## Restrições
- UI PT-BR Sentence case + acento; accessibilityLabel sem acento; sem emoji; ADR-0005
  (sem comparativo negativo). Atualizar `docs/FEATURES-CANONICAS.md` §3.7. Worktree.

## Verificação canônica
```bash
./scripts/bootstrap-worktree.sh && npx tsc --noEmit
npm test --silent -- --testPathPattern="settings|integracoes|autopull"
./scripts/smoke.sh
```
Validação visual Gauntlet (orquestrador) + screenshots.

## Proof-of-work
1. diff. 2. jest verde. 3. smoke. 4. hash+branch. 5. screenshots. 6. achados→sprint.
