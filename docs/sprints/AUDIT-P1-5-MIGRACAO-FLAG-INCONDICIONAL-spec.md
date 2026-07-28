# AUDIT-P1-5-MIGRACAO-FLAG-INCONDICIONAL — migração de layout marca sucesso mesmo falhando

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (registro do usuário fica invisível para sempre, sem erro e
            sem log; a flag impede que qualquer boot futuro re-tente)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-5] da auditoria de 2026-07-28. Encontrado ao comparar o
            contrato de erro declarado no cabeçalho do módulo com a única linha
            que sobe a flag. `moverIdempotente` engole a falha e devolve `false`;
            `MigracaoLayoutResultado` só tem um contador de sucesso, então o
            sinal de falha morre no retorno.
```

## Problema (contrato declarado no cabeçalho contradiz a implementação)

### O contrato

```
// src/lib/boot/migrarVaultLayoutPorTipo.ts:44-47
// Comportamento de erro: tolera falha de I/O por arquivo individual
// (Syncthing concorrente, OEM bloqueando arquivo); proxima execucao
// re-tenta porque a flag so sobe se TODOS os arquivos do diretorio
// alvo foram processados sem erro fatal.
```

### A implementação

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:414-416
  // Sucesso: marca flag para skip rapido em boots futuros.
  useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
  return resultado;
}
```

A chamada é a última instrução da função, fora de qualquer condicional. Não há
nenhum ponto no corpo em que a flag deixe de subir. E não há como haver: o sinal
de falha nunca chega até ali.

`moverIdempotente` devolve `false` **tanto** para "destino já existia" (sucesso
idempotente) quanto para "a cópia falhou":

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts (moverIdempotente)
  try {
    await FileSystem.copyAsync({ from: origemUri, to: destinoUri });
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort: duplicata aceitavel ate proximo boot.
    }
    return true;
  } catch {
    return false;
  }
```

E o tipo de retorno da migração só sabe contar acertos:

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts
export interface MigracaoLayoutResultado {
  migrados: number;
}
```

O caller (`src/lib/boot/reagendamento.ts:157-159`) faz `await` e descarta o
resultado. Nenhum `console`, nenhum `devLog`, nenhum toast.

### Por que o dano é total e silencioso

O guard de entrada da função é a mesma flag:

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:259
if (useSessao.getState().flags.vaultLayoutMigrado) return resultado;
```

Uma vez `true`, nenhum boot futuro re-tenta. E todos os leitores varrem
exclusivamente `markdown/`. Exemplo canônico, `listarContadores`:

```ts
const todos =
  opts?.listagem ??
  (await listVaultFolder(vaultUriJoin(vaultRoot, MARKDOWN_FOLDER), '.md'));
