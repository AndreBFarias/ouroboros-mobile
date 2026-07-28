# AUDIT-P3-5-FANTASMAS-GATE — reapontar o detector de sprints fantasma para onde o rastreamento vive hoje

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: alta (o gate não reporta zero fantasmas — não reporta nada, e foi sob
            ele que 44 sprints fantasma se acumularam)
DEPENDE:    nenhuma
ORIGEM:     achado [P3-5] da auditoria de 2026-07-28. A varredura de rastreabilidade
            documental estranhou que o smoke nunca emite aviso de fantasma num
            projeto com 113 specs marcadas `[todo]`. Rodar o script à mão revelou
            exit 2 por arquivo ausente, e a leitura do bloco do `smoke.sh` mostrou
            que exit não-zero faz o `if` inteiro ser pulado sem `else`.
```

## Problema (gate auto-anulado por dois defeitos que se cancelam em silêncio)

O detector sai com código 2 antes de chegar ao caminho `--warn-only`:

```python
# scripts/check_roadmap_fantasmas.py:652-654
    if not args.roadmap.exists():
        print(f"ERRO: {args.roadmap} nao existe.", file=sys.stderr)
        return 2
```

```python
# scripts/check_roadmap_fantasmas.py:689-693
    fantasmas = sum(1 for (_, (c, _)) in resultado.items() if c == "FANTASMA")
    if args.warn_only:
        return 0
    return 1 if fantasmas > 0 else 0
```

O `return 0` de `--warn-only` está 36 linhas depois do `return 2` e
nunca é alcançado quando o arquivo não existe.

Do outro lado, o `smoke.sh` chama o script dentro de um `if` sem `else`:

```bash
# scripts/smoke.sh:26-32
echo ">> auditoria fantasmas ROADMAP (warning, nao-bloqueante)"
if python3 scripts/check_roadmap_fantasmas.py --warn-only > /tmp/roadmap-fantasmas.log 2>&1; then
  n=$(grep -cE "^  FANTASMA: [A-Z]" /tmp/roadmap-fantasmas.log || true)
  if [[ "$n" -gt 0 ]]; then
    echo "AVISO: ROADMAP pode ter $n fantasma(s) - rode 'python3 scripts/check_roadmap_fantasmas.py' pra auditar"
  fi
