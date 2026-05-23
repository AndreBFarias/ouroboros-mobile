# R-INT-3-HC-BRIDGE-NATIVA-D — Cleanup migration sync.ts + remocao react-native-health-connect

**Tipo:** refactor + cleanup
**Prioridade:** P1 (fecha bridge nativa completa)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** sub-sprints A + B + C (availability + permissions + readRecords + insertRecords entregues em `modules/health-connect/`)

## Contexto

Sub-sprints A/B/C entregaram bridge nativa completa em `modules/health-connect/` (pacote `ouroboros-health-connect`):
- 7 conversores de leitura: Steps, ExerciseSession, Weight, BodyFat, HeartRate, SleepSession, MenstruationFlow.
- 4 builders de escrita: ExerciseSession, Weight, BodyFat, MenstruationFlow.
- API JS em `modules/health-connect/src/index.ts` espelha as assinaturas que `src/lib/health/{availability,permissions,sync}.ts` consumiam do upstream — migracao e' troca de import.

Auditoria pre-sprint (grep contra HEAD `7be4cc6`) confirma 3 arquivos em `src/lib/health/` ainda dependem do upstream `react-native-health-connect@3.5.3`:

| Arquivo | Linhas | Natureza |
|---|---|---|
| `src/lib/health/sync.ts` | 42 (`require`), 44, 211 (comentarios) | require + 2 comentarios |
| `src/lib/health/availability.ts` | 6 | comentario apenas |
| `src/lib/health/permissions.ts` | 6 | comentario apenas |

Adicionalmente:
- `package.json` linha 63: `"react-native-health-connect": "^3.5.3"` em dependencies.
- `package.json` linha 7: `"postinstall": "patch-package"` e linha 87: `"patch-package": "^8.0.1"` em devDependencies — diretorio `patches/` NAO existe (verificado: `ls patches/` → no such file). Logo `patch-package` foi instalado so para HC e pode ser removido.
- `app.json` linha 117: `"react-native-health-connect"` no array `plugins`.
- `app.json` linha 127 (`extraProguardRules`): menciona `react-native-health-connect` em comentario do ProGuard config — pode ser limpado.
- `tests/lib/health/sync.test.ts`: 13 ocorrencias do literal `'react-native-health-connect'` em `jest.doMock`/`jest.requireMock`. NAO existe `jest.mock('react-native-health-connect')` global em `jest.setup.cjs` (verificado) — todos os mocks vivem dentro do proprio sync.test.ts.
- `tests/e2e/playwright/q17d-evolucao-hc-resumo.e2e.ts` linha 8: comentario que cita o upstream. Atualizar para refletir bridge nativa.

A bridge nativa NAO tem Proxy lancante (usa `requireOptionalNativeModule` do `expo-modules-core` que devolve `null` em ambiente sem suporte). Logo:
- `Reflect.get` defensivo em sync.ts (linhas 49-50) fica obsoleto.
- Comentarios sobre `R-INT-3-HC-PROXY-REFLECT-HARDENING` em availability.ts/permissions.ts/sync.ts ficam historicos — podem ir.

## Objetivo

1. Trocar `require('react-native-health-connect')` por `require('../../../modules/health-connect/src')` em `src/lib/health/sync.ts` (alternativa: ajustar import para o nome do package `ouroboros-health-connect` quando o `package.json` do modulo for resolvido via workspace — esta sprint adota path relativo, mais simples).
2. Remover `Reflect.get` defensivo do `carregarModulo()` em sync.ts — bridge nativa nao precisa.
3. Remover `react-native-health-connect` do `package.json.dependencies`.
4. Remover `patch-package` e o script `postinstall` do `package.json` (confirmar `patches/` inexistente — caso contrario, NAO remover).
5. Remover `react-native-health-connect` do array `app.json.plugins`. NAO mexer em `extraProguardRules` ainda — comentario interno e' inofensivo e mexer arrisca quebrar build (decisao registrada em "Riscos").
6. Atualizar comentarios em `src/lib/health/{availability,permissions,sync}.ts` removendo referencias a `R-INT-3-HC-PROXY-REFLECT-HARDENING` e a `react-native-health-connect@3.5.x`.
7. Atualizar `tests/lib/health/sync.test.ts`: trocar 13 mocks de `'react-native-health-connect'` para o path relativo usado no novo `carregarModulo()`. Re-rodar suite — 13 testes devem permanecer verdes (ou ajustes minimos se algum testa comportamento Proxy-especifico que sumiu).
8. Atualizar comentario em `tests/e2e/playwright/q17d-evolucao-hc-resumo.e2e.ts` linha 8.
9. Smoke verde (289 suites, 2768 testes baseline) + build APK alpha confirma autosuficiencia.