const arquivos = todos.filter(
  (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'contador-')
);
```

`MARKDOWN_FOLDER = 'markdown'` (`src/lib/vault/paths.ts:85`). O mesmo padrão vale
para as 10 pastas migradas no passo 1 (`:261-320`): `daily/`, `eventos/`, `marcos/`,
`medidas/`, `exercicios/`, `inbox/saude/ciclo`, `inbox/mente/diario`, `alarmes/`,
`tarefas/`, `contadores/`.

### Cenário de falha concreto

O Vault de `pessoa_a` está sincronizado por Syncthing. No boot em que a migração
roda, o Syncthing está no meio de uma escrita em `daily/2026-03-14-humor.md` e o
`copyAsync` daquele arquivo levanta. `moverIdempotente` devolve `false`, o
contador `migrados` simplesmente não incrementa, e a função segue para os passos 2
a 8 e sobe a flag.

O registro de humor de 14/03 continua em `daily/`. Nenhum leitor olha para lá. Do
ponto de vista de `pessoa_a`, o dia sumiu do histórico, do Recap e das médias — e
nenhum boot futuro vai buscá-lo, porque a flag diz que a migração terminou. O
arquivo está intacto no disco; é a única boa notícia, e é o que torna a recuperação
possível.

## Escopo (mínimo)

1. Propagar o sinal de falha. Distinguir, em `moverIdempotente`, "destino já
   existia" de "falhou": trocar o `boolean` por um resultado de três estados
   (`movido` | `ja-estava` | `falhou`), ou devolver o erro. Sem isso o resto do
   escopo é inalcançável.
2. Estender `MigracaoLayoutResultado` com `falhas: number` e a lista dos paths
   relativos que falharam. Todos os oito passos (`:261-412`) somam nos dois
   contadores.
3. Só marcar `vaultLayoutMigrado` quando `falhas === 0`, cumprindo o contrato de
   `:44-47` literalmente. Com falhas parciais a flag permanece `false` e o próximo
   boot re-tenta — o que já é seguro, porque `moverIdempotente` trata destino
   existente sem sobrescrever.
4. Logar as falhas por `devLog` (`src/lib/util/devLog.ts`, criado por
   R-INT-3-LOGGER-CONDICIONAL exatamente para não vazar em release; precedentes de
   uso em `src/lib/health/autopullScheduler.ts:85` e
   `src/lib/midia/exportarSlideMemorias.ts:131`). Registrar contagem e paths;
   nunca o conteúdo do arquivo.
5. Caminho de recuperação para vaults já afetados. A flag pode estar `true` num
   Vault com arquivos órfãos, e o guard de `:259` impede o re-teste. Boot hook
   one-shot com flag própria em `FlagsBootState`
   (`src/lib/stores/sessao.ts:100-106`, no formato dos 5 flags existentes) que
   ignora `vaultLayoutMigrado`, varre as 10 pastas do passo 1 mais as pastas dos
   passos 2 a 8, e re-executa a migração para o que sobrou. Idempotente por
   construção: num Vault já migrado as pastas legadas estão vazias e o hook é
   no-op.
6. Testes: falha de `copyAsync` num arquivo deixa a flag `false` e reporta
   `falhas: 1` com o path certo; migração sem falhas sobe a flag; destino já
   existente conta como sucesso e não como falha; hook de recuperação move o órfão
   e é no-op em Vault limpo. Suíte existente a estender:
   `tests/lib/boot/migrarVaultLayoutPorTipo-inbox-whitelist.test.ts` (citada em
   `:41-42` como a cobertura de regressão do módulo).
7. Atualizar `docs/FEATURES-CANONICAS.md` §16 (Vault físico) — registro que some
   do histórico é comportamento visível ao usuário.
8. NÃO-objetivo: alterar a whitelist de `inbox/` (ADR-0024, `:35-42`). Os subpaths
   do share intent receiver continuam fora da migração.
9. NÃO-objetivo: caso E2E de Playwright. O módulo tem early-return em web
   (`:257-258`, `Platform.OS === 'web'` e `vaultRoot.startsWith('web://')`), então o
   caminho de código não é alcançável pelo Gauntlet. A validação de runtime real
   é Nível B/C (ver Proof-of-work).

## Proof-of-work

```bash
npx tsc --noEmit                                     # exit 0
npm test -- migrarVaultLayoutPorTipo                 # casos de falha parcial verdes
npm test -- audit-p1-5                               # hook de recuperacao

# a flag nao pode mais estar fora de um condicional
rg -n "marcarFlagBoot\('vaultLayoutMigrado'\)" src/lib/boot/migrarVaultLayoutPorTipo.ts

# runtime real (Nivel B, emulador): Vault semeado com um .md em daily/ que
# nao pode ser copiado; apos o boot, conferir que a flag continua false
adb shell run-as com.ouroboros.mobile ls files/Ouroboros/daily/
adb logcat -s ReactNativeJS | grep migrarVaultLayout  # falhas reportadas em __DEV__

./scripts/smoke.sh                                   # verde
```

Sem screenshots: a sprint não toca UI. Evidência = saída dos testes, listagem do
Vault no emulador antes/depois e log do `devLog` com a contagem de falhas.

## Commit

```
fix: audit-p1-5 flag de migracao so sobe em sucesso total e hook recupera orfaos
```
