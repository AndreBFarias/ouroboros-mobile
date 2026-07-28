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
(`app/_layout.tsx:763`, `app/onboarding.tsx:178` e `:218`) sempre
recebem `true` incondicionalmente.

O defeito real desta parte (a) **não é lógica quebrada** — o
comportamento atual (early-return true) é intencional e documentado
pelo comentário V4.0.2 correto. O defeito é que os **dois comentários
de cabeçalho** (linhas 147-150 e 193-202) ainda descrevem, em prosa, um
fluxo de intent + retry que ninguém mais alcança, e alguém lendo só o
comentário de topo (sem notar o early-return abaixo) concluiria
incorretamente que o app pede a permissão de forma interativa.

### (b) MANAGE_EXTERNAL_STORAGE declarada onde SAF bastaria

`app.json:42-44` declara as três permissões de armazenamento:

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
   é uma decisão consciente (vault em diretório privado não precisa de
   `MANAGE_EXTERNAL_STORAGE`; caller que escolher pasta arbitrária via
   SAF já tem a concessão daquela pasta pelo próprio picker).
3. Migrar o caminho "Outra pasta" para operar via SAF nativo
   (`StorageAccessFramework.createFileAsync`/`writeAsStringAsync` sobre
   o tree URI) em vez de `safTreeUriToFileUri` + `file://`. Requer
   validação em device real (Nível C) — mudança de storage nativo não é
   verificável só no Gauntlet web.
4. Após o item 3 validado em device, remover as três permissões de
   armazenamento de `app.json:42-44`.
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
