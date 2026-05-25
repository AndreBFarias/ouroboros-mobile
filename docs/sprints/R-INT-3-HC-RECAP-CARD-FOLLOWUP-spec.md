# R-INT-3-HC-RECAP-CARD-FOLLOWUP — Gate de recap vazio + seed de saude no Gauntlet

**Tipo:** fix + test-infra
**Prioridade:** P2
**Estimativa:** 0.5d
**Fase:** 3 (Onda 3Q.B1 — cadeia de valor HC)
**Depende de:** R-INT-3-HC-RECAP-CARD (`4ef2449`, entregue)

## Origem

Dois achados do executor + validacao de R-INT-3-HC-RECAP-CARD (2026-05-25):

1. **Gate de recap vazio esconde a secao Saude.** `RecapScreen.tsx` renderiza o
   conteudo (incluindo a nova `RecapSecaoSaude`) dentro de um `ScrollView` que so
   aparece quando `totalRecap > 0` (soma das secoes pre-existentes:
   conquistas/numeros/crises/etc). Se o usuario tiver SOMENTE dados de saude vindos
   do autopull HC (passos/treinos/sono/medidas) e nenhum outro registro no periodo,
   o `EmptyState` e mostrado e a secao Saude NUNCA aparece — derrotando parcialmente
   o proposito do card (tornar visivel o dado do HC).

2. **Gauntlet nao consegue semear dados de saude.** `seedDeterministico` cobre
   humores/diarios/eventos, mas nao passos/sono/treinos/medidas. Logo a validacao
   visual web (Gauntlet) so consegue exercitar o caminho "secao oculta" — o caminho
   com-dados fica coberto apenas por teste de componente (mock readers) + E2E
   nao-rodado. Sem seed de saude, nao ha screenshot real da secao preenchida.

## Objetivo

### Parte A — incluir saude no calculo de "recap nao vazio"

`RecapScreen.tsx`: incluir a presenca de dado de saude (resultado de
`calcularSaudeRecap` != tudo-null) no predicado que decide entre `EmptyState` e o
conteudo. Ou seja: se houver passos OU treinos OU sono OU medida no periodo, o
recap NAO e vazio, mesmo sem conquistas/numeros/etc.

- Reusar o `calcularSaudeRecap` ja chamado pela `RecapSecaoSaude` (evitar duplo
  fetch — elevar o calculo para o `RecapScreen` e passar o resultado como prop para
  `RecapSecaoSaude`, OU expor um flag `temDadoSaude`).
- NAO alterar a aparencia das secoes existentes; so o predicado de vazio.

### Parte B — seed de saude no Gauntlet

`src/lib/dev/seedDeterministico.ts` (+ expor em `gauntlet.ts`): adicionar
`seedSaude(dias = 7)` que escreve no vault mock arquivos canonicos:
- `markdown/passos-<data>.md` (schema de passos) para N dias.
- `markdown/sono-<data>-hc-<id>.md` (SonoSchema) para N noites.
- 1-2 `markdown/treino-<data>-hc-<id>.md` (TreinoSessao com `fonte_hc_id`).
- 1 `markdown/medidas-<data>.md` com peso.

Expor `seedComDados('saude-7d')` no `GauntletAPI` (mesma pattern de
`humores-30d`). Permite screenshot real da secao Saude preenchida.

## Escopo / Entregaveis

- MODIFICAR `src/components/screens/RecapScreen.tsx` (predicado de vazio + evitar
  duplo fetch).
- MODIFICAR `src/lib/dev/seedDeterministico.ts` (+ `seedSaude`).
- MODIFICAR `src/lib/dev/gauntlet.ts` (entry `saude-7d` em `seedComDados`).
- Tests: estender `tests/components/screens/RecapScreen.test.tsx` (recap nao-vazio
  com so dado de saude) + `tests/lib/dev/seedDeterministico` se houver.

## OFF-LIMITS

- NAO alterar as secoes Recap existentes (so o predicado de vazio).
- NAO tocar puxadores/scheduler/readers do autopull (so consumir).
- NAO tocar docs canonicos de raiz.

## Acceptance criteria

1. Recap com SOMENTE dado de saude no periodo renderiza a secao Saude (nao mostra EmptyState).
2. `calcularSaudeRecap` chamado 1x por render do Recap (sem duplo fetch).
3. `window.__gauntlet.seedComDados('saude-7d')` popula o vault mock e a secao Saude aparece no Gauntlet.
4. `npx tsc --noEmit` + `./scripts/smoke.sh` verde.

## Validacao visual

UI → Gauntlet obrigatorio. Com `seedComDados('saude-7d')`, screenshot da secao
"Saude essa semana" preenchida em `docs/sprints/R-INT-3-HC-RECAP-CARD-FOLLOWUP-screenshots-gauntlet/`.

## Proof-of-work esperado

1. Diff de RecapScreen + seedDeterministico + gauntlet.
2. Jest verde + screenshot Gauntlet da secao Saude preenchida.
3. Hash commit + branch.

## Referencias

- Sprint origem: `R-INT-3-HC-RECAP-CARD-spec.md` + commit `4ef2449`.
- Pattern seed: `src/lib/dev/seedDeterministico.ts` (seedHumores/seedDiarios/seedEventos).
- Readers: `listarPassos`/`listarSono`/`listarTreinos`/`listarMedidas`.
