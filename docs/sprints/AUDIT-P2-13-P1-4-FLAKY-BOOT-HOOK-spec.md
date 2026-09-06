# AUDIT-P2-13-P1-4-FLAKY-BOOT-HOOK — o caso da agenda mede ou não, conforme a corrida

```
STATUS:     materializada 2026-09-05 (achado da execução de AUDIT-INFRA-VAULT-MOCK-DELETE)
PRIORIDADE: média — não há defeito de app; o que está quebrado é a confiabilidade
            de um gate, e gate intermitente é pior que gate vermelho
DEPENDE:    nenhuma. AUDIT-INFRA-VAULT-MOCK-DELETE já fechou a metade de infra.
ORIGEM:     medido ao fechar o item 7 de AUDIT-INFRA-VAULT-MOCK-DELETE
DECISAO:    (nenhuma pendente do dono)
```

## O que foi medido

Três execuções consecutivas de `scripts/e2e-web.sh --grep audit-p1-4`, sem limpar
nada entre elas, no mesmo commit:

| Run | Resultado |
|----:|-----------|
| 1 | INCONCLUSIVO |
| 2 | PASS |
| 3 | INCONCLUSIVO |

O caso **às vezes mede**. E o modo de falha é o pior possível para um gate: ele
não fica vermelho, fica `INCONCLUSIVO` — que é **warn-only** no runner. Um caso
assim passa verde no CI sem ter medido nada, e ninguém percebe.

Isto também explica um desencontro real: durante a execução de
`AUDIT-INFRA-VAULT-MOCK-DELETE`, o agente que implementou reportou o caso como
`INCONCLUSIVO` e o revisor que o auditou reportou `PASS`. Os dois rodaram, os
dois falaram a verdade sobre o que viram, e cada um generalizou de uma amostra
de tamanho 1.

## Causa provável (apurada, não corrigida)

`autoSeedDev()` em `app/_layout.tsx` seta o `vaultRoot` em **todo** boot dev-web.
Com isso `limparDuplicatasAgendaUmaVez` roda no mount, com o Vault mock ainda
vazio — o `Map` do `useVaultMock` é memória pura e não sobrevive ao reload.
Não achando duplicata nenhuma, ele marca a flag one-shot
`duplicatasAgendaLimpas` como concluída.

Quando o passo 4 do caso semeia as duplicatas e chama `disparaBootHooks()`, o
hook já queimou. O `localStorage.clear()` do passo 0 existe justamente para
zerar essa flag, e a corrida decide quem chega primeiro — o boot ou o caso.

## Escopo

1. Reproduzir a corrida de forma determinística (rodar N vezes e contar), para
   não trabalhar sobre uma amostra de tamanho 1 — foi assim que dois agentes
   chegaram a conclusões opostas.
2. Dar ao caso um jeito de zerar a flag **depois** de semear e **antes** de
   disparar os hooks. Candidato: expor `__gauntlet.resetarFlagBoot(nome)` ou
   fazer `disparaBootHooks()` forçar a re-execução dos hooks one-shot.
3. Enquanto instável, **não** admitir o caso ao `e2e-smoke.json`.
4. Varrer os demais casos que dependem de hook one-shot — a corrida não tem
   nada de específico da agenda, e outros casos podem estar medindo por sorte.

## NÃO-objetivo

Mudar o comportamento de `limparDuplicatasAgendaUmaVez` em aparelho. A
semântica one-shot está correta em produção; o problema é só o harness não
conseguir voltar o relógio.
