# AUDIT-P4-9-STORAGE-SAF-COMENTARIO — corrigir comentário de permissions.ts e remover MANAGE_EXTERNAL_STORAGE desnecessária

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (documentação enganosa para quem for mexer no código,
            mais uma permissão ampla demais que contradiz a política de
            privacidade publicada e barraria a Play Store)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-12]/[P4-11]/[IN-05]/[SE-06] da auditoria de
            2026-07-28. Confirmado nesta materialização lendo
            src/lib/vault/permissions.ts:147-239, app.json:23-56 e
            public/privacy.html:68-69.
```

## Execução de 2026-09-05 — itens 1 e 2 entregues, 3 e 4 viram continuação

Fechada pelo item 5 do Escopo: os itens 1 e 2 (comentários de
`src/lib/vault/permissions.ts`) foram aplicados e fecham a sprint
sozinhos. Os itens 3 e 4 **não** foram executados e ficam registrados
aqui como continuação, com o que a execução apurou sobre cada um.

**Item 4 (remover as permissões de `app.json:43-45`) colide com uma ADR
aceita.** `docs/ADRs/0016-vault-auto-criado-sem-saf.md:51-56` registra:
"Como o APK é distribuído fora da Play Store (GitHub Releases direto),
`MANAGE_EXTERNAL_STORAGE` é aceitável. A Play Store rejeitaria essa
permissão ... mas o canal de distribuição manual não tem essa
restrição." Ou seja, o argumento "publicação na loja seria rejeitada",
usado na seção (b) como se fosse achado novo, é decisão já tomada e
aceita. Executar o item 4 exige `DECISAO:` do dono ou uma ADR que
supersede a 0016 — não é trabalho de executor. O que continua de pé na
seção (b), independentemente disso, é a contradição com
`public/privacy.html:68-69`: ou a permissão sai, ou a política é
reescrita para descrever o que o app de fato declara.

**Item 3 (migrar "Outra pasta" para SAF nativo) é migração
arquitetural, não troca de duas chamadas.** Medido nesta execução:

- `StorageAccessFramework.writeAsStringAsync` é apenas um alias de
  `FileSystem.writeAsStringAsync`
  (`node_modules/expo-file-system/src/legacy/FileSystem.ts:743`). O que
  obriga a reescrita não é a chamada de escrita em si — o módulo nativo
  aceita `content://` de documento SAF —, e sim `createFileAsync`, que
  passa a ser obrigatório para **criar** o documento antes de escrever.
  Some o "abre e escreve" que o código usa hoje em todo lugar.
- O scheme persistido em `VAULT_ROOT_KEY` deixaria de ser `file://`,
  o que reativa o ramo `saf-fallback`
  (`src/lib/vault/permissions.ts:376`, `:428`) e o dispatch por scheme
  de `src/lib/vault/reader.ts:69` e `src/lib/vault/writer.ts:73` no app
  inteiro.
- `vaultUriJoin` (`src/lib/vault/paths.ts:39`) é concatenação de path;
  com `content://` ela deixa de valer. São **140 usos em 33 arquivos**
  de `src/` e `app/` (`grep -rn vaultUriJoin src app`).

Recomendação: materializar o item 3 como sprint própria, com validação
Nível C em device, em vez de arrastá-lo dentro de P4-9. Sem device não
há como provar nenhuma das três consequências acima.

## Problema (duas partes ligadas: comentário que mente sobre o próprio código, e permissão mais ampla do que o uso exige)

### (a) O comentário de cabeçalho descreve um fluxo hoje inalcançável — documentação mentindo, não lógica quebrada

`pedirPermissaoStorage()` sempre retorna `true` no Android. Isso **é
uma decisão consciente** documentada no próprio código — mas o
comentário de cabeçalho de duas funções ainda descreve um fluxo que o
early-return torna morto.

`probeManagePermission()` tem comentário de topo desalinhado do corpo:

