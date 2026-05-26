# R-INT-3-HC-AUTOPULL-BACKGROUND — Autopull HC com app fechado (opt-in)

**Tipo:** feature (infra de background) — **GATE DE BUILD NATIVO**
**Prioridade:** P2
**Estimativa:** 1d (+ rebuild nativo)
**Fase:** 3
**Depende de:** R-INT-3-HC-AUTOPULL-WIRING (foreground ja entregue, `802927d`)

## Contexto

O autopull HC ja roda em foreground (boot + AppState 'active') via useEffect
`[hc-autopull]` em `app/_layout.tsx:283`, chamando
`orquestrarHCAutopull([puxadorPassos, puxadorExercicio, puxadorMedidas,
puxadorMenstruacao, puxadorSono])`. Esta sprint adiciona execucao com **app
fechado**, opt-in (custo de bateria).

## GATE DE BUILD NATIVO (ler antes)

`expo-task-manager` + a lib de background NAO estao instaladas (confirmado:
ausentes em `package.json`/`node_modules`). Background e codigo nativo →
`npx expo install` exige **rebuild do dev-client/APK** (nao pega via OTA/Metro).
Logo esta sprint NAO fecha so com bundle JS: a validacao live (Nivel B/C) aguarda
um dev-client novo com a lib compilada. O codigo JS pode ser escrito e o registro
deve ser **guarded/lazy** (no-op quando a lib nativa esta ausente, pra nao quebrar
o bundle/smoke atual).

**Decisao de lib:** usar **`expo-background-task`** (WorkManager, recomendado SDK
53+) — NAO `expo-background-fetch` (deprecada no SDK 53+). Justificar no commit.

## Objetivo / Escopo

1. `src/lib/health/autopullBackgroundTask.ts` (NOVO): define + registra a task
   de background que chama `orquestrarHCAutopull([...os 5 puxadores...])` (reuso —
   NAO reimplementar). Registro **guarded**: se o modulo nativo
   (`expo-task-manager`) nao estiver disponivel, no-op silencioso (mesma defesa do
   `requireOptionalNativeModule` da bridge HC).
2. `src/lib/stores/settings.ts`: toggle `featureToggles.hcAutopullBackground`
   (default `false`) + migracao em `mesclarDefaults` + cascata em `exportarVault`
   se aplicavel (espelhar tratamento de outros featureToggles).
3. `app/_layout.tsx`: registrar/desregistrar a task conforme o toggle (guarded;
   NAO tocar o useEffect foreground `[hc-autopull]` existente — adicionar bloco
   separado).
4. `app.json`: permissao Android de background (WorkManager) se exigida pela lib.

## OFF-LIMITS
- NAO modificar `autopullScheduler.ts`, os puxadores, nem o useEffect foreground.
- NAO instalar a lib sem marcar claramente que exige rebuild (reportar como achado).
- NAO tocar docs canonicos de raiz.

## Hipotese / Validacao ANTES (executor roda antes de codar)
```bash
grep -E "expo-task-manager|expo-background-task|expo-background-fetch" package.json   # esperado: ausente → instruir npx expo install + flag rebuild
grep -n "orquestrarHCAutopull" src/lib/health/autopullScheduler.ts                    # reuso
grep -n "hcAutopullBackground" src/lib/stores/settings.ts                             # esperado: ausente
grep -n "\[hc-autopull\]" app/_layout.tsx                                             # foreground existente (nao tocar)
```

## Acceptance
1. Toggle `hcAutopullBackground` (default false) em settings + migracao.
2. Registro da task guarded (no-op sem lib nativa) — bundle/smoke nao quebram.
3. Quando toggle on + lib presente, task registrada chama `orquestrarHCAutopull`.
4. `tsc --noEmit` + `check_anonimato` + `check_strings_ui_ptbr` + smoke verde.
5. E2E playwright do toggle na Tela 23 Settings.
6. Achado documentado: **exige build nativo novo** (dev-client/APK) p/ validacao live.

## Verificacao canonica
```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
```

## Referencias
- Foreground wiring: `app/_layout.tsx` useEffect `[hc-autopull]`.
- Scheduler: `src/lib/health/autopullScheduler.ts` (`orquestrarHCAutopull`).
- expo-background-task: https://docs.expo.dev/versions/latest/sdk/background-task/
