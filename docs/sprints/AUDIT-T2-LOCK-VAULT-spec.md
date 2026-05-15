# AUDIT-T2-LOCK-VAULT — Eliminar race read-then-write em saves do vault

> Sprint derivada da auditoria 2026-05-15 (bug B7 descopado de T1).
> Severidade: ALTA — corrupção silenciosa em uso multi-device com
> Syncthing. **Opção A decidida** após T1B6 fechado.

## 1. Objetivo

Eliminar o padrão **read-then-write** em saves do vault que pode
gerar conflito Syncthing silencioso quando dois devices capturam
no mesmo segundo. O caso canônico está em
`src/lib/humor/saveHumor.ts:52–73` (`resolvePath`) e se repete em
≥8 callers de `save*`.

## 2. Estratégia — Opção A (decidida)

**Sempre escrever com `-<deviceId>` desde o início.** Remove a
decisão dinâmica entre nome canônico e suffix. Todo registro sempre
tem o sufixo do device que escreveu. Listadores agregam por dia/feature
ignorando o sufixo.

**Prós**: zero race condition. Determinismo total. Layout previsível.
**Contras**: muda layout dos arquivos no vault — exige migration
de registros legados (boot hook idempotente).

**Por que A e não B (lock file)**: lock-file em filesystem é frágil
(crashes deixam órfãos, requer cleanup, falsos negativos por
permissão). Opção A elimina a corrida estruturalmente.

## 3. Entregáveis

### 3.1 Util novo

**Arquivo**: `src/lib/util/deviceId.ts`

Adicionar função:

```ts
/**
 * Garante que o path relativo tenha o suffix de deviceId antes da
 * extensão. Idempotente: se já tem o suffix do mesmo deviceId,
 * retorna inalterado. Se tem suffix de OUTRO deviceId, lança erro
 * (caller precisa saber que está sobrescrevendo arquivo de outro
 * device, o que nunca deve acontecer em fluxo normal).
 *
 * Exemplos:
 *   forceDeviceIdSuffix('markdown/humor-2026-05-15.md', 'a4b2')
 *     -> 'markdown/humor-2026-05-15-a4b2.md'
 *   forceDeviceIdSuffix('markdown/humor-2026-05-15-a4b2.md', 'a4b2')
 *     -> 'markdown/humor-2026-05-15-a4b2.md' (inalterado)
 */
export function forceDeviceIdSuffix(
  rel: string,
  deviceId: string
): string;
```

Compartilhar regex/parser canônico com `applyDeviceIdSuffix`
existente (M38) — mas semântica diferente: A sempre aplica, M38
era condicional.

**Testes**: `tests/lib/util/deviceId-forceSuffix.test.ts` cobrindo
idempotência, sufixo de outro device (erro), edge cases (path sem
extensão, path multi-segmento).

### 3.2 Refactor de callers de `save*`

Para cada um dos arquivos abaixo, trocar a chamada de `resolvePath`
+ `applyDeviceIdSuffix` condicional por `forceDeviceIdSuffix` sempre.
Remover a função `resolvePath` quando ela só servia para essa decisão.

Arquivos a auditar e modificar:

1. **`src/lib/humor/saveHumor.ts`**: deletar `resolvePath` (linhas
   46–73), trocar uso por `forceDeviceIdSuffix` direto. O campo
   `conflito: boolean` em `SaveHumorResult` perde sentido — manter
   como deprecated (sempre `false`) ou remover (preferência:
   remover, ajustar callers de `saveHumor`).
2. **`src/lib/diario/saveDiario.ts`**
3. **`src/lib/eventos/saveEvento.ts`**
4. **`src/lib/marcos/saveMarco.ts`**
5. **`src/lib/medidas/saveMedida.ts`** (verificar se tem padrão)
6. **`src/lib/ciclo/saveRegistroCiclo.ts`** (verificar)
7. **`src/lib/contadores/saveContador.ts`** (verificar)
8. **`src/lib/tarefas/saveTarefa.ts`** (verificar)
9. **`src/lib/alarmes/saveAlarme.ts`** (verificar)

**Importante**: usar `grep -RIn "applyDeviceIdSuffix\|resolvePath" src/`
para mapear TODOS os callers antes de começar. Reportar mapa antes/depois.

### 3.3 Listadores: agregação por dia ignorando suffix

Verificar que `listarHumor`, `listarDiario`, etc. já parseiam o
filename via prefix+date+optionalSuffix (M38 já implementou esse
parser). Auditar:

