# AUDIT-P4-8-ESTADO-TEXTO-PURO — parar de espelhar nomes reais e rascunhos de diário em _estado/*.md

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (privacidade — dado sensível em texto puro, composto
            com o risco de sincronização por Syncthing ou copia manual
            do Vault)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-10]/[SE-04] da auditoria de 2026-07-28. Confirmado
            nesta materialização lendo src/lib/stores/pessoa.ts:70-77,
            src/lib/stores/sessao.ts:343-353 e
            src/lib/schemas/vault_estado.ts:210-227.
```

## Problema (o mesmo raciocínio de segurança já aplicado a tokens não foi estendido a nomes e rascunhos)

Dois subscribers não-mutativos espelham estado de stores runtime para
markdown no Vault (`_estado/<key>-<deviceId>.md`, escrita via
`escreverEstadoCanonico`, debounced 500ms):

```ts
// src/lib/stores/pessoa.ts:70-77
usePessoa.subscribe((state) => {
  escreverEstadoCanonico('pessoa', {
    pessoaAtiva: state.pessoaAtiva,
    filtroPessoa: state.filtroPessoa,
    nomes: { ...state.nomes },     // nomes reais dos dois
    fotos: { ...state.fotos },
  });
});
```

```ts
// src/lib/stores/sessao.ts:346-353
useSessao.subscribe((state) => {
  escreverEstadoCanonico('sessao', {
    ultimaRota: state.ultimaRota,
    rascunhos: { ...state.rascunhos },   // diario/humor/ciclo NAO salvos
    permissoesPedidas: { ...state.permissoesPedidas },
    flags: { ...state.flags },
  });
});
```

`rascunhos` (schema em `src/lib/schemas/vault_estado.ts:133-141`) cobre
**7** tipos de rascunho, não só os 4 mais obvios: `humorRapido`,
`diarioEmocional`, `eventos`, `cicloRegistrar`, `alarmesNovo`,
`contadoresNovo`, `tarefasNova`. Ou seja: texto de diário, humor ou
ciclo menstrual que o usuário **ainda está digitando e não confirmou**
já está em disco em claro, no mesmo arquivo `.md` do estado de sessão.

Cenário concreto: pessoa_a começa a escrever um registro de diário
emocional, digita alguns parágrafos, e fecha o app sem salvar (ou o app
fecha sozinho). O rascunho fica em
`_estado/sessao-<deviceId>.md` em texto puro. Se o Vault estiver
sincronizado por Syncthing para outro dispositivo, ou se alguém abrir
o arquivo com um leitor de markdown genérico, o texto não-confirmado
do diário é legível — mesmo que a pessoa nunca tenha "salvo" aquele
registro no sentido do app.

O que torna este achado não-óbvio é o contraste com o que o **próprio
código já fez certo** em outro schema do mesmo arquivo:

```ts
// src/lib/schemas/vault_estado.ts:224-226
// NAO espelha tokens (esses ficam em SecureStore; bug de seguranca
// colocar token cripto em .md)
```

O `EstadoIntegracoesSchema` (linhas 221-238) exclui deliberadamente os
tokens OAuth do espelho `.md`, persistindo só flags de "conectado" e
timestamps. O mesmo raciocínio — "dado sensível não pertence a um `.md`
que pode ser sincronizado ou copiado" — se aplica igualmente a nomes
reais e a rascunhos de diário, que são exatamente o tipo de dado que a
Regra de Identidade do projeto (arquivo de regras da raiz) trata como
sensível: "Nomes reais nunca aparecem em código versionado" — aqui o dado é runtime, não
código versionado, mas o Vault é precisamente o artefato que o
Syncthing sincroniza e que o usuário pode copiar manualmente, então o
mesmo cuidado se justifica.

## Escopo (mínimo)

1. Remover `nomes` e `fotos` de `pessoa.ts:74-75` do objeto espelhado —
   se o snapshot for necessário para diagnóstico ou Recap multi-device,
   gravar apenas os identificadores canônicos `pessoa_a`/`pessoa_b`/
   `ambos` (já usados em todo o resto do código), resolvendo o nome de
   exibição em runtime a partir do SecureStore quando precisar
   renderizar.
2. Remover `rascunhos` de `sessao.ts:349` do objeto espelhado. Se o
   sibling Python ou outro consumidor externo do Vault depender de
   saber que "existe um rascunho pendente" (sem o conteúdo), avaliar
   gravar só um booleano por tipo (`temRascunho: { diarioEmocional:
   true, ... }`), nunca o corpo do rascunho.
3. Atualizar `src/lib/schemas/vault_estado.ts` — `EstadoPessoaSchema` e
   `EstadoSessaoSchema` — para refletir os campos reduzidos, com
   comentário explícito no mesmo padrão já usado para tokens (linha
   224-226), citando esta sprint.
4. Migração: arquivos `_estado/pessoa-*.md` e `_estado/sessao-*.md` já
   gravados em disco por instalações existentes retem os campos
   antigos até a próxima escrita (debounce de 500ms na próxima mudança
   de estado) — avaliar se vale um passo de sanitização explícita no
   boot (reescrever o arquivo imediatamente sem os campos removidos) ou
   se é aceitável a limpeza orgânica na próxima escrita.
5. NÃO-objetivo: não mudar o formato de `_estado/*.md` para outros
   domínios (integrações, onboarding, navegação) que já não carregam
   dado sensível equivalente; não mover o Vault inteiro para fora de
   `documentDirectory` (achado relacionado de Auto Backup do Android,
   fora do escopo desta sprint específica de conteúdo do espelho de
   estado).

## Proof-of-work

```bash
grep -n "nomes\|fotos" src/lib/stores/pessoa.ts                 # objeto espelhado sem esses campos
grep -n "rascunhos" src/lib/stores/sessao.ts                     # objeto espelhado sem o campo
npx tsc --noEmit                                                 # exit 0
npm test -- pessoa sessao vault_estado                           # suites verdes com schema atualizado
npm test -- vault-md-completo                                    # auditoria de .md canonico continua verde
./scripts/smoke.sh                                                # verde
```

Sem alteração de UI (mudança é no que é persistido em disco, não no
que é exibido) — dispensa caso E2E novo; validar com teste de
integração existente (`tests/integration/vault-md-completo.test.ts`)
que já audita todos os `.md` canônicos gravados pelo Vault.

## Commit

```
fix: audit-p4-8-estado-texto-puro remove nomes reais e rascunhos de diario do espelho _estado
```
