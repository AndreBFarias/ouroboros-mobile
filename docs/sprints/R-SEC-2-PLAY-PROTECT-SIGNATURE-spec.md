# R-SEC-2 — M-SEC-PLAY-PROTECT-SIGNATURE

**Tipo**: infra
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-SEC
**Fase**: 4

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SEC → R-SEC-2.

Q17.e fechou keystore EAS em GitHub Secrets. Esta sprint valida flow completo + **registra keystore no Play Console** como app interno (não publica). Play Protect deixa de avisar após registro propagar (até 48h).

**Decisão D4 = Sim** (dono autorizou em 2026-05-15): pago $25
one-time. Setup completo do Play Console é a sprint sibling
[`R-PLAYCONSOLE-SETUP-spec.md`](R-PLAYCONSOLE-SETUP-spec.md)
(TODO list executável pro dono).

## Dependências

- **Bloqueia**: distribuição com Play Protect tranquilo
- **Bloqueado por**: Q17.e (`[ok]`), Decisão D4

## OFF-LIMITS

Padrão T1. **Pode tocar**: `docs/RELEASE.md` (checklist Play Console).

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test: APK instalado em 3 devices sem aviso de Play Protect
```

## Proof-of-work

1. Documentação atualizada.
2. Decisão D4 confirmada pelo dono.
3. Hash do commit.
4. Path do worktree + branch.
5. APK instalado sem aviso em 3 devices (validação live).
