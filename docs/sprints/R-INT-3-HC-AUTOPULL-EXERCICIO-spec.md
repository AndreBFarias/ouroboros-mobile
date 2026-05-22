# R-INT-3-HC-AUTOPULL-EXERCICIO — Puxar ExerciseSession do HC pro Vault

**Tipo:** feature (puxador + reuso writer treino-sessao existente)
**Prioridade:** P1 (cobre 99% dos treinos registrados via wearable)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B + R-INT-3-HC-AUTOPULL-SCHEDULER

## Contexto

`ExerciseSessionRecord` do HC tem `startTime`, `endTime`, `title`, `exerciseType` (enum int do HC), `notes`. Esses sao treinos registrados por wearables ou apps de terceiros (Strava, Google Fit, Samsung Health) — o usuario nao precisa registrar de novo no Ouroboros.

Sub-sprint reutiliza writer `escreverTreinoSessao` ja existente (R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG entregue em Onda 3N.5).

## Objetivo

Criar `src/lib/health/autopullExercicio.ts`:

```ts
export interface ExercicioResultado {
  novos: number;       // sessoes novas persistidas
  pulados: number;     // duplicatas (mesmo HC id ja persistido)
}

export async function autopullExercicio(
  vaultRoot: string,
  agora: Date,
  desde: Date
): Promise<ExercicioResultado>;
```

Logica:
1. `readRecords('ExerciseSession', { timeRangeFilter, ascendingOrder: true })`.
2. Para cada record, gerar slug determinístico: `hc-${record.metadata.id}`.
3. Verificar se ja existe `treinos/treino-<data>-hc-<id>.md` — pular se sim.
4. Mapear `exerciseType` (int HC) -> string PT-BR via tabela canonica (caminhada, corrida, ciclismo, musculacao, yoga, etc).
5. `escreverTreinoSessao(vaultRoot, meta)` com:
```yaml
tipo: treino_sessao
data: 2026-05-22
autor: pessoa_a
modo: 'sessao_hc'  # novo modo, diferente de 'rotina' e 'livre'
titulo: 'Caminhada importada de Conexão Saúde'
inicio: 2026-05-22T18:30:00-03:00
fim: 2026-05-22T19:15:00-03:00
duracao_min: 45
fonte_hc_id: 'a1b2c3d4-...'    # metadata.id
fonte_hc_origin: 'Strava'      # metadata.dataOrigin (package name humanizado)
exercicio_hc_type: 79          # exerciseType raw
```

## API auxiliar

Estender `TreinoSessaoSchema` com campos opcionais `fonte_hc_id?: string`, `fonte_hc_origin?: string`, `exercicio_hc_type?: number`. Backward-compat: sessions antigas sem esses campos continuam validas.

Tabela exerciseType -> PT-BR em `src/lib/health/exerciseTypeMap.ts` (novo). Cobrir os 80+ tipos do HC SDK.

## Escopo

### A. Investigacao obrigatoria

```bash
grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/.../HealthConnectModule.kt  # >= 1
grep -n "escreverTreinoSessao" src/lib/vault/treinos.ts  # confirma writer ja existente
grep -c "fonte_hc_id" src/lib/schemas/treino_sessao.ts  # esperado 0 antes
```

### B. Implementacao

1. `src/lib/schemas/treino_sessao.ts`: adicionar 3 campos opcionais.
2. `src/lib/health/exerciseTypeMap.ts` (novo): const `EXERCISE_TYPES_PTBR: Record<number, string>`.
3. `src/lib/health/autopullExercicio.ts` (novo): orquestracao.
4. `src/lib/vault/treinos.ts`: idempotencia via `slug` (se ja existe `treino-<data>-hc-<id>.md`, retornar `pulado: true`).
5. `src/lib/health/scheduler.ts`: adicionar `exercicio` no TIPOS_AUTOPULL.

### C. Testes

- `tests/lib/health/autopullExercicio.test.ts`: idempotencia, mapeamento exerciseType, fonte_hc_origin humanizado.
- `tests/lib/health/exerciseTypeMap.test.ts`: cobre os 10 mais comuns + fallback "Atividade fisica".

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas,vault,health}/{treino_sessao,treinos,autopullExercicio,exerciseTypeMap}*`, `src/lib/health/scheduler.ts` (entry), tests.

**Nao pode tocar:** modulo nativo, schemas nao relacionados, MainActivity, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
# Live: registrar 1 ExerciseSession no HC nativo (ou via Strava sync),
# abrir Ouroboros, ver TreinoSessao com modo='sessao_hc' no Vault.
```

## Proof-of-work

1. Lista arquivos + diff.
2. `npx jest --silent | tail -5`.
3. Hash commit + build APK.
4. Live: arquivo treino-<data>-hc-<id>.md no Vault apos sync HC.

## Referencias

- HC ExerciseSession: https://developer.android.com/reference/androidx/health/connect/client/records/ExerciseSessionRecord
- Exercise types enum: https://developer.android.com/reference/androidx/health/connect/client/records/ExerciseSessionRecord#summary
