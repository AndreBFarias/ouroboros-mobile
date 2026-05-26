# R-INT-3-HC-BACKGROUND-DEFINETASK-SCOPE — Mover defineTask do autopull HC para escopo global do módulo

**Tipo**: fix
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Tranche**: R-INT (Onda 3P, autopull HC background)
**Fase**: 3 (depende de validação live)

## Fonte canônica

Achado da sessão 2026-05-25/26 (autopull HC background + upgrade SDK 56), registrado em
`Checkpoint.md` e `STATE.md` como "achado a verificar na validação live (não-bloqueante)".

`expo-background-task` (WorkManager no Android) acorda o app em background para rodar a
task registrada. O Expo recomenda que `TaskManager.defineTask` seja chamado no **escopo
global de um módulo carregado cedo** (top-level), antes de o app terminar de montar —
porque quando o SO reinicia o app só para executar a task, o JS roda do zero e o handler
precisa **já estar definido** no carregamento do módulo. Se o `defineTask` só roda dentro
de uma função acionada por `useEffect`, há uma janela em que o SO pode tentar executar a
task antes de o handler existir → a execução em background falha silenciosamente.

## Hipóteses técnicas

1. **`defineTask` não é top-level** — comprovado: em
   `src/lib/health/autopullBackgroundTask.ts`, `taskManager.defineTask(...)` está em
   `definirTask()` (linha ~92-95), que só é chamada por `registrarHCAutopullBackground()`
   (linha ~137), por sua vez acionada por um `useEffect` em `app/_layout.tsx` (bloco
   `hcAutopullBackground`). Logo, a task só é definida quando o app monta e o toggle
   está ON — não no carregamento do módulo.
2. **O require das libs é lazy/guarded** — `carregarTaskManager()`/`carregarBackgroundTask()`
   fazem `require('expo-task-manager')`/`require('expo-background-task')` em try/catch
   (no-op sem prebuild). O fix precisa preservar esse guard (Jest/web/Expo Go sem nativo
   não podem quebrar).
3. **A task reusa `orquestrarHCAutopull` com os 5 puxadores** — o handler em si está
   correto; só o *momento/escopo* da definição muda.

## APIs reutilizáveis

- `src/lib/health/autopullBackgroundTask.ts` — `carregarTaskManager`, `definirTask`,
  `HC_AUTOPULL_BACKGROUND_TASK`, o handler que chama `orquestrarHCAutopull`. **Reusar**;
  só reorganizar o ponto de chamada de `defineTask`.
- `app/_layout.tsx` — o import do módulo no boot path garante o carregamento cedo.

## Entregáveis

### Arquivos modificados

- `src/lib/health/autopullBackgroundTask.ts` — chamar `defineTask` no **escopo global do
  módulo** (top-level), guardado por `carregarTaskManager()` não-null (preserva no-op sem
  nativo). O handler lê o toggle `featureToggles.hcAutopullBackground` em runtime (já faz)
  — então definir cedo é seguro mesmo com o toggle OFF (vira no-op gracioso quando dispara).
  `registrarHCAutopullBackground`/`desregistrar` continuam controlando só o
  `registerTaskAsync`/`unregisterTaskAsync` (agendamento), não a definição.
- `app/_layout.tsx` — garantir que o módulo seja importado no topo do boot path (já é
  importado para `registrar/desregistrar`; confirmar que o import roda cedo, antes do
  primeiro frame). Se necessário, mover o import para um ponto carregado no boot.

### Testes

- Atualizar `tests/lib/health/autopullBackgroundTask.test.ts`: a task deve estar definível
  no import do módulo (com lib mockada presente) e no-op sem lib (mock lançante, padrão
  já adotado no SDK 56). Caso positivo (lib presente: `defineTask` chamado no load) +
  negativo (lib ausente: sem erro).

### Documentação

- [ ] `VALIDATOR_BRIEF.md` §4 — nota da armadilha (defineTask deve ser top-level no Expo
  background-task).
- [ ] `STATE.md` / `Checkpoint.md` — remover da lista de "achado a verificar".
- [ ] `docs/FEATURES-CANONICAS.md` — não aplicável (sem mudança de feature visível).

## Dependências

- **Bloqueia**: confiabilidade do autopull HC em background (feature opt-in
  `hcAutopullBackground`).
- **Bloqueado por**: idealmente validar junto de `R-INT-3-HC-LIVE-CHECKPOINT` (device) —
  o sintoma (task não dispara) só se confirma no runtime nativo.
- **Decisão pendente**: nenhuma.

## OFF-LIMITS

**Pode tocar**: `src/lib/health/autopullBackgroundTask.ts`, o import no `app/_layout.tsx`,
o teste, docs de estado.
**Não pode tocar**: `autopullScheduler.ts` e os puxadores (o handler reusa, não muda);
`package.json` (libs já instaladas); os outros useEffects do `_layout`.

## Restrições

- **Sem nativo em Jest/web** — preservar o guard lazy (no-op sem `expo-task-manager`).
- **Comentários sem acento**; **commit sem acento**; **TypeScript strict**.
- **Dead-code/no-op** em ambientes sem suporte mantido.

## Verificação canônica

```bash
./scripts/bootstrap-worktree.sh
npx tsc --noEmit
npm test --silent -- --testPathPattern="autopullBackgroundTask"
./scripts/smoke.sh
```

Validação real (device, junto de R-INT-3-HC-LIVE-CHECKPOINT): ligar o toggle
"Sincronizar em segundo plano", fechar o app, e confirmar no logcat
`[hc-autopull] background registrado` + a task disparar no intervalo (ou via
`adb shell cmd jobscheduler run -f com.ouroboros.mobile <id>`).

## Decisões herdadas

- **Toggle `hcAutopullBackground` default OFF** (opt-in, custo de bateria) — inalterado.
- **`defineTask` 1x por nome** (guard `taskDefinida`) — preservar ao mover para top-level.

## Proof-of-work

1. `git diff --name-only`.
2. `npx jest --silent -- --testPathPattern="autopullBackgroundTask" | tail -5`.
3. `./scripts/smoke.sh` (últimas 10 linhas).
4. Hash do commit + branch worktree.
5. Validação live (logcat) descrita no checkpoint do device.
6. Achados colaterais — sprint nova, sem fix inline silencioso.
