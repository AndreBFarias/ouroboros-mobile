# AUDIT-P0-2-BRAND-3-COMMIT — comitar o glifo canônico pronto e destravar r-brand-4 e r-brand-7

```
STATUS:     materializada 2026-07-28 (achado [P0-2] da auditoria de 2026-07-28)
PRIORIDADE: alta (bloqueio ativo e citado em dois specs prontos para execução;
            enquanto não commitado, o trabalho corre o mesmo risco de perda
            descrito em AUDIT-P0-1-RASTREABILIDADE-GIT-spec.md)
DEPENDE:    nenhuma
ORIGEM:     achado [P0-2] da auditoria de 2026-07-28. Verificado por
            `git status --short`, `git ls-files` nos diretórios do glifo,
            leitura de R-BRAND-4-ABERTURAS-spec.md e
            R-BRAND-7-ESTADOS-VIVOS-spec.md, e leitura do diff não commitado
            de docs/FEATURES-CANONICAS.md.
```

## Problema (bloqueio real por metade, artificial pela outra metade)

`R-BRAND-3-GLIFO` — a fundação da onda de marca — está implementada,
documentada e rodando neste checkout, mas nunca foi adicionada ao índice do
git. O conjunto completo, verificado arquivo a arquivo:

Modificados (rastreados, com mudança não commitada):

- `docs/FEATURES-CANONICAS.md` — `git diff --stat` mostra `32 insertions`,
  a nova seção "1.3 Marca — glifo canônico animável + monomarks E1/E2/E3 —
  R-BRAND-3-GLIFO (2026-07-14)" (linha 120), documentando a feature como
  entregue.
- `src/components/brand/OuroborosLogo.tsx`
- `src/components/brand/index.ts`

Nunca adicionados (`git ls-files` vazio para os dois diretórios):

- `src/components/brand/glifo/` — 4 arquivos: `index.ts`,
  `ordenarDaCabeca.ts`, `geometria.ts`, `OuroborosGlifo.tsx`.
- `src/components/brand/conceitos/` — 4 arquivos: `E1HeadOnly.tsx`,
  `E2RingOnly.tsx`, `E3Wordmark.tsx`, `index.ts`.
- `app/_dev/bench-c2.tsx` — confirmado como parte do mesmo pacote: o próprio
  cabeçalho do arquivo diz "R-BRAND-3-GLIFO -- rota dev /_dev/bench-c2" e o
  corpo importa diretamente `OuroborosGlifo` de `@/components/brand/glifo` e
  `E1HeadOnly, E2RingOnly, E3Wordmark` de `@/components/brand/conceitos`.
- `tests/e2e/playwright/r-brand-3-glifo.e2e.ts`.
- `tests/components/ordenarDaCabeca.test.ts` — o teste Jest que
  `FEATURES-CANONICAS.md` já credita ("Coberta por teste Jest") à peça
  `ordenarDaCabeca.ts`.

Duas sprints já escritas se declaram travadas por essa ausência. Citação
literal do cabeçalho de `R-BRAND-4-ABERTURAS-spec.md`:

```
DEPENDE:    (hard, BLOQUEANTE — verificado 2026-07-14)
            - R-BRAND-3-GLIFO mergeada. Hoje NÃO existe:
              `src/components/brand/glifo/` e `src/components/brand/conceitos/`
              ausentes no repo (ls confirmou; grep OuroborosGlifo em src/ e
              app/ = 0 ocorrencias).
...
STATUS:     [todo] (2026-07-14) — BLOQUEADA por R-BRAND-3-GLIFO ate merge.
```

E de `R-BRAND-7-ESTADOS-VIVOS-spec.md`:

```
DEPENDE:    (hard, bloqueante para TODAS as peças)
            - R-BRAND-3-GLIFO mergeada. Hoje NÃO existe: o diretório
              src/components/brand/glifo/ está ausente (confirmado por
              `ls src/components/brand/glifo/` falha) e
              src/components/brand/conceitos/ também não existe.
...
STATUS:     [todo] — BLOQUEIO ATIVO: aguarda R-BRAND-3-GLIFO mergeada. Não
            despachar executor enquanto `ls src/components/brand/glifo/`
            falhar.
```

As duas alegações estão provadas falsas hoje: `find
src/components/brand/glifo/ src/components/brand/conceitos/ -type f` lista
os 8 arquivos, com conteúdo completo e coerente com o que
`FEATURES-CANONICAS.md` descreve. O `ls`/`grep` que os dois specs citam como
prova de ausência só falha porque nada foi adicionado ao índice — não porque
o código não exista. Reforço do mesmo sintoma: `docs/sprints/
R-BRAND-3-GLIFO-spec.md:18` continua com `STATUS: [todo] (2026-07-14)`,
mesmo com o código pronto no disco e a documentação já escrita — nem o
próprio spec de origem foi atualizado.

**Ressalva que precisa ficar honesta (achado da verificação desta sprint, não
do catálogo original):** nem todo o bloqueio é artificial. O trecho final da
seção 1.3 (ainda não commitada) de `FEATURES-CANONICAS.md` diz literalmente:

