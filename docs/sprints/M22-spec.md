# Sprint M22 — Vault auto-criado em /sdcard/Documents/Ouroboros sem SAF

```
DEPENDE:    M21 (release v1.0.0 retirado); ADR-0014 (vault dedicado)
BLOQUEIA:   M23 (onboarding novo confia em vaultRoot setado)
            Toda sprint que persiste arquivos (M24-M40)
ESTIMATIVA: 5-6h
```

## 1. Objetivo

Substituir o pedido SAF interativo do onboarding por inicialização
**automática** do Vault em `/sdcard/Documents/Ouroboros/` na primeira
execução, criando recursivamente as 18+ subpastas canônicas. App pede
permissão de armazenamento uma vez (via `WRITE_EXTERNAL_STORAGE` em
Android <11 ou `MANAGE_EXTERNAL_STORAGE` em Android ≥11) e
`useVault.vaultRoot` fica sempre setado após onboarding. Helper
`garantirSubpastas()` é idempotente e auto-cura pasta deletada por
Syncthing.

Acompanha ADR-0016 (já criado) que estende ADR-0014.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/vault/permissions-init.test.ts`
  — testes de `inicializarVaultCanonico()` mockando Android <11 e ≥11
  + `garantirSubpastas()` idempotente.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/permissions.ts`
  — adicionar:
  - `inicializarVaultCanonico(): Promise<{ vaultRoot: string; criado: boolean }>`.
  - `garantirSubpastas(vaultRoot: string): Promise<void>` (idempotente).
  - `pedirPermissaoStorage(): Promise<boolean>` (detecta API e usa
    `PermissionsAndroid` ou Intent `MANAGE_EXTERNAL_STORAGE`).
  - Constante `SUBPASTAS_CANONICAS` lista os 18 paths.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — adicionar paths para `media/{fotos,audios,videos,frases,avatares,scanner}`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — adicionar permissões Android:
  - `"android.permission.WRITE_EXTERNAL_STORAGE"`,
  - `"android.permission.READ_EXTERNAL_STORAGE"`,
  - `"android.permission.MANAGE_EXTERNAL_STORAGE"`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/seed_vault_demo.sh`
  — atualizar para criar todas as 18 subpastas em
  `~/Protocolo-Ouroboros/` (espelho do que `inicializarVaultCanonico`
  cria no Android).

### Arquivos NÃO modificados

- `app/onboarding.tsx` (M23 reescreve).
- `src/lib/stores/vault.ts` (sem mudanças no shape).

## 3. APIs reutilizáveis

- `expo-file-system/legacy` — `makeDirectoryAsync`, `getInfoAsync`.
- `expo-file-system` — `documentDirectory`, `getStorageBaseUriAsync`
  (fallback se `/sdcard/` não acessível).
- `react-native` `PermissionsAndroid.request()` — Android <11.
- `expo-intent-launcher` (já transitivo) — Intent
  `android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`.
- `Platform.Version` (number) — discrimina API.
- `useVault` em `src/lib/stores/vault.ts` — chamar
  `setVaultRoot(uri)` no fim de `inicializarVaultCanonico()`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **app.json:** seção 1.8 — adiciona 3 permissões Android.
- **Boot hook:** seção 1.7 — `inicializarVaultCanonico()` é chamado
  por M23 (onboarding Frame 2 "Tudo pronto") e por
  `app/_layout.tsx` no boot caso `vaultRoot` esteja null mas
  `useOnboarding.done === true` (recovery se usuário apagou pasta).
- **Stores:** seção 1.4 — usa `useVault` existente; nenhuma store nova.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR completa em strings de UI (toasts
  de erro de permissão).
- `accessibilityLabel` sem acento.
- Comentários em código sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore`.
- Imports via `@/*`.
- **Não tocar** em `app/onboarding.tsx` (M23 fica responsável).
- **Não remover** o helper antigo `requestVaultPermission()` —
  manter como deprecated com `// TODO M23 remove after onboarding`.
- Web (`Platform.OS === 'web'`) deve cair em no-op silencioso
  (devolver path mock e `criado: false`).
