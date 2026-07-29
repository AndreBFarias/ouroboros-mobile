# AUDIT-P1-5B-LISTARBASENAMES — pasta que falha ao listar vira pasta vazia e some inteira

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (mesmo dano da AUDIT-P1-5 um nível acima — em vez de um
            arquivo órfão, uma pasta inteira; menos provável, muito mais caro)
DEPENDE:    AUDIT-P1-5-MIGRACAO-FLAG-INCONDICIONAL (mergeada; introduziu a
            contabilidade de falhas que este spec estende para as listagens)
ORIGEM:     achado [P1-5B] da auditoria de 2026-07-28. Encontrado na execução
            da Fase 1, ao corrigir o `boolean` ambíguo de `moverIdempotente`:
            a mesma ambiguidade existe uma camada acima, em `listarBasenames`,
            e não foi tratada porque o custo de distinguir os dois casos exige
            uma decisão própria sobre I/O em SAF.
```

## Problema (o `catch` colapsa "pasta não existe" com "a listagem falhou")

### A evidência

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:104-121
async function listarBasenames(folderUri: string): Promise<string[]> {
  try {
    if (folderUri.startsWith('content://')) {
      const uris = await StorageAccessFramework.readDirectoryAsync(folderUri);
      const out: string[] = [];
      for (const u of uris) {
        const decoded = decodeURIComponent(u);
        const last = decoded.split('/').pop() ?? '';
        if (last.length > 0 && !ehSyncConflict(last)) out.push(last);
      }
      return out;
    }
    const nomes = await FileSystem.readDirectoryAsync(folderUri);
    return nomes.filter((n) => !ehSyncConflict(n));
  } catch {
    return [];
  }
}
```

O comentário da função, logo acima, declara só o caso benigno:

```
// src/lib/boot/migrarVaultLayoutPorTipo.ts:93
// Lista basenames de uma pasta; retorna [] se inexistente.
```

O `[]` de `:119` cobre dois mundos:

- **pasta não existe** — o caso comum e benigno. Num Vault criado depois do
  layout-por-tipo, as 19 pastas legadas simplesmente não estão lá. Devolver
  lista vazia é a resposta certa;
- **`readDirectoryAsync` levantou numa pasta cheia** — permissão SAF revogada
  no meio do boot, `content://` que virou stale depois de o usuário reeleger a
  raiz, OEM segurando o diretório, Syncthing mexendo na pasta. Aqui a lista
  vazia é uma mentira.

### Por que a mentira é total e silenciosa

`listarBasenames` é a boca de entrada de todos os passos de migração. Cada
passo faz o mesmo movimento — lista, itera, move:

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:214-227
  const folderUri = joinUri(vaultRoot, folderLegado);
  const basenames = await listarBasenames(folderUri);
  for (const basename of basenames) {
    if (!basename.endsWith('.md')) continue;
    // ...
    await moverEContabilizar(
      resultado,
      vaultRoot,
      `${folderLegado}/${basename}`,
      `markdown/${novoBasename}`
    );
  }
```

Se `basenames` volta vazio, o `for` não roda. `moverEContabilizar`
(`:177-193`) nunca é chamado, e é ele — e só ele — quem incrementa
`resultado.falhas` e empilha em `resultado.pathsFalhos` (`:177-193`). A contagem de falhas
fica **zero**. E zero é exatamente a condição que a `AUDIT-P1-5` instalou para
liberar a flag:

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:542-554
  if (resultado.falhas > 0) {
    // Contrato do cabecalho: flag NAO sobe com falha parcial. [...]
    logarFalhas('migracao', resultado);
    return resultado;
  }

  // Sucesso total: marca flag para skip rapido em boots futuros. A
  // varredura de recuperacao tambem e dispensada — nao ha orfaos que
  // ela pudesse achar.
  useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
  useSessao.getState().marcarFlagBoot('vaultLayoutOrfaosVarridos');
```

