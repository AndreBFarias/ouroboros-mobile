# R-INT-3-HC-DEDUP — Dedup de records do Health Connect via clientRecordId determinístico

**Tipo**: fix (robustez)
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-INT (Onda 3P, bridge HC)

## Fonte canônica

Achado registrado em `modules/health-connect/.../Utils.kt:126` ("clientRecordId=null;
caller pode prover dedup futuramente") e em `_BACKLOG.md` (contingente). O Health Connect
**não dedupa records por padrão**: chamar `insertRecords()` 2x com o mesmo payload cria 2
registros duplicados. O write-back Vault→HC (`escreverTreinoEmHC`/`escreverPesoEmHC`/
`escreverBodyFatEmHC`/`escreverMenstruacaoEmHC` em `src/lib/health/sync.ts`) pode reinserir
o mesmo dado (ex: re-save de uma medida), duplicando no HC.

## Hipóteses técnicas (validar via grep antes)

1. **Bridge aceita clientRecordId** — `modules/health-connect/src/index.ts` (`InsertRecordInput`)
   e `Utils.kt` (`mapToRecord`) setam `clientRecordId` (hoje null). Comprovar e estender os
   `InsertXInput` para aceitar `clientRecordId?: string` e o builder Kotlin para aplicá-lo via
   `Metadata.manualEntry(clientRecordId = ...)` (API connect-client 1.1.0; o R-INT-3-HC-BRIDGE-INSERT-1-1-0-FIX já usa factory methods de Metadata).
2. **Caller gera o id determinístico** — em `sync.ts`, cada `escreverXEmHC` deriva um
   `clientRecordId` estável do dado do Vault (ex: `treino-<data>-<slug>`, `peso-<YYYY-MM-DD>`).
   Reinserir o mesmo dado → mesmo id → HC faz upsert (não duplica).

## Entregáveis

- `modules/health-connect/src/index.ts` — `clientRecordId?: string` nos 4 `InsertXInput`.
- `modules/health-connect/android/.../Utils.kt` — aplicar `clientRecordId` no Metadata dos
  4 builders (quando presente; mantém `manualEntry()` sem id quando ausente).
- `src/lib/health/sync.ts` — cada `escreverXEmHC` passa `clientRecordId` determinístico.
- Testes: `tests/lib/health/sync.test.ts` ou `insertRecords-mock.test.ts` — 2 inserts do
  mesmo dado usam o mesmo `clientRecordId` (asserção sobre o payload passado ao mock).

## OFF-LIMITS
- Pode: `modules/health-connect/**`, `src/lib/health/sync.ts`, testes health.
- Não: autopull scheduler/puxadores (leitura, não escrita); `package.json`.

## Restrições
- Toca código nativo Kotlin → **invalida dev-clients antigos** (entra no próximo build).
- Comentários sem acento; commit sem acento; TS strict; worktree.

## Verificação canônica
```bash
./scripts/bootstrap-worktree.sh
npx tsc --noEmit
npm test --silent -- --testPathPattern="health"
./scripts/smoke.sh
```
Validação nativa real: parte do R-INT-3-HC-LIVE-CHECKPOINT (re-save de medida não duplica no HC nativo).

## Proof-of-work
1. `git diff --name-only`. 2. jest health verde. 3. smoke. 4. hash+branch worktree.
5. Achados colaterais → sprint nova.