- `src/lib/vault/humor.ts`
- `src/lib/vault/diario.ts`
- `src/lib/vault/eventos.ts`
- `src/lib/vault/marcos.ts`
- Demais listadores correspondentes aos saves acima.

Cada listagem que mostra "humor de hoje" precisa retornar **2
arquivos quando há 2 devices**, não 1 substituído. Verificar com
testes de regressão.

### 3.4 Migration boot

**Arquivo novo**: `src/lib/boot/migrarArquivosCanonicosParaDeviceId.ts`

- Lê pasta `markdown/` (canônica pós-V4.0.2).
- Para cada arquivo `<prefix>-<YYYY-MM-DD>.md` sem suffix de device,
  renomeia para `<prefix>-<YYYY-MM-DD>-<deviceIdAtual>.md`.
- Idempotente: se já tem suffix de device, pula.
- Roda 1× e marca em `useSettings.migrations.t2DeviceIdSuffix = true`.

Adicionar ao boot hook canônico (`src/lib/boot/index.ts` ou onde
estiverem os outros migrations).

**Teste**: `tests/lib/boot/migrarArquivosCanonicosParaDeviceId.test.ts`
cobrindo:
- Arquivo sem suffix → renomeia.
- Arquivo com suffix → ignora.
- Arquivo `.sync-conflict-*` → ignora (preserva filtro T1B6).
- Migration roda 1× (flag).

## 4. OFF-LIMITS

Não toque:
- CLAUDE.md, STATE.md, ROADMAP.md, CHANGELOG.md, HOW_TO_RESUME.md,
  VALIDATOR_BRIEF.md
- docs/CONTEXTO.md, docs/BRIEFING.md, docs/FEATURES-CANONICAS.md
- docs/ADRs/* (nenhum ADR novo nesta sprint)
- docs/sprints/*-spec.md exceto esta
- `.gitignore`, `.github/workflows/*`, `app.json`, `eas.json`,
  `package.json`, `scripts/*`, `hooks/*`

**Adicional**: cuidado em `src/lib/util/deviceId.ts` (canônico desde
M38) — não remover `applyDeviceIdSuffix` (pode haver callers fora
dos saves auditados; manter como legado e marcar `@deprecated` em
comentário).

## 5. Verificação

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
./scripts/test_contract_drift.sh
npx tsc --noEmit
npx jest --silent | tail -5
./scripts/smoke.sh
```

Esperado: ≥1995 testes verde (3-5 testes novos: util forceSuffix,
migration boot, regressão saves multi-device).

## 6. Commit (único — refactor coeso)

```
fix: t2-lock-vault sempre suffix deviceid em saves + migration boot canonicos
```

**FAÇA O COMMIT no final, sem perguntar autorização.** Você tem
autorização explícita do maestro.

## 7. Cenários de pause/rejeição

- Se a contagem de callers `resolvePath`/`applyDeviceIdSuffix` for
  > 12 (estimativa: 8–9), **pause** e reporte — pode ter caller
  esquecido no mapeamento original.
- Se algum teste existente de listagem quebrar e a causa não for
  trivial (mock, fixture), **pause** e reporte com o teste
  específico antes de mudar a lógica de listagem.
- Se `tests/lib/util/deviceId-*.test.ts` existir com nome similar,
  **pause** — pode estar testando comportamento M38 que mudou.

## 8. Proof-of-work

1. Lista de arquivos modificados/criados (path absoluto).
2. Mapa antes/depois de callers de `applyDeviceIdSuffix` e
   `resolvePath` (grep).
3. Saída literal `npx jest --silent | tail -5`.
4. Saída `./scripts/smoke.sh`.
5. **Hash do commit (OBRIGATÓRIO)**.
6. Path do worktree + branch.
7. Confirmação que campo `conflito` em `SaveHumorResult` (e similares)
   foi removido ou marcado deprecated, com justificativa.
8. Achados colaterais (se houver caller esquecido — reportar).

## 9. Decisões tomadas

- **Opção A**: sempre escrever com `-<deviceId>`.
- **Migration boot idempotente**: rodar 1× por instalação; flag em
  `useSettings.migrations.t2DeviceIdSuffix`.
- **Campo `conflito` removido** dos returns de `save*` — ele perde
  sentido. Callers que usavam para mostrar aviso "outro device
  registrou" não terão mais a info, mas isso é correto: não há
  conflito agora.
- **Pré-requisito**: B6 (sync-conflict filter) já mergeado em
  `0d95b9a`. T1B6 (migration filter) em `a49222f`.
- **`applyDeviceIdSuffix` permanece** como legado deprecated em
  `deviceId.ts` — pode haver callers fora dos saves auditados.
