# R-SEC-4 — M-SEC-PROGUARD-MINIFY

**Tipo**: infra
**Prioridade**: P2-medium
**Estimativa**: 2-4h
**Tranche**: R-SEC
**Fase**: 4

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SEC → R-SEC-4.

`android/app/build.gradle` com `minifyEnabled true` + `shrinkResources true` em release. Regras ProGuard para Expo + RN + Reanimated + Health Connect. APK final ≥15% menor.

Atenção a regressões em features sensíveis (Reanimated 4, Health Connect, BottomSheet).

## Dependências

- **Bloqueia**: M41 (release final menor)
- **Bloqueado por**: R-CRIT-3 (mídia ausente — pode mascarar regressão), Q22 fechado

## OFF-LIMITS

Padrão T1. **Pode tocar**: `android/app/build.gradle`, `android/app/proguard-rules.pro` (com aprovação para mudança em android/).

## Verificação canônica

```bash
./scripts/smoke.sh
./gradlew assembleRelease
# Compare APK size before/after
```

## Proof-of-work

1. Lista de arquivos modificados.
2. APK size antes/depois (deve cair ≥15%).
3. Hash do commit.
4. Path do worktree + branch.
5. Smoke + Gauntlet verde pós-minify.
6. Validação Nível C: 3 features sensíveis (Reanimated, HC, BottomSheet) sem regressão.
