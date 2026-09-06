# AUDIT-P2-12-RECAP-CEGO-NO-GAUNTLET — o Recap não enxerga o seed do Gauntlet

```
STATUS:     FECHADA 2026-09-05, no mesmo dia (achado colateral de AUDIT-P2-11)
PRIORIDADE: alta para o processo, nenhuma para o usuário — não há defeito em
            aparelho; o que está quebrado é a capacidade de VALIDAR o Recap
            antes de chegar ao aparelho
DEPENDE:    nenhuma
ORIGEM:     medido durante a validação visual de `AUDIT-P2-11`, que ficou
            bloqueada por isto
DECISAO:    (nenhuma pendente do dono; é investigação técnica)
```

## O que foi medido

Com `EXPO_PUBLIC_GAUNTLET=1` e Metro em `localhost:8082`, na sequência:

```js
__gauntlet.reset();
__gauntlet.seed();
await __gauntlet.seedComDados('eventos-7');
await __gauntlet.abrir('/recap');
```

`__gauntlet.listarVaultMock()` confirma os sete arquivos gravados no path
canônico que o loader varre:

```
web://mock-vault/Ouroboros/markdown/evento-2026-08-29-casa-6.md
web://mock-vault/Ouroboros/markdown/evento-2026-08-30-parque-5.md
... (7 no total)
```

O conteúdo de cada um é frontmatter válido — verificado contra `EventoSchema`
com `safeParse`, os sete passam. `__gauntlet.estado()` mostra
`vaultRoot: "web://mock-vault/Ouroboros"`.

E ainda assim:

- **Modo Calendário** renderiza `"Sua primeira conquista vai aparecer aqui."`,
  que é o galho `sem` (`brutas.length === 0`).
- **Modo Lista** renderiza `"Vazio é uma forma de tempo também."`, com o
  período em Semana e os eventos caindo entre −7 d e −1 d.

Repetido com re-seed após a tela montada, e com ciclo de foco
(`abrir('/')` → `abrir('/recap')`) para disparar o `useFocusEffect` de
`useConquistas`. Mesmo resultado: zero.

## Por que isso importa mais do que parece

O Recap **nunca** pôde ser validado no Gauntlet. Não é uma regressão recente:
é a explicação de por que a barra de filtros de `AUDIT-P2-11` ficou dois meses
implementada, testada e desconectada sem ninguém notar. A tela que deveria
mostrar o defeito mostrava um empty state — e um empty state é indistinguível
de "funcionando, mas sem dados".

Vale para todo E2E que dependa de conquistas: ele devolve `INCONCLUSIVO`, e
`INCONCLUSIVO` é warn-only no runner. Ou seja, passa verde sem ter medido.

## Causa — nenhum dos três suspeitos

A hipótese original apontava três camadas: `listVaultFolder` no mock web,
`readVaultFile` devolvendo `null`, e `matchesFeaturePrefix` contra URIs
`web://`. **As três estavam erradas.** Instrumentadas uma a uma com
`Platform.OS` forçado para `'web'`, as três funcionam: a listagem devolve o
arquivo, a leitura devolve `modo: positivo`, o prefixo casa.

A causa estava oito linhas acima delas, em `lerConquistas`, e era explícita:

```ts
// M28-COLAT-01 / M27.1 fix: vault mock em web (web://mock-vault/...)
// nao tem reader funcional. Promise nunca resolveria, deixando o
// hook preso em loading=true e bloqueando boot.
if (vaultRoot.startsWith('web://')) {
  return { conquistas: [], totaisPorOrigem: { ... } };
}
```

Um early-return deliberado, escrito quando a premissa era verdadeira — o
mock web realmente não tinha reader. O `INFRA-VAULT-WEB-MOCK` (V4.0,
2026-05-08) criou esse reader, e o guard **sobreviveu à própria
justificativa**. Ninguém o removeu porque nada reprovava: a tela mostrava
empty state, e empty state é indistinguível de "sem dados".

**Por que a suíte não pegava:** o ramo web de `reader.ts` só roda com
`Platform.OS === 'web'`, e o preset de teste do React Native reporta
`'ios'`. As 379 suítes passavam sem nunca visitar esse caminho. O defeito
morava exatamente no galho que os testes não visitam.

## Entregue

1. **Guard removido**, com o histórico registrado em comentário no lugar dele
   — para que a próxima pessoa não o reintroduza "por segurança".
2. **`tests/lib/conquistas/loader-web-mock.test.ts`** — roda com `Platform.OS`
   forçado para `'web'` e reprova sem o fix. É a primeira cobertura desse
   ramo.
3. **Os dois `catch {}` mudos** de `lerEventosPositivos` e
   `lerDiarioConquistas` agora chamam `devLog` nomeando arquivo e erro.
4. **`tests/e2e/playwright/audit-p2-12-recap-le-o-seed.e2e.ts`** — o gate.
   Semeia `eventos-7`, confere que os sete chegaram ao vault mock (separando
   falha de seed de falha de leitura) e exige que o Recap saia do empty state.

## Validado no Gauntlet

Calendário com dots nos dias semeados, sheet com os quatro filtros de
`AUDIT-P2-11`, contador indo a "1 ativo" ao filtrar por Spotify e voltando ao
repouso no Limpar. Screenshots em
`AUDIT-P2-12-RECAP-CEGO-NO-GAUNTLET-screenshots-gauntlet/`.

## NÃO-objetivo

Mudar o comportamento do Recap em aparelho — lá ele lê o Vault real e
funciona. O defeito é do caminho web/mock.
