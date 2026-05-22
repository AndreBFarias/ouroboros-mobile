# R-INT-3-HC-AUTOPULL-MENSTRUACAO — Puxar MenstruationFlow do HC pro Vault

**Tipo:** feature (puxador + reuso RegistroCiclo)
**Prioridade:** P2
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B + R-INT-3-HC-AUTOPULL-SCHEDULER

## Contexto

Apps de tracking menstrual (Flo, Clue) escrevem MenstruationFlowRecord no HC. Sub-sprint puxa e cria RegistroCiclo no Vault (schema existente Q17.c.c).

## Objetivo

Criar `src/lib/health/autopullMenstruacao.ts`:

```ts
export interface MenstruacaoResultado {
  novos: number;
  pulados: number;
}

export async function autopullMenstruacao(
  vaultRoot: string,
  agora: Date,
  desde: Date
): Promise<MenstruacaoResultado>;
```

Logica:
1. `readRecords('MenstruationFlow', ...)`.
2. Mapear `flow` (HC enum: 1=light, 2=medium, 3=heavy) -> string PT-BR.
3. Para cada record, verificar slug `ciclo-<data>-hc-<id>.md` — pular se existe.
4. `escreverRegistroCiclo(vaultRoot, meta)` com:
```yaml
tipo: ciclo
data: 2026-05-22
autor: pessoa_a
fase: menstrual
intensidade: leve | media | forte
fonte_hc_id: 'a1b2c3d4-...'
fonte_hc_origin: 'Flo' | 'Clue' | etc
```

## API auxiliar

Estender `RegistroCicloSchema` com 2 campos opcionais.

Mapa flow -> PT-BR em const:
```ts
const FLOW_PTBR: Record<number, 'leve' | 'media' | 'forte'> = {
  1: 'leve', 2: 'media', 3: 'forte'
};
```

## Escopo

### A. Investigacao

```bash
grep -c "readRecords" modules/health-connect/android/.../HealthConnectModule.kt  # >= 1
grep -n "escreverRegistroCiclo" src/lib/vault/ciclo.ts  # confirma writer
grep -c "fonte_hc_id" src/lib/schemas/ciclo.ts  # 0 antes
```

### B. Implementacao

1. `src/lib/schemas/ciclo.ts`: 2 campos opcionais + intensidade enum se nao existe.
2. `src/lib/health/autopullMenstruacao.ts` (novo).
3. `src/lib/health/scheduler.ts`: entry.

### C. Testes

- `tests/lib/health/autopullMenstruacao.test.ts`: mapeamento flow, idempotencia.

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas/ciclo,vault/ciclo,health/autopullMenstruacao}.ts`, scheduler entry, tests.

**Nao pode tocar:** outros schemas/writers, bridge, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live: adicionar fluxo via Flo/Clue, abrir Ouroboros, ver RegistroCiclo.
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde.
3. Hash + build APK.
4. Live (opcional): ciclo-<data>-hc-<id>.md.

## Referencias

- HC MenstruationFlow: https://developer.android.com/reference/androidx/health/connect/client/records/MenstruationFlowRecord