```ts
// src/lib/vault/permissions.ts:147-150 -- COMENTARIO
// Probe rapido de MANAGE_EXTERNAL_STORAGE: tenta escrever um arquivo
// efemero em /sdcard/Documents/. Se sucesso, permissao esta ativa
// (Android 11+) ou WRITE_EXTERNAL_STORAGE concedido (Android <11).

// src/lib/vault/permissions.ts:151-165 -- CORPO REAL
async function probeManagePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // V4.0.2: probe no app's external files dir, que sempre e gravavel
  // independente de MANAGE_EXTERNAL_STORAGE. Para vault em /sdcard/
  // arbitrario o caller precisa usar SAF picker explicitamente.
  const baseDir = FileSystem.documentDirectory ?? 'file:///sdcard/';
  const probeUri = `${baseDir}.ouroboros-permcheck-${Date.now()}`;
  try {
    await FileSystem.writeAsStringAsync(probeUri, 'ok');
    await FileSystem.deleteAsync(probeUri, { idempotent: true });
    return true;
  } catch { return false; }
}
```

O comentário de topo (147-150) diz que a sonda escreve em
`/sdcard/Documents/` — o corpo (153-156, comentário V4.0.2 correto)
sonda `FileSystem.documentDirectory`, o diretório **privado** do app,
que é sempre gravável independentemente de qualquer permissão. Os dois
comentários coexistem no mesmo bloco de código e se contradizem.

`pedirPermissaoStorage()` tem o mesmo padrão, em escala maior:

```ts
// src/lib/vault/permissions.ts:193-202 -- COMENTARIO, descreve um fluxo completo
// Fluxo de pedido de permissao de armazenamento. Diferente da versao
// pre-V4.0.2: agora ESPERA o usuario retornar da tela de configuracoes
// e re-probea ate confirmar grant ou esgotar timeout. Resolve com true
// se permissao concedida, false caso contrario.
// Android >=11 (API >=30): Intent MANAGE_EXTERNAL_STORAGE leva o
// usuario para tela de configuracao; AppState detecta retorno; probe
// confirma grant.
export async function pedirPermissaoStorage(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Caminho rapido: ja concedida.
  if (await probeManagePermission()) return true;   // <- SEMPRE entra aqui
  // ... (linhas 207-238: intent + waitForAppForeground + 5 retries)
```

Como `probeManagePermission()` sempre retorna `true` no Android (sonda
o diretório privado, que é sempre gravável), a linha 206
(`if (await probeManagePermission()) return true;`) **sempre** dispara
primeiro, e as linhas 207-238 — o intent
`MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`, a espera de
`AppState` e os 5 retries com backoff — são **código morto**,
inalcançável em qualquer chamada real. Os 3 call-sites confirmados
(`app/_layout.tsx:796`, `app/onboarding.tsx:178` e `:218`) sempre
recebem `true` incondicionalmente.

O defeito real desta parte (a) **não é lógica quebrada** — o
comportamento atual (early-return true) é intencional e documentado
pelo comentário V4.0.2 correto. O defeito é que os **dois comentários
de cabeçalho** (linhas 147-150 e 193-202) ainda descrevem, em prosa, um
fluxo de intent + retry que ninguém mais alcança, e alguém lendo só o
comentário de topo (sem notar o early-return abaixo) concluiria
incorretamente que o app pede a permissão de forma interativa.

### (b) MANAGE_EXTERNAL_STORAGE declarada onde SAF bastaria

`app.json:43-45` declara as três permissões de armazenamento:

```json
"android.permission.WRITE_EXTERNAL_STORAGE",
"android.permission.READ_EXTERNAL_STORAGE",
"android.permission.MANAGE_EXTERNAL_STORAGE",
```

`MANAGE_EXTERNAL_STORAGE` concede leitura/escrita em **todos** os
arquivos do dispositivo. O app só precisa escrever na pasta que o
usuário escolheu via SAF picker no onboarding. A arquitetura já
converte deliberadamente o tree URI do SAF (que **já** traz a
concessão de acesso aquela pasta) para `file://`:

```ts
// src/lib/vault/permissions.ts:253-254
// malformadas em concat, createFileAsync obrigatorio para writes).
export function safTreeUriToFileUri(treeUri: string): string | null {
```

E essa conversão para `file://` que exige a permissão ampla para
escrever — se o caminho usasse o SAF nativamente
(`StorageAccessFramework.createFileAsync`/`writeAsStringAsync` sobre o
tree URI), a permissão ampla não seria necessária.

Isso contradiz a política de privacidade publicada,
`public/privacy.html:68-69`:

