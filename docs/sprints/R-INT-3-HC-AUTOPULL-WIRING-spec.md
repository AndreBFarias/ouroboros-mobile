## R-INT-3-HC-AUTOPULL-WIRING — Wiring boot path do autopull HC

**Tipo:** integração (wiring boot path em `app/_layout.tsx`)
**Prioridade:** P1 (bloqueia release v1.0.0 — sem este wiring, todo trabalho de Fase B fica em código morto)
**Estimativa:** 0.5h (30min) após puxadores existirem
**Fase:** 3 (Onda HC autopull)
**Depende de:** R-INT-3-HC-AUTOPULL-SCHEDULER (já entregue) + TODOS os 5 puxadores B.2-B.6 (PASSOS já entregue; EXERCICIO/MEDIDAS/MENSTRUACAO/SLEEP pendentes)
**Bloqueia:** release v1.0.0

## Origem

Sprint dedicada de wiring que liga `orquestrarHCAutopull` aos puxadores no boot path. Foi mencionada pelo planejador SCHEDULER (Fase B.1, seção Anti-débito), executor SCHEDULER, executor PASSOS e validador PASSOS, mas NUNCA virou spec — falha de processo detectada em 2026-05-22. Sem este wiring, o SCHEDULER + 5 puxadores são código morto (nenhum caller no boot path).

Decisão registrada no spec do SCHEDULER (linha 183 do `R-INT-3-HC-AUTOPULL-SCHEDULER-spec.md`):
> "Wiring `_layout.tsx`: ficou fora de escopo desta sprint. Registrar como `R-INT-3-HC-AUTOPULL-WIRING-spec.md` (sprint nova, dispatcha após B.2-B.6 fecharem)."

## Contexto

Após Fase B.1 (SCHEDULER) + B.2-B.6 (5 puxadores concretos), faltava o glue que dispara `orquestrarHCAutopull([puxadorPassos, puxadorExercicio, puxadorMedidas, puxadorMenstruacao, puxadorSono])` no boot path do app. Este wiring deve:

1. Disparar **após mount** (idealmente após `appPronto`, mesma janela usada pelo `migrarEstadoParaVault` e `avaliarBackupAutomatico`).
2. Disparar **após app voltar do background** (transição `AppState` para `'active'`), porque o usuário pode ter coletado dados no HC enquanto o Ouroboros estava em background.
3. Respeitar **toggle**: ler `useSettings.getState().featureToggles.healthConnectSync`. Se `false`, NÃO dispara nenhuma chamada — sequer toca a bridge nativa.
4. Aplicar **throttle**: rodar no máximo 1× a cada 60min, calculado via `min(hcAutopullUltimaSync[tipo])` no settings store. Evita martelar o HC a cada foreground rápido.
5. Logar resultado (`totalNovos` + `totalErros` agregados) via `console.log('[hc-autopull]', ...)` — mesmo prefix já usado pelo scheduler.

## Objetivo

Entregar 1 useEffect novo em `app/_layout.tsx` (modelo igual aos useEffects de `migrarEstadoParaVault` e `avaliarBackupAutomatico` que já existem nas linhas 202-223) que:

- Importa `orquestrarHCAutopull` de `@/lib/health/autopullScheduler` + as 5 instâncias `puxador{Passos,Exercicio,Medidas,Menstruacao,Sleep}` dos respectivos módulos em `src/lib/health/puxadores/`.
- Roda após `appPronto === true` (gating já existente, decisão CONTRACT 7.9).
- Roda após `AppState` voltar para `'active'` (assinatura `AppState.addEventListener('change', ...)` — padrão já usado em `src/lib/vault/permissions.ts:176`).
- Lê toggle `useSettings.getState().featureToggles.healthConnectSync`. Se `false`, early return (no-op).
- Calcula throttle: lê `useSettings.getState().hcAutopullUltimaSync` (`Record<TipoHC, string | null>`), pega `min` dos valores não-nulos e compara com `Date.now() - 60min`. Se algum tipo nunca sincronizou (todos `null`), permite disparar (primeira sync).
- Chama `orquestrarHCAutopull([puxadorPassos, puxadorExercicio, puxadorMedidas, puxadorMenstruacao, puxadorSono])` fire-and-forget (`void`).
- Loga `{rodadoEm, totalNovos, totalErros}` ao concluir.

## Escopo / Entregáveis

### Arquivos a MODIFICAR