## Escopo

### A. Investigacao obrigatoria

```bash
# Confirma sub-sprints A+B+C entregues (4 AsyncFunctions critaveis):
grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
grep -c "AsyncFunction(\"insertRecords\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
grep -c "AsyncFunction(\"requestPermission\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
# Esperado: 1 cada

# Lista exatamente o que vai mudar (esperado: 3 arquivos src/, 1 package.json, 1 app.json, 2 tests/):
rg -l "react-native-health-connect"

# Confirma patches/ ausente:
ls patches/ 2>&1
```

### B. Mudancas codigo

1. `src/lib/health/sync.ts`:
   - Linha 42: trocar `require('react-native-health-connect')` por `require('../../../modules/health-connect/src')`.
   - Linhas 49-50: remover `Reflect.get` e voltar a `mod.readRecords`/`mod.insertRecords` simples.
   - Linhas 44-48 e 211: limpar comentarios sobre Proxy hardening + versionamento upstream.
   - Manter a interface `HealthConnectModule` local (shape de readRecords + insertRecords) — desacoplamento da bridge.
   - Manter API publica intacta: `escreverTreinoEmHC`, `escreverPesoEmHC`, `escreverBodyFatEmHC`, `escreverMenstruacaoEmHC`, `lerStepsHC`, `lerPesosHC` (callers em `src/lib/services/*` nao mudam).

2. `src/lib/health/availability.ts` e `src/lib/health/permissions.ts`:
   - Linha 6: substituir comentario por referencia ao modulo local. Confirmar que esses arquivos ja consomem helpers da bridge (sub-sprint A): se ainda fizerem `require('react-native-health-connect')`, migrar igual ao sync.ts.

3. `package.json`:
   - Remover `"react-native-health-connect": "^3.5.3"` (linha 63).
   - Remover `"postinstall": "patch-package"` (linha 7) se `patches/` vazio/ausente.
   - Remover `"patch-package": "^8.0.1"` (linha 87) se nenhum outro patch usar.

4. `app.json`:
   - Remover string `"react-native-health-connect"` do array `plugins` (linha 117).
   - Confirmar `"./modules/health-connect/app.plugin.js"` continua presente.
   - NAO mexer no `extraProguardRules` (linha 127) — mexer arrisca regressao no build prod.

5. `tests/lib/health/sync.test.ts`:
   - 13 trocas literais: `'react-native-health-connect'` → `'../../../modules/health-connect/src'` (path relativo desde `tests/lib/health/`).
   - Reanalisar 1 teste especifico de Proxy (linhas 173-179: "Simula react-native-health-connect@3.5.0 em ambiente nao-Android") — bridge nativa nao tem Proxy issue, esse teste pode virar obsoleto ou ser reescrito para validar `requireOptionalNativeModule` retornando null.

6. `tests/e2e/playwright/q17d-evolucao-hc-resumo.e2e.ts`:
   - Linha 8: atualizar comentario "Limitacao web: react-native-health-connect retorna mock sem dados" para refletir bridge nativa (que devolve `{ records: [] }` em web via `Platform.OS !== 'android'`).

### C. Idempotencia / dedup

Spec NAO introduz `clientRecordId` para dedup (registrado como nao-objetivo em `modules/health-connect/src/index.ts` linha 70-73 e linha 264-266). Comportamento atual (callers chamam `escreverXXXEmHC` 2x → 2 entries no HC) e' mantido. Sprint futura (R-INT-3-HC-DEDUP) tratara.

### D. Aritmetica

- Arquivos a editar: 6
  - `src/lib/health/sync.ts` (~5 linhas mudadas)
  - `src/lib/health/availability.ts` (~2 linhas)
  - `src/lib/health/permissions.ts` (~2 linhas)
  - `package.json` (3 linhas removidas)
  - `app.json` (1 linha removida)
  - `tests/lib/health/sync.test.ts` (13 linhas substituidas + possivel reescrita de 1 teste)
  - `tests/e2e/playwright/q17d-evolucao-hc-resumo.e2e.ts` (1 linha)
- Total: ~30 linhas mudadas, sem novas linhas significativas.
- `package-lock.json`: regerar via `npm install` apos editar `package.json`. Espera-se reducao no lock (lib removida + transitivos).
- Tamanho bundle: esperado decrescimo (lib removida). Validar via `docs/auditoria-bundle-2026-05-21/` baseline (ver `RELATORIO.md`) — sprint NAO obriga delta especifico, so registra leitura pos-build.

