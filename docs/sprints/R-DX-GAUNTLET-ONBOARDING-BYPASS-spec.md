# R-DX-GAUNTLET-ONBOARDING-BYPASS — Onboarding bypassado por default no Gauntlet web + flag opt-in para testar onboarding

**Tipo**: infra (DX, dev-only)
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Pedido do dono em 2026-05-26: "o seu emulador tem que iniciar dando um bypass no
onboarding por default e colocar uma flag pra iniciar onboarding assim vc consegue
usar o chrome com exatidão". Decisão via AskUserQuestion 2026-05-26: **só Gauntlet web
(Chrome)**, nada no emulador Android nativo.

Hoje, ao abrir o Gauntlet no Chrome, o `OnboardingGuard` redireciona para `/onboarding`
porque `useOnboarding.done` é `false` por default — eu (orquestrador) tenho que chamar
`window.__gauntlet.seed()` manualmente antes de validar qualquer tela. O objetivo é:
**por default, em dev web, o app abre já com onboarding concluído** (seed automático:
done + vault mock + nomes genéricos), caindo direto numa tela útil; e uma **flag
`?onboarding=1` na URL** força o fluxo de onboarding quando eu quiser validá-lo.

## Hipóteses técnicas

1. **`OnboardingGuard` não tem bypass** — comprovado em `app/_layout.tsx:599-614`:
   o guard sempre faz `router.replace('/onboarding')` quando `!onboardingDone` e o
   pathname não começa com `/onboarding`. O `BiometriaGate` irmão já recebe
   `bypass={MODO_DEV_WEB}` (`app/_layout.tsx:447`) — o padrão a espelhar existe.
2. **`aplicarSeed()` já faz tudo que o bypass precisa** — comprovado em
   `src/lib/dev/gauntlet.ts:232`: seta `useOnboarding.done=true` + `vaultRoot` mock
   (`web://mock-vault/Ouroboros`) + nomes via `setState` síncrono. É chamado por
   `abrirSheet` (linha 551) exatamente com essa intenção ("seed minimo antes de abrir").
3. **Padrão anti-leak de entry-points** — comprovado em
   `src/lib/dev/gauntletBootstrap.ts`: 4 entry-points neutros guardados por
   `if (__DEV__)` que fazem `require('@/lib/dev/gauntlet').<fn>()`. Babel/Metro DCE
   elimina o branch em release. O novo `autoSeedDev()` segue exatamente esse molde.
4. **`MODO_DEV_WEB = Platform.OS==='web' && __DEV__`** — comprovado em
   `src/lib/dev/gauntletAtivo.ts:25`. Garante dead-code em qualquer build mobile/release.
5. **`window.location.search` é acessível em RN-Web** e `undefined` em nativo —
   ler com guard `typeof window !== 'undefined' && typeof window.location !== 'undefined'`.

## APIs reutilizáveis

- `src/lib/dev/gauntlet.ts:232` `aplicarSeed()` — **reusar** como motor do auto-seed.
  Não reimplementar seed de onboarding/vault/nomes.
- `src/lib/dev/gauntletBootstrap.ts` — **reusar o molde** dos entry-points neutros
  guardados por `__DEV__` (zero markers em release).
- `src/lib/dev/gauntletAtivo.ts` `MODO_DEV_WEB` — **reusar** como guard runtime.
- `app/_layout.tsx:447` `BiometriaGate bypass={MODO_DEV_WEB}` — **espelhar o padrão**
  no `OnboardingGuard`.

## Entregáveis

### Arquivos modificados

- `src/lib/dev/gauntlet.ts` — nova função exportada `autoSeedOnboardingSeNecessario()`:
  se `GAUNTLET_ATIVO` e `!useOnboarding.getState().done`, chama `aplicarSeed()`. No-op
  caso contrário. (Reusa `aplicarSeed` interno; idempotente.)
- `src/lib/dev/gauntletBootstrap.ts` — novo entry-point neutro `autoSeedDev()` guardado
  por `if (__DEV__) require('@/lib/dev/gauntlet').autoSeedOnboardingSeNecessario()`.
- `app/_layout.tsx`:
  - helper `querOnboardingFresh(): boolean` — lê `window.location.search` por
    `onboarding` (com guards de `typeof window`/`location`); `false` em nativo.
  - `OnboardingGuard`: quando `MODO_DEV_WEB && !querOnboardingFresh()` e `!onboardingDone`
    (após hidratar) → chamar `autoSeedDev()` em vez de `router.replace('/onboarding')`.
    Com a flag (`fresh`), comportamento atual preservado (redireciona ao onboarding).
- `gauntlet.sh` — flag opcional `--onboarding` que troca a URL aberta de
  `/_dev/gauntlet` para `/?onboarding=1`; documentar no header do script (lista de uso).

### Testes

- Caso positivo: `autoSeedOnboardingSeNecessario()` chamado com `done=false` seta
  `useOnboarding.getState().done === true` e `useVault.getState().vaultRoot` não-nulo.
- Caso negativo/edge: chamado com `done=true` é no-op (não re-seeda; preserva nomes).
- Caso guard: `querOnboardingFresh()` retorna `true` com `?onboarding=1` e `false` sem
  param (mock de `window.location.search`).
- E2E Gauntlet em `tests/e2e/playwright/r-dx-gauntlet-onboarding-bypass.e2e.ts`
  (copiado de `docs/templates/e2e-template.e2e.ts`): abrir `/` → assert que a Tela Hoje
  renderiza (não o onboarding); abrir `/?onboarding=1` → assert que o onboarding
  ("Como você se chama?" ou equivalente) renderiza.

