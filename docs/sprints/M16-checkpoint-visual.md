# Sprint M16 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (ac296b200ecaa5c81)
ORQUESTRADOR: Claude principal
DECISÃO: APROVADO
```

## Camada A — Agente executor (playwright headless)

5 screenshots:

- `A-01-toggle-off-aba-some.png` — 5 abas fixas (sem Alarmes) com toggle OFF
- `A-02-toggle-on-empty-state.png` — Aba "Alarmes" aparece (6ª) com empty state "Crie seu primeiro alarme." (sentence case, sem exclamação ADR-0005)
- `A-03-cadastro-novo.png` — Form completo: Título placeholder "Ex.: Medicação da manhã", Horário 08:00 mono, 7 chips dias semana (seg-sex selecionados purple), Categoria Medicação laranja, Som Suave ciano, Slider Soneca 5 min, Toggle Ativo
- `A-04-card-alarme-na-lista.png` — Input "Medicação da manhã" com borda purple ativa
- `A-05-modal-confirmar-exclusao.png` — Modal não capturável em Web (depende SAF). Registrado para Nível C

Acentuação 100% correta (Medicação, Soneca, Categoria, Suave).

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       740 passing (88 suites)  [+77 vs baseline 663]
smoke.sh:     OK
expo export:  ~8.3 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] Aba `/(tabs)/alarmes` substitui redirect-stub; pasta com Stack interno (index/novo/[slug])
- [ok] Schema `AlarmeSchema` exportado via barrel
- [ok] Helpers Vault (listarAlarmes, lerAlarme, escreverAlarme, excluirAlarme) exportados
- [ok] `alarmesPath` adicionado em `paths.ts` + `VAULT_FOLDERS.alarmes`
- [ok] Boot hook: `reagendarAlarmesHook` adicionado em `BOOT_HOOKS`
- [ok] Categoria `alarme` com action buttons (Soneca 5 min / Desligar) registrada em `notificationActions.ts` chamada em `app/_layout.tsx` no boot
- [ok] app.json: `SCHEDULE_EXACT_ALARM` + `USE_EXACT_ALARM` (Android 12+) + canal `alarmes`
- [ok] Consome `useSettings.featureToggles.alarmePessoal` (sem mudar shape)

## Decisões implementadas (spec §11)

- [ok] Sons CC0 gerados via ffmpeg sine wave (gentle 440Hz / normal 660Hz / forte 880Hz, 1.5s, PCM 16-bit). Tons puros = domínio público. CREDITS.md documenta
- [ok] Limite 64 schedules respeitado com toast informativo no 65º
- [ok] Snooze entrega na M16 via category com action buttons
- [ok] Permissão `SCHEDULE_EXACT_ALARM` declarada em app.json

## Achados colaterais

Nenhum.

## Decisão final

**APROVADO.** M16 entrega alarme opt-in completo com snooze + sons + permissão Android 12+.

**Próxima sprint executável:** [M17 — To-do leve opt-in com drag & drop](M17-spec.md).
