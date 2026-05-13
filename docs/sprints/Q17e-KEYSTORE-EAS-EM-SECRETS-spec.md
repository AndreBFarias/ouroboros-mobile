# Q17.e — Keystore EAS encriptado em GitHub Secrets

> **Tamanho:** Pequeno (1.5–3h)
> **Bloqueia v1.0.0?** Sim — desbloqueia OAuth Google em qualquer
> APK gerado pelo CI local, evitando dependência do EAS quando a
> quota Free Tier estoura.
> **Pré-requisitos:** Q17.a entregue (workflow `build-android-apk.yml`
> em produção), acesso ao dashboard EAS para exportar keystore.

## Contexto

O workflow `.github/workflows/build-android-apk.yml` (Q17.a) builda
APK local mas usa **debug keystore** do Android SDK (SHA-1 padrão
do AOSP `A0:0B:6E:E2:CB:67:84:E6:A7:9A:B2:E3:5C:62:FE:A0:FA:84:78:C3`).

O Android OAuth client cadastrado em Google Cloud Console
(`691237256846-sgqvc50rnut8p5emjq44sjfs6jg9tq5g`) está vinculado ao
SHA-1 **da keystore EAS** (`E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`).

Resultado: APKs gerados pelo workflow tentam OAuth → Google rejeita
porque SHA-1 ≠ esperado → erro `400 invalid_request`.

## Objetivo da sprint

Permitir que o workflow CI local produza APKs **assinados com o
mesmo keystore EAS** que o build oficial usa. Mesma SHA-1, OAuth
funciona em todos os APKs.

## Decisões técnicas firmes

- **Não cadastrar SHA-1 novo no Cloud Console.** Mantemos o vínculo
  ao keystore EAS canônico (já está em todos os APKs alpha-1 a
  alpha-4).
- **Não rotacionar keystore.** Rotação invalidaria todas as updates
  pra usuários que já têm o app instalado.
- **Storage:** 4 secrets no repo GitHub:
  - `ANDROID_KEYSTORE_BASE64` — keystore `.jks` codificado em base64.
  - `ANDROID_KEYSTORE_PASSWORD` — senha do arquivo `.jks`.
  - `ANDROID_KEY_ALIAS` — alias da chave dentro do keystore.
  - `ANDROID_KEY_PASSWORD` — senha do alias (frequentemente a mesma
    do arquivo, mas pode variar).
- **Aplicação:** step novo no workflow decodifica o keystore em
  `android/app/release.keystore` e configura `signingConfigs` via
  patch no `android/app/build.gradle` gerado pelo prebuild.

## Arquivos a criar/modificar

### Modificações

1. `.github/workflows/build-android-apk.yml`
   - Adicionar 2 steps antes de "Gradle assembleRelease":
     - "Provision keystore" — decodifica base64 → `release.keystore`.
     - "Patch build.gradle signing" — injeta `signingConfigs.release`
       e troca `signingConfig signingConfigs.debug` por
       `signingConfigs.release` no buildType `release`.
   - Os 4 valores vêm de `secrets.ANDROID_*`.
   - Fallback: se `ANDROID_KEYSTORE_BASE64` ausente, mantém debug
     keystore (caminho atual) — não quebra o workflow.

2. `docs/RELEASE.md`
   - Documentar passo a passo de:
     - Como exportar keystore via `eas credentials --platform android`.
     - Como gerar base64 (`base64 -w0 release.keystore`).
     - Como cadastrar as 4 secrets no repo.

### Novos

- `scripts/exportar_keystore_eas.sh` — wrapper que chama
  `eas credentials --platform android`, baixa o keystore, gera base64
  e mostra os 4 valores prontos pra colar no GitHub Secrets.

## Proof-of-work esperado

1. **Keystore exportado e base64 gerado:**
   ```bash
   ./scripts/exportar_keystore_eas.sh
   # Saída: 4 chaves com valores prontos pra colar no GitHub Secrets.
   ```

2. **Secrets configurados:** `gh secret list --json name` mostra
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

3. **Workflow run com signing:**
   ```bash
   gh workflow run build-android-apk.yml
   # Acompanha logs ate FINISHED, baixa artifact.
   keytool -printcert -jarfile ouroboros-android-apk.apk | grep SHA1
   # Esperado: SHA1=E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C
   ```

4. **OAuth funciona no APK:**
   ```bash
   adb install -r ouroboros-android-apk.apk
   # Abrir app → Menu → Agenda → "Conectar conta Google"
   # Deve mostrar consent screen (sem erro 400 invalid_request).
   ```

5. **Smoke:**
   ```bash
   ./scripts/smoke.sh
   # 1892 testes verde mantidos.
   ```

## Critérios de aceite

- [ ] 4 secrets cadastrados em `gh secret list`
- [ ] Workflow decodifica + assina APK com keystore EAS
- [ ] SHA-1 do APK gerado bate `E4:49:C8...` (validado com keytool)
- [ ] OAuth Google funciona no APK produzido pelo CI local
- [ ] Fallback: workflow continua funcionando sem secrets (cai em
      debug keystore como hoje)
- [ ] `docs/RELEASE.md` documentação atualizada
- [ ] `scripts/exportar_keystore_eas.sh` versionado

## Riscos identificados

| Risco | Mitigação |
|-------|-----------|
| Keystore vazar em log | Usar `::add-mask::` no workflow + nunca cat o `.jks` |
| Senha errada → assinatura falha | Step "Verify signing" com keytool antes do upload |
| Patch no build.gradle quebra em update de Expo prebuild | Idempotência via regex anchor estável; documentar no script |

## Anti-débito

Se aparecer um terceiro keystore (ex.: usuário regenera o EAS),
sprint Q17.f cobre rotação coordenada com novo SHA-1 no Cloud
Console.
