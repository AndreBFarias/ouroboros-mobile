# AUDIT-P0-1-RASTREABILIDADE-GIT — histórico do projeto vive só neste disco, recuperar branches e versionar specs

```
STATUS:     materializada 2026-07-28 (achado [P0-1] da auditoria de 2026-07-28)
PRIORIDADE: alta (risco de perda irreversível de histórico e de 406 specs; um
            único `git gc`, `git clean -xfd` ou falha de disco neste checkout
            leva embora tudo que não está no remoto)
DEPENDE:    nenhuma
ORIGEM:     achado [P0-1] da auditoria de 2026-07-28. Verificado por comparação
            entre `ls docs/sprints/*.md`, `git ls-files docs/sprints/`,
            `git rev-list --count` (main, --all, --branches, --remotes),
            `git ls-remote --heads origin`, `git branch --no-merged main` e
            leitura literal de STATE.md:188-189 contra o remoto real.
```

## Problema (rastreabilidade quebrada em três frentes)

O scrub de 12/07/2026 recomeçou `main` do zero: o primeiro commit alcançável
por `main` hoje é `1aa5ebb feat: base do aplicativo ouroboros` (2026-07-12),
e `git rev-list --count main` retorna **39**. Isso por si só não é um
problema — foi uma decisão deliberada de limpeza (ver a série de commits
`chore: scrub ...` em `git log --oneline`). O problema é que o scrub deixou
três rastros soltos que nenhum commit posterior fechou.

**1. `docs/sprints/` está 97% fora de controle de versão.**

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

1. Empurrar as 4 branches locais não mescladas para o remoto, como estão,
   sem squash nem rebase: `git push origin backup-pre-sdk56 r-audit-ci-gates
   scrub-staging sdk56-experiment`. Alternativa equivalente, se o dono
   preferir não poluir a lista de branches do GitHub: criar tags anotadas de
   arquivo (`git tag arquivo/backup-pre-sdk56 backup-pre-sdk56` etc.) e
   empurrar só as tags (`git push origin --tags`). As duas variantes cumprem
   o mesmo objetivo (nenhum commit fica acessível só neste disco); a escolha
   entre branch remota e tag de arquivo fica para o dono decidir no passo 0
   da execução — este spec não escolhe por ele.
2. `git add docs/sprints/` (caminho explícito, não `-A` global) e commit dos
   418 specs, incluindo os 406 soltos. Antes de commitar, confirmar que
   nenhum arquivo novo carrega dado sensível — a auditoria já confirmou zero
   segredos versionados no projeto inteiro, mas o executor desta sprint
   confere de novo especificamente em `docs/sprints/` (`git diff --cached
   docs/sprints/ | grep -iE "client_secret|AIza|senha|password"` como
   sanity-check antes do commit).
3. Corrigir `STATE.md:188-189`: depois do passo 1, reescrever a frase para
   descrever o estado real (branches empurradas como refs de arquivo, ou
   substituídas por tags — conforme a escolha do dono). Se por algum motivo
   o dono decidir não empurrar nenhuma branch, a linha não pode continuar
   afirmando "preservadas no remoto" — nesse caso, reescrever para o estado
   real ("preservadas só localmente, risco assumido").
4. Decisão do dono sobre `ROADMAP.md`/`CHANGELOG.md` — apresentar as duas
   opções, sem escolher por ele:
   - **Opção A (recriar).** `git show r-audit-ci-gates:ROADMAP.md >
     ROADMAP.md` e `git show r-audit-ci-gates:CHANGELOG.md > CHANGELOG.md`
     (as versões de 2026-07-11, um dia antes do scrub, as mais completas
     das três branches candidatas). Revisar o que ficou desatualizado desde
     então (a onda `R-BRAND-SYSTEM` e as sprints `AUDIT-*` não estão lá) e
     commitar como ponto de partida, não como verdade absoluta do presente.
   - **Opção B (descontinuar formalmente).** Declarar os dois arquivos
     obsoletos por decisão do dono, e atualizar `HOW_TO_RESUME.md` (as 7
     linhas citadas acima) e qualquer outra referência viva em `STATE.md`
     para não apontar mais para arquivos que não existem — documentando o
     motivo do abandono no próprio `HOW_TO_RESUME.md`.
   Este spec materializa as duas alternativas; a escolha é do dono no passo
   0 da execução.
5. NÃO-objetivo: reescrever o histórico de `main` (sem rebase/squash/
   force-push em `main`); mesclar `backup-pre-sdk56`/`r-audit-ci-gates`/
   `scrub-staging`/`sdk56-experiment` em `main` (esta sprint só evita que
   elas se percam — mesclar conteúdo é decisão separada, sprint a sprint);
   migrar `STATE.md` para outro formato; auditar o conteúdo de cada uma das
   406 specs recém-versionadas (isso é o que a onda de specs `AUDIT-*`
   nascida desta mesma auditoria já está fazendo, sprint a sprint).

## Proof-of-work

```bash
git ls-remote --heads origin | grep -cE "backup-pre-sdk56|r-audit-ci-gates|scrub-staging|sdk56-experiment"
# 4 apos o push (ou 0 se o dono optar pela variante de tags — nesse caso
# checar `git ls-remote --tags origin | grep -c arquivo/` = 4)

git ls-files docs/sprints/ | grep -c '\.md$'      # 418 (ou o total resultante da decisao do passo 4)
diff <(ls docs/sprints/*.md | sort) <(git ls-files docs/sprints/ | grep '\.md$' | sort)   # vazio
git status --short docs/sprints/                  # nada untracked remanescente

grep -n "preservadas no remoto\|preservadas só localmente" STATE.md   # texto batendo com o remoto real

./scripts/smoke.sh                                # verde
```

## Commit

```
docs: versiona 406 specs soltos e recupera branches de arquivo do scrub de 12/07
```
