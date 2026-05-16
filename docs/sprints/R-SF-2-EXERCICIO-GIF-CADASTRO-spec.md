# R-SF-2 — M-SAUDE-FISICA-EXERCICIO-GIF-CADASTRO

**Tipo**: validation (Q18 já fechou)
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Tranche**: R-SF
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SF → R-SF-2.

Q18 + Q18.b + Q18.x fecharam: schema com GIF/MP4/JPG opcional, player reusável. Esta sprint **valida em runtime real** + cobre lacuna: GIF corrompido cai para placeholder em vez de tela vermelha.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R-CRIT-3 (mídia ausente — pode estar relacionado)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/midia/MidiaExecucaoPlayer.tsx` (apenas adicionar error boundary), `src/components/midia/EmptyStateMidia.tsx`.

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
6. Validação Nível C: cadastrar exercícios com GIF/MP4/JPG/GIF-corrompido — todos renderizam placeholder ou conteúdo.
7. Achados colaterais.