### Documentação

- [ ] `docs/GAUNTLET.md` — documentar o novo default (bypass) + flag `?onboarding=1`
  + `gauntlet.sh --onboarding`.
- [ ] `VALIDATOR_BRIEF.md` §1.9 — nota do novo comportamento de boot do Gauntlet.
- [ ] `STATE.md`, `ROADMAP.md` (tile novo `[ok]`), `CHANGELOG.md` `[Unreleased]`.
- [ ] `docs/FEATURES-CANONICAS.md` — **não aplicável**: bypass é dev-only, dead-code em
  release, não é feature visível ao usuário final.
- [ ] Screenshots em `docs/sprints/R-DX-GAUNTLET-ONBOARDING-BYPASS-screenshots-gauntlet/`.

## Dependências

- **Bloqueia**: nada (mas melhora a DX de validação visual de todas as sprints futuras).
- **Bloqueado por**: nada (paths disjuntos da R-SEC-6; paralelizável via worktree).
- **Decisão pendente**: nenhuma.

## OFF-LIMITS

**Pode tocar**:
- `src/lib/dev/gauntlet.ts`, `src/lib/dev/gauntletBootstrap.ts` — código dev-only.
- `app/_layout.tsx` — apenas o `OnboardingGuard` + helper novo (não tocar os wirings
  de HC autopull / Calendar / boot hooks).
- `gauntlet.sh` — flag nova.
- `tests/**` (novos), `docs/GAUNTLET.md`, `VALIDATOR_BRIEF.md`, docs de estado.

**Não pode tocar**:
- `src/lib/stores/onboarding.ts` — o store não muda; só é seedado via `setState`.
- Os useEffects de HC autopull / Calendar / background em `app/_layout.tsx`.
- `package.json` — sem mudança de dependência (paralela R-SEC-6 cuida de deps).
- `pessoas.config.ts` — nomes reais nunca.

## Restrições

- **Regra −1** (Anonimato): zero IA, zero nomes reais. Nomes do seed = `Nome_A`/`Nome_B`
  genéricos (já é o default de `aplicarSeed`). Validado por `check_anonimato.sh`.
- **Dead-code em release OBRIGATÓRIO**: todo o caminho novo guardado por `MODO_DEV_WEB`
  / `__DEV__`. Verificar via `npx expo export --platform android` + grep de markers
  (`autoSeedOnboardingSeNecessario`, `querOnboardingFresh`) = 0 no bundle.
- **Sem emojis**; **comentários em código sem acento**; **commits sem acento**.
- **Strings de UI** (se houver) em Sentence case com acento — improvável aqui (dev-only).
- **TypeScript strict** — sem `any`/`@ts-ignore` injustificado.
- **Worktree obrigatório** — `.claude/worktrees/agent-<id>/`.

## Verificação canônica

```bash
git rev-parse --show-toplevel
./scripts/bootstrap-worktree.sh

./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent -- --testPathPattern="gauntlet"
./scripts/smoke.sh

# Dead-code em release (gate anti-vazamento):
npx expo export --platform android --output-dir /tmp/r-dx-bypass-export
grep -rl "autoSeedOnboardingSeNecessario\|querOnboardingFresh" /tmp/r-dx-bypass-export && echo "VAZOU" || echo "OK: dead-code"
rm -rf /tmp/r-dx-bypass-export

# Validacao visual (Nivel A+ Gauntlet, via playwright MCP pelo orquestrador):
# ./gauntlet.sh  -> http://localhost:8081/  (deve cair na Tela Hoje, sem onboarding)
#               -> http://localhost:8081/?onboarding=1  (deve cair no onboarding)
```

Todos exit 0. Build com grep "OK: dead-code". Se vazar marker, parar e reportar.

## Decisões herdadas

- **Bypass só Gauntlet web** (AskUserQuestion 2026-05-26) — `MODO_DEV_WEB` guard.
  Emulador Android nativo fora de escopo (mecanismo seria separado; MODO_DEV_WEB é
  `false` no Android).
- **Flag por query param `?onboarding=1`** (não env var) — ergonomia: alterna só
  mudando a URL no Chrome, sem reiniciar Metro.
- **Bypass DENTRO do `OnboardingGuard`** (não num useEffect separado do RootLayout) —
  robustez de timing: o seed síncrono re-renderiza o guard com `done=true` antes de
  qualquer `router.replace`, e satisfaz VaultBootGate/SessaoBootGate de tabela.

## Proof-of-work

1. `git diff --name-only` (gauntlet.ts, gauntletBootstrap.ts, _layout.tsx, gauntlet.sh,
   tests, docs).
2. `npx jest --silent -- --testPathPattern="gauntlet" | tail -5`.
3. `./scripts/smoke.sh` (últimas 10 linhas) — ≥ 3061 testes.
4. `npx expo export --platform android` + grep markers = "OK: dead-code".
5. Hash do commit — `git rev-parse HEAD`.
6. Path do worktree + branch.
7. E2E novo + screenshots Gauntlet: `/` na Tela Hoje (sem onboarding) e `/?onboarding=1`
   no onboarding, em `docs/sprints/R-DX-GAUNTLET-ONBOARDING-BYPASS-screenshots-gauntlet/`.
8. Achados colaterais — lista com path:linha + proposta de sprint nova (sem fix inline).
