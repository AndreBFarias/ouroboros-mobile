# AUDIT-P2-4-STATS-PIPELINE — disparar o pipeline de stats agregadas que o contrato já exige

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (4 arquivos declarados canônicos no contrato com o backend nunca
            existem em nenhum Vault; o ZIP de estado sai com 5 de 9 arquivos)
DEPENDE:    nenhuma
ORIGEM:     achados [P2-4] / [NI-04] da auditoria de 2026-07-28. Encontrado por varredura
            de exports sem consumidor em `src/lib/`. Reverificado nesta materialização em
            `main @ b5bf2db`, com uma correção relevante ao enquadramento original: a
            auditoria classificou o pipeline como "sem quem consumiria o resultado". A
            verificação encontrou consumidores declarados — ver §Ligar ou remover.
```

## Problema (gatilho ausente num pipeline com contrato publicado)

`src/lib/stats/escreverStats.ts` (163 linhas) e `src/lib/stats/calcular.ts` (305 linhas)
formam um par fechado: só se chamam entre si. O gatilho descrito no preâmbulo não existe.

`src/lib/stats/escreverStats.ts:7-10`:

```ts
// Debounce 30s por periodo: subscribers dos stores de dominio
// (humor, diario, eventos, marcos, contadores, tarefas) chamam
// agendarRecalculoStats em cada mutacao; o agendamento agrupa em
// 1 write por periodo a cada 30s.
```

Verificação linha a linha da afirmação:

```
$ grep -rn "agendarRecalculoStats\b" --include="*.ts" --include="*.tsx" src app
src/lib/stats/escreverStats.ts:9:   (comentario acima)
src/lib/stats/escreverStats.ts:117: export function agendarRecalculoStats(...)
src/lib/stats/escreverStats.ts:140: agendarRecalculoStats(p)   <- chamada interna

