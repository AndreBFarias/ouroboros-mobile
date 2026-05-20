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

## Pre-release checklist (uma vez, antes do primeiro release público)

Itens de configuração de repositório que precisam estar prontos antes
do primeiro release distribuído publicamente. Cada item é idempotente
e só precisa ser feito uma vez por repositório.

- [ ] **GitHub Pages habilitado apontando para `public/` em `main`.**
  Necessário para servir as páginas de política e termos linkadas no
  Google Cloud Console (consent screen) e em `app.json`. Configuração
  no painel do GitHub:

  1. Abrir `Settings > Pages` no repositório.
  2. Em **Source**, selecionar `Deploy from a branch`.
  3. Em **Branch**, escolher `main` e em **Folder** escolher `/public`.
  4. Clicar em `Save`. Aguardar ~1 minuto até o primeiro deploy.

  Verificação:

  ```bash
  curl -sf https://andrebfarias.github.io/ouroboros-mobile/privacy.html | head -5
  curl -sf https://andrebfarias.github.io/ouroboros-mobile/terms.html | head -5
  ```

  Ambos devem retornar HTML válido (linha `<!DOCTYPE html>`). Enquanto
  Pages não estiver habilitado, `gh api repos/<owner>/<repo>/pages`
  retorna 404 e os endpoints respondem 404. Esta tarefa é do dono do
  repositório (humano), não pode ser feita por automação sem token de
  admin.

  Arquivos servidos (já versionados em `public/` desde R-SEC-3):
  `public/privacy.html`, `public/terms.html`, `public/styles/docs.css`,
  `public/fonts/JetBrainsMono_400Regular.ttf`,
  `public/fonts/JetBrainsMono_500Medium.ttf`.

- [ ] **URLs de política e termos cadastradas no Google Cloud Console.**
  No consent screen do OAuth (interno ou externo), preencher:

  - Política de privacidade: `https://andrebfarias.github.io/ouroboros-mobile/privacy.html`
  - Termos de uso: `https://andrebfarias.github.io/ouroboros-mobile/terms.html`

  Sem essas URLs preenchidas, Google rejeita a publicação do consent
  screen de produção.

- [ ] **Links de política e termos referenciados no aplicativo.**
  Settings &rsaquo; Sobre passa a apresentar dois links externos para
  `privacy.html` e `terms.html`. Essa entrega é feita em sprint
  dedicada de UI (não pertence ao escopo de R-SEC-3, que cobre apenas
  os arquivos HTML estáticos).

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

## R-OPS-1 — Release automática via push de tag (2026-05-17)

Antes desta sprint, ao empurrar uma tag `v*-alpha-*` o workflow
falhava no último passo (`Attach APK to release on tag`) com
`release not found`. Workaround manual: criar a release via
`gh release create $TAG` **antes** de empurrar a tag. Frágil e
fácil de esquecer (regressão recorrente entre alphas 10-12).

Agora o workflow é idempotente:

1. **Ensure release exists (draft if new)** — se a release já
   existe, reusa. Senão, cria como **draft** com notas extraídas
   do `CHANGELOG.md` via `scripts/extract-changelog-section.sh`,
   apontando para o SHA da tag.
2. **Attach APK to release on tag** — anexa o `.apk` à release
   (existente ou draft criado no passo 1).
3. **Publish release (remove draft)** — se a release estava em
   draft, marca como `--draft=false`. Idempotente: no-op se já
   estava publicada.

### Notas auto-extraídas do CHANGELOG

`scripts/extract-changelog-section.sh` extrai a **primeira seção
`### `** do CHANGELOG (sem incluir o cabeçalho `## [Unreleased]`),
parando no segundo `### ` ou EOF. Exemplo:

```bash
./scripts/extract-changelog-section.sh CHANGELOG.md
# imprime em stdout:
#   ### Fase 3 Onda 3D.3 — R-NAV-3-V2 ... (2026-05-17)
#   <conteúdo da seção>
```

Exit codes:
- `0` sucesso (conteúdo em stdout, log em stderr).
- `1` arquivo não encontrado.
- `2` nenhum cabeçalho `### ` encontrado.

### Fluxo de release recomendado

