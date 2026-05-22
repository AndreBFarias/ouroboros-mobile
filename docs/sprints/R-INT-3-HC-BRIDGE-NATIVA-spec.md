# R-INT-3-HC-BRIDGE-NATIVA — Bridge Health Connect nativa propria (substitui react-native-health-connect)

**Tipo:** infra + feature (bridge nativa + integracao)
**Prioridade:** P1 (desbloqueia feature Health Connect)
**Estimativa:** 3-5 dias dedicados (recomendado dividir em sub-sprints A/B/C/D)
**Fase:** 3
**Origem:** decisao do dono 2026-05-22 em resposta a R-INT-3-HC-UPSTREAM-OBSOLETO

## Contexto

`react-native-health-connect@3.5.3` usa `androidx.health.connect:connect-client:1.1.0-alpha11` (de 2024). HC moderno rejeita esse SDK como obsoleto -> `getSdkStatus()` retorna `needs_update` permanente, bloqueando o fluxo. Patches via patch-package falharam porque API quebrou (Metadata constructor internal desde alpha12). Issue upstream #228 sem fix.

Opcao C escolhida: substituir a lib por bridge nativa propria usando o SDK atual diretamente, sem manutencao upstream pendurada.

## Objetivo

Criar **`modules/health-connect/`** como Expo Module local (padrao identico ao `modules/widget-homescreen/`), implementando bridge Kotlin -> JS direta sobre `androidx.health.connect:connect-client:1.2.0-alpha04` (mais recente no Google Maven).

API JS exportada precisa ser **compativel com o que `src/lib/health/{availability,permissions,sync}.ts` ja consome**, para que callers em `src/lib/health/`, `app/settings/integracoes.tsx`, `src/lib/services/saveTreino.ts`, `src/lib/services/escreverMedida.ts`, `src/lib/services/escreverRegistroCiclo.ts` nao precisem mudar.

## Estrutura proposta

```
modules/health-connect/
├── package.json                          # name "ouroboros-health-connect", private
├── expo-module.config.json               # platforms: [android], modules: [HealthConnectModule]
├── src/
│   └── index.ts                          # re-export tipado das AsyncFunctions
└── android/
    ├── build.gradle                      # connect-client:1.2.0-alpha04
    └── src/main/java/com/ouroboros/healthconnect/
        ├── HealthConnectModule.kt        # bridge Expo Module (entry point)
        ├── PermissionsBridge.kt          # solicitar/listar/revogar permissions
        ├── RecordsReadBridge.kt          # readRecords (Exercise/Steps/Weight/BodyFat/Sleep/HeartRate/Menstruation)
        ├── RecordsWriteBridge.kt         # insertRecords + factory methods Metadata.activelyRecorded
        ├── PermissionsActivity.kt        # ActivityResultContract.RequestPermission
        └── Utils.kt                      # conversores ReadableMap <-> Record types
```

## API JS exportada (compat com callers atuais)

Mesma assinatura que `src/lib/health/{availability,permissions,sync}.ts` esperam do `require('react-native-health-connect')` hoje:

```ts
// modules/health-connect/src/index.ts
export type HealthSdkStatus = 'available' | 'needs_update' | 'unavailable';
export interface Permission { accessType: 'read' | 'write'; recordType: string; }
export interface RegistroExternoHC { uuid: string; tipo: ...; inicio: string; fim: string; rotulo: string; valor?: number; }

// Availability
export async function getSdkStatus(): Promise<number>;       // 1/2/3 codes
export async function initialize(): Promise<boolean>;
export function openHealthConnectSettings(): void;

// Permissions
export async function requestPermission(perms: Permission[]): Promise<Permission[]>;
export async function getGrantedPermissions(): Promise<Permission[]>;
export async function revokeAllPermissions(): Promise<void>;

// Records (read)
export async function readRecords(recordType: string, options: {
  timeRangeFilter: { operator: 'between', startTime: string, endTime: string };
  ascendingOrder?: boolean;
  pageSize?: number;
}): Promise<{ records: unknown[] }>;

// Records (write)
export async function insertRecords(records: unknown[]): Promise<string[]>;
```

Caller em `src/lib/health/availability.ts`, `permissions.ts`, `sync.ts` muda **apenas** o require:

```ts
// antes
const mod = require('react-native-health-connect');

// depois
const mod = require('ouroboros-health-connect');
// OU melhor: import direto, ja que e modulo local sem Proxy issue
import * as hc from 'ouroboros-health-connect';
```

Isso elimina tambem a necessidade de `Reflect.get` defensivo (R-INT-3-HC-PROXY-REFLECT-HARDENING) -- sem Proxy, sem protecao.