Repare que sobem **as duas** flags. A `vaultLayoutOrfaosVarridos` existe
justamente para resgatar o que a versão antiga deixou para trás — e é
dispensada aqui sob a premissa "não há órfãos que ela pudesse achar", premissa
que uma listagem falha inválida. O guard de entrada (`:534-538`) então fecha
as duas portas de uma vez: nem a migração nem a recuperação rodam de novo.

### Cenário de falha concreto

O Vault de `pessoa_a` está em `content://` (SAF, pasta escolhida no
onboarding). No boot em que a migração roda, o Android já devolveu o
`vaultRoot` persistido, mas a permissão persistente de `daily/` foi invalidada
— o usuário moveu a pasta no gerenciador de arquivos, ou o OEM reciclou a
concessão. `readDirectoryAsync('.../daily')` levanta.

`listarBasenames` devolve `[]`. Os outros 18 diretórios listam normalmente e
migram. `falhas` termina em 0, as duas flags sobem, e o boot segue sem uma
linha de log — `logarFalhas` (`:509-519`) só emite quando `falhas > 0`.

Todo o histórico de humor de `pessoa_a` continua em `daily/`. Nenhum leitor
olha para lá: todos varrem `markdown/` (`MARKDOWN_FOLDER` em
`src/lib/vault/paths.ts`). Do ponto de vista do app, `pessoa_a` nunca
registrou humor — histórico, Recap e médias, todos vazios. Os arquivos estão
intactos no disco, e é a única coisa que torna a recuperação possível.

É a mesma classe de defeito que a `AUDIT-P1-5` acabou de corrigir um nível
abaixo, e a correção de lá é o modelo:

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:123-131
// Resultado de um movimento individual. Os tres estados existem para
// desfazer a ambiguidade do `boolean` anterior (AUDIT-P1-5), que
// devolvia `false` tanto para sucesso benigno quanto para erro real:
//   - 'movido':    copia concluida nesta execucao (origem removida).
//   - 'ja-estava': destino ja existia; nada a fazer. Sucesso idempotente,
//                  o registro esta visivel para os leitores.
//   - 'falhou':    copyAsync levantou. O arquivo continua no layout
//                  legado e nenhum leitor o enxerga.
export type MovimentoResultado = 'movido' | 'ja-estava' | 'falhou';
```

### O custo, e por que não coube na AUDIT-P1-5

Distinguir "não existe" de "falhou" não sai de graça. `readDirectoryAsync`
não separa os dois casos por tipo de erro de forma confiável em SAF, então a
única leitura estável é perguntar antes: `getInfoAsync` na pasta, e só então
listar.

Medido nesta auditoria, `executarPassosMigracao`
(`migrarVaultLayoutPorTipo.ts:365-504`) invoca `listarBasenames`
**22 vezes** por execução completa, sobre **19 diretórios distintos**
(`media/fotos` é listada três vezes e `media/scanner` duas). Cada `getInfoAsync`
extra em `content://` é uma ida ao provider SAF, no caminho crítico do boot,
no aparelho onde SAF já é a operação mais cara do app. É decisão de tradeoff
— quanto de arranque se paga por essa garantia — e por isso ficou de fora do
escopo da `AUDIT-P1-5`, que se restringiu à camada de movimento.

## Escopo (mínimo)

1. Trocar o retorno de `listarBasenames` por três estados, espelhando o
   vocabulário que `MovimentoResultado` já estabeleceu no arquivo. Sugestão:
   `{ estado: 'listada'; basenames: string[] } | { estado: 'inexistente' } |
   { estado: 'falhou' }`. Manter o nome da função e o filtro de
   `sync-conflict` intactos.
