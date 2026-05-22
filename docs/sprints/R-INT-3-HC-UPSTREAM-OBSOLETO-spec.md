# R-INT-3-HC-UPSTREAM-OBSOLETO — Health Connect bloqueado por SDK obsoleto na lib

**Tipo:** investigação + decisão de produto
**Prioridade:** P1 (bloqueia feature Health Connect)
**Estimativa:** 0.5h decisão + variável (fork: 1-2d / aguardar: indefinido)
**Fase:** 3 (achado live em 2026-05-21, validação no Xiaomi HyperOS com alpha-14/15)

## Contexto

Health Connect (Conexão Saúde do Android) é feature canônica do
Ouroboros: sync de TreinoSessao → ExerciseSession, Medida → Weight/BodyFat,
RegistroCiclo → MenstruationFlow. Status `[ok-jest]` no ROADMAP — testes
unitários passam, mas validação live no celular real falhou.

## Sintoma observado

No Xiaomi HyperOS com `com.google.android.apps.healthdata`
v2026.04.16.00.release instalado (último disponível na Play Store):

1. App abre Settings > Integrações > Saúde Física.
2. Componente exibe **"Status: Atualização necessária"** + botão "Atualizar Conexão Saúde".
3. Tap no botão abre tela nativa do Health Connect (`abrirSettingsHealthConnect()`).
4. Lista de apps no HC mostra Claude e Google Fit, **mas NÃO mostra Ouroboros**.
5. Botão "Conectar" nunca aparece (gating em `status === 'available'`).
6. `solicitarPermissoesCanonicas()` nunca é disparado → HC nunca registra Ouroboros como app compatível.

Validado com 3 builds consecutivos:
- alpha-14: lib `react-native-health-connect@3.5.0` → `needs_update`
- alpha-15: lib `3.5.3` (upgrade) → mesmo `needs_update`
- alpha-19: lib `3.5.3` (estado atual) → mesmo `needs_update`

## Causa raiz (confirmada)

`react-native-health-connect@3.5.3` (versão mais recente publicada
2026-05-15) ainda referencia em `node_modules/react-native-health-connect/android/build.gradle`:

```gradle
implementation "androidx.health.connect:connect-client:1.1.0-alpha11"
```

Versão `1.1.0-alpha11` é de 2024. Google Maven publicou desde:
- `1.1.0-alpha12`, `1.1.0-beta01/02`, `1.1.0-rc01/02/03`
- **`1.1.0` (estável)**
- `1.2.0-alpha01..04`

HC moderno (`v2026.04.16.00.release`) detecta SDK `1.1.0-alpha11` como
**obsoleto** e retorna `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` (code 3)
em `getSdkStatus()` — mesmo com HC instalado e atualizado.

Issue upstream open: https://github.com/matinzd/react-native-health-connect/issues/228
("getSdkStatus always returns 3 - SDK_UNAVAILABLE_VERSION_TOO_OLD",
relator independente confirma mesmo cenário).

## Por que não basta patchar via patch-package

Tentativa 1 (alpha-16): patchar para `connect-client:5.5.0` →
Maven Central reportava 5.5.0 mas Google Maven (autoritativo) só tem
até `1.2.0-alpha04`. Build falha em `Could not find ...:5.5.0`.

Tentativa 2 (alpha-17): patchar para `connect-client:1.1.0` (estável real)
→ build Kotlin falha:
```
e: HealthConnectUtils.kt:185 Cannot access 'constructor(...): Metadata':
   it is internal in 'androidx/health/connect/client/records/metadata/Metadata'.
```

Em `1.1.0` final, `Metadata(...)` construtor virou `internal`. A lib
upstream usa esse construtor em 2 pontos (`convertMetadataFromJSMap`,
linhas 182 e 185 do `HealthConnectUtils.kt`). A API nova exige factory
methods: `Metadata.manualEntry()`, `Metadata.activelyRecorded()`,
`Metadata.autoRecorded()`, `Metadata.unknownRecordingMethod()`.

Tentativa 3 (alpha-18): patchar para `connect-client:1.1.0-alpha12`
→ mesma falha — API quebrou já no alpha12, não no final.

## Caminhos disponíveis

### A. Aguardar upstream (zero código, indefinido)
Reportar/contribuir no issue #228 + PR para a lib. Tempo até merge +
release: indeterminado (maintainer ativo mas sem ETA).

### B. Fork da lib (1-2 dias dedicados)
Forkar `matinzd/react-native-health-connect`, upgrade `connect-client`
para `1.2.0-alpha04` (latest), refatorar `HealthConnectUtils.kt` para
usar factory methods (`Metadata.activelyRecorded` etc), republicar como
package privado ou usar via git URL no `package.json`. Custo de
manutenção contínuo (rebase de upstream).

### C. Bypass com SDK direto (3-5 dias, código próprio)
Não usar `react-native-health-connect`. Implementar bridge nativa
Kotlin própria usando `androidx.health.connect:connect-client:1.2.0-alpha04`
diretamente em `android/app/src/main/java/com/ouroboros/health/`. Maior
controle, sem dependência da lib obsoleta, mas duplica trabalho.

### D. Descopar Health Connect para v1.1 (curto prazo)
Ocultar entry "Saúde Física" do Hub Integrações no v1.0.0. Manter
código JS+native preparado. Reintroduzir no v1.1 quando lib upstream
atualizar OU quando fork (B) ficar pronto.

## Recomendação

**Curto prazo (v1.0.0): descopar via D** — esconder card "Saúde Física"
do Hub via feature flag. Manter código pronto, não bloqueia release.

**Médio prazo (v1.1): fork via B** — upgrade controlado para
`1.2.0-alpha04`, manutenção via rebase quando upstream sair.

## Verificação canônica (D — descopar)

```bash
grep -n "Saúde Física" src/components/screens/IntegracoesScreen.tsx
# Adicionar feature flag healthConnectVisible (default false)
./scripts/smoke.sh
```

## Proof-of-work (D)

1. Diff em `IntegracoesScreen.tsx` (feature flag).
2. Test atualizado (default flag false esconde card).
3. Smoke + 3 runs sanity.
4. Hash do commit.
5. Screenshot do Hub sem o card "Saúde Física".
6. ROADMAP marca R-INT-3 como `[descopado-v1.0]` apontando esta sprint.

## Referências

- Issue upstream: https://github.com/matinzd/react-native-health-connect/issues/228
- Google Maven connect-client: https://dl.google.com/dl/android/maven2/androidx/health/connect/group-index.xml
- Validação live: tablet Xiaomi 2312DRAABG HyperOS, HC v2026.04.16.00.release, 3 builds testados (alpha-14/15/19)
