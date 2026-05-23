## R-INT-3-HC-AUTOPULL-SCHEDULER — Orquestrador puro (sem puxadores concretos)

**Tipo:** infra (lib pura TypeScript + tracking persistente)
**Prioridade:** P1 (gate para sprints B.2-B.6)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B (readRecords disponível) + R-INT-3-HC-BRIDGE-NATIVA-D (sync.ts migrado)
**Bloqueia:** R-INT-3-HC-AUTOPULL-{PASSOS,EXERCICIO,MEDIDAS,MENSTRUACAO,SLEEP} (cada uma implementa 1 Puxador concreto)

## Decisões registradas (do dono, 2026-05-22)

1. **Contrato puxadorscheduler bloqueado até puxadores existirem.** Esta sprint exporta apenas o orquestrador puro + tipo `Puxador<T>` canônico + helper de tracking. ZERO puxadores concretos. ZERO wiring em `_layout.tsx`. Wiring fica para sprint dedicada de integração (ou para a última puxador a entregar de B.2-B.6).
2. **Tracking ultimaSync vai em settings store (zustand persist).** Campo `hcAutopullUltimaSync` no `src/lib/stores/settings.ts`, persistido via middleware existente.
3. **Semântica de delta:** scheduler passa `since: ultimaSync[tipo]` ao puxador. Default 7 dias atrás se `null` (primeira sync). Cada puxador é responsável por chamar `readRecords` com `timeRangeFilter.startTime = since` e escrever no Vault.

Implicação: Fase B passa a ser **sequencial**, não paralela como o HANDOFF inicial sugeria.

## Contexto

Apos R-INT-3-HC-EMPIRICAL-FINDINGS, o Ouroboros tem acesso completo aos dados do Health Connect. Falta o flow inverso: puxar dados do HC e abastecer o Vault automaticamente.

Esta sprint cria o **orquestrador puro** que itera sobre uma lista de puxadores injetada externamente, chama cada um com `{since, pageSize}`, agrega resultados e atualiza tracking. NÃO chama nenhum puxador concreto — esses chegam em sprints irmãs.

## Objetivo

Entregar 3 peças canônicas:

1. **Orquestrador puro** em `src/lib/health/autopullScheduler.ts`:
   - Função `orquestrarHCAutopull(puxadores: Puxador[])` aceita array injetado.
   - Itera, chama `puxar({since, pageSize})` em cada puxador.
   - Agrega resultados, atualiza `hcAutopullUltimaSync[tipo]` no settings store em caso de sucesso.
   - Tolera falha individual (Promise.allSettled ou loop com try/catch).

2. **Tipos canônicos** exportados pelo mesmo arquivo:
   ```ts
   export type TipoHC =
     | 'Steps'
     | 'ExerciseSession'
     | 'Weight'
     | 'BodyFat'
     | 'HeartRate'
     | 'SleepSession'
     | 'MenstruationFlow';

   export interface Puxador<T = unknown> {
     tipo: TipoHC;
     puxar(opts: { since: string | null; pageSize: number }): Promise<{
       novos: number;
       erro: string | null;
     }>;
   }

   export interface OrquestrarHCAutopullResult {
     rodadoEm: string;            // ISO 8601 do disparo
     tipos: Array<{
       tipo: TipoHC;
       novos: number;
       erro: string | null;
     }>;
   }

   export async function orquestrarHCAutopull(
     puxadores: Puxador[]
   ): Promise<OrquestrarHCAutopullResult>;
   ```

3. **Tracking persistente** em `src/lib/stores/settings.ts`:
   ```ts
   hcAutopullUltimaSync: Record<TipoHC, string | null>;
   setHCAutopullUltimaSync(tipo: TipoHC, iso: string): void;
   ```
   Persistido automaticamente via middleware zustand persist existente. Default inicial: todos os tipos com `null`.

## Escopo / Entregáveis

### Arquivos a CRIAR

- `src/lib/health/autopullScheduler.ts` (~100L)
  - Exporta `TipoHC`, `Puxador<T>`, `OrquestrarHCAutopullResult`, `orquestrarHCAutopull`.
  - Lê `useSettings.getState().hcAutopullUltimaSync` para montar `since`.
  - Default `since`: ISO de `Date.now() - 7 * 24 * 60 * 60 * 1000` se `null`.
  - `pageSize` fixo em 1000 (cap por execução por tipo — proteção contra primeira sync gigantesca).
  - Em sucesso (`erro === null`): chama `setHCAutopullUltimaSync(tipo, new Date().toISOString())`.
  - Em erro: NÃO atualiza ultimaSync (preserva ponto de retomada).
  - Iteração tolerante: 1 puxador falhar não impede outros (Promise.allSettled ou for-of com try/catch).
  - Logging via `console.log('[hc-autopull]', ...)` para debug live (logcat).

- `tests/lib/health/autopullScheduler.test.ts` (~50L)
  - Mocka `Puxador[]` com fakes determinísticos.
  - 5+ cenários cobertos:
    1. 3 puxadores OK → todos novos > 0, todos erro null, 3 chamadas a `setHCAutopullUltimaSync`.
    2. 1 puxador erro + 2 OK → resultado parcial agregado, ultimaSync atualizada só para os 2 OK.
    3. Primeira sync (ultimaSync[tipo] === null) → `since` passado é ~7d atrás.
    4. Sync subsequente (ultimaSync[tipo] === ISO recente) → `since` passado é o ISO armazenado.
    5. Cap pageSize: cada puxador recebe `pageSize: 1000`.

