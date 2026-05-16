# R-INT-3 — M-INTEGRACOES-HEALTH-CONNECT-NAO-FUNCIONA

**Tipo**: bug
**Prioridade**: P1-high
**Estimativa**: 2-4h
**Tranche**: R-INT
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-INT → R-INT-3.

Q17 fechou writes em ExerciseSession/Weight/BodyFat/MenstruationFlow/Steps, mas validação live alpha-11 mostra **dados não sincronizam**: treino salvo não aparece em Samsung Health / Google Fit; peso registrado não aparece em HC.

**Hipóteses técnicas**:
- Permissão concedida mas escopo errado (read vs write)
- Hook `escreverHealthConnect` capturando erro silenciosamente (AUDIT-T1B3 padrão recorrente)
- `react-native-health-connect` versão pinned mudou API
- HyperOS pode requerer permission grant via UI manual fora do app

Toast de erro **explícito** se permissão falhar (não silenciar).

## Dependências

- **Bloqueia**: F1 (field test Health Connect)
- **Bloqueado por**: R0, R-INT-2 (nome do app), R-CRIT-3 (mídia ausente — pode ser raiz comum)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/lib/health/sync.ts`, `src/lib/health/resumo.ts`, `src/components/saude-fisica/CardHCResumo.tsx`, `src/lib/stores/settings.ts` (toggle HC).

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test:
# 1. Salvar treino no app
# 2. Aguardar 30s
# 3. Verificar Samsung Health / Google Fit
adb shell pm dump com.ouroboros.mobile | grep -i "health"
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Validação Nível C: treino + peso aparecem em HC ≤30s.
7. Toast explícito em caso de falha de permissão.
8. Achados colaterais.