- `app/_layout.tsx` (~+40-50L; estrutura: 1 useEffect novo + bloco de imports + helper de throttle inline)
  - **Imports a adicionar (top do arquivo, perto dos outros health imports na linha 26):**
    ```ts
    import { orquestrarHCAutopull } from '@/lib/health/autopullScheduler';
    import { puxadorPassos } from '@/lib/health/puxadores/passos';
    import { puxadorExercicio } from '@/lib/health/puxadores/exercicio';
    import { puxadorMedidas } from '@/lib/health/puxadores/medidas';
    import { puxadorMenstruacao } from '@/lib/health/puxadores/menstruacao';
    import { puxadorSono } from '@/lib/health/puxadores/sleep';
    import { AppState } from 'react-native'; // já importado? grep antes
    import { useSettings } from '@/lib/stores/settings';
    ```
  - **useEffect novo (inserir logo após o useEffect de `avaliarBackupAutomatico`, ~linha 224):**
    Modelo aproximado (executor adapta para casar com estilo do arquivo):
    ```ts
    // R-INT-3-HC-AUTOPULL-WIRING (2026-05-22): dispara autopull do HC
    // no boot apos appPronto e a cada foreground. Respeita toggle
    // featureToggles.healthConnectSync e throttle de 60min via
    // hcAutopullUltimaSync. Fire-and-forget: não bloqueia render.
    useEffect(() => {
      if (!appPronto) return;

      const THROTTLE_MS = 60 * 60 * 1000;
      const puxadores = [
        puxadorPassos,
        puxadorExercicio,
        puxadorMedidas,
        puxadorMenstruacao,
        puxadorSono,
      ];

      function podeDisparar(): boolean {
        const s = useSettings.getState();
        if (!s.featureToggles.healthConnectSync) return false;
        const ultimas = Object.values(s.hcAutopullUltimaSync).filter(
          (v): v is string => typeof v === 'string'
        );
        if (ultimas.length === 0) return true; // primeira sync
        const maisAntigo = Math.min(
          ...ultimas.map((iso) => new Date(iso).getTime())
        );
        return Date.now() - maisAntigo >= THROTTLE_MS;
      }

      async function disparar(): Promise<void> {
        if (!podeDisparar()) return;
        try {
          const r = await orquestrarHCAutopull(puxadores);
          const totalNovos = r.tipos.reduce((acc, t) => acc + t.novos, 0);
          const totalErros = r.tipos.filter((t) => t.erro !== null).length;
          console.log('[hc-autopull]', 'wiring boot/foreground', {
            rodadoEm: r.rodadoEm,
            totalNovos,
            totalErros,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log('[hc-autopull]', 'wiring erro', msg);
        }
      }

      // Disparo 1: boot apos appPronto.
      void disparar();

      // Disparo 2: cada vez que app volta para 'active'.
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void disparar();
      });

      return () => {
        sub.remove();
      };
    }, [appPronto]);
    ```

### Arquivos a CRIAR

Nenhum (sprint é puramente wiring).

### Investigação obrigatória (antes de codar)

```bash
# Confirma que SCHEDULER existe e exporta orquestrarHCAutopull:
grep -n "export async function orquestrarHCAutopull" src/lib/health/autopullScheduler.ts  # >= 1

# Confirma que os 5 puxadores existem e exportam a const correta:
test -f src/lib/health/puxadores/passos.ts && grep -n "export const puxadorPassos" src/lib/health/puxadores/passos.ts
test -f src/lib/health/puxadores/exercicio.ts && grep -n "export const puxadorExercicio" src/lib/health/puxadores/exercicio.ts
test -f src/lib/health/puxadores/medidas.ts && grep -n "export const puxadorMedidas" src/lib/health/puxadores/medidas.ts
test -f src/lib/health/puxadores/menstruacao.ts && grep -n "export const puxadorMenstruacao" src/lib/health/puxadores/menstruacao.ts
test -f src/lib/health/puxadores/sleep.ts && grep -n "export const puxadorSono" src/lib/health/puxadores/sleep.ts

# Se algum puxador faltar, sprint NÃO PODE EXECUTAR. Erro imediato.

# Confirma toggle existe no settings store:
grep -n "healthConnectSync" src/lib/stores/settings.ts  # >= 1

# Confirma tracking ultimaSync existe:
grep -n "hcAutopullUltimaSync\|setHCAutopullUltimaSync" src/lib/stores/settings.ts  # >= 3

# Confirma AppState ja eh importado em _layout.tsx (ou não):
grep -n "AppState" app/_layout.tsx  # 0 = adicionar import; >=1 = ja existe

# Confirma appPronto disponivel em _layout.tsx:
grep -n "appPronto\|useAppPronto\|useBootStatus" app/_layout.tsx  # >= 1
```

## OFF-LIMITS (inegociável)