### Arquivos a MODIFICAR

- `src/lib/stores/settings.ts` (~+30L)
  - Adicionar campo `hcAutopullUltimaSync: Record<TipoHC, string | null>` ao state.
  - Default inicial: objeto com os 7 tipos preenchidos com `null`.
  - Adicionar setter `setHCAutopullUltimaSync(tipo: TipoHC, iso: string)`.
  - Importar `TipoHC` de `src/lib/health/autopullScheduler.ts` (ou redeclarar — verificar ciclo de import; preferir extrair tipo para `src/lib/health/tipos.ts` se houver ciclo).
  - Garantir que o campo entra no `partialize` do persist middleware.

### Investigação obrigatória (antes de codar)

```bash
# Confirma settings store existe e tem persist middleware:
grep -n "persist\|partialize" src/lib/stores/settings.ts  # >= 1

# Confirma padrao zustand existente:
grep -n "create<.*>()\|create(" src/lib/stores/settings.ts  # >= 1

# Verifica se há ciclo de import potencial entre health/ e stores/:
grep -rn "from.*stores/settings" src/lib/health/  # idealmente vazio

# Confirma sub-sprints HC ja entregues (pré-requisito):
grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/src/main/java/expo/modules/healthconnect/HealthConnectModule.kt  # >= 1
```

## OFF-LIMITS (inegociável)

- **NÃO** implemente puxadores concretos. Sprints irmãs B.2-B.6 fazem isso.
- **NÃO** toque `modules/health-connect/` (bridge nativa já entregue).
- **NÃO** toque schemas de passos/treino_sessao/medidas/registro_ciclo/sono.
- **NÃO** toque `app/_layout.tsx` (wiring fica para sprint futura — provavelmente a última de B.2-B.6 ou nova sprint de integração).
- **NÃO** toque `CLAUDE.md` / `ROADMAP.md` / `STATE.md` / `VALIDATOR_BRIEF.md` / `Checkpoint.md`.
- **NÃO** crie helpers de SecureStore — tracking vai em settings store (decisão 2).

## Aritmética prometida

- 1 arquivo novo (`autopullScheduler.ts`): ~100L
- 1 arquivo modificado (`settings.ts`): ~+30L
- 1 teste novo (`autopullScheduler.test.ts`): ~50L
- (opcional) 1 arquivo `tipos.ts` se houver ciclo de import: ~15L
- **Total: ~180L em 3-4 arquivos**

## Proof-of-work esperado

1. Tipos TS bem definidos e exportados:
   - `TipoHC` union de 7 valores literais.
   - `Puxador<T>` interface com `tipo` + `puxar({since, pageSize})`.
   - `OrquestrarHCAutopullResult` com `rodadoEm` ISO + array `tipos`.

2. Função `orquestrarHCAutopull(puxadores)`:
   - Aceita `Puxador[]` (não cria os puxadores).
   - Para cada puxador: lê `hcAutopullUltimaSync[puxador.tipo]` do settings store, monta `since` (ou default 7d), chama `puxar({since, pageSize: 1000})`.
   - Agrega `{tipo, novos, erro}` em array.
   - Em sucesso: `setHCAutopullUltimaSync(tipo, new Date().toISOString())`.
   - Em erro: preserva ultimaSync anterior (ponto de retomada).
   - Erro de 1 puxador NÃO interrompe os outros.

3. Settings store:
   - Campo `hcAutopullUltimaSync: Record<TipoHC, string | null>` no state.
   - Setter `setHCAutopullUltimaSync` atualiza imutavelmente.
   - Campo entra no persist (`partialize` se aplicável).

4. Testes Jest (5+ cenários listados acima) passando.

5. `npx tsc --noEmit` exit 0.

## Cuidado runtime

Esta sprint NÃO toca runtime nativo. É lib TypeScript pura + state store.

- **A22 (worklets shared):** não aplicável — sem reanimated aqui.
- **A25 (metro require resolution):** não aplicável — sem mudanças em `metro.config.js`.
- **A30/A31 (HC bridge):** não aplicável — bridge entregue em sub-sprints anteriores.

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest tests/lib/health/autopullScheduler.test.ts --silent 2>&1 | grep "Tests:" | tail -1; done
```

## Anti-débito

- **Wiring `_layout.tsx`:** ficou fora de escopo desta sprint. Registrar como `R-INT-3-HC-AUTOPULL-WIRING-spec.md` (sprint nova, dispatcha após B.2-B.6 fecharem).
- **Background sync (app fechado):** continua como `R-INT-3-HC-AUTOPULL-BACKGROUND-spec.md` (sprint nova, futura — expo-task-manager + expo-background-fetch, custo de bateria, decisão dono).
- **Idempotência fina por record ID:** responsabilidade dos puxadores concretos (B.2-B.6), não do scheduler. Scheduler só passa `since` e confia no puxador.

## Referências

- Pattern scheduler simples: `src/lib/services/notifyRescheduler.ts` (M30 alarmes).
- Settings store atual: `src/lib/stores/settings.ts` (zustand + persist + partialize).
- AndroidX HC docs: https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data
