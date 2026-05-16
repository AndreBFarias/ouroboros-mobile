# R-CRIT-4 — M-LOADER-LOGO-GIF-QUEBRADO

**Tipo**: fix (animação)
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Tranche**: R-CRIT
**Fase**: 1

## Fonte canônica

Briefing completo em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-CRIT → R-CRIT-4.

**Sintoma**: `OuroborosLoader` (M25) aparece estático em alguns
pontos (`/agenda`, `/recap` pós refresh).

**Hipóteses técnicas**:
- `cancelAnimation` chamado em unmount sem re-mount limpo
- Gates `__DEV__` desabilitando Reanimated em production
- `data-anim-id` no web (M25.2) duplicando em múltiplos loaders →
  gerar UUID por instância

## Dependências

- **Bloqueia**: nenhuma (cosmético, não-crítico para release)
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/ui/OuroborosLoader.tsx`,
`src/lib/ui/animacao*.ts`, consumers do loader.

## Verificação canônica

```bash
./scripts/smoke.sh
```

Gauntlet: captura 5 screenshots t+100ms, t+500ms, t+1000ms — anéis em ângulos visivelmente distintos em todos.

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Caso E2E novo: spawn 3 loaders simultâneos, verifica que todos animam.
7. 3 screenshots Gauntlet em `docs/sprints/R-CRIT-4-screenshots-gauntlet/`.
8. Achados colaterais.