```
Enquanto o número não fecha, as sprints R-BRAND-4…9 permanecem bloqueadas;
se mediana(fps) < 45, a onda pausa e um spec de pivô Skia é redigido antes
de qualquer sprint seguinte.
```

— referindo-se ao gate de performance do benchmark C2 (`app/_dev/bench-c2.tsx`,
`>= 45fps` sustentado no device real, medição "pendente do dono"). Essa
medição não foi feita em nenhum lugar rastreável (busca por "45fps"/"bench-c2"
nos specs de fecho da onda não retorna resultado). Ou seja: comitar o código
remove a alegação **falsa** ("o diretório não existe") que hoje aparece como
o motivo primário de bloqueio nos dois specs — mas não fecha, e não deveria
fingir fechar, o gate de performance genuinamente pendente. As duas sprints
deixam de estar bloqueadas por uma mentira; continuam com uma dependência real
e não resolvida até o dono rodar a medição no device.

## Escopo (mínimo)

1. Rodar `./scripts/smoke.sh` (typecheck + jest + anonimato + auditoria
   PT-BR) com o working tree como está hoje — `tsc`/`jest` leem do disco
   independente do índice do git, então isso valida o conjunto antes de
   torná-lo histórico permanente.
2. `git add` explícito (não `-A`) do conjunto verificado: `docs/
   FEATURES-CANONICAS.md`, `src/components/brand/OuroborosLogo.tsx`, `src/
   components/brand/index.ts`, `src/components/brand/glifo/`, `src/
   components/brand/conceitos/`, `app/_dev/bench-c2.tsx`, `tests/e2e/
   playwright/r-brand-3-glifo.e2e.ts`, `tests/components/
   ordenarDaCabeca.test.ts`. Conferir com `git status --short
   src/components/brand/ app/_dev/ tests/` que só esse conjunto muda de
   estado — nenhum outro untracked do repo (os 406 specs soltos de
   `AUDIT-P0-1-RASTREABILIDADE-GIT` são outra sprint) deve vazar para este
   commit.
3. Atualizar `docs/sprints/R-BRAND-3-GLIFO-spec.md:18` de `STATUS: [todo]`
   para refletir a entrega real (código + documentação mergeados nesta
   sprint), preservando textualmente a ressalva do gate de performance C2
   ainda pendente — não inventar que o gate fechou.
4. Editar os blocos `DEPENDE`/`STATUS` de `R-BRAND-4-ABERTURAS-spec.md` e
   `R-BRAND-7-ESTADOS-VIVOS-spec.md`: remover a alegação "hoje NÃO existe"
   (falsa após este commit), substituir por confirmação de que a base do
   glifo está mergeada, e **manter explícita** a menção ao gate de
   performance C2 (`bench-c2`, `>=45fps` no device) como pendência separada
   e real — "medição no device pendente do dono", nos termos da própria
   seção 1.3 de `FEATURES-CANONICAS.md`. Não declarar as duas sprints livres
   para iniciar sem essa ressalva.
5. NÃO-objetivo: rodar o benchmark C2 no device real (pertence ao dono ou a
   uma sprint futura de validação de performance, fora do escopo desta
   sprint de rastreabilidade); implementar qualquer peça de `R-BRAND-4`
   (A1/A2) ou `R-BRAND-7` (B1/B2/B3) — isso são as próprias sprints já
   escritas, não esta; tocar em qualquer outro arquivo untracked do repo
   fora do conjunto listado no item 2.

## Proof-of-work

```bash
./scripts/smoke.sh                                          # verde, antes de commitar

git status --short src/components/brand/ app/_dev/ tests/  # limpo apos o commit
git ls-files src/components/brand/glifo/ | wc -l             # 4
git ls-files src/components/brand/conceitos/ | wc -l         # 4
git ls-files app/_dev/bench-c2.tsx tests/e2e/playwright/r-brand-3-glifo.e2e.ts tests/components/ordenarDaCabeca.test.ts | wc -l   # 3

grep -n "STATUS" docs/sprints/R-BRAND-3-GLIFO-spec.md         # nao mais [todo]
grep -n "BLOQUEANTE\|hoje NÃO existe" docs/sprints/R-BRAND-4-ABERTURAS-spec.md      # alegacao falsa removida
grep -n "BLOQUEIO ATIVO\|hoje NÃO existe" docs/sprints/R-BRAND-7-ESTADOS-VIVOS-spec.md   # alegacao falsa removida
grep -n "45fps\|pendente do dono" docs/sprints/R-BRAND-4-ABERTURAS-spec.md docs/sprints/R-BRAND-7-ESTADOS-VIVOS-spec.md   # ressalva do gate C2 preservada

# sanity visual leve (o E2E de UI ja existe no conjunto commitado, item 2;
# esta sprint nao adiciona comportamento novo, so verifica que o que ja
# existia continua renderizando apos entrar no historico):
./gauntlet.sh   # navegar /_dev/bench-c2, console limpo, glifo e monomarks visiveis
```

## Commit

```
feat: comita glifo canonico r-brand-3-glifo e destrava r-brand-4 e r-brand-7
```
