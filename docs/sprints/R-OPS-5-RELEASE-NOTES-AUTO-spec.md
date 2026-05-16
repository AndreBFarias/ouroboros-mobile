# R-OPS-5 — M-OPS-RELEASE-NOTES-AUTO

**Tipo**: infra
**Estimativa**: 1-2h
**Tranche**: R-OPS
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-OPS → R-OPS-5.

Script que extrai entries do CHANGELOG entre 2 tags e gera release notes automáticas no GitHub Release.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R-OPS-1 (workflow release)

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `scripts/changelog-to-release-notes.sh`.

## Verificação canônica

```bash
./scripts/smoke.sh
./scripts/changelog-to-release-notes.sh v1.0.0-alpha-11 v1.0.0
```

## Proof-of-work

1. Lista de arquivos criados.
2. Hash do commit.
3. Path do worktree + branch.
4. Exemplo de release notes gerado.
