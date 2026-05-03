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

## 5. Procedimento sugerido

1. **Estudar Android API 30+**: confirmar que
   `MANAGE_EXTERNAL_STORAGE` precisa Intent específico (não vai por
   `PermissionsAndroid.request`). Documentação:
   `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`.
2. Criar `pedirPermissaoStorage()`:
   ```ts
   async function pedirPermissaoStorage(): Promise<boolean> {
     if (Platform.OS !== 'android') return true; // web/iOS no-op
     if (Platform.Version >= 30) {
       const granted = await Environment.isExternalStorageManager?.();
       if (granted) return true;
       // dispara Intent para o usuário aceitar manualmente
       await IntentLauncher.startActivityAsync(
         'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
         { data: 'package:com.ouroboros.mobile' }
       );
       // aguarda usuario voltar; reverifica
       return await Environment.isExternalStorageManager?.() ?? false;
     }
     const res = await PermissionsAndroid.request(
       PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
     );
     return res === PermissionsAndroid.RESULTS.GRANTED;
   }
   ```
3. Criar `garantirSubpastas(vaultRoot)`: itera
   `SUBPASTAS_CANONICAS` (18 paths) e chama `makeDirectoryAsync(uri,
   { intermediates: true })` em cada. Catch silencioso para
   "diretorio já existe".
4. Criar `inicializarVaultCanonico()`:
   ```ts
   const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
   export async function inicializarVaultCanonico() {
     if (Platform.OS === 'web') {
       return { vaultRoot: 'web://mock-vault/', criado: false };
     }
     const ok = await pedirPermissaoStorage();
     if (!ok) throw new Error('storage permission denied');
     const uri = `file://${VAULT_PATH}`;
     await garantirSubpastas(uri);
     useVault.getState().setVaultRoot(uri);
     return { vaultRoot: uri, criado: true };
   }
   ```
5. Atualizar `paths.ts` adicionando helpers:
   `mediaFotosPath(date, rand)`,
   `mediaAudiosPath(date, rand)`,
   `mediaVideosPath(date, rand)`,
   `mediaFrasesPath(date, slug)`,
   `mediaAvataresPath(pessoa, ts)`,
   `mediaScannerPath(slug)`.
6. Adicionar permissões em `app.json`.
7. Atualizar `scripts/seed_vault_demo.sh` espelhando subpastas.
8. Testes: cobrir API <30 vs ≥30, sucesso, erro, idempotência.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m22-export && rm -rf /tmp/m22-export

# Verificação Android (manual ou em emulador):
adb shell ls /sdcard/Documents/Ouroboros/
# espera ver: daily, eventos, inbox, marcos, treinos, exercicios,
#             medidas, alarmes, tarefas, contadores, media
adb shell ls /sdcard/Documents/Ouroboros/media/
# espera ver: fotos, audios, videos, frases, avatares, scanner
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
- **Recovery no boot**: se usuário aceitar permissão e depois apagar
  pasta manualmente, `app/_layout.tsx` chama
  `inicializarVaultCanonico()` no boot quando detecta `vaultRoot`
  inválido. Sem prompt; só recriar.
- **Web cai em no-op**: mock URI `web://mock-vault/`; nenhum write
  real (mantém comportamento da v1.0).

Sprint pronta para execução sem perguntas pendentes.
