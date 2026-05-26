# R-INT-3-HC-DOC-VERSION-FIX-RESIDUO — Comentario residual de versao em build.gradle

**Tipo:** docs (micro)
**Prioridade:** P3
**Estimativa:** 10min
**Fase:** infra
**Depende de:** R-INT-3-HC-DOC-VERSION-FIX (`ad2652a` — corrigiu index.ts + .kt; build.gradle ficou OFF-LIMITS)

## Origem

Achado AC-1 de R-INT-3-HC-DOC-VERSION-FIX: `modules/health-connect/android/build.gradle:11`
ainda tem comentario citando `1.2.0-alpha04` numa nota tecnica
(`// API nova (1.2.0-alpha04): construtor Metadata(...) virou internal desde alpha12`).
A versao instalada/canonica e `connect-client:1.1.0` (linha 58). O comentario nao
declara a versao instalada (e nota sobre comportamento da API nas series alpha),
mas o numero confunde auditoria.

## Objetivo

Reescrever o comentario da linha 11 para NAO implicar que `1.2.0-alpha04` esta
instalado. Opcoes (executor escolhe a mais clara):
- "API series alpha (1.2.0-alphaNN): construtor Metadata(...) virou internal desde alpha12 — usamos 1.1.0 estavel", OU
- remover a nota se nao agrega (a build usa 1.1.0).

Mudanca de UM comentario. Zero impacto em build/runtime.

## OFF-LIMITS
- NAO mudar a versao real `connect-client:1.1.0` (linha 58) nem nenhuma logica de build.

## Acceptance
1. `grep "1.2.0-alpha04" modules/health-connect/android/build.gradle` → 0 (ou reescrito sem implicar instalacao).
2. `grep "connect-client:1.1.0" build.gradle` → mantido.
3. anonimato + smoke verdes (smoke nao roda Gradle; so confirma nao-regressao JS).

## Verificacao
```bash
grep -n "1.2.0-alpha04\|connect-client:1.1.0" modules/health-connect/android/build.gradle
./scripts/check_anonimato.sh
```

## Referencias
- Achado AC-1 (proof-of-work R-INT-3-HC-DOC-VERSION-FIX `ad2652a`).