$ grep -rn "agendarRecalculoStatsTodos" --include="*.ts" --include="*.tsx" src app
src/lib/stats/escreverStats.ts:138: export function agendarRecalculoStatsTodos()
```

`agendarRecalculoStatsTodos` — a função cujo comentário em `:136-137` diz literalmente
*"Caller comum: subscribers de stores de dominio"* — tem **zero callers**.
`escreverStatsAgregadas` (`:52`) tem 4 hits, todos internos ao mesmo arquivo. Nenhum dos
módulos de domínio em `src/lib/vault/` (`humor.ts`, `diario.ts`, `eventos.ts`,
`marcos.ts`, `contadores.ts`, `tarefas.ts`) importa `escreverStats`.

Consequência: os arquivos `_estado/stats-7d-<deviceId>.md`, `stats-30d`, `stats-90d` e
`stats-all` **nunca são escritos** em nenhum Vault de nenhum usuário.

### Onde a ausência aparece

`src/lib/vault/exportarEstadoCompleto.ts:3-4` — o exportador declara o que espera:

```ts
// Coleta os .md de vault/_estado/ (5 estados R-VAULT-A + 4 stats
// agregadas R-VAULT-B = 9 arquivos esperados) e empacota em ZIP
```

A rota é alcançável: `app/settings/index.tsx:516` chama `exportarEstadoCompletoZip()` a
partir do botão de exportar estado. O `_meta.md` do ZIP grava `total_arquivos`
(`exportarEstadoCompleto.ts:117,127`). Cenário de falha concreto: `pessoa_a` toca
"Exportar estado completo", envia o ZIP para o pipeline do desktop, e o ZIP chega com
`total_arquivos: 5` em vez de 9 — sem erro, sem aviso, sem nada que indique que quatro
arquivos canônicos simplesmente não existem.

## Ligar ou remover

A instrução de investigação previa que, se ninguém lesse esses arquivos, a recomendação
seria remover. **A verificação desmentiu a premissa.** Existem três consumidores
declarados, nenhum deles no grep de `src/`:

1. **`docs/CONTRACT-MOBILE-BACKEND.md` §5.28 a §5.31** — os quatro arquivos são tipos
   canônicos do contrato com o backend, com path, schema, versão e tabela de frontmatter
   campo a campo. §5.28 fecha com: *"Read-model derivado dos 7 últimos dias. Recalculado
   pelo writer reativo a cada mutação relevante (debounced 30s)"* — descrevendo como fato
   o gatilho que não existe.
2. **`docs/SCHEMA-VAULT-ESTADO.md`** — declara "Total atual: 9 `.md` por device" (`:44`)
   e especifica, em §"Para o sibling Python ETL", a API recomendada
   `lerStatsAgregadas(periodo: Literal['7d','30d','90d','all'])` (`:280`).
3. **`src/lib/vault/exportarEstadoCompleto.ts`** — já citado, com caminho de usuário real.

O consumidor final é o repositório irmão de desktop (`protocolo-ouroboros`, em produção
segundo `docs/CONTEXTO.md:460`), que é outro projeto — por isso invisível a qualquer grep
neste repositório. O propósito declarado do read-model
(`R-VAULT-CANONICAL-COMPLETE-B-spec.md:22-25`) é permitir que o ETL leia séries
históricas sem reagregar o Vault inteiro.

**Recomendação: LIGAR.**

Justificativa: remover exigiria reverter dois documentos canônicos de contrato
(`CONTRACT-MOBILE-BACKEND.md`, `SCHEMA-VAULT-ESTADO.md`), o schema
`EstadoStatsAgregadasSchema` e o mapa `ESTADO_SLUGS` em
`src/lib/schemas/vault_estado.ts:343-356`, mais o cabeçalho do exportador — e quebraria
unilateralmente um contrato acordado com outro repositório. O custo de ligar é um gatilho;
o custo de remover é uma renegociação de contrato mais 468 linhas testadas jogadas fora.

Ressalva honesta que precisa ficar registrada: **nenhuma tela do app lê esses arquivos.**
O benefício é inteiramente para o consumo externo. Se o dono decidir que o ETL do desktop
não vai mais consumir stats pré-agregadas, a recomendação se inverte para remover — e aí
esta sprint deve ser substituída por uma de limpeza que toque também os dois documentos
de contrato. A decisão é do dono e antecede a execução.

## Escopo (mínimo)

1. Escolher **um** ponto de disparo e implementá-lo. Duas opções, com o tradeoff explícito:
   - **(a) Um `BootHook` + chamada pós-save nos writers de vault.** Chamar
     `agendarRecalculoStatsTodos()` após cada save bem-sucedido nos módulos de domínio
     citados no preâmbulo (`humor`, `diario`, `eventos`, `marcos`, `contadores`,
     `tarefas`). Mais preciso, toca 6 arquivos.
   - **(b) Apenas um `BootHook`** registrado em `src/lib/boot/reagendamento.ts`
     (`BOOT_HOOKS.push`, `:221-259`, onde já vivem 12 a 14 hooks). Um write por boot, zero
     acoplamento nos writers. Menos fresco, mas suficiente para um ETL que roda no desktop
     periodicamente.

   Recomendação: **(b) primeiro**, porque entrega os 4 arquivos com um único ponto de
   acoplamento e sem espalhar side-effect por seis módulos de escrita. O debounce de 30 s
   de `agendarRecalculoStats` (`escreverStats.ts:117-134`) já protege contra rajada, então
   (a) pode vir depois se a frescura provar-se insuficiente.
2. Confirmar em runtime que o no-op defensivo de `escreverStats.ts:120-125` (vault
   inacessível devolve sem agendar) não engole o disparo em boot — o hook precisa rodar
   depois de `vaultRoot` estar resolvido, não antes.
3. Corrigir os comentários que hoje afirmam o que não acontece: `escreverStats.ts:7-10` e
   `docs/CONTRACT-MOBILE-BACKEND.md` §5.28 (*"Recalculado pelo writer reativo a cada
   mutação relevante"*), alinhando ao gatilho que de fato for implementado.
4. Atualizar `docs/FEATURES-CANONICAS.md`: registrar que o Vault passa a conter os 4
   arquivos de stats agregadas e que o export de estado completo sai com 9 arquivos.
5. NÃO-objetivo: construir UI que leia stats agregadas. Nenhuma tela consome hoje e esta
   sprint não cria consumo interno.
6. NÃO-objetivo: alterar `calcular.ts` ou o `EstadoStatsAgregadasSchema`. Cálculo e
   schema estão prontos e testados; falta só o gatilho.
7. NÃO-objetivo: mexer no `exportarEstadoCompleto.ts` além de, se necessário, ajustar o
   comentário de cabeçalho.

## Proof-of-work

```bash
# 1. Antes: nenhum caller externo
grep -rn "agendarRecalculoStatsTodos\|agendarRecalculoStats\b" \
  --include="*.ts" --include="*.tsx" src app | grep -v "src/lib/stats/"   # 0 hits

# 2. Depois: pelo menos 1 caller fora de src/lib/stats/
grep -rn "agendarRecalculoStatsTodos\|agendarRecalculoStats\b" \
  --include="*.ts" --include="*.tsx" src app | grep -v "src/lib/stats/"   # >= 1 hit

# 3. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test -- stats                                    # verde
npm test -- exportarEstadoCompleto                   # verde
./scripts/smoke.sh                                   # verde

# 4. Prova de que os 4 arquivos passam a existir (vault mock do Gauntlet)
./gauntlet.sh
# no console do browser, apos seed com dados:
#   await window.__gauntlet.seedComDados()
#   (aguardar o debounce de 30s ou o flush do boot hook)
#   await window.__gauntlet.estado()
# depois, exportar estado completo em Configuracoes e conferir total_arquivos: 9
```

Sem caso E2E novo: esta sprint não introduz nem altera controle de UI. A verificação de
usuário é indireta (contagem de arquivos no ZIP de estado) e está coberta pelo passo 4 e
pela suíte Jest de `exportarEstadoCompleto`.

## Commit

```
feat: audit-p2-4 dispara pipeline de stats agregadas via boot hook e fecha os 9 arquivos de estado
```
