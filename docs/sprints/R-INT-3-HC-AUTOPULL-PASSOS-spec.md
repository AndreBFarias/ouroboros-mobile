# R-INT-3-HC-AUTOPULL-PASSOS — Puxar Steps do HC pro Vault automaticamente

**Tipo:** feature (puxador + writer canonico)
**Prioridade:** P1 (mais util — usuario tem pedometro 24/7)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B (readRecords) + R-INT-3-HC-AUTOPULL-SCHEDULER (orquestrador)

## Contexto

`StepsRecord` do HC tem `startTime`, `endTime`, `count`. Pode ter dezenas/centenas de records por dia (cada wearable agrega janelas diferentes). Sumarizar em 1 registro diario por familia no Vault: `passos-YYYY-MM-DD.md`.

## Objetivo

Criar `src/lib/health/autopullPassos.ts`:

```ts
export interface PassosResultado {
  novos: number;        // dias novos persistidos
  pulados: number;      // dias que ja existiam (idempotencia)
}

export async function autopullPassos(
  vaultRoot: string,
  agora: Date,
  desde: Date  // ultima sync (fallback: 30d atras)
): Promise<PassosResultado>;
```

Logica:
1. `readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: desde, endTime: agora } })`.
2. Agrupar por dia local (UTC-3).
3. Somar `count` por dia.
4. Para cada dia, verificar se `passos-YYYY-MM-DD.md` ja existe no Vault — pular se sim (sem sobrescrever).
5. Criar novo arquivo MD com frontmatter:
```yaml
tipo: passos
data: 2026-05-22
total: 8472
fonte_hc: true
sincronizado_em: 2026-05-22T20:30:00-03:00
```

## API auxiliar (schema novo)

`src/lib/schemas/passos.ts` (novo):
```ts
export const PassosSchema = z.object({
  tipo: z.literal('passos'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().int().nonnegative(),
  fonte_hc: z.boolean(),
  sincronizado_em: z.string(),  // ISO 8601
});
export type Passos = z.infer<typeof PassosSchema>;
```

Writer canonico `src/lib/vault/passos.ts` (novo): `escreverPassos(vaultRoot, meta): Promise<{uri, rel}>` + `listarPassos(vaultRoot, range)`.

## Consumer (UI)

Card "Importados HC" em `app/evolucao.tsx` ou `src/components/screens/EvolucaoScreen.tsx` (Q17.d ja tem `CardHCResumo` — extender pra mostrar passos 7d). Sub-sprint nao precisa modificar UI se Q17.d ja consome via `src/lib/health/resumo.ts`.

## Escopo

### A. Investigacao obrigatoria

```bash
grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/.../HealthConnectModule.kt  # >= 1
grep -rn "tipo: 'passos'\|PassosSchema" src/lib/schemas/  # esperado 0 antes do fix
ls src/lib/vault/passos.ts  # esperado nao existe antes do fix
```

### B. Implementacao

1. `src/lib/schemas/passos.ts` (novo) — PassosSchema + tipo.
2. `src/lib/vault/passos.ts` (novo) — `escreverPassos`, `listarPassos`, `paths`.
3. `src/lib/health/autopullPassos.ts` (novo) — orquestracao read HC -> aggregate by day -> writer.
4. `src/lib/health/scheduler.ts` (modificar — sprint sibling) — adicionar `passos` na lista despachada.

### C. Testes

- `tests/lib/health/autopullPassos.test.ts`: cenarios (1) sem records HC retorna {novos:0, pulados:0}, (2) records novos -> 1 arquivo MD por dia, (3) idempotencia: segunda chamada com mesmos records nao cria duplicata.
- `tests/lib/schemas/passos.test.ts`: parse/serialize PassosSchema.
- `tests/lib/vault/passos.test.ts`: escreverPassos + listarPassos.

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas,vault,health}/passos*.ts` (novos), `src/lib/health/scheduler.ts` (entry no array TIPOS_AUTOPULL), tests.

**Nao pode tocar:** outros schemas, outros writers, MainActivity, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
# Live: caminhar 100+ passos com celular, abrir Ouroboros, ver arquivo
# passos-YYYY-MM-DD.md no Vault com total correto.
```

## Proof-of-work

1. Lista arquivos.
2. `npx jest --silent | tail -5`.
3. Hash commit + build APK.
4. Live: arquivo MD novo no Vault.

## Referencias

- AndroidX Steps API: https://developer.android.com/reference/androidx/health/connect/client/records/StepsRecord
- Pattern writer + schema: `src/lib/{schemas,vault}/medida.ts` ou `tarefa.ts`.
