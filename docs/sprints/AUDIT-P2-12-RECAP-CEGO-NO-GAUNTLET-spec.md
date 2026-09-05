# AUDIT-P2-12-RECAP-CEGO-NO-GAUNTLET — o Recap não enxerga o seed do Gauntlet

```
STATUS:     materializada 2026-09-05 (achado colateral da execução de AUDIT-P2-11)
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

## Onde procurar

Não investigado a fundo — o escopo de P2-11 era outro. Os candidatos, em
ordem de suspeita:

1. **`listVaultFolder` no mock web** — o loader chama
   `listVaultFolder(joinUri(vaultRoot, 'markdown'), '.md')`. O
   `listarVaultMock` do Gauntlet lista os arquivos por outro caminho; os dois
   podem não estar olhando o mesmo lugar.
2. **`readVaultFile(uri, EventoSchema)`** devolvendo `null` no mock web. O
   `catch {}` do loop em `lerEventosPositivos` engole a exceção sem log, então
   uma falha de leitura é silenciosa por construção.
3. **`matchesFeaturePrefix(u, 'evento-')`** contra URIs `web://`.

## Escopo

1. Descobrir em qual das três camadas a lista se perde, com log — não com
   inspeção de código.
2. Corrigir.
3. **Trocar o `catch {}` silencioso** de `lerEventosPositivos` por um
   `devLog` que nomeie o arquivo e o motivo. Um erro de parse hoje é
   indistinguível de "não há conquistas", que é exatamente o que tornou este
   defeito invisível.
4. Caso E2E que semeia `eventos-7` e exige `brutas.length === 7` — o gate que
   faltava. Sem ele, o próximo bug do Recap volta a ficar escondido atrás de
   um empty state.
5. Depois disso, rodar `tests/e2e/playwright/audit-p2-11-filtrosbar-recap.e2e.ts`,
   que já existe e hoje devolve `INCONCLUSIVO` por falta de conquistas.

## NÃO-objetivo

Mudar o comportamento do Recap em aparelho — lá ele lê o Vault real e
funciona. O defeito é do caminho web/mock.