> "O aplicativo usa o Storage Access Framework do Android para ler e
> escrever os arquivos do Vault na pasta que você escolher. **Nenhum
> outro arquivo do dispositivo é acessado.**"

A permissão declarada no manifesto é justamente a capacidade de
acessar todos os outros arquivos — o oposto do que a política promete.
Além da inconsistência com a política, `MANAGE_EXTERNAL_STORAGE` exige
formulário de declaração na Play Store, aprovado essencialmente só para
apps gerenciadores de arquivos/backup — publicação na loja **seria
rejeitada** com o app atual.

## Escopo (mínimo)

1. Corrigir o comentário de `probeManagePermission()` (linhas 147-150)
   para descrever o comportamento real: sonda o diretório privado do
   app (`documentDirectory`), que é sempre gravável — não
   `/sdcard/Documents/`.
2. Corrigir o comentário de `pedirPermissaoStorage()` (linhas 193-202)
   para deixar explícito que o early-return da linha 206 torna o fluxo
   de intent (linhas 207-238) inalcançável na prática hoje, e que essa
   é uma decisão consciente (o vault default vive em diretório privado
   e não precisa de `MANAGE_EXTERNAL_STORAGE`). **Correção de 2026-09-05:**
   a justificativa original deste item — "caller que escolher pasta
   arbitrária via SAF já tem a concessão daquela pasta pelo próprio
   picker" — é **falsa** neste codebase e não foi escrita no código.
   `safTreeUriToFileUri` (`src/lib/vault/permissions.ts:274`) converte o
   tree URI para `file://`, e escrita em `file://` sob `/sdcard` não é
   coberta pela concessão do picker: é exatamente o caso que exige
   `MANAGE_EXTERNAL_STORAGE`, como o próprio cabeçalho do arquivo já
   dizia em `src/lib/vault/permissions.ts:36-40`.
3. Migrar o caminho "Outra pasta" para operar via SAF nativo
   (`StorageAccessFramework.createFileAsync`/`writeAsStringAsync` sobre
   o tree URI) em vez de `safTreeUriToFileUri` + `file://`. Requer
   validação em device real (Nível C) — mudança de storage nativo não é
   verificável só no Gauntlet web.
4. Após o item 3 validado em device, remover as três permissões de
   armazenamento de `app.json:43-45`.
5. NÃO-objetivo: não mudar o default do Vault (continua
   `documentDirectory`); não remover ou reescrever o código morto das
   linhas 207-238 nesta sprint se o item 3 não puder ser validado a
   tempo — nesse caso, os itens 1 e 2 (comentário) são entregaveis
   independentes e podem fechar a sprint sozinhos, com os itens 3-4
   documentados como continuação (a correção de comentário não deve
   ficar refém da migração de storage, que é mais arriscada).

## Proof-of-work

```bash
# itens 1-2 (comentario) -- baixo risco, verificavel estaticamente
npx tsc --noEmit                                                    # exit 0
npm test -- permissions                                             # suite verde, comportamento inalterado
grep -n "MANAGE_APP_ALL_FILES_ACCESS_PERMISSION" src/lib/vault/permissions.ts
# confirma que o codigo citado no comentario corrigido ainda existe (nao foi removido, so documentado)

# itens 3-4 (migracao SAF + remocao de permissao) -- requer device real
./scripts/adb-vault-pull.sh                                         # backup do vault antes de qualquer teste
# instalar dev-client com o app.json atualizado (permissao removida)
# no onboarding, escolher "Outra pasta" (SAF) e confirmar escrita/leitura
# de um registro real sem MANAGE_EXTERNAL_STORAGE concedida
adb shell dumpsys package com.ouroboros.mobile | grep -A2 MANAGE_EXTERNAL_STORAGE
# confirma que a permissao nao esta mais no manifesto instalado
./scripts/smoke.sh                                                   # verde
```

Sem UI nova (fluxo de escolha de pasta já existe) — dispensa caso E2E
novo no Gauntlet web para a parte de storage nativo (SAF/permissão não
é verificável em ambiente web); checkpoint Nível C obrigatório para os
itens 3-4 por tocar API nativa de armazenamento, conforme a própria
regra de validação do projeto.

## Commit

```
fix: audit-p4-9-storage-saf-comentario alinha comentario de permissions.ts ao early-return e prepara remocao do manage-external-storage
```
