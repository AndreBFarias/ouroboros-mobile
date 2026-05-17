# R-INFRA-GAUNTLET-AGENDA-MOCK — API __gauntlet pra popular eventos agenda

**Tipo**: infra + DX
**Prioridade**: P3-low
**Estimativa**: 1h
**Fase**: 3
**Origem**: achado colateral R-HOME-2 (commit `bc51b87`)

## Problema

E2E playwright de R-HOME-2 (`tests/e2e/playwright/r-home-2-proximos-eventos-merge.e2e.ts`) cobre 2 cenários:
- Cenário 1: mescla 3 itens (2 eventos agenda + 1 alarme)
- Cenário 2: fallback sem OAuth (apenas alarmes)

**Cenário 1 está bloqueado**: a API `window.__gauntlet` em `src/lib/dev/gauntlet.ts` não tem método para popular eventos da agenda via `useVaultMock`. Sem isso, validação visual via Gauntlet Nível A+ do merge agenda+alarmes não é possível.

R-HOME-2 entregou cobertura completa via testes unit + RTL; visual via Gauntlet ficou pra esta sprint follow-up.

## Objetivo

Adicionar `__gauntlet.setEventosAgendaMock(pessoa, eventos)` ao runtime dev. Permite E2E playwright + Nível A+ validar mescla cronológica determinística.

## Entregáveis

### Função em `src/lib/dev/gauntlet.ts`

```typescript
setEventosAgendaMock: (pessoa: 'pessoa_a' | 'pessoa_b', eventos: AgendaEvento[]) => {
  useVaultMock.getState().setEventos(pessoa, eventos);
}
```

### Setter em `useVaultMock`

Adicionar action ao store `src/lib/stores/useVaultMock.ts` (ou similar — confirme via Glob) que aceita eventos por pessoa e os retorna em `listarEventosAgenda`.

### Atualizar E2E

Em `tests/e2e/playwright/r-home-2-proximos-eventos-merge.e2e.ts` cenário 1:
- Chamar `__gauntlet.setEventosAgendaMock('pessoa_a', [evt1, evt2])`
- Verificar render no DOM dos 3 itens em ordem cronológica
- Capturar screenshot `A-mescla-agenda-alarme.png`

### Documentação

Em `docs/GAUNTLET.md` (ou similar — Glob): adicionar `setEventosAgendaMock` à lista de APIs dev.

## OFF-LIMITS

**Pode tocar**:
- `src/lib/dev/gauntlet.ts` (estender)
- `src/lib/stores/useVaultMock.ts` (estender)
- `tests/e2e/playwright/r-home-2-proximos-eventos-merge.e2e.ts` (estender)
- `docs/GAUNTLET.md` (atualizar)

**Não pode tocar**:
- Hook `useProximos` (R-HOME-2 já entregou)
- Helper `mesclarAgendaAlarmes` (R-HOME-2 já entregou)
- Componente `SecaoProximos.tsx` (R-HOME-2 já entregou)

## Verificação

```bash
./scripts/smoke.sh
# E2E playwright: cenário 1 agora deve renderizar 3 itens
```

## Proof-of-work

1. Arquivos modificados.
2. E2E playwright cenário 1 + cenário 2 ambos passando.
3. Screenshot Gauntlet `A-mescla-agenda-alarme.png` mostrando 3 itens em ordem.
4. Hash do commit.

## Decisão

- P3 porque é infra de teste E2E, não bug de produção. R-HOME-2 já entregue com cobertura unit + RTL.
- Sprint pequena, pode ser agrupada com outras DX (R-DX-EXECUTOR-WORKTREE-ENFORCE, R-INFRA-GAUNTLET-WORKTREE-SYMLINK).
