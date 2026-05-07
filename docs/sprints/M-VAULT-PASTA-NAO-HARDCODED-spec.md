# Sprint H3 — M-VAULT-PASTA-NAO-HARDCODED

```
DEPENDE:    H1 (vaultUriJoin), H2 (layout por tipo)
BLOQUEIA:   J1 (onboarding ganha passo "onde salvar"), todo Bloco I
ESTIMATIVA: ~3h
PRIORIDADE: ALTA (UX + decisão arquitetural durável)
ADR:        0022
STATUS:     [todo]
```

## §1 Achado / motivação

`src/lib/vault/permissions.ts:41-42`:

```ts
const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
const VAULT_URI = `file://${VAULT_PATH}`;
```

Hardcoded. `inicializarVaultCanonico()` força tentar `/sdcard/Documents/Ouroboros/`
sem perguntar ao usuário onde salvar. Se probe falha (OEM agressivo —
MIUI, OneUI, HyperOS bloqueando write em `/sdcard/Documents/`), cai em
SAF picker via `requestVaultPermission()`.

Problemas:

1. Usuário não pode escolher local na primeira tentativa — só no fallback.
2. Hardcode "Ouroboros" assume usuário não tem outro Vault Obsidian já
   nessa pasta.
3. Não há tela de "trocar pasta depois" em Settings.

Decisão durável dono 2026-05-06: **onboarding pergunta** + Settings tem
opção de trocar.

## §2 Tarefa concreta

1. **Refatorar `src/lib/vault/permissions.ts`**:

   - Remover `VAULT_PATH` e `VAULT_URI` como constantes globais.
   - Substituir `inicializarVaultCanonico()` por
     `inicializarVaultEscolhido(uri: string)` que aceita URI já
     escolhida pelo caller.
   - Manter `pedirPermissaoStorage()` (chamado quando usuário escolhe
     sugestão default `/sdcard/Documents/Ouroboros/`).
   - Manter `requestVaultPermission()` (chamado quando usuário escolhe
     "Outra pasta" via SAF picker).
   - Adicionar `sugestaoVaultPathDefault(): string` que retorna
     `/sdcard/Documents/Ouroboros/` (sugestão pura, não hardcode).
   - `garantirSubpastas` recebe URI saneada via `vaultUriJoin` (H1).

2. **Atualizar `app/onboarding.tsx`**:

   - Frame final ganha sub-passo **"Onde salvar seus dados?"**:

     ```
     [Card] Sugestão: Documents/Ouroboros
              "Pasta dedicada visível no seu file manager.
               Fácil de sincronizar com Obsidian/Syncthing."
              [Botão "Usar essa"]

     [Card] Outra pasta
              "Escolher manualmente onde salvar
               (ex: pasta de outro Vault Obsidian existente)."
              [Botão "Escolher"]
     ```

   - "Usar essa" → chama `pedirPermissaoStorage()` + `inicializarVaultEscolhido(sugestaoVaultPathDefault())`.
   - "Escolher" → chama `requestVaultPermission()` + `inicializarVaultEscolhido(uriEscolhida)`.

3. **Criar `app/settings/vault.tsx`** (nova sub-tela):

   - Mostra path atual: `vaultRoot` (truncado se longo).
   - Botão "Trocar pasta do Vault" → diálogo de aviso "Os dados ficam
     na pasta antiga, mover manualmente. Confirmar?" → SAF picker.
   - Botão "Reinicializar pasta" (já existe? auditar
     `app/settings/index.tsx`) → recria 19 subpastas na pasta atual.

4. **Plug Settings** em `app/settings/index.tsx`: `<LinkSubTela>` "Vault" →
   `/settings/vault`.

5. **Criar ADR-0022** em
   `docs/ADRs/0022-vault-pasta-escolhida-pelo-usuario.md`. Status:
   Aceito. Supersedes parcialmente ADR-0014 (que assumia pasta
   dedicada hardcoded). Justificativa: respeitar autonomia do usuário,
   permitir Vault Obsidian compartilhado.

6. **Atualizar `docs/ADRs/INDEX.md`**.

## §3 Restrições invioláveis

- Anonimato Regra −1.
- PT-BR sentence case + acentuação completa em strings UI.
- TS strict 0 erros.
- Sem regressão de testes.
- Trocar pasta no Settings NÃO mover dados automaticamente — diálogo
  explícito para o usuário entender.
- Comentários sem acento.

## §4 Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
./scripts/check_gauntlet_leak.sh
```

Adicionar 4+ casos novos em `tests/lib/vault/permissions.test.ts`:

- `inicializarVaultEscolhido` com URI de sugestão default → cria 8 pastas
  (markdown, png, jpg, m4a, mp4, pdf, gif, .ouroboros/cache).
- `inicializarVaultEscolhido` com URI SAF (`content://...`) → cria pastas
  via SAF.
- `inicializarVaultEscolhido` com URI vazia → lança erro.
- Idempotência: chamar 2× com mesma URI = no-op no segundo (pastas já
  existem).

## §5 Validação Gauntlet OU validação humana

**Gauntlet (Nível A)**: navegar `/onboarding` no Gauntlet web, completar
até Frame final, mockear `requestVaultPermission` retornando URI fake
`web://mock/`, validar que `useVault.vaultRoot` é setado corretamente.
PNG `A-onboarding-escolha-pasta.png`.

**Validação humana adb obrigatória** (SAF picker é runtime nativo):

```bash
adb shell pm clear com.ouroboros.mobile
adb shell am start -W -a android.intent.action.MAIN -n com.ouroboros.mobile/.MainActivity
# Onboarding inicia. Avançar até Frame "Onde salvar?".
# Caminho A: tocar "Usar essa" → permissão storage → vault em /sdcard/Documents/Ouroboros/
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/markdown/

# Reset e refazer.
adb shell pm clear com.ouroboros.mobile
adb shell am start -W -a android.intent.action.MAIN -n com.ouroboros.mobile/.MainActivity
# Caminho B: tocar "Escolher" → SAF picker → escolher /sdcard/Download/
# Vault deve ser criado em /sdcard/Download/markdown/, etc.
adb shell ls /sdcard/Download/markdown/ 2>&1
```

PNG `B-onboarding-escolha-pasta-saf.png` capturado via `adb exec-out
screencap -p` no momento do SAF picker.

## §6 Commit message

```
feat: m-vault-pasta-nao-hardcoded onboarding pergunta + adr-0022
```

## §7 Decisões tomadas

- **Pergunta com card "Sugestão" + "Outra pasta"** em vez de SAF picker
  direto: usuário menos avançado escolhe sugestão e tudo funciona;
  usuário avançado tem flexibilidade. Documentar em ADR-0022.
- **Settings ganha sub-tela `/settings/vault`** em vez de inline em
  Settings: separação de concerns + permite expandir com mais opções
  (clear cache vault, export ZIP, import ZIP, etc).
- **Trocar pasta NÃO move dados**: complexidade de migração SAF↔SAF é
  alta (precisaria copy file-by-file), e usuário pode preferir manter
  histórico antigo. Diálogo explícito + sugestão "exporta ZIP, importa
  no novo" como fluxo manual.
- **Sugestão default `/sdcard/Documents/Ouroboros/`**: mantém
  retrocompatibilidade com instalações antigas (mesma pasta) +
  fácil de descobrir no file manager.