fi
```

Exit 2 torna a condição falsa, o bloco inteiro é pulado, o `stderr` foi
redirecionado para `/tmp/roadmap-fantasmas.log` e nunca é lido, e
**nenhum aviso chega ao console**. O `smoke.sh` segue e sai com exit 0.

Verificação empírica:

```
$ python3 scripts/check_roadmap_fantasmas.py --warn-only; echo "EXIT=$?"
ERRO: <REPO_ROOT>/ROADMAP.md nao existe.
EXIT=2
```

O ponto que torna isso pior que um bug comum: o gate **não reporta zero
fantasmas — não reporta nada**, e as duas situações são
indistinguíveis para quem lê o log do smoke. Um operador que confia no
smoke conclui "sem fantasmas" quando o correto seria "o detector não
rodou".

Complicador estrutural: o alvo que o script lê não existe mais.

```
$ ls ROADMAP.md
ls: cannot access 'ROADMAP.md': No such file or directory
```

```python
# scripts/check_roadmap_fantasmas.py:52
ROADMAP_PATH = REPO_ROOT / "ROADMAP.md"
```

O `ROADMAP.md` foi apagado no scrub de 2026-07-12. O detector ficou
apontando para um arquivo morto desde então — e foi exatamente sob esse
gate anulado que **44 sprints fantasma** se acumularam (specs marcadas
`[todo]` cujo trabalho já está entregue no código, em vários casos com
o próprio ID citado em comentário do fonte).

Cenário de falha concreto: uma sprint é entregue e mergeada, mas
ninguém volta ao spec para trocar o `[todo]`. O detector existiria
justamente para acusar isso no smoke seguinte. Como ele não roda, o
spec permanece `[todo]` para sempre, e meses depois alguém dimensiona
o backlog contando 113 itens que em larga maioria já estão feitos.

## Escopo (mínimo)

Três decisões possíveis foram avaliadas. A recomendação é a **(b)**.

| Opção | Avaliação |
|---|---|
| (a) Recriar o `ROADMAP.md` | Rejeitada. Recria uma segunda fonte de verdade paralela a `docs/sprints/` (385 specs) e a `docs/FEATURES-CANONICAS.md`. Reintroduz o drift que o scrub eliminou: dois lugares para marcar a mesma sprint como feita, e nada garante a sincronia. Custo alto, valor negativo. |
| **(b) Reapontar o script para `docs/sprints/`** | **Recomendada.** É onde o rastreamento de fato vive hoje. O anchor é limpo e já padronizado: 93 specs têm exatamente `STATUS:     [todo]`, mais ~9 variantes com data ou nota anexa; o ID da sprint sai do próprio nome do arquivo (`<ID>-spec.md`). Toda a lógica de valor do script — `coletar_commits_git`, `coletar_arquivos_codigo` (grep do ID em `src`/`app`/`tests`), `coletar_mencoes_features` contra `FEATURES-CANONICAS.md` — permanece intacta. Só o parser de entrada muda. |
| (c) Aposentar o script | Rejeitada. O achado de 44 fantasmas prova que o problema que ele detecta é real e recorrente neste projeto. Aposentar é escolher não medir. |

Passos:

1. **Tornar a falha alta antes de qualquer coisa.** Reescrever
   `scripts/smoke.sh:26-32` para não engolir exit não-zero: capturar o
   código de saída explicitamente e imprimir o conteúdo de
   `/tmp/roadmap-fantasmas.log` quando ele for diferente de 0 e de 1.
   Mantém-se não-bloqueante (é warn-only por design), mas passa a ser
   **visível**. Este passo sozinho já teria exposto o defeito no dia em
   que o `ROADMAP.md` sumiu.
2. **Consertar a ordem no script.** Sob `--warn-only`, alvo ausente
   deve imprimir aviso e retornar 0, não 2. Sem `--warn-only`, manter
   exit 2 (é erro de invocação legítimo). Concretamente: mover a
   verificação de existência para depois do parse de argumentos e
   condicioná-la a `args.warn_only`.
3. **Trocar o alvo.** Substituir `ROADMAP_PATH = REPO_ROOT / "ROADMAP.md"`
   (`:52`) por um scan de `docs/sprints/*-spec.md`, e reescrever
   `parse_roadmap` (`:241`) para produzir a mesma estrutura
   `list[LinhaSprint]` a partir de: ID = basename sem o sufixo
   `-spec.md`; status = primeiro match de `\[([a-z][a-z0-9 ]*)\]` na
   linha que começa com `STATUS:`. Preservar os conjuntos
   `STATUS_PENDENTE`/`STATUS_OK` (`:134-135`) sem alteração. Renomear
   a flag `--roadmap` mantendo alias para não quebrar chamadas
   existentes.
4. **Ajustar o texto das mensagens** no script e no `smoke.sh`, que
   hoje dizem "ROADMAP" em vários pontos e passariam a mentir sobre a
   fonte.
5. Atualizar a menção ao script no arquivo de regras da raiz e em
   `docs/CONTEXTO.md`, se houver — verificar antes de editar.
6. NÃO-objetivo: marcar as 44 sprints fantasma como `[ok]` (é a fila
   que esta sprint destrava, não o trabalho dela); reescrever a lógica
   de evidência (`coletar_commits_git` e afins), que continua válida;
   versionar `docs/sprints/` no git (problema separado, de prioridade
   maior, tratado em outra sprint desta auditoria).

## Trabalho de limpeza que esta sprint destrava

Esta sprint **não** deixa o CI vermelho — o detector é warn-only por
design e assim permanece. Mas ela vai começar a imprimir um aviso
grande no smoke, e o dono precisa saber o tamanho antes:

```
$ grep -rl "\[todo\]" docs/sprints/*-spec.md | wc -l
113
```

113 specs contêm o marcador `[todo]`. A auditoria de 2026-07-28
verificou 53 delas manualmente e classificou **44 como fantasma** (83%),
7 como pendência real e 2 como parciais. Extrapolando a taxa, a fila de
reconciliação documental é da ordem de **80 a 90 specs** a marcar como
entregues. É trabalho de documentação, barato por item, mas volumoso —
e o script tem `--fix`, que auto-marca as linhas classificadas como
FANTASMA. Recomenda-se usá-lo por lotes revisados, nunca de uma vez
sobre 90 arquivos sem leitura.

Ordem sugerida: esta sprint, depois um lote de `--fix` revisado, e só
então considerar promover o detector de warn-only a bloqueante. Ligar o
bloqueio antes da reconciliação transformaria 90 fantasmas em 90
falhas de CI.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
python3 scripts/check_roadmap_fantasmas.py --warn-only; echo "EXIT=$?"
#   ERRO: /home/.../ROADMAP.md nao existe.
#   EXIT=2
./scripts/smoke.sh 2>&1 | grep -A2 "auditoria fantasmas"
#   so' o echo do cabecalho; nenhum aviso, nenhuma linha de erro

# DEPOIS
python3 scripts/check_roadmap_fantasmas.py --warn-only; echo "EXIT=$?"
#   relatorio com N linhas FANTASMA sobre docs/sprints/
#   EXIT=0

python3 scripts/check_roadmap_fantasmas.py --json \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d))"
#   contagem programatica, sem depender do formato de texto

./scripts/smoke.sh 2>&1 | grep "fantasma"
#   AVISO: podem existir N sprint(s) fantasma - rode ... pra auditar
./scripts/smoke.sh; echo "SMOKE_EXIT=$?"     # 0 (continua nao-bloqueante)

# prova de que o modo alto funciona: renomear temporariamente o alvo e
# confirmar que o smoke agora IMPRIME o erro em vez de pular em silencio

npx tsc --noEmit                              # exit 0 (nao-regressao)
npm test -- tests/scripts                     # suites de scripts verdes
```

Sem device, sem E2E, sem Gauntlet: a sprint toca apenas um script
Python de auditoria e o orquestrador shell. Nenhum código de app.

## Commit

```
fix: audit-p3-5 detector de fantasmas le docs sprints e o smoke deixa de engolir exit nao-zero
```
