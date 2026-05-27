# R-SEC-7-PROGUARD-HC-EXTENDED — Regras ProGuard defensivas para classes HC não-record

**Tipo**: infra (hardening release)
**Prioridade**: P3-low
**Estimativa**: 30min-1h
**Tranche**: R-SEC

> ID **R-SEC-7** (R-SEC-5 = secret-leak-audit, R-SEC-6 = npm-audit já usados).

> **STATUS: `[ok-analise]` — RESOLVIDO POR ANÁLISE 2026-05-26, sem mudança de código.**
> A regra existente em `app.json` `-keep class androidx.health.connect.client.** { *; }`
> é **recursiva** (`**`) e já cobre `androidx.health.connect.client.request.**`,
> `.units.**`, builders, request objects e todas as subpackages — tornar regras
> específicas seria redundante (débito). Confirmado via
> `grep -oE "androidx.health.connect.client[^ ]*" app.json`: já há `client.**` +
> `client.records.**`. **Nenhuma regra nova necessária.** Reabrir SOMENTE se a validação
> live (R-INT-3-HC-LIVE-CHECKPOINT, release alpha-32) acusar `ClassNotFoundException` de
> classe HC concreta fora desse glob — aí adicionar o `-keep` pontual da classe real.

## Fonte canônica

`docs/sprints/R-SEC-4-PROGUARD-CLEANUP-spec.md` (não-objetivo): "se durante validação real
release surgir `ClassNotFoundException` de **outra** classe que não record (builders,
request objects), registrar como sprint nova R-SEC-PROGUARD-HC-EXTENDED". Proativa: adicionar
`-keep` defensivo para as classes HC acessadas por reflexão além dos records, reduzindo risco
de crash em release shrink (R8/minify ON em `app.json`).

## Hipóteses técnicas (validar via grep)

1. `app.json` `expo.plugins[expo-build-properties].android.extraProguardRules` já tem
   `-keep class androidx.health.connect.client.** { *; }` + records. Faltam regras
   explícitas para `androidx.health.connect.client.request.**` (ReadRecordsRequest,
   AggregateRequest) e `androidx.health.connect.client.units.**` se acessados por reflexão.
2. `enableMinifyInReleaseBuilds: true` + `enableShrinkResourcesInReleaseBuilds: true`
   (confirmar em `app.json`).

## Entregáveis

- `app.json` — adicionar ao `extraProguardRules` (string com `\n` literais):
  `-keep class androidx.health.connect.client.request.** { *; }` e
  `-keep class androidx.health.connect.client.units.** { *; }` (defensivo).
  JSON válido após edit (`node -e "JSON.parse(...)"`).

## OFF-LIMITS
- Pode: única chave `extraProguardRules` em `app.json`. Não: outras chaves; código;
  `package.json`.

## Restrições
- Comentário ProGuard em ASCII (sem acento — convenção do bloco). JSON válido. Worktree.
- Não remover regras existentes (HC bridge `com.ouroboros.healthconnect.**`, records).

## Verificação canônica
```bash
node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))" && echo "json ok"
grep -c "androidx.health.connect.client" app.json   # >= 3 apos edit
./scripts/smoke.sh   # inalterado (proguard nao roda em jest)
```
Validação real: release alpha-32 SDK 56, logcat sem `ClassNotFound|NoSuchMethod|VerifyError`
nas superfícies HC (parte do R-INT-3-HC-LIVE-CHECKPOINT).

## Proof-of-work
1. diff (so app.json). 2. greps. 3. json válido. 4. smoke. 5. hash+branch.
