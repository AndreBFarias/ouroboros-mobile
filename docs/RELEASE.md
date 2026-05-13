# Processo de Release — Ouroboros Mobile

Documento canônico do pipeline de release v1.0.0+. Este projeto **não
é distribuído via Play Store**: é uso pessoal, aplicação comunitária,
APK assinado e instalado manualmente nos celulares dos usuários
(`pessoa_a` e `pessoa_b`).

## Pré-requisitos

- `EXPO_TOKEN` exportado no ambiente (token robot do EAS).
- `eas-cli@>=18.0` instalado (`npm i -g eas-cli`).
- Keystore Android já gerada via `eas credentials` (veja
  [`credentials/README.md`](../credentials/README.md)).
- `app.json` com versão alvo correta (semver).
- Branch `main` limpa (zero diffs locais), todos os testes passando.
- `bundletool` instalado para extrair APK universal do AAB
  (`pip install bundletool` ou
  [download direto](https://github.com/google/bundletool/releases)).

## Pipeline canônico

### 1. Verificação local

```bash
./scripts/check_anonimato.sh    # Regra -1 (CONTEXTO §5)
npx tsc --noEmit                # type check
npm test --silent               # 1057+ testes
./scripts/smoke.sh              # smoke completo
npx expo export --platform android --output-dir /tmp/m19-export
du -sh /tmp/m19-export/_expo/static/js/android/*.hbc
# limite: < 12 MB (Hermes bundle)
```

Todos exit 0; bundle Hermes sob o limite.

### 2. Disparar build production

Pipeline automatizado via `./scripts/release-apk.sh`:

```bash
EXPO_TOKEN='<token>' ./scripts/release-apk.sh
```

Esse script:
1. Repete os checks acima (idempotente).
2. Dispara `eas build --platform android --profile production`.
3. Polling de status (a cada 60s, máximo 30 min).
4. Baixa o `.aab` para `builds/ouroboros-<versao>.aab`.

Build production:
- `buildType: app-bundle` (gera `.aab` para Play Store; aqui usamos
  como fonte para extrair `.apk` universal).
- `gradleCommand: :app:bundleRelease`.
- `autoIncrement: 'versionCode'` (próxima release sobe o número
  sem mexer no commit).
- `env.NODE_ENV: production` (Hermes minifica + tree-shake).

### 3. Extrair APK universal

`.aab` é o formato App Bundle do Play Store. Para sideload precisamos
de `.apk`:

```bash
VERSION=$(node -p "require('./app.json').expo.version")
bundletool build-apks \
  --bundle="builds/ouroboros-${VERSION}.aab" \
  --output="builds/ouroboros-${VERSION}.apks" \
  --mode=universal
unzip -p "builds/ouroboros-${VERSION}.apks" universal.apk \
  > "builds/ouroboros-${VERSION}.apk"
du -h "builds/ouroboros-${VERSION}.apk"
# limite: < 35 MB instalado
```

### 4. Instalar nos celulares

Para cada celular pareado via ADB:

```bash
adb devices                                       # confirma device
adb -s <device-id> install -r builds/ouroboros-${VERSION}.apk
adb -s <device-id> shell dumpsys package com.ouroboros.mobile | grep versionName
# espera: versionName=1.0.0
```

### 5. Validação manual ponta-a-ponta

Em cada celular:

- [ ] **Cold start** < 3s (cronômetro do tap no ícone até Tela 01).
- [ ] **Onboarding completo** (apenas para instalação fresca):
  - Frame 1: boas-vindas + próximo
  - Frame 2: tipo de companhia
  - Frame 3: nome
  - Frame 4: SAF picker do Vault
- [ ] **4 flows críticos do BRIEFING §5:**
  - PIX share intent → categoria → salvar (<5s)
  - Diário trigger → 30s (<30s)
  - Evento positivo com lugar → salvar (<25s)
  - Scanner nota fiscal → OCR → salvar (<20s)
- [ ] **Sync Syncthing** (se 2+ celulares ativos):
  - Humor registrado em pessoa_a aparece no Vault da pessoa_b.
  - Conflitos `*-pessoa_a.md` e `*-pessoa_b.md` quando ambos salvam
    no mesmo dia.
- [ ] **Cache backend Python** (se desktop pareado via Syncthing):
  - Mini Humor (Tela 21) carrega `humor-heatmap.json`.
  - Mini Financeiro (Tela 22) carrega `financas-cache.json`.
- [ ] **Biometria de abertura** (toggle on em Settings):
  - App pede impressão digital ao reabrir.
- [ ] **Exportar Vault em ZIP** via share sheet do Settings.
- [ ] **Widget homescreen** (M20):
  - Long-press home → adicionar widget Ouroboros.
  - Widget mostra humor do dia da pessoa ativa.

Capturar screenshots de cada validação em
`docs/sprints/M19-screenshots/`.

### 6. Tag git + push

Após validação manual aprovada:

```bash
VERSION=$(node -p "require('./app.json').expo.version")
git tag "v${VERSION}" -m "release v${VERSION} mvp fechado"
git push origin "v${VERSION}"
```

A tag é o sinal canônico de que o MVP fechou.

## Rollback

Se a release v1.0.0 quebrar em produção:

1. **Não desfazer a tag.** Tags são imutáveis no git.
2. Diagnosticar o bug em branch separada.
3. Subir release v1.0.1 com `versionCode: 2` (auto-incrementado).
4. `adb install -r ouroboros-1.0.1.apk` substitui sem perder dados
   (mesmo `package`, mesma assinatura).

Caso o bug seja crítico e não tenha solução rápida:

1. Distribuir o `.apk` da release anterior para os usuários.
2. `adb uninstall com.ouroboros.mobile && adb install ouroboros-0.x.y.apk`
   (perde dados não sincronizados — instrua usuário a aguardar sync
   completo do Syncthing antes).

## Versionamento

Semver simples:

- **MAJOR**: breaking change no schema do Vault (raríssimo;
  esperamos zero até v2.0).
- **MINOR**: nova feature (M2x sprints, V2 features).
- **PATCH**: bug fix isolado, sem mudança de schema.

`versionCode` Android sempre sobe monotonicamente; `eas build`
auto-incrementa.

## Limites hard

Excedeu limite → abrir sub-sprint M19.x antes de lançar:

| Métrica | Limite | Sub-sprint se exceder |
|---|---|---|
| Hermes bundle | 12 MB | M19.1 — tree-shake imports pesados |
| APK universal | 35 MB | M19.2 — comprimir GIFs / lazy load |
| Cold start (Redmi Note 13 5G Pro) | 3s | M19.3 — refactor boot path |

## Anti-features confirmadas zero

- Sem light mode.
- Sem multi-idioma (só PT-BR).
- Sem analytics / telemetria.
- Sem Play Store updates / OTA / EAS Update.
- Sem rede em runtime (ADR-0007).

## Q17.e — Keystore EAS em GitHub Secrets (release alternativo via CI local)

Quando a quota EAS Free Tier estoura, o workflow
[`.github/workflows/build-android-apk.yml`](../.github/workflows/build-android-apk.yml)
builda APK no GitHub Actions runner usando o **mesmo keystore EAS**
distribuído nas releases oficiais. Mesma SHA-1, OAuth Google
funciona.

### Setup inicial (uma vez)

Use o script versionado:

```bash
./scripts/exportar_keystore_eas.sh --apply
```

O script:
1. Carrega `EXPO_TOKEN` do `.env`.
2. Roda `eas credentials --platform android` (escolha **production** →
   **credentials.json: Download credentials from EAS to credentials.json**
   no menu interativo).
3. Extrai `keystorePassword`, `keyAlias`, `keyPassword` de
   `credentials.json`.
4. Valida com `keytool` que a senha bate.
5. Confirma SHA-1 `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`
   (o cadastrado em Google Cloud Console).
6. Gera base64 do `.jks` em arquivo temp.
7. Com `--apply`, cadastra 4 secrets via `gh secret set`:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
8. Shred no arquivo temp via trap exit.

Sem `--apply`, o script só imprime os 4 comandos `gh secret set` pra
você colar.

**Higiene pós-execução**: apague `credentials/android/keystore.jks` e
`credentials.json` do disco local (gitignored, mas evita exposição
acidental). O `.gitignore` cobre `credentials/android/`, `credentials.json`
e `*.jks`.

### Disparar build via workflow

```bash
gh workflow run build-android-apk.yml
gh run watch
```

Workflow steps relevantes (gerados pela Q17.e):
- **Provision keystore EAS** — decodifica `ANDROID_KEYSTORE_BASE64`
  em `android/app/release.keystore`. Skip + fallback se secret
  ausente (cai em debug keystore, OAuth quebra).
- **Patch build.gradle signing release** — apenda bloco
  `android.signingConfigs.release { ... }` no `android/app/build.gradle`
  pós-prebuild, lendo senhas via env vars.
- **Verify APK signature** — `keytool -printcert -jarfile <apk>` +
  comparação contra SHA-1 esperado. Falha o build se mismatch.

### Rotação de keystore

Não rotacionar a menos que o `.jks` vaze. Rotação invalidaria todas
as releases instaladas — usuários precisariam desinstalar + reinstalar
perdendo Vault. Se rotacionar:

1. Atualizar SHA-1 no Cloud Console (OAuth client Android).
2. Re-rodar `./scripts/exportar_keystore_eas.sh --apply` (os 4
   secrets sobrescrevem).
3. Bump major `versionCode` no `app.json` pra forçar reinstall.
4. Comunicar usuários antes do build.

### Comportamento sem os secrets

O workflow continua funcionando sem os 4 secrets — cai em debug
keystore (caminho legado pré-Q17.e). APK gera, instala, mas OAuth
Google rejeita com `400 invalid_request`. Útil só pra smoke de build,
não pra distribuição.
