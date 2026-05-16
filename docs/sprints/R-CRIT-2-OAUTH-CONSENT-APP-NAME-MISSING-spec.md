# R-CRIT-2 — M-OAUTH-CONSENT-APP-NAME-MISSING

**Tipo**: fix (Google Cloud Console + AndroidManifest)
**Prioridade**: P1-high
**Estimativa**: 1-2h
**Tranche**: R-CRIT
**Fase**: 1
**Spec sibling**: R-SEC-1 (verificação completa Google)

## Fonte canônica

Briefing completo em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-CRIT → R-CRIT-2.

**Sintoma**: consent screen do Google mostra
"Protocolo-Mob-Ouroboros" (nome do repo) em vez de "Ouroboros".
Tela de permissões do Android idem.

**Hipóteses técnicas**:
- Nome no OAuth Consent Screen do Cloud Console editável
- Logo do app no consent: upload PNG 120x120 mínimo
- `android:label` no `AndroidManifest.xml`
- `app.json → expo.name`

## Dependências

- **Bloqueia**: R-INT-1, R-INT-2
- **Bloqueado por**: R0 (lexical) — paralelo possível

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app.json` `expo.name` /
`expo.android.label` se aplicável, `app.json` (com aprovação
explícita), `docs/RELEASE.md` para checklist Cloud Console.

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test:
adb shell pm dump com.ouroboros.mobile | grep -i "label"
# Validacao Cloud Console manual: screenshot do consent screen
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Screenshot do consent screen pos-fix (em `docs/sprints/R-CRIT-2-screenshots/`).
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Checklist Cloud Console em `docs/OAUTH-SETUP.md` atualizado.
7. Achados colaterais.