## OFF-LIMITS

**Pode tocar:** `src/lib/health/sync.ts`, `src/lib/health/availability.ts`, `src/lib/health/permissions.ts`, `package.json`, `package-lock.json`, `app.json`, `tests/lib/health/sync.test.ts`, `tests/e2e/playwright/q17d-evolucao-hc-resumo.e2e.ts`.

**Nao pode tocar:**
- `modules/health-connect/**` — bridge entregue em A/B/C, codigo congelado.
- `src/lib/services/*.ts` — callers do sync mantem API publica.
- `src/lib/health/resumo.ts` — nao consome upstream diretamente (verificado).
- `CLAUDE.md`, `ROADMAP.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`.
- `extraProguardRules` em `app.json` (comentario interno, risco de quebrar build).

## Riscos e nao-objetivos

- **Risco 1 (alto):** algum mock de teste em `sync.test.ts` valida comportamento Proxy-especifico (linha 173-179). Se sumir, teste pode quebrar. Mitigacao: rodar `npx jest sync.test.ts` apos cada bloco de mudanca; ajustar 1 teste se necessario (reescrever pra validar `getNative()` retornando null em web).
- **Risco 2 (medio):** `package-lock.json` regerado pode reordenar entries de outros pacotes. Diff vai ser grande mas isso e' esperado. Validar so que `react-native-health-connect` sumiu via `jq '.packages | keys[]' package-lock.json | rg health-connect`.
- **Risco 3 (baixo):** `extraProguardRules` em `app.json` linha 127 menciona `react-native-health-connect` em comentario humano. NAO remover nesta sprint — risco/beneficio nao compensa, e o bloco ja menciona `androidx.health.connect.client.**` que e' o que importa pro build.
- **Nao-objetivo:** dedup via `clientRecordId` (sprint futura).
- **Nao-objetivo:** migrar `lerStepsHC`/`lerPesosHC` para usar paginacao (`pageToken`) — bridge nativa expoe, sprint atual nao consome.
- **Nao-objetivo:** rename do path relativo `'../../../modules/health-connect/src'` para o nome de package `'ouroboros-health-connect'` — exigiria wire-up de workspace, ortogonal.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
# Confirma referencia zerada:
rg "react-native-health-connect" src/ app/ tests/ package.json app.json | wc -l
# Esperado: 0 (ou apenas linha de extraProguardRules que ficou de proposito)
# Build APK alpha-32 (apos commit + tag): esperado bundle menor + nada quebrado
```

## Proof-of-work

1. Lista de arquivos modificados (6 esperados + package-lock.json).
2. `npx jest --silent | tail -5` — `Test Suites:` linha intacta (289/289) ou reduzida em 1-2 se teste de Proxy virar obsoleto.
3. Hash commit + build APK alpha successful via `eas build` ou `gradlew assembleRelease` local.
4. `rg "react-native-health-connect" src/ app/ tests/` retorna 0 matches (excecao tolerada: linha de `extraProguardRules` em app.json se nao for limpada).
5. **Validacao live MANDATORIA** (mitigacao Risco 1 + valida write end-to-end via bridge nativa):
   - Instalar alpha-32 no Xiaomi (HyperOS, `adb shell pm install`).
   - Criar TreinoSessao no app.
   - Abrir Health Connect nativo → secao Exercicio → confirmar nova entry "Treino Ouroboros".
   - Criar MedidaSnapshot com peso 75kg → confirmar em HC > Peso.
   - Criar RegistroCiclo fase=menstrual → confirmar em HC > Fluxo menstrual.
   - Capturar 3 screenshots em `docs/sprints/R-INT-3-HC-BRIDGE-NATIVA-D-screenshots-live/`.

## Referencias

- Sub-sprints A/B/C: `docs/sprints/R-INT-3-HC-BRIDGE-NATIVA-{A,B,C}-*-spec.md`
- Bridge nativa: `modules/health-connect/src/index.ts` (API JS) + `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt` (Kotlin)
- Padrao migracao: `modules/widget-homescreen/` (Q24.b.c.b — sucessor de lib upstream removida).
- Memoria operacional: `reference_hc_bridge_arquitetura.md`, `reference_hc_decompile_canonico.md`.
- Aprendizado runtime: `feedback_validacao_celular_real.md` (justifica validacao live mandatoria).
