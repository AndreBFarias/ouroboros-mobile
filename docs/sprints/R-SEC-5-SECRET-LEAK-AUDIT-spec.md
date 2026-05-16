# R-SEC-5 — M-SEC-SECRET-LEAK-AUDIT

**Tipo**: infra + audit
**Prioridade**: P1-high
**Estimativa**: 1-2h
**Tranche**: R-SEC
**Fase**: 4

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SEC → R-SEC-5.

`gitleaks detect --source . --no-banner` em todo o histórico. Qualquer leak detectado → rotacionar credencial **antes** de fechar a sprint. Pre-commit hook bloqueia commits com padrões suspeitos.

## Dependências

- **Bloqueia**: F1 (não pode field-testar com leak conhecido)
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: `hooks/pre-commit` (adicionar bloco gitleaks), criar `docs/SECURITY.md`.

## Verificação canônica

```bash
./scripts/smoke.sh
gitleaks detect --source . --no-banner  # zero findings
```

## Proof-of-work

1. Saída literal `gitleaks detect --source . --no-banner` — zero findings.
2. Lista de credenciais rotacionadas (se houver leak).
3. Hash do commit.
4. Path do worktree + branch.
5. Demo de bloqueio: tentar commit com fake key → bloqueado.