- **NÃO** toque `src/lib/health/autopullScheduler.ts` (orquestrador puro entregue).
- **NÃO** toque nenhum puxador em `src/lib/health/puxadores/*.ts`.
- **NÃO** toque `modules/health-connect/` (bridge nativa entregue).
- **NÃO** toque `src/lib/stores/settings.ts` (tracking + toggle já existentes).
- **NÃO** crie helpers em arquivos novos — o throttle inline está intencional (lógica trivial, ~10L, não justifica arquivo dedicado).
- **NÃO** toque `CLAUDE.md` / `ROADMAP.md` / `STATE.md` / `VALIDATOR_BRIEF.md` / `Checkpoint.md`.
- **NÃO** introduza background fetch (app fechado) — isso é sprint futura separada `R-INT-3-HC-AUTOPULL-BACKGROUND-spec.md` (custo de bateria, decisão dono).
- **NÃO** modifique nenhum `featureToggles.*` default. Se `healthConnectSync` está `false` por default no `settings.ts` (linha 185 confirmou que sim), wiring respeita silenciosamente — usuário liga via tela Settings.
- **NÃO** toque outros useEffects em `_layout.tsx` (`migrarEstadoParaVault`, `avaliarBackupAutomatico`, `OnboardingGuard`, etc.) — mudança cirúrgica.

## Acceptance criteria

1. `app/_layout.tsx` contém useEffect que chama `orquestrarHCAutopull([puxadorPassos, puxadorExercicio, puxadorMedidas, puxadorMenstruacao, puxadorSono])`.
2. Disparo ocorre apenas quando `appPronto === true` (gate de boot).
3. Disparo ocorre também a cada transição `AppState` para `'active'` (foreground).
4. Toggle `featureToggles.healthConnectSync === false` faz early return (no-op total).
5. Throttle de 60min via `min(hcAutopullUltimaSync)` — se última sync < 60min atrás, no-op.
6. Erros internos do `orquestrarHCAutopull` são logados via `console.log('[hc-autopull]', ...)`, não propagam para crash.
7. Cleanup do useEffect remove o listener de AppState (sem leak).
8. Os 5 imports novos resolvem corretamente (sem erro TS).
9. `npx tsc --noEmit` exit 0.
10. `./scripts/smoke.sh` verde (Jest passa, sem regressão).

## Aritmética prometida

- 1 arquivo modificado (`app/_layout.tsx`).
- Estado atual: 627L (`wc -l` confirmou).
- Imports adicionados: ~8L (7 imports + 1 linha em branco se aplicável).
- useEffect novo: ~45L (incluindo comentário-cabeçalho de 4 linhas, helper `podeDisparar`, helper `disparar`, useEffect body).
- **Projetado após mudança: 627 + ~53 = ~680L.**
- **Meta:** nenhuma meta numérica de linhas máxima (arquivo já é grande; sprint não introduz regressão de tamanho relevante; <100L de delta).

## Proof-of-work esperado

1. **Diff final** mostrando exatamente os 7 imports novos + 1 useEffect novo + nada mais.
2. **Verificações grep:**
   ```bash
   rg "orquestrarHCAutopull" app/_layout.tsx  # >= 1
   rg "puxadorPassos|puxadorExercicio|puxadorMedidas|puxadorMenstruacao|puxadorSono" app/_layout.tsx  # >= 5 (1 por puxador)
   rg "featureToggles.healthConnectSync" app/_layout.tsx  # >= 1
   rg "AppState.addEventListener" app/_layout.tsx  # >= 1
   rg "\[hc-autopull\]" app/_layout.tsx  # >= 1
   ```
3. **Hipótese verificada (lição 4):** todos os identificadores citados acima existem em arquivos do projeto antes de codar; executor confirma via grep durante investigação.
4. **Runtime real:**
   - `./scripts/check_anonimato.sh` exit 0.
   - `python3 scripts/check_strings_ui_ptbr.py` exit 0.
   - `npx tsc --noEmit` exit 0.
   - `./scripts/smoke.sh` verde (1126/130 baseline preservado).
5. **Validação live opcional (Nível C — celular físico):** dev-client com toggle `healthConnectSync=true`, logcat filtrado por `[hc-autopull]` mostra:
   - 1 linha após boot (`'wiring boot/foreground'`).
   - 1 linha por foreground (mata, abre, mata, abre).
   - Throttle: se reabrir <60min depois, nenhuma linha nova (corretamente bloqueado).
   - Toggle OFF: zero linhas.
   - Esta validação é **opcional** (sprint não exige checkpoint nível C — wiring trivial). Mas se executor tem device em mãos, anexa o snippet logcat ao PR.

## Cuidado runtime