## Pre-requisitos AndroidManifest (ja existem via app.json)

- `<queries><package name="com.google.android.apps.healthdata"/></queries>` OK
- `<uses-permission android:name="android.permission.health.*"/>` (11 itens) OK
- `<intent-filter><action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"/></intent-filter>` em activity OK (ja provisionado pelo plugin atual)
- `<service android:name="androidx.health.platform.client.impl.sdkservice.HealthDataSdkService" ...>` OK

Esses ja estao no APK alpha-15+ via plugin atual. **Manter o plugin `react-native-health-connect` no app.json APENAS para esses provisionamentos do manifest** (entry no `expo.plugins` array) MESMO depois de remover a lib do codigo JS -- alternativa: portar provisionamento para `modules/health-connect/android/AndroidManifest.xml` + remover plugin do app.json (mais limpo).

## Sub-sprints sugeridas (divisao pelo executor-sprint/planejador)

### A. Skeleton + Availability + Permissions (1d)
- Criar estrutura de pastas + Gradle + Module skeleton.
- Implementar `getSdkStatus`, `initialize`, `openHealthConnectSettings`, `requestPermission`, `getGrantedPermissions`, `revokeAllPermissions`.
- Trocar require em `src/lib/health/availability.ts` e `permissions.ts`.
- Smoke + build APK alpha-20 + validacao live: status retorna `available`, request permission abre dialog do HC, Ouroboros passa a aparecer na lista de apps do HC.

### B. Records read (1d)
- Implementar `readRecords` para todos os 7 tipos: ExerciseSession, Steps, Weight, BodyFat, HeartRate, SleepSession, MenstruationFlow.
- Conversores `Record` -> JS-friendly objects (mantendo shape que `sync.ts` espera).
- Tests unitarios Kotlin (Robolectric ou JUnit) para conversores.

### C. Records write (1d)
- Implementar `insertRecords` para ExerciseSession, Weight, BodyFat, MenstruationFlow.
- Usar factory methods novos: `Metadata.activelyRecorded`, `Metadata.manualEntry`.
- Conversores ReadableMap -> Record.

### D. Integracao + remocao lib + validacao live (1d)
- Trocar require em `src/lib/health/sync.ts`.
- Remover `react-native-health-connect` do `package.json`.
- Remover plugin do `app.json` (mover provisionamento para `modules/health-connect/AndroidManifest.xml`).
- Build APK alpha-23, instalar no Xiaomi.
- Validacao E2E: criar TreinoSessao -> confirmar ExerciseSession no HC; gravar Medida -> WeightRecord; etc.
- Atualizar `docs/FEATURES-CANONICAS.md` (Saude Fisica agora 100% funcional).
- Atualizar `ROADMAP.md`: R-INT-3 vira `[ok-live]` ao inves de `[ok-jest]`.

## OFF-LIMITS

**Pode tocar:**
- `modules/health-connect/` (novo)
- `src/lib/health/availability.ts`, `permissions.ts`, `sync.ts` (trocar require/import)
- `package.json` (remover lib, manter no final apenas se for sprint D)
- `app.json` (sprint D)
- Tests novos
- `docs/FEATURES-CANONICAS.md` + `ROADMAP.md` (so sprint D)

**Nao pode tocar:**
- Schemas (`TreinoSessaoSchema`, `MedidaSchema`, `RegistroCicloSchema`)
- Outras integracoes (Spotify, YouTube, Google Calendar, Drive)
- `CLAUDE.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`

## Verificacao canonica

Por sub-sprint (A/B/C/D):

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
# E2E live (sprint A e D): build APK + adb install + validar HC reconhece Ouroboros
```

## Proof-of-work obrigatorio

Por sub-sprint:
1. Lista de arquivos modificados.
2. Saida `npx jest --silent | tail -5`.
3. Saida `./scripts/smoke.sh`.
4. Hash do commit.
5. **Build APK successful** (link GH Actions run).
6. **Sprints A e D: validacao live no Xiaomi** com screenshot mostrando Ouroboros na lista do HC (sprint A) + records aparecendo (sprint D).
7. Achados colaterais (auto-dispatch planejador-sprint).

## Referencias

- Spec do bloqueio: `docs/sprints/R-INT-3-HC-UPSTREAM-OBSOLETO-spec.md`
- Padrao Expo Module local: `modules/widget-homescreen/`
- AndroidX Health Connect docs: https://developer.android.com/health-and-fitness/guides/health-connect
- API client: `androidx.health.connect:connect-client:1.2.0-alpha04` (Google Maven)
- Factory methods Metadata: https://developer.android.com/reference/androidx/health/connect/client/records/metadata/Metadata