- **Armadilha A19 (BRIEF §4)**: scoped storage Android 11+ + OEMs
  agressivos podem negar write em `/sdcard/Documents/Ouroboros/`
  mesmo com `MANAGE_EXTERNAL_STORAGE` concedida. M22 **obriga
  probe write+read+delete** num arquivo `.ouroboros-probe` antes
  de marcar `vaultRoot` como válido. Se probe falhar, **fallback
  para SAF interativo** via `requestVaultPermission()` legacy com
  toast "Seu dispositivo exige seleção manual da pasta. Escolha
  `/sdcard/Documents/Ouroboros/`."
- **Detecção de `MANAGE_EXTERNAL_STORAGE`**: não usar
  `Environment.isExternalStorageManager` (não existe em RN/Expo
  como API JS direta). Usar **probe write+read+delete** como
  fonte de verdade — se probe passa, permissão está OK
  funcionalmente. A Intent `MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`
  é disparada apenas como fluxo de pedido, não como check.

## 5. Procedimento sugerido

1. **Estudar Android API 30+**: confirmar que
   `MANAGE_EXTERNAL_STORAGE` precisa Intent específico (não vai por
   `PermissionsAndroid.request`). Documentação:
   `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`.
2. Criar helper `probeVaultWritable(vaultRoot)` (ÚNICA fonte de
   verdade sobre permissão funcional):
   ```ts
   async function probeVaultWritable(vaultRoot: string): Promise<boolean> {
     const probe = `${vaultRoot}/.ouroboros-probe`;
     try {
       await FileSystem.writeAsStringAsync(probe, 'ok');
       const back = await FileSystem.readAsStringAsync(probe);
       await FileSystem.deleteAsync(probe, { idempotent: true });
       return back === 'ok';
     } catch {
       return false;
     }
   }
   ```
3. Criar `pedirPermissaoStorage()` — só **dispara fluxo de pedido**.
   Nunca usa o resultado da Intent como fonte de verdade (vide A19):
   ```ts
   async function pedirPermissaoStorage(): Promise<void> {
     if (Platform.OS !== 'android') return;
     if (Platform.Version >= 30) {
       try {
         await IntentLauncher.startActivityAsync(
           'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
           { data: 'package:com.ouroboros.mobile' }
         );
       } catch {
         // se Intent falhar, segue — probe vai detectar
       }
     } else {
       await PermissionsAndroid.request(
         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
       );
     }
   }
   ```
4. Criar `garantirSubpastas(vaultRoot)`: itera
   `SUBPASTAS_CANONICAS` (18 paths) e chama `makeDirectoryAsync(uri,
   { intermediates: true })` em cada. Catch silencioso para
   "diretorio já existe".
5. Criar `inicializarVaultCanonico()` com **probe + fallback SAF**:
   ```ts
   const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
   export async function inicializarVaultCanonico(): Promise<{
     vaultRoot: string; criado: boolean; modo: 'auto' | 'saf-fallback' | 'web'
   }> {
     if (Platform.OS === 'web') {
       return { vaultRoot: 'web://mock-vault/', criado: false, modo: 'web' };
     }
     const uri = `file://${VAULT_PATH}`;
     await pedirPermissaoStorage();
     await garantirSubpastas(uri);
     const writable = await probeVaultWritable(uri);
     if (!writable) {
       // Armadilha A19: OEM/scoped storage bloqueou. Cair em SAF.
       const safUri = await requestVaultPermission(); // legacy helper
       if (!safUri) throw new Error('storage permission denied (saf fallback also denied)');
       await garantirSubpastas(safUri);
       useVault.getState().setVaultRoot(safUri);
       return { vaultRoot: safUri, criado: true, modo: 'saf-fallback' };
     }
     useVault.getState().setVaultRoot(uri);
     return { vaultRoot: uri, criado: true, modo: 'auto' };
   }
   ```
6. Atualizar `paths.ts` adicionando helpers:
   `mediaFotosPath(date, rand)`,
   `mediaAudiosPath(date, rand)`,
   `mediaVideosPath(date, rand)`,
   `mediaFrasesPath(date, slug)`,
   `mediaAvataresPath(pessoa, ts)`,
   `mediaScannerPath(slug)`.
7. Adicionar permissões em `app.json`.
8. Atualizar `scripts/seed_vault_demo.sh` espelhando subpastas.
9. **Plug em `app/_layout.tsx` via `useEffect` direto** (NÃO em
   `BOOT_HOOKS` — vide CONTRACT §7.9; falha precisa propagar para UI):
   ```tsx
   useEffect(() => {
     if (useOnboarding.getState().done && !useVault.getState().vaultRoot) {
       inicializarVaultCanonico().catch((err) => {
         showToast({ tipo: 'error', texto: 'Não foi possível acessar a pasta do Vault. Verifique as permissões em Configurações.' });
       });
     }
   }, []);
   ```
10. **Adicionar mocks no `jest.setup.cjs`** (vide CONTRACT §7.8):
    `PermissionsAndroid` + `expo-intent-launcher` + mock de
    `expo-file-system/legacy.writeAsStringAsync` retornando OK por
    default e configurável por teste para simular A19.
11. Testes: cobrir API <30 vs ≥30, sucesso, erro de permissão,
    **probe falhando → fallback SAF**, idempotência de
    `garantirSubpastas`.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m22-export && rm -rf /tmp/m22-export

# Verificação Android (Nível B — emulador ouroboros-test):
adb shell ls /sdcard/Documents/Ouroboros/
# espera ver: daily, eventos, inbox, marcos, treinos, exercicios,
#             medidas, alarmes, tarefas, contadores, media
adb shell ls /sdcard/Documents/Ouroboros/media/
# espera ver: fotos, audios, videos, frases, avatares, scanner

# Confirma permissão MANAGE_EXTERNAL_STORAGE concedida:
adb shell dumpsys package com.ouroboros.mobile | grep -i MANAGE_EXTERNAL
# espera ver: granted=true

# Confirma probe roda OK (sem leftover):
adb shell ls -la /sdcard/Documents/Ouroboros/.ouroboros-probe 2>&1
# espera ver: No such file or directory (probe sempre auto-deleta)

# Validação A19 (Nível C — Redmi Note 13 do usuário com MIUI):
# instalar APK + abrir + verificar que se modo='saf-fallback', o
# toast aparece e SAF picker abre como fallback funcional.
```