- **A30/A31 (HC bridge):** wiring consome bridge entregue; não toca nativo.
- **A26 (useEffect cleanup):** obrigatório retornar `() => sub.remove()` para evitar leak de listener.
- **Boot timing (CONTRACT 7.9):** wiring usa `appPronto` como gate, mesma janela que outros useEffects (linhas 202, 217 do `_layout.tsx`).
- **AppState em web:** `AppState.addEventListener` no React Native Web funciona (no-op em browsers), seguro deixar sem guard `Platform.OS`. Mas wiring inteiro vira no-op em web porque `featureToggles.healthConnectSync` controla, e em web a sync HC é irrelevante.
- **Promise.allSettled (interno ao scheduler):** já implementado; wiring só consome.
- **Side effect em boot:** fire-and-forget intencional (`void disparar()`). Se demorar minutos, não bloqueia UI.

## Testes

Sprint não adiciona testes Jest novos. Motivo: wiring de 1 useEffect em `_layout.tsx` é difícil de testar isoladamente (mock de `AppState`, `useSettings`, 5 puxadores, scheduler) e o valor de cobertura é baixo. O risco está coberto por:

1. **Testes do SCHEDULER** (R-INT-3-HC-AUTOPULL-SCHEDULER): garantem que `orquestrarHCAutopull` funciona com array injetado.
2. **Testes dos puxadores** (B.2-B.6, cada um com sua bateria): garantem que cada puxador respeita contrato `Puxador`.
3. **Verificação manual via logcat** no checkpoint live opcional (descrito acima).

Baseline Jest: 1126 testes / 130 suites verde (estado em HEAD `86df505`). Esperado pós-sprint: **mesma baseline** (zero teste novo, zero teste removido).

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
rg "orquestrarHCAutopull" app/_layout.tsx
rg "puxador(Passos|Exercicio|Medidas|Menstruacao|Sleep)" app/_layout.tsx
rg "featureToggles\.healthConnectSync" app/_layout.tsx
rg "AppState\.addEventListener" app/_layout.tsx
```

Todos os comandos devem sair com exit 0 e os greps devem retornar >= 1 match.

## Riscos e não-objetivos

- **Não-objetivo 1:** background sync (app totalmente fechado). Fica como sprint nova futura `R-INT-3-HC-AUTOPULL-BACKGROUND-spec.md` (expo-task-manager + expo-background-fetch, custo de bateria, decisão do dono).
- **Não-objetivo 2:** UI de "sync agora" no Settings (botão manual). Sprint separada se demandada.
- **Não-objetivo 3:** telemetria de sync (histórico de execuções, contagem total). Sprint separada se demandada.
- **Risco baixo:** AppState pode disparar `'active'` muitas vezes em sucessão rápida (lock screen → unlock conta como mudança em alguns OEMs). Mitigação: throttle de 60min cobre. Sem throttle, seria spam — por isso o throttle é parte do acceptance criteria.
- **Risco baixo:** wiring antes dos 4 puxadores faltantes existirem causa erro TS imediato. Mitigação: a investigação obrigatória (`test -f ... && grep -n ...`) bloqueia execução se algum puxador faltar — sprint só pode executar quando B.2-B.6 fecharem 100%.

## Anti-débito

- **Background sync:** registrar como `R-INT-3-HC-AUTOPULL-BACKGROUND-spec.md`.
- **UI manual de sync:** registrar como `R-INT-3-HC-AUTOPULL-UI-MANUAL-spec.md` se dono pedir.
- **Telemetria histórica:** registrar como `R-INT-3-HC-AUTOPULL-TELEMETRIA-spec.md` se dono pedir.

## Referências

- Spec do SCHEDULER (origem do TODO de wiring): `docs/sprints/R-INT-3-HC-AUTOPULL-SCHEDULER-spec.md` linha 183.
- Implementação do SCHEDULER: `src/lib/health/autopullScheduler.ts`.
- Implementação do puxador PASSOS (template para os outros): `src/lib/health/puxadores/passos.ts`.
- Settings store com toggle + tracking: `src/lib/stores/settings.ts` (linhas 71, 106, 135, 185, 212, 254, 374).
- Padrão AppState existente no projeto: `src/lib/vault/permissions.ts` linhas 167-191 (`waitForAppForeground`).
- Padrão useEffect com `appPronto`: `app/_layout.tsx` linhas 202-223 (`migrarEstadoParaVault` + `avaliarBackupAutomatico`).
- VALIDATOR_BRIEF.md §1 (invariantes), §4 (armadilhas A30/A31 HC), §7 (Gauntlet — não aplicável aqui, sprint sem UI).
