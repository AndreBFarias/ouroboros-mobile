# R-SEC-1 — M-SEC-GOOGLE-OAUTH-VERIFICATION

**Tipo**: docs + cloud-config
**Prioridade**: P1-high
**Estimativa**: 2-3h ativas + tempo de espera Google (até 6 semanas para sensitive scopes — não fazer agora)
**Tranche**: R-SEC
**Fase**: 4

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SEC → R-SEC-1.

Para uso pessoal entre 2 pessoas, manter Cloud Console em **Testing mode** + adicionar testers explícitos. Elimina aviso "app não verificado" para esses 2 emails.

Submissão para Production / Verification **descopada** ($15-75k para Security Assessment com sensitive scopes — não justifica para uso pessoal).

## Dependências

- **Bloqueia**: F1 (field test sem aviso de não-verificado)
- **Bloqueado por**: R-CRIT-1 (OAuth funcional)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `docs/RELEASE.md`, `docs/OAUTH-SETUP.md` (checklist Cloud Console).

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test: dono + Vitoria completam OAuth sem aviso
```

## Proof-of-work

1. Documentação atualizada.
2. Hash do commit.
3. Path do worktree + branch.
4. 2 emails de teste cadastrados em Cloud Console (screenshot).
