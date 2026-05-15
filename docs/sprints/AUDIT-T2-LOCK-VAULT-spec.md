# AUDIT-T2-LOCK-VAULT — Eliminar race read-then-write em saves do vault

> Sprint derivada da auditoria 2026-05-15 (bug B7 descopado de T1).
> Severidade: ALTA — corrupção silenciosa em uso multi-device com
> Syncthing.

## 1. Objetivo

Eliminar o padrão **read-then-write** em saves do vault que pode
gerar conflito Syncthing silencioso quando dois devices capturam
no mesmo segundo. O caso canônico está em
`src/lib/humor/saveHumor.ts:52–73` (`resolvePath`) e se repete em:

- `src/lib/diario/saveDiario.ts`
- `src/lib/eventos/saveEvento.ts`
- `src/lib/marcos/saveMarco.ts`
- `src/lib/medidas/saveMedida.ts` (verificar)
- `src/lib/ciclo/saveRegistroCiclo.ts` (verificar)
- `src/lib/contadores/saveContador.ts` (verificar)
- `src/lib/tarefas/saveTarefa.ts` (verificar)
- `src/lib/alarmes/saveAlarme.ts` (verificar)

Em todos esses, o `resolvePath` lê o arquivo canônico, decide entre
nome canônico ou suffix `-<deviceId>`, depois escreve. Entre read e
write, **outro device pode escrever no canônico** — o segundo perde.

## 2. Estratégia

Duas opções (decidir na fase de planejamento detalhado):

### Opção A — Sempre escrever com `-<deviceId>` desde o início

Remove a decisão dinâmica. Todo registro sempre tem o sufixo do
device que escreveu. Listadores agregam por dia/feature ignorando o
sufixo.

**Prós**: zero race. Determinismo total.
**Contras**: muda layout de arquivos no vault (breaking change para
quem já tem registros canônicos).

### Opção B — Lock file `<path>.lock` durante save

Antes de read, criar `.lock` atômico (rename de `.lock-<pid>` para
`.lock`). Se falhar (já existe), aguardar 200ms e retentar até 3×.
Após write, deletar `.lock`.

**Prós**: layout do vault inalterado.
**Contras**: lock-file em filesystem é frágil; crashes deixam orfão.

**Recomendação**: A (mais simples, mais robusto, mas exige migration
de registros legados — bloco H já consolidou layout, então
incremento é aceitável).

## 3. Entregáveis (placeholder)

Sprint planejada em detalhe quando priorizada. Esqueleto:

- Util `forceDeviceIdSuffix(rel: string): string` em
  `src/lib/util/deviceId.ts`
- 8 callers de `save*` refactorados
- Listadores correspondentes garantem agregação por dia
- Migration boot: arquivos canônicos antigos sem suffix recebem
  `-<deviceIdLegacy>` no primeiro boot pós-update
- Testes cobrindo: 2 devices salvando no mesmo dia, listagem
  agrega ambos, recap conta 2

## 4. OFF-LIMITS

Mesma lista de T1. **Adicional**: `src/lib/util/deviceId.ts`
(canônico desde M38) e listadores tocados em B6 — refactorar com
cuidado pra não regressar filtro `sync-conflict`.

## 5. Verificação

```bash
./scripts/smoke.sh                 # >= 1962 testes (testes novos)
# Cenário live (opcional):
#   - Capturar humor em desktop e celular no mesmo minuto
#   - Verificar que ambos persistem
```

## 6. Decisões tomadas

- **B7 descopado de T1** porque exige refactor de 8 callers + util
  + migration — escopo próprio.
- **Opção A vs B**: decidir na próxima fase quando sprint for
  priorizada.
- **Pré-requisito**: B6 (sync-conflict filter) já mergeado em T1
  (commit `0d95b9a`).

## 7. Quando executar

Após validação live do alpha-11 e antes da release v1.0 final.
Sem essa sprint, multi-device com Syncthing tem risco residual de
perda silenciosa de registro.
