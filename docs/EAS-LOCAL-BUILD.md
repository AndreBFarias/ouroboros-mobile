# Build APK local sem EAS Cloud — Ouroboros Mobile

Documento canônico para gerar APK assinado **sem consumir quota EAS
Free Tier**. Use este fluxo quando a quota mensal Android estourar
(armadilha **A38**) ou quando precisar de build offline rápido para
diagnóstico.

> **Fonte de verdade da release oficial:** [`docs/RELEASE.md`](./RELEASE.md).
> Este doc cobre **apenas as três alternativas locais** ao
> `eas build --platform android --profile production` (EAS Cloud).

## Quando usar cada opção

| Cenário | Opção recomendada | Custo | Resultado |
|---|---|---|---|
| Distribuição alpha/release com OAuth Google funcional | **1. GH Actions + keystore EAS** | gratuito | APK SHA-1 canônico, OAuth funciona |
| Smoke local de build (sem OAuth) | **2. `eas build --local`** | gratuito | APK assinado pelo keystore EAS local (`credentials/android/keystore.jks`) |
| Diagnóstico cru de Gradle / Reanimated / módulos nativos | **3. `expo prebuild` + `gradle assembleRelease`** | gratuito | APK assinado por debug keystore (OAuth quebra), build mais rápido |

Critério rápido:

- Precisa instalar nos celulares de produção e OAuth tem que funcionar?
  → **Opção 1**.
- Precisa só validar que o bundle compila sem subir nada para CI?
  → **Opção 2** ou **3**, conforme tiver Java + Android SDK na máquina.
- Está investigando crash nativo ou problema de signing?
  → **Opção 3** (controle total da toolchain local).

## Pré-requisitos comuns

- Repositório clonado em `~/Desenvolvimento/Protocolo-Mob-Ouroboros`.
- `node` ≥ 22 e `npm` (matches `actions/setup-node@v4` com
  `node-version: '22'` no workflow canônico).
- Branch `main` limpa (zero diffs locais) ou worktree dedicado via
  `./scripts/bootstrap-worktree.sh`.
- `app.json` com `version` e `android.versionCode` corretos.

Pré-requisitos específicos por opção estão nas seções abaixo.

---

## Opção 1 — GitHub Actions (canônico, alpha-5+)

Workflow versionado: [`.github/workflows/build-android-apk.yml`](../.github/workflows/build-android-apk.yml).

Builda APK no runner `ubuntu-latest` via `expo prebuild` +
`gradle assembleRelease`. Não consome quota EAS, assina com o **mesmo
keystore EAS** distribuído nas releases oficiais (SHA-1
`E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`).

### Pré-requisitos

- `gh` CLI logado em conta com permissão `admin` no repo
  `AndreBFarias/ouroboros-mobile`.
- 4 secrets cadastrados no repo (uma vez só, via Q17.e):
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- 1 secret opcional (sem ele OAuth Google quebra mas APK gera):
  - `ENV_JSON_BASE64` — base64 do `env.json` com `client_id` do
    Google OAuth.

### Setup inicial dos secrets (uma vez)