## 7. Commit

```
feat: m22 vault canonico em sdcard documents ouroboros sem saf
```

## 8. Checkpoint visual

Sprint sem UI direta. Validação Nível B (emulador) verifica que:
- Onboarding Frame 2 (mantido temporariamente, M23 remove) já não
  bloqueia se `inicializarVaultCanonico()` foi chamado.
- Pasta `/sdcard/Documents/Ouroboros/` existe com subpastas.

Capturar 1 screenshot Nível A `docs/sprints/M22-screenshots/A-permissao-pedida.png`
mostrando o prompt de Storage no emulador.

## 9. Decisões tomadas

- **`MANAGE_EXTERNAL_STORAGE` em Android 11+**: APK fora da Play
  Store; permissão aceitável. Documentado em ADR-0016.
- **Path hardcoded `/sdcard/Documents/Ouroboros/`**: convenção
  comum, visível em qualquer file manager, fácil de pareear no
  Syncthing.
- **18 subpastas criadas de uma vez**: evita race condition em
  primeiro save. `garantirSubpastas` chamado também em cada save
  como auto-cura.
- **Recovery no boot via `useEffect` direto, NÃO `BOOT_HOOKS`**
  (vide CONTRACT §7.9): falha de permissão precisa propagar à UI
  via toast. `BOOT_HOOKS` swallow erros silenciosamente.
- **Web cai em no-op**: mock URI `web://mock-vault/`; nenhum write
  real (mantém comportamento da v1.0).
- **Probe write+read+delete como fonte de verdade** (vide A19 no
  BRIEF §4): `Environment.isExternalStorageManager()` não existe
  em RN/Expo como API JS. Probe é a única forma de saber se write
  funciona em runtime nesse OEM/Android específico.
- **Fallback automático para SAF se probe falhar**: MIUI/Xiaomi
  (Redmi Note 13 do usuário), OneUI/Samsung, OxygenOS podem negar
  write mesmo com permissão concedida. SAF interativo é o último
  recurso — usuário escolhe pasta uma vez, app aceita o URI SAF.
  `requestVaultPermission()` legacy reutilizado.
- **Modo da inicialização exposto** no retorno (`'auto' |
  'saf-fallback' | 'web'`): permite Settings (M29) e M23
  (onboarding) saberem em que modo o vault foi setado para mostrar
  texto contextual ("Vault em /sdcard/..." vs "Vault em pasta
  selecionada manualmente").

Sprint pronta para execução sem perguntas pendentes.
