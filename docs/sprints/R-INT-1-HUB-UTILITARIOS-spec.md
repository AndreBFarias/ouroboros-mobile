# R-INT-1 — M-INTEGRACOES-HUB-UTILITARIOS

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-INT
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-INT → R-INT-1.

Entry "Integrações" em `MenuLateral > Utilitários` (ícone `Plug` ou `Zap`). Rota `/integracoes` (ou move o atual `/settings/integracoes` para canônico). Lista:
- Health Connect (Q17)
- Google Calendar (Q22.B + R-CRIT-1)
- (Spotify/YouTube/Drive: R-INT-2/3/4)

Cada integração: nome canônico, estado (Conectado/Desconectado/Erro), toggle direto, botão conectar/desconectar, última sincronização.

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: R0, R-CRIT-2 (nome app correto)

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `app/integracoes.tsx`,
`src/components/screens/IntegracoesScreen.tsx`, `MenuLateral` entry novo.

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Screenshot Gauntlet em `docs/sprints/R-INT-1-screenshots-gauntlet/`.
7. Achados colaterais.
