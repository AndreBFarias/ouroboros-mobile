# Sprint M-WCAG-MUTED-DECOR-TEXTO — Auditoria caso a caso de mutedDecor em texto

```
DEPENDE:    M-WCAG-COMPLETO
BLOQUEIA:   M41
ESTIMATIVA: 1-2h
PRIORIDADE: baixa (uso predominantemente decorativo)
```

## 1. Achado / motivacao

Auditoria 2026-05-04 (`docs/auditoria-wcag-2026-05-04/RELATORIO.md`
secao 5) listou **24 ocorrencias** de `colors.mutedDecor` (#6272a4)
como `color:` em `<Text>` com fontSize <= 14. Razao 3.03:1 sobre
`colors.bg` falha WCAG AA texto normal (precisa 4.5).

A maior parte e uso decorativo legitimo (rotulos micro, hints,
datas auxiliares). Mas algumas instancias podem ser texto chave
de leitura mascarado de decorativo.

## 2. Objetivo

Decisao caso a caso: manter como decorativo (aceito) ou promover
para `colors.muted` (#c9c9cc, ratio 8.62:1 sobre bg).

## 3. Entregaveis

Para cada arquivo da lista da secao 5 do RELATORIO, decidir:

| Arquivo:linha | Conteudo do texto | Decisao | Justificativa |
|---|---|---|---|
| `src/components/data/ConquistaCard.tsx:115` | rotuloTipo | ? | ? |
| `src/components/medidas/SliderFotos.tsx:89` | rotulo slider | ? | ? |
| (preencher na execucao) | | | |

Edits em arquivos onde decisao for "promover":
- Trocar `colors.mutedDecor` por `colors.muted` na linha indicada.
- Atualizar snapshot test se houver.

## 4. Verificacao

- Para cada texto promovido a `muted`, ratio >= 4.5 confirmado via
  helper `ratioContraste`.
- Smoke verde, tsc 0, todos os testes passam.
- Auditoria revisada e atualizada.

## 5. Decisoes tomadas

- Heuristica: se o texto carrega informacao funcional unica
  (ex: data de execucao de exercicio, valor numerico de medida,
  categoria que distingue itens da lista), promover. Se e somente
  rotulo de apoio (ex: "Foto 1 de 3", "kg" como unidade), manter
  decorativo.
