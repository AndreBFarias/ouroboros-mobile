# R-DX-5 — M-DX-EAS-LOCAL-BUILD-DOCS

**Tipo**: docs
**Estimativa**: 1h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-DX → R-DX-5.

Doc `docs/EAS-LOCAL-BUILD.md` consolidando o fluxo de build local (alpha-5 em diante via GitHub Actions local). Atualmente disperso em commits.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `docs/EAS-LOCAL-BUILD.md`.

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos criados.
2. Hash do commit.
3. Path do worktree + branch.
4. Doc cobre: workflow GH Actions, secrets (Q17.e), comando local, troubleshooting (A38/A39).
