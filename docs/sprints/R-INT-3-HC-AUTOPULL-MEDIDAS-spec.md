# R-INT-3-HC-AUTOPULL-MEDIDAS — Puxar Weight + BodyFat do HC pro Vault

**Tipo:** feature (puxador + reuso writer medida existente)
**Prioridade:** P2
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B + R-INT-3-HC-AUTOPULL-SCHEDULER

## Contexto

Balanca inteligente (ex: Mi Scale, Withings) escreve WeightRecord + BodyFatRecord no HC. Sub-sprint puxa esses e cria Medida no Vault sem usuario precisar digitar.

Reutiliza `MedidaSchema` + writer `escreverMedida` existentes (Q17.c).

## Objetivo

Criar `src/lib/health/autopullMedidas.ts`:

```ts
export interface MedidasResultado {
  novos: number;
  pulados: number;
}

export async function autopullMedidas(
  vaultRoot: string,
  agora: Date,
  desde: Date
): Promise<MedidasResultado>;
```

Logica:
1. `readRecords('Weight', ...)` + `readRecords('BodyFat', ...)` em paralelo.
2. **Pareamento por timestamp**: Weight e BodyFat geralmente vem juntos (mesma pesagem). Agrupar por janela ±5min.
3. Para cada par (ou item solo), verificar slug `medida-<data>-hc-<id>.md` ou similar — pular se existe.
4. `escreverMedida(vaultRoot, meta)` com:
```yaml
tipo: medida
data: 2026-05-22
autor: pessoa_a
peso: 72.5
gordura: 18.3       # opcional, se BodyFat pareado
fonte_hc_id: 'a1b2c3d4-...'
fonte_hc_origin: 'Mi Scale'
```

## API auxiliar

Estender `MedidaSchema` com `fonte_hc_id?: string`, `fonte_hc_origin?: string` opcionais.

## Escopo

### A. Investigacao

```bash
grep -c "readRecords" modules/health-connect/android/.../HealthConnectModule.kt  # >= 1
grep -n "escreverMedida" src/lib/vault/medidas.ts  # confirma writer
grep -c "fonte_hc_id" src/lib/schemas/medida.ts  # 0 antes
```

### B. Implementacao

1. `src/lib/schemas/medida.ts`: 2 campos opcionais.
2. `src/lib/health/autopullMedidas.ts` (novo).
3. `src/lib/health/scheduler.ts`: adicionar `medidas` no TIPOS_AUTOPULL.

### C. Testes

- `tests/lib/health/autopullMedidas.test.ts`: cenarios (peso solo, peso+gordura pareados, idempotencia).

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas/medida,vault/medidas,health/autopullMedidas}.ts`, scheduler.ts (entry), tests.

**Nao pode tocar:** outros schemas/writers, bridge nativa, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live: subir balanca inteligente, abrir Ouroboros, ver Medida no Vault.
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde.
3. Hash + build APK.
4. Live (opcional, requer balanca): medida-<data>-hc-<id>.md.

## Referencias

- HC Weight: https://developer.android.com/reference/androidx/health/connect/client/records/WeightRecord
- HC BodyFat: https://developer.android.com/reference/androidx/health/connect/client/records/BodyFatRecord