```bash
# 1. Garanta que o CHANGELOG.md tenha como primeira ### a seção
#    da versão que está prestes a ser lançada. As entradas anteriores
#    continuam abaixo, intocadas.

# 2. Crie e empurre a tag — o workflow faz o resto:
VERSION=v1.0.0-alpha-13
git tag "$VERSION" -m "release $VERSION"
git push origin "$VERSION"

# 3. Acompanhe:
gh run watch
# Ao final, a release fica publicada em
# https://github.com/<owner>/<repo>/releases/tag/$VERSION
# com o APK anexado e notas extraídas do CHANGELOG.
```

### Retry / re-execução

O fluxo é seguro pra re-rodar:
- Se a release já existe (draft ou publicada), o passo 1 reusa.
- O upload usa `--clobber`, sobrescrevendo o APK anterior.
- Se já estava publicada, o passo 3 vira no-op.

### Como editar notas manualmente

Se você precisa de notas customizadas (não o extrato do CHANGELOG):

1. Crie a release manualmente **antes** de empurrar a tag:
   ```bash
   gh release create v1.0.0-alpha-13 \
     --title "v1.0.0-alpha-13" \
     --notes-file MINHAS_NOTAS.md \
     --draft
   ```
2. Empurre a tag — o workflow detecta que a release existe,
   reusa, anexa o APK, e publica.

## R-OPS-4 — Setup do repo: branch protection (2026-05-17)

Configuração única aplicada uma vez no repositório GitHub. Garante
que `main` nunca aceite push direto sem passar pelos checks
automatizados (anonimato + build Android), evitando regressões
silenciosas como as que apareceram entre alpha-10 e alpha-12.

### Política aplicada

| Campo | Valor | Motivo |
|---|---|---|
| `required_status_checks.strict` | `true` | exige branch atualizado antes do merge |
| `required_status_checks.contexts` | `["scan-commits", "Build APK Android"]` | bloqueia se anonimato falhar ou bundle quebrar |
| `required_pull_request_reviews` | `null` | dev solo; sem revisor obrigatório |
| `enforce_admins` | `false` | dono pode hotfix em emergência |
| `required_linear_history` | `true` | rebase/squash; rejeita merge commit sujo |
| `allow_force_pushes` | `false` | impede reescrita de história |
| `allow_deletions` | `false` | impede deletar `main` por acidente |
| `restrictions` | `null` | sem allowlist de pushers |

Os contextos correspondem ao `check_run.name` reportado pelo GitHub
Actions, **não** ao nome do workflow:

- `scan-commits` — job id de `.github/workflows/anonymity-check.yml`.
- `Build APK Android` — campo `jobs.build.name` em
  `.github/workflows/build-android-apk.yml`. (O workflow se chama
  `Build Android APK`, mas o que é registrado como status check é o
  nome do job, confirmado empiricamente via `gh api .../jobs`.)

### Aplicar via script idempotente

```bash
# inspecionar payload antes (não muda nada):
./scripts/setup-branch-protection.sh --dry-run

# aplicar (precisa de gh autenticado com escopo repo e admin no repo):
./scripts/setup-branch-protection.sh

# verificar config atual:
./scripts/setup-branch-protection.sh --show
```

Overrides via env:

```bash
REPO=owner/fork-do-repo BRANCH=main ./scripts/setup-branch-protection.sh
```

### Aplicação manual via `gh api`

Se preferir aplicar sem o script (ou auditar o comando que o script
gera):

```bash
gh api repos/[REDACTED]/ouroboros-mobile/branches/main/protection \
  --method PUT \
  --field 'required_status_checks={"strict":true,"contexts":["scan-commits","Build APK Android"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### Quando aplicar

Uma vez, na configuração inicial do repo, ou ao mudar de fork. O
script é seguro pra re-rodar — PUT sobrescreve com o estado
declarativo do script. Se precisar mudar a política, edite o script
e rode de novo; não há diff incremental.

### Bypass em emergência

`enforce_admins=false` permite que o dono empurre direto em
emergências (ex: corrigir CI quebrado que está bloqueando todos os
PRs). Documentar o motivo em commit posterior. Para sprint normal,
sempre via PR + checks verdes.
