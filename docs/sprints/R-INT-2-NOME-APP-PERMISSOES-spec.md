# R-INT-2 — M-INTEGRACOES-NOME-APP-PERMISSOES

**Tipo**: fix
**Prioridade**: P1-high
**Estimativa**: 1-2h
**Tranche**: R-INT
**Fase**: 2
**Spec sibling**: R-CRIT-2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-INT → R-INT-2.

Conexão Saúde + onboarding "Permissões do App" exibem nome técnico. Devem exibir "Ouroboros" + ícone canônico. Causa raiz provável em `AndroidManifest.xml` (label de activity) + Health Connect rationale activity.

## Dependências

- **Bloqueia**: R-INT-3
- **Bloqueado por**: R-CRIT-2 (mesma causa raiz)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `AndroidManifest.xml` (com aprovação), `app.json` android labels, rationale activity de Health Connect.

## Verificação canônica

```bash
./scripts/smoke.sh
./gradlew lint  # sem warnings de label ausente
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Screenshot Health Connect → Apps mostrando "Ouroboros" + ícone.
3. Screenshot onboarding permissões.
4. Saída `./scripts/smoke.sh`.
5. **Hash do commit (OBRIGATÓRIO)**.
6. Path do worktree + branch.
7. Achados colaterais.