Detalhado em [`docs/RELEASE.md`](./RELEASE.md) §Q17.e. Resumo:

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/exportar_keystore_eas.sh --apply
```

O script:

1. Carrega `EXPO_TOKEN` do `.env`.
2. Roda `eas credentials --platform android` (menu interativo:
   **production** → **Download credentials from EAS to
   credentials.json**).
3. Extrai senhas de `credentials.json`.
4. Valida com `keytool` (compara SHA-1 contra o esperado).
5. Gera base64 do `.jks` em arquivo temp.
6. Cadastra os 4 secrets via `gh secret set` (com `--apply`).
7. `shred` no temp via trap exit.

Sem `--apply`, o script só imprime os comandos `gh secret set` prontos
para colar.

> **Higiene pós-execução:** apague `credentials/android/keystore.jks`
> e `credentials.json` do disco local. Ambos são `gitignored`, mas
> evite deixar arquivo em disco quente.

### Disparar build manual

```bash
gh workflow run build-android-apk.yml
gh run watch
```

Cobertura típica em runner cache quente: ~15 min. Cold cache: ~30 min.

### Disparar build automático em tag

Push de tag `v*-alpha-*` ou `v*` dispara o workflow e anexa o APK ao
release correspondente:

```bash
git tag v1.0.0-alpha-6 -m "alpha-6"
git push origin v1.0.0-alpha-6
```

### Estrutura do workflow (passos relevantes)

1. **Checkout + setup Node 22 + Java 17 + Android SDK 35.**
   `platform-tools platforms;android-35 platforms;android-34
   build-tools;35.0.0 build-tools;34.0.0`.
2. **`npm ci --legacy-peer-deps`.**
3. **Provision `env.json`** — decodifica `ENV_JSON_BASE64` se
   presente, fallback para `env.json.example`.
4. **Cache Gradle** — chave por `**/*.gradle*` + `package-lock.json`.
5. **`expo prebuild --platform android --no-install --clean`.**
6. **Restrict to `arm64-v8a`** — append em `android/gradle.properties`
   (`reactNativeArchitectures=arm64-v8a` +
   `android.enableR8.fullMode=true`).
7. **Provision keystore EAS** — decodifica
   `ANDROID_KEYSTORE_BASE64` em `android/app/release.keystore`. Skip
   + fallback debug keystore se secret ausente.
8. **Patch `build.gradle` signing release** — apende bloco
   `android.signingConfigs.release { ... }` pós-prebuild, lendo
   senhas via env vars.
9. **`./gradlew assembleRelease --no-daemon --stacktrace
   -Preact.architectures=arm64-v8a`.**
10. **Verify APK signature** — `apksigner verify --print-certs` +
    compara SHA-1 contra esperado. Falha se mismatch.
11. **Upload APK** como artifact (retention 14 dias) e anexa ao
    release se triggered por tag.

### Download manual do APK

Via `gh`:

```bash
RUN_ID=$(gh run list --workflow build-android-apk.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run download "$RUN_ID" --name ouroboros-android-apk --dir /tmp/apk
ls -lh /tmp/apk/*.apk
```

Via release:

```bash
gh release download v1.0.0-alpha-6 --pattern '*.apk' --dir builds/
```

---

## Opção 2 — `eas build --local`

Roda o pipeline EAS completo na máquina local, sem upload pra cloud,
sem consumir quota. Útil quando você tem Java + Android SDK
instalados e quer o mesmo binário que o EAS Cloud produziria.

### Pré-requisitos

- **Java 17** (`temurin` ou `openjdk-17-jdk`). `java -version` deve
  imprimir `17.x`.
- **Android SDK 35** com `platform-tools`, `platforms;android-35`,
  `platforms;android-34`, `build-tools;35.0.0`, `build-tools;34.0.0`.
  Caminho típico em `~/Android/Sdk` (Linux).
- Variáveis exportadas:
  ```bash
  export ANDROID_HOME=~/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0
  ```
- `eas-cli` ≥ 18 (`npm i -g eas-cli`).
- `EXPO_TOKEN` carregado no shell (`set -a; . ./.env; set +a`).
- Keystore EAS já baixado em `credentials/android/keystore.jks` +
  `credentials.json`. Se não tiver, rode primeiro:
  ```bash
  npx eas-cli credentials --platform android
  # menu: production -> Download credentials from EAS to credentials.json
  ```

### Comando

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# Production (gera AAB, mesmo do release oficial)
eas build --platform android --profile production --local --non-interactive

# Preview (gera APK assinado, distribuição interna)
eas build --platform android --profile preview --local --non-interactive

# Development (APK com dev-client, distribution: internal)
eas build --platform android --profile development --local --non-interactive
```

Os profiles vêm de [`eas.json`](../eas.json):

- `production` → `buildType: app-bundle`,
  `gradleCommand: :app:bundleRelease`. Saída: `*.aab`.
- `preview` → `buildType: apk`,
  `gradleCommand: :app:assembleRelease`. Saída: `*.apk`.
- `development` → `developmentClient: true`,
  `gradleCommand: :app:assembleDebug`. Saída: `*.apk` (dev-client).

O artefato sai na raiz do repo como `build-<timestamp>.aab` ou
`build-<timestamp>.apk`.

### Pós-build (production AAB → APK universal)

```bash
VERSION=$(node -p "require('./app.json').expo.version")
mv build-*.aab "builds/ouroboros-${VERSION}.aab"

# Extrair APK universal via bundletool
bundletool build-apks \
  --bundle="builds/ouroboros-${VERSION}.aab" \
  --output="builds/ouroboros-${VERSION}.apks" \
  --mode=universal
unzip -p "builds/ouroboros-${VERSION}.apks" universal.apk \
  > "builds/ouroboros-${VERSION}.apk"
du -h "builds/ouroboros-${VERSION}.apk"
```

---

## Opção 3 — `expo prebuild` + `gradle assembleRelease`

Bypass completo do EAS. Replica passo-a-passo o que o workflow GH
Actions faz, mas localmente. Útil para debug avançado.

### Pré-requisitos

- Mesmos da Opção 2 (Java 17 + Android SDK 35 + variáveis
  exportadas).
- `npm ci --legacy-peer-deps` rodado.
- `env.json` presente na raiz (se ausente, copie
  `env.json.example` — OAuth quebra mas build gera).

### Sequência

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# 1. Prebuild Android (gera diretório android/ a partir do app.json)
npx expo prebuild --platform android --no-install --clean

# 2. Restringir a arm64-v8a (reduz tempo de build de ~45min para ~15min)
printf '\nreactNativeArchitectures=arm64-v8a\nandroid.enableR8.fullMode=true\n' \
  >> android/gradle.properties

# 3. (Opcional) provisionar keystore EAS para OAuth funcionar
#    Se não fizer este passo, APK assina com debug keystore do AOSP
#    e OAuth Google retorna 400 invalid_request.
cp credentials/android/keystore.jks android/app/release.keystore

cat >> android/app/build.gradle <<'GROOVY'

android.signingConfigs {
    release {
        storeFile file("release.keystore")
        storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
        keyAlias System.getenv("ANDROID_KEY_ALIAS")
        keyPassword System.getenv("ANDROID_KEY_PASSWORD")
    }
}
android.buildTypes.release.signingConfig android.signingConfigs.release
GROOVY

# 4. Exportar senhas (lidas pelo signingConfig)
export ANDROID_KEYSTORE_PASSWORD=$(python3 -c "import json; print(json.load(open('credentials.json'))['android']['keystore']['keystorePassword'])")
export ANDROID_KEY_ALIAS=$(python3 -c "import json; print(json.load(open('credentials.json'))['android']['keystore']['keyAlias'])")
export ANDROID_KEY_PASSWORD=$(python3 -c "import json; print(json.load(open('credentials.json'))['android']['keystore']['keyPassword'])")

# 5. Gradle assembleRelease (APK) ou bundleRelease (AAB)
cd android
chmod +x ./gradlew
./gradlew assembleRelease --no-daemon --stacktrace -Preact.architectures=arm64-v8a

# 6. Localizar APK
find app/build/outputs/apk -name "*.apk"
# espera: app/build/outputs/apk/release/app-release.apk

# 7. Verificar assinatura (SHA-1 do keystore EAS)
APKSIGNER=$(find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -1)
"$APKSIGNER" verify --print-certs app/build/outputs/apk/release/app-release.apk
# espera: SHA-1 digest: e449c8b3b489f92669aa311c38814344d37db38c
```

### Limpeza pós-build

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
rm -rf android  # `expo prebuild --clean` regenera no próximo build
shred -u credentials.json credentials/android/keystore.jks 2>/dev/null || true
```

---

## Troubleshooting (armadilhas A30-A39)

### A38 — EAS Free Tier esgotada

**Sintoma**: `eas build --platform android --profile production` falha com:

> "This account has used its Android builds from the Free plan this
> month, which will reset in N days."

**Resolução**: use **Opção 1 (GH Actions)**. O workflow não consome
quota EAS. Reset da quota EAS Free Tier sempre no dia 1 do mês
seguinte (ex: estourou em 13/Mai → reseta em 01/Jun).

**Alternativas a longo prazo**:

- Upgrade EAS para Production plan (~$19/mês).
- Manter Opção 1 como canônico (já é, desde alpha-5).

### A39 — `env.json` ausente no CI

**Sintoma**: bundle JS quebra com:

> `Unable to resolve module ../../../env.json` em `googleAuthFlow.ts`.

**Causa**: `env.json` é gitignored (contém `project_id` privado),
então `git clone` no CI runner não tem o arquivo.

**Resolução**:

- No GH Actions: cadastre `ENV_JSON_BASE64` como secret
  (`base64 -w0 env.json | gh secret set ENV_JSON_BASE64 --repo ...`).
- Localmente (Opções 2/3): copie `env.json.example` se ausente.
- Workflow já tem step **Provision env.json** que faz fallback
  automático.

### A37 — Build dev-client APK demora 10-25 min

**Sintoma**: `eas build --profile development` leva 10-25 min em fila
Free Tier; após Q17.e, GH Actions também leva ~15-30 min.

**Resolução**: antes de buildar, conferir se um APK em
`builds/dev-client-*.apk` recente cobre as edits. Só **código JS**
precisa de novo bundle, não APK — Reusar APK existente +
`adb reverse 8081` é mais rápido. Critério para rebuild novo APK:

- novo `expo install` rodou;
- versão de pacote nativo (`expo-modules-core`, `reanimated`,
  `gluestack`) mudou;
- plugin Expo adicionado/removido em `app.json`;
- `expo-build-properties` mudou (`minSdkVersion`, `compileSdkVersion`,
  ABIs).

### A32 — HyperOS / MIUI bloqueia `adb install -r`

**Sintoma**: `adb install -r <apk>` retorna `INSTALL_FAILED_USER_RESTRICTED`
em Redmi/Xiaomi com MIUI/HyperOS.

**Resolução**:

```bash
adb shell pm install -r -t -d /sdcard/Download/<apk>
# precisa fazer push antes:
adb push <apk> /sdcard/Download/<apk>
```

Detalhado em `VALIDATOR_BRIEF.md` §4 A32 e em
`feedback_dev_client_celular.md` (memory).

### CMake compilando todas as ABIs (build timeout 45min)

**Sintoma**: `gradle assembleRelease` sem flag de arquitetura
compila 4 ABIs (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`),
estourando timeout do runner.

**Resolução**: restringir a `arm64-v8a` (cobre 95%+ devices
modernos):

```bash
printf '\nreactNativeArchitectures=arm64-v8a\nandroid.enableR8.fullMode=true\n' \
  >> android/gradle.properties
```

Já aplicado no workflow canônico. Resultado: APK passa de ~157 MB
(universal alpha-4) para ~65 MB (alpha-5+).

### `compileSdk` ou `minSdk` errado

**Sintoma**: build falha com:

> `compileSdk 34 < 35` (Health Connect) ou `minSdkVersion 24 < 26`.

**Resolução**: ambos resolvidos via `expo-build-properties` em
`app.json`:

```json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "compileSdkVersion": 35,
          "targetSdkVersion": 35,
          "minSdkVersion": 26
        }
      }
    ]
  ]
}
```

Já configurado no projeto.

### SHA-1 mismatch após `provisionar keystore`

**Sintoma**: workflow `Verify APK signature` falha com:

> "SHA-1 mismatch entre APK e keystore EAS canônico."

**Causa**: secrets cadastrados são de **outro** keystore (não o
canônico). Geralmente ocorre se você rotacionou ou se baixou
credentials de outro project EAS.

**Resolução**: re-rode
`./scripts/exportar_keystore_eas.sh --apply`. O script valida o
SHA-1 antes de cadastrar e aborta se não bater.

> **Atenção**: rotacionar keystore invalida todas as releases já
> instaladas. Detalhado em `RELEASE.md` §Q17.e (Rotação de
> keystore).

### Gradle cache poluído

**Sintoma**: build local funciona, mas falha no GH Actions com erro
de classe Kotlin desencontrada (após bump de SDK / Reanimated /
Gluestack).

**Resolução**: invalidar o cache do runner.

```bash
# Listar caches do repo
gh cache list --limit 20

# Deletar cache específico
gh cache delete <cache-key>
```

Ou bumpe a chave do cache no workflow alterando o hash de input
(ex: trocar `hashFiles('**/*.gradle*', ...)` por uma versão
explícita).

---

## Referências canônicas

- [`docs/RELEASE.md`](./RELEASE.md) — pipeline oficial release v1.0+.
- [`.github/workflows/build-android-apk.yml`](../.github/workflows/build-android-apk.yml)
  — workflow GH Actions canônico.
- [`scripts/exportar_keystore_eas.sh`](../scripts/exportar_keystore_eas.sh)
  — setup dos 4 secrets de keystore.
- [`scripts/release-apk.sh`](../scripts/release-apk.sh) — pipeline
  release v1.0+ via EAS Cloud (quando há quota).
- [`eas.json`](../eas.json) — profiles `development`, `preview`,
  `production`.
- [`VALIDATOR_BRIEF.md`](../VALIDATOR_BRIEF.md) §4 — armadilhas
  A30-A39 completas.
- `docs/ONDA-Q-2026-05-12.md` — histórico das 6 tentativas até o
  primeiro APK CI local (alpha-5).
