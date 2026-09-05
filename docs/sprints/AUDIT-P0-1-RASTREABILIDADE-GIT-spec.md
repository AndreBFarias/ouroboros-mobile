# AUDIT-P0-1-RASTREABILIDADE-GIT — histórico do projeto vive só neste disco, recuperar branches e versionar specs

```
STATUS:     itens 1, 3 e 4 EXECUTADOS; item 2 REVERTIDO pelo dono (ver aviso abaixo) (achado [P0-1] da auditoria de 2026-07-28)
PRIORIDADE: alta (risco de perda irreversível de histórico e de 406 specs; um
            único `git gc`, `git clean -xfd` ou falha de disco neste checkout
            leva embora tudo que não está no remoto)
DEPENDE:    nenhuma
ORIGEM:     achado [P0-1] da auditoria de 2026-07-28. Verificado por comparação
            entre `ls docs/sprints/*.md`, `git ls-files docs/sprints/`,
            `git rev-list --count` (main, --all, --branches, --remotes),
            `git ls-remote --heads origin`, `git branch --no-merged main` e
            leitura literal de STATE.md:188-189 contra o remoto real.
DECISAO:    (dono, 2026-07-29) `ROADMAP.md` e `CHANGELOG.md` ficam
            descontinuados (opção B do item 4 do Escopo); as 4 branches foram
            preservadas via bundle git anexado a release de repositório
            privado — não por push ao remoto público — e isso já foi executado.
```

> ## AVISO — NÃO EXECUTE O ITEM 2 DESTE SPEC
>
> **Revisado em 2026-09-05.** O item 2 do Escopo mandava `git add docs/sprints/`
> e commitar 418 specs. Isso hoje e **proibicao inviolavel** do projeto.
>
> Em 2026-07-28 exatamente esse comando vazou 883 specs internos ao repositorio
> **publico**, e custou reescrita de histórico e ticket ao suporte do GitHub. A
> prova do incidente esta no branch local `backup-antes-rewrite-2026-07-28`
> (373eddc): *"chore: remove do publico os 872 specs internos publicados por
> engano"*.
>
> A regra vigente esta em `docs/CONTEXTO.md` §5, no `CLAUDE.md` da raiz e em
> `STATE.md`: **`docs/sprints/` e parcialmente versionado por decisao de
> compliance** — 464 no disco, 59 versionados. Sempre lista explicita de
> arquivos, nunca o diretório.
>
> As instrucoes abaixo que só passam violando a regra foram **neutralizadas**
> nesta revisao: o item 2 do Escopo, e as verificacoes de Proof-of-work que
> exigiam paridade entre disco e index. Ficam marcadas como REVERTIDO, e não
> removidas, para que a decisao continue auditavel.
>
> Estado dos demais itens, verificado em 2026-09-05: item 1 entregue (bundle
> `ouroboros-arquivo-2026-07-28.bundle`, 111.321.707 bytes, com as 4 branches
> nos hashes 820cce5 / 5c1cfdb / d8e40a5 / 944dce0, anexado a release
> `arquivo-2026-07-28` do repositorio privado); itens 3 e 4 entregues.

## Problema (rastreabilidade quebrada em três frentes)

O scrub de 12/07/2026 recomeçou `main` do zero: o primeiro commit alcançável
por `main` hoje é `1aa5ebb feat: base do aplicativo ouroboros` (2026-07-12),
e `git rev-list --count main` retorna **39**. Isso por si só não é um
problema — foi uma decisão deliberada de limpeza (ver a série de commits
`chore: scrub ...` em `git log --oneline`). O problema é que o scrub deixou
três rastros soltos que nenhum commit posterior fechou.

**1. `docs/sprints/` está 97% fora de controle de versão.**

> Diagnostico de 2026-07-28, mantido como registro. **Hoje isto não e um
> defeito**: a divergencia entre disco e index e' politica de compliance
> decidida em 2026-07-28. Ver o aviso no topo.

```
ls docs/sprints/*.md | wc -l                    -> 418
git ls-files docs/sprints/ | grep -c '\.md$'     -> 12
```

Os 12 versionados são só a onda `R-BRAND-SYSTEM` (`_ONDA-R-BRAND-SYSTEM.md`,
`ORDEM-EXECUCAO-V1.md` e as 10 specs `R-BRAND-*`). Os outros **406** —
inclusive specs de sprints já mergeadas e citadas por hash de commit em
`STATE.md` — existem só neste checkout. `git status --short` os lista todos
como `??`. Nenhum PR, `git gc` ou reinstalação de disco os preserva.

**2. 622 commits fora de `main` — mas nem todos pelo mesmo motivo.**

```
git rev-list --count main               -> 39
git rev-list --count --all              -> 661
git rev-list --count --all --not main   -> 622
git rev-list --count --branches --not main   -> 599   (SO em branches LOCAIS)
git rev-list --count --remotes --not main    -> 10    (em branches REMOTAS)
```

Correção em relação ao número bruto do catálogo: dos 622 commits que não
estão em `main`, **599** existem **somente** em branches locais nunca
empurradas — esses sim estão em risco real de desaparecer com um `git gc` ou
a perda deste disco. Os outros **10** já estão seguros no GitHub (são os 10
branches do Dependabot, 1 commit cada, listados abaixo) e não precisam de
ação de resgate — só não devem ser confundidos com histórico de produto em
risco.

```
git ls-remote --heads origin
```

retorna exatamente `main` + 10 `dependabot/npm_and_yarn/*`. Nenhuma outra
branch.

```
git branch --no-merged main
```

retorna 4 branches locais não mescladas e nunca empurradas:
`backup-pre-sdk56`, `r-audit-ci-gates`, `scrub-staging`, `sdk56-experiment`.
São elas que sustentam os 599 commits em risco.

**3. `STATE.md:188-189` afirma uma coisa que o remoto contradiz.**

```
188: > - **Branches preservadas no remoto:** `sdk56-experiment` (944dce0, o upgrade) e
189: >   `backup-pre-sdk56` (820cce5, SDK 54 pré-upgrade).
```

Os hashes batem exatamente com as pontas locais reais
(`git rev-parse --short sdk56-experiment` = `944dce0`,
`git rev-parse --short backup-pre-sdk56` = `820cce5`) — quem escreveu a
linha tinha as branches na mão. Mas `git ls-remote --heads origin | grep -E
"sdk56-experiment|backup-pre-sdk56"` não retorna nada: nenhuma das duas
branches jamais foi empurrada. A frase está errada hoje.

**4. `ROADMAP.md` e `CHANGELOG.md` sumiram de `main`, mas não do repositório
local — ainda.**

```
ls ROADMAP.md CHANGELOG.md          -> No such file or directory (as duas)
git log --all --oneline -- ROADMAP.md    -> existe histórico (até ca0ac7d, m00.fase1)
git cat-file -e main:ROADMAP.md          -> ausente em main
git cat-file -e scrub-staging:ROADMAP.md -> ausente em scrub-staging
git cat-file -e backup-pre-sdk56:ROADMAP.md   -> EXISTE
git cat-file -e r-audit-ci-gates:ROADMAP.md   -> EXISTE
git cat-file -e sdk56-experiment:ROADMAP.md   -> EXISTE
```

A cópia mais completa e mais recente está em `r-audit-ci-gates`
(commit `5c1cfdb`, 2026-07-11 — um dia antes do scrub):
`ROADMAP.md` com **1.188 linhas**, `CHANGELOG.md` com **7.347 linhas** — batem
exatamente com os números já citados pela auditoria. Ou seja: os dois
arquivos **não estão perdidos hoje**, mas só sobrevivem porque
`r-audit-ci-gates` ainda existe neste disco e nunca foi empurrada nem
mesclada. `HOW_TO_RESUME.md` (linhas 63, 163, 170-172, 197, 255, 402, 450-451)
continua instruindo abrir `ROADMAP.md`/`CHANGELOG.md` como parte do
protocolo canônico de retomada — hoje, quem seguir o arquivo à risca encontra
os dois ausentes.

## Escopo (mínimo)

1. **Já executado — decisão do dono, 2026-07-29.** As 4 branches locais não
   mescladas (`backup-pre-sdk56`, `r-audit-ci-gates`, `scrub-staging`,
   `sdk56-experiment`) foram preservadas como **bundle git anexado a uma
   release de repositório privado**, como estão, sem squash nem rebase. O push
   ao remoto público ficou descartado porque republicaria material que o scrub
   de 12/07 removeu por compliance; a variante de tag anotada pública cai pelo
   mesmo motivo. Objetivo cumprido: nenhum commit fica acessível só neste
   disco. O executor desta sprint não repete o passo — apenas confirma que o
   bundle está anexado à release privada antes de seguir para o item 2.
2. ~~`git add docs/sprints/` e commit dos 418 specs.~~ **REVERTIDO pelo dono
   em 2026-07-28, apos o vazamento.** Não versionar o diretório. `docs/sprints/`
   e parcialmente versionado por decisao de compliance: so o conjunto aprovado
   vai ao publico, e sempre por lista explicita de arquivos. Ver o aviso no topo
   deste documento.
3. Corrigir `STATE.md:188-189`: a frase "preservadas no remoto" está errada e
   passa a descrever o estado real — as duas branches citadas ali, e as outras
   duas, estão preservadas em bundle git anexado a release de repositório
   privado, não como refs no remoto público. A linha não pode continuar
   afirmando o que `git ls-remote --heads origin` contradiz.
4. `ROADMAP.md` e `CHANGELOG.md` ficam **descontinuados** — decisão do dono,
   2026-07-29. Motivo registrado: o rastreamento do projeto vive hoje em
   `docs/sprints/`, e a sprint `AUDIT-P3-5` reaponta o detector de fantasmas
   para lá; restaurar as ~8.500 linhas desatualizadas das versões de
   2026-07-11 criaria duas fontes de verdade concorrentes. Os dois arquivos
   seguem preservados no bundle do arquivo privado do item 1, para consulta
   histórica. Trabalho desta sprint:
   - atualizar `HOW_TO_RESUME.md` (linhas 63, 163, 170-172, 197, 255, 402,
     450-451) e qualquer outra referência viva em `STATE.md` para não apontar
     mais para arquivos que não existem, documentando no próprio
     `HOW_TO_RESUME.md` o motivo da descontinuação e onde consultar o
     histórico;
   - **não** recriar os arquivos a partir de `r-audit-ci-gates` nem de
     qualquer outra branch. Recriar está descartado.
5. NÃO-objetivo: reescrever o histórico de `main` (sem rebase/squash/
   force-push em `main`); mesclar `backup-pre-sdk56`/`r-audit-ci-gates`/
   `scrub-staging`/`sdk56-experiment` em `main` (esta sprint só evita que
   elas se percam — mesclar conteúdo é decisão separada, sprint a sprint);
   migrar `STATE.md` para outro formato; auditar o conteúdo de cada uma das
   406 specs recém-versionadas (isso é o que a onda de specs `AUDIT-*`
   nascida desta mesma auditoria já está fazendo, sprint a sprint).

## Proof-of-work

```bash
# Item 1 ja executado: as 4 branches estao no bundle git anexado a release do
# repositorio privado. A evidencia e' aquela release, nao o remoto publico.
git ls-remote --heads origin | grep -cE "backup-pre-sdk56|r-audit-ci-gates|scrub-staging|sdk56-experiment"
# 0 esperado no remoto publico — resultado correto, nao falha

# REVERTIDO: as tres verificacoes abaixo so' passam violando a proibicao de
# versionar docs/sprints/. Mantidas comentadas para a decisao ficar auditavel.
#   git ls-files docs/sprints/ | grep -c '\.md$'      # 418

ls ROADMAP.md CHANGELOG.md 2>&1                   # segue ausente (descontinuados)
grep -rn "ROADMAP.md\|CHANGELOG.md" HOW_TO_RESUME.md   # so' em texto que explica a descontinuacao
#   diff <(ls docs/sprints/*.md | sort) <(git ls-files docs/sprints/ | grep '\.md$' | sort)
#   git status --short docs/sprints/
# A divergencia entre disco e index e' o estado CORRETO, nao um defeito.

grep -n "preservadas no remoto\|preservadas só localmente" STATE.md   # texto batendo com o remoto real

./scripts/smoke.sh                                # verde
```

## Commit

```
docs: audit-p0-1 reconcilia rastreabilidade e desarma a instrucao de versionar docs/sprints
```

## Resultado (revisada 2026-09-05)

Nenhum executor deve rodar o escopo original. Verificação item a item:

| Item | Estado |
|---|---|
| 1. Preservar as 4 branches | **Entregue.** Bundle `ouroboros-arquivo-2026-07-28.bundle` (111.321.707 bytes) na release `arquivo-2026-07-28` do repositório privado, com `backup-pre-sdk56` (820cce5), `r-audit-ci-gates` (5c1cfdb), `scrub-staging` (d8e40a5) e `sdk56-experiment` (944dce0). |
| 2. Versionar `docs/sprints/` | **REVERTIDO pelo dono**, após o vazamento de 883 specs em 2026-07-28. |
| 3. Corrigir `STATE.md` | **Entregue** (`STATE.md:240-244`). |
| 4. Descontinuar ROADMAP/CHANGELOG | **Entregue.** Ambos ausentes; decisão registrada em `docs/RELEASE.md:328-330`. |

### O que esta revisão fez

O spec continha **quatro** instruções que só passam violando a proibição de
versionar `docs/sprints/`: o item 2 do Escopo, duas verificações de Proof-of-work
(`git ls-files docs/sprints/ | grep -c` esperando 418, e o `diff` disco-vs-index
esperando vazio) e a mensagem de commit sugerida. Todas neutralizadas — marcadas
como revertidas, não apagadas, para a decisão seguir auditável. Aviso no topo do
documento, antes de qualquer instrução.

Reconciliado também `AUDIT-2026-07-28-INDEX.md` (versionado), em 4 trechos que
descreviam como defeito o que hoje é política, e o `CLAUDE.md` da raiz, que ainda
afirmava que o smoke não reprova lint — falso desde `AUDIT-P3-2`.

### Ressalva sobre o gate

`scripts/check_anonimato.sh` **não lê `docs/`** por padrão (`ANONIMATO_SCAN_DIRS`
cobre `src/ app/ tests/`), então o smoke não protege edições em spec versionado.
Rodado explicitamente aqui: `ANONIMATO_SCAN_DIRS="docs/" ./scripts/check_anonimato.sh`.
Os arquivos commitados estão limpos. O único nome real em `docs/` está em
`M36-spec.md`, que é **untracked** e permanece local.