2. Decidir como distinguir, e registrar a medição no comentário da função.
   Caminho default: `getInfoAsync` na pasta antes de listar — se
   `exists === false`, `'inexistente'`; se existe e a listagem levanta,
   `'falhou'`. Cachear o resultado por `folderUri` dentro de uma execução
   derruba as 22 chamadas para 19. Medir o custo real em `content://` no
   emulador antes de fechar; se o número não couber no arranque, considerar
   `getInfoAsync` **só** no caminho de erro (listar primeiro; ao levantar,
   perguntar se a pasta existia) — que paga o custo apenas no caso raro.
3. Contabilizar `'falhou'` no `MigracaoLayoutResultado`. A pasta inteira vira
   uma falha: `resultado.falhas += 1` e `resultado.pathsFalhos.push(<path
   relativo da pasta>)`. Isso reusa, sem nenhuma mudança, toda a máquina que a
   `AUDIT-P1-5` instalou: a flag não sobe (`:542-548`), o próximo boot
   re-tenta, e `logarFalhas` (`:509-519`) reporta o path por `devLog`.
4. Ajustar `logarFalhas` para deixar claro que uma entrada em `pathsFalhos`
   pode ser um diretório, não só um arquivo. Hoje o aviso literal diz
   "arquivos seguem no layout legado"; com este spec pode ser uma pasta
   inteira, e quem lê o log precisa saber a diferença.
5. Testes em `tests/lib/boot/migrarVaultLayoutPorTipo-audit-p1-5.test.ts`
   (suíte irmã, já dedicada à contabilidade de falhas): pasta inexistente não
   conta falha e a flag sobe; `readDirectoryAsync` que levanta numa pasta
   existente conta 1 falha, registra o path da pasta e **deixa a flag em
   `false`**; boot seguinte re-tenta e, com a listagem funcionando, migra tudo
   e sobe a flag. O terceiro caso é o que prova que o dano é recuperável.
6. Atualizar `docs/FEATURES-CANONICAS.md` §16, subseção "Migração de layout:
   falha parcial é visível e recuperável (AUDIT-P1-5)", estendendo a garantia
   para falha de listagem de diretório. O texto atual promete recuperação por
   arquivo; passa a valer também por pasta.
7. NÃO-objetivo: mudar `moverIdempotente` ou qualquer um dos 8 passos. Esta
   sprint toca só a camada de enumeração.
8. NÃO-objetivo: alterar a whitelist de `inbox/` (ADR-0024). Os subpaths do
   share intent receiver continuam fora da migração.
9. NÃO-objetivo: caso E2E de Playwright. O módulo tem early-return em web
   (`Platform.OS === 'web'` e `vaultRoot.startsWith('web://')` em `:531-532`),
   então o caminho de código não é alcançável pelo Gauntlet. A validação de
   runtime real é Nível B (ver Proof-of-work), mesmo racional da
   `AUDIT-P1-5`.

## Proof-of-work

```bash
npx tsc --noEmit                                     # exit 0
npm test -- migrarVaultLayoutPorTipo                 # 3 suites verdes
npm test -- audit-p1-5                               # casos de listagem falha

# o catch nao pode mais devolver lista vazia indistinta
rg -n -A2 "catch \{" src/lib/boot/migrarVaultLayoutPorTipo.ts | rg -n "return \[\]"   # sem match

# custo medido: quantas listagens por execucao completa
rg -c "await listarBasenames\(" src/lib/boot/migrarVaultLayoutPorTipo.ts   # 6 call sites, 22 invocacoes

# runtime real (Nivel B, emulador): Vault semeado com .md em daily/ e a
# pasta tornada ilegivel; apos o boot, a flag tem de continuar false
adb shell run-as com.ouroboros.mobile ls files/Ouroboros/daily/
adb logcat -s ReactNativeJS | grep migrarVaultLayout   # falha reportada com o path da pasta

./scripts/smoke.sh                                   # verde
```

Sem screenshots: a sprint não toca UI. Evidência = saída dos testes, listagem
do Vault no emulador antes e depois, e o `devLog` com o path da pasta que
falhou.

## Commit

```
fix: audit-p1-5b listagem de pasta que falha conta como falha da migracao
```
