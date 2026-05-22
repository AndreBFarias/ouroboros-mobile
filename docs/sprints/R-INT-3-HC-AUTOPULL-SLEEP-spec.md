# R-INT-3-HC-AUTOPULL-SLEEP — Puxar SleepSession do HC pro Vault

**Tipo:** feature (puxador + schema novo)
**Prioridade:** P3 (feature secundaria, requer wearable de sono)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B + R-INT-3-HC-AUTOPULL-SCHEDULER

## Contexto

Wearables (Galaxy Watch, Mi Band) escrevem SleepSessionRecord no HC. Atualmente o Ouroboros nao tem schema dedicado para sono — esta sprint cria um e o popula via HC autopull.

Sem analytics complexa (gráfico ciclos REM/profundo etc) — so duracao + horario, suficiente para o usuario ver no Recap.

## Objetivo

Criar schema novo `src/lib/schemas/sono.ts` + writer `src/lib/vault/sono.ts` + puxador `src/lib/health/autopullSono.ts`:

```ts
export interface SonoResultado {
  novos: number;
  pulados: number;
}

export async function autopullSono(
  vaultRoot: string,
  agora: Date,
  desde: Date
): Promise<SonoResultado>;
```

Logica:
1. `readRecords('SleepSession', ...)`.
2. Calcular `duracao_min` = (endTime - startTime) / 60000.
3. Para cada record, verificar slug `sono-<data>-hc-<id>.md` — pular se existe.
4. `escreverSono(vaultRoot, meta)` com:
```yaml
tipo: sono
data: 2026-05-22         # data do despertar
autor: pessoa_a
inicio: 2026-05-21T23:15:00-03:00
fim: 2026-05-22T07:32:00-03:00
duracao_min: 497
fonte_hc_id: 'a1b2c3d4-...'
fonte_hc_origin: 'Galaxy Watch'
```

## API auxiliar

`SonoSchema` em `src/lib/schemas/sono.ts`:
```ts
export const SonoSchema = z.object({
  tipo: z.literal('sono'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  autor: PessoaAutorSchema,
  inicio: IsoDatetimeSchema,
  fim: IsoDatetimeSchema,
  duracao_min: z.number().int().positive(),
  fonte_hc_id: z.string().optional(),
  fonte_hc_origin: z.string().optional(),
});
```

## Escopo

### A. Investigacao

```bash
grep -c "readRecords" modules/health-connect/android/.../HealthConnectModule.kt  # >= 1
ls src/lib/schemas/sono.ts  # esperado nao existe antes
ls src/lib/vault/sono.ts    # idem
```

### B. Implementacao

1. `src/lib/schemas/sono.ts` (novo).
2. `src/lib/vault/sono.ts` (novo).
3. `src/lib/health/autopullSono.ts` (novo).
4. `src/lib/health/scheduler.ts`: entry no TIPOS_AUTOPULL.

### C. Testes

- `tests/lib/schemas/sono.test.ts`: parse/serialize.
- `tests/lib/vault/sono.test.ts`: escrever + listar.
- `tests/lib/health/autopullSono.test.ts`: idempotencia + duracao_min calculo.

## OFF-LIMITS

**Pode tocar:** novos arquivos sono + scheduler entry + tests.

**Nao pode tocar:** outros schemas/writers, bridge, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live (requer wearable): dormir com Galaxy Watch, manha seguinte abrir
# Ouroboros, ver sono-<data>-hc-<id>.md no Vault.
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde (+N testes).
3. Hash + build APK.
4. Live opcional.

## Referencias

- HC SleepSession: https://developer.android.com/reference/androidx/health/connect/client/records/SleepSessionRecord
