# R-INT-3-HC-AUTOPULL-SCHEDULER — Orquestrador unico que dispara puxadores HC diarios

**Tipo:** infra + feature (scheduler + observabilidade)
**Prioridade:** P1 (gate para as outras sprints autopull)
**Estimativa:** 0.5-1d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B (readRecords disponivel) + R-INT-3-HC-BRIDGE-NATIVA-D (sync.ts migrado)

## Contexto

Apos R-INT-3-HC-EMPIRICAL-FINDINGS, o Ouroboros tem acesso completo aos dados do Health Connect. Falta o flow inverso: puxar dados do HC e abastecer o Vault automaticamente, sem usuario precisar abrir o app.

Esta sprint cria o **orquestrador** que dispara 5 puxadores especializados (passos, exercicios, medidas, ciclo, sono) em cascata, com idempotencia (nao re-importa o mesmo dado), tracking do timestamp ultima sync e tolerancia a falha individual de cada tipo.

## Objetivo

Criar `src/lib/health/scheduler.ts` com 1 funcao publica:

```ts
export interface AutopullResultado {
  rodadoEm: string;            // ISO 8601 do disparo
  tipos: Array<{
    tipo: 'passos' | 'exercicio' | 'medidas' | 'menstruacao' | 'sono';
    novos: number;             // quantos itens novos persistidos no Vault
    erro: string | null;
  }>;
}

export async function executarAutopullHC(
  vaultRoot: string,
  agora: Date
): Promise<AutopullResultado>;
```

E disparo automatico via 1 dos 2 caminhos abaixo:

- **Foreground:** `app/_layout.tsx` ou `app/index.tsx` chama no useEffect uma vez por sessao (com cap de 1x por hora via SecureStore).
- **Background (futuro):** expo-task-manager + expo-background-fetch (fica como R-INT-3-HC-AUTOPULL-BACKGROUND nova sprint).

Esta sprint cobre **foreground** apenas.

## API auxiliar

`src/lib/health/scheduler.ts` exporta:

```ts
export const TIPOS_AUTOPULL = ['passos', 'exercicio', 'medidas', 'menstruacao', 'sono'] as const;
export type TipoAutopull = (typeof TIPOS_AUTOPULL)[number];

// Chave SecureStore: timestamp ultima execucao por tipo.
// Usado para janela "since last sync" (evita re-puxar tudo todo dia).
const KEY_ULTIMA_SYNC = 'ouroboros.hc.autopull.ultima-sync';

export interface UltimaSyncMap {
  [tipo in TipoAutopull]?: string;  // ISO 8601
}

export async function lerUltimaSync(): Promise<UltimaSyncMap>;
export async function gravarUltimaSync(map: UltimaSyncMap): Promise<void>;
```

## Escopo

### A. Investigacao obrigatoria

```bash
# Confirma sub-sprints HC ja entregues:
grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/.../HealthConnectModule.kt  # >= 1
grep -rn "ouroboros-health-connect" src/lib/health/  # >= 1 (migrado em D)

# Verifica padrao SecureStore existente:
grep -n "SecureStore.getItemAsync\|SecureStore.setItemAsync" src/lib/health/  # ok existir
```

### B. Implementacao

1. `src/lib/health/scheduler.ts` (novo, ~150 linhas):
   - `executarAutopullHC` orquestra: chama cada puxador, agrega resultado, atualiza UltimaSyncMap.
   - Each puxador eh chamado independentemente (Promise.allSettled, nao Promise.all) — falha de um nao impede outros.
   - Cap por tipo: nao puxa mais que 1000 records por execucao (proteçao contra primeira sync gigantesca).

2. `app/_layout.tsx` (modificar):
   - `useEffect` chama `executarAutopullHC` once on mount, gated por:
     - `useSettings.getState().featureToggles.healthConnectSync === true`
     - ultima execucao geral > 1h atras (anti-spam ao reabrir app)
   - Resultado emitido via toast: "Sincronizado: 12 passos, 3 medidas" (silencioso se 0).

3. Logging via `console.log('[hc-autopull]')` para debug live (logcat).

### C. Testes

- `tests/lib/health/scheduler.test.ts`: mocka puxadores individuais (TipoAutopull[]), valida orchestracao, agregacao, idempotencia (segunda chamada nao re-puxa se ultima < 1h).
- `tests/app/_layout-hc-autopull.test.tsx`: integracao com useEffect + featureToggle off (nao chama) + on (chama).

## OFF-LIMITS

**Pode tocar:** `src/lib/health/scheduler.ts` (novo), `app/_layout.tsx`, tests novos.

**Nao pode tocar:** puxadores individuais (sprints irmas R-INT-3-HC-AUTOPULL-{PASSOS,EXERCICIO,MEDIDAS,MENSTRUACAO,SLEEP}), bridge nativa (entregue B/C/D), schemas, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
# Validacao live: abrir Ouroboros logo apos novo registro HC (passos do dia),
# confirmar toast "Sincronizado" + arquivo MD novo no Vault.
```

## Proof-of-work

1. Lista de arquivos modificados.
2. `npx jest --silent | tail -5`.
3. Hash commit.
4. Live: criar passo manual no HC (Settings -> Health Connect -> Adicionar dados -> Steps), abrir Ouroboros, ver toast + arquivo `passos-YYYY-MM-DD.md` no Vault.

## Anti-debito

Background sync (mesmo com app fechado) fica como R-INT-3-HC-AUTOPULL-BACKGROUND-spec.md (sprint nova, futura — expo-task-manager + expo-background-fetch tem custo de bateria, decisao dono).

## Referencias

- Pattern scheduler simples: `src/lib/services/notifyRescheduler.ts` (M30 alarmes).
- AndroidX docs: https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data
