# R-INFRA-EXPO-SDK-56-UPGRADE — Subir Expo SDK 54 para 56 (zera postcss/uuid + cadeia @expo/*)

**Tipo**: infra (upgrade major)
**Prioridade**: P2-medium
**Estimativa**: 2-4d (onda dedicada)
**Tranche**: R-INFRA
**Fase**: pós-v1.0.0

> **STATUS: `[ok]` — EXECUTADA 2026-05-26 (decisão do dono de antecipar).** Upgrade
> 54→56 concluído e mergeado no main (commit `021c00c`), validado por **build nativo
> verde no CI** (run `26480485827`, tag `devclient-sdk56-test`). A cautela inicial
> sobre `expo-share-intent` foi refutada: o config plugin dele roda no SDK 56 e o
> `gradle assembleDebug` compilou HC bridge + widget + RN 0.85.

## Resultado da execução — playbook das 6 camadas (2026-05-26)

`npm install expo@^56` + `npx expo install --fix` levou a RN 0.85.3, React 19.2.3,
Reanimated 4.3.1, worklets 0.8.3, TS 6.0.3, babel-preset-expo 56, jest-expo 56. O
upgrade revelou 6 camadas de incompatibilidade, cada uma com causa-raiz isolada e fix:

1. **jest config** — RN 0.85 separou o preset: instalar `@react-native/jest-preset`
   (peer do jest-expo 56) + apontar `tests/__env__/rn-realtimers.js` para
   `@react-native/jest-preset/jest/react-native-env.js` (saiu de `react-native/jest/`).
2. **tsc (11546 erros)** — auto-include de `@types/*` parou no `moduleResolution:
   bundler` + TS6: adicionar `"types": ["jest","node"]` + `"ignoreDeprecations": "6.0"`
   (baseUrl) em `tsconfig.json`.
3. **82 suítes** — worklets 0.8.3: reanimated 4.3 chama `scheduleOnUI` no init;
   adicionar `scheduleOnUI`/`runOnUISync` ao mock de `react-native-worklets` em
   `jest.setup.cjs`.
4. **14 suítes** — `react-native-css-interop` (NativeWind) acessa Appearance/AppState/
   AccessibilityInfo/Dimensions/I18nManager/PixelRatio no init (disparado pelo getter
   `global.fetch` do winter runtime do Expo 56). Helper central
   `tests/__support__/rnCssInteropMock.cjs` stuba os 6; os mocks parciais de
   `react-native` passam a usá-lo.
5. **2 testes** — `expo-task-manager`/`expo-background-task` agora instaladas carregam
   em Jest (mockar ausência deterministicamente); e `jest.doMock` dentro de
   `isolateModules` não vence o `jest.mock` hoisted no jest 56 (mover o cenário mobile
   para arquivo próprio `gauntlet-autoseed-no-op-mobile.test.ts`).
6. **prebuild** — `@expo/config-plugins` não é mais hoisted no top-level; o config
   plugin do `datetimepicker` quebrava `expo config`: instalar `@expo/config-plugins`
   como devDependency (hoist).

**Métricas finais:** tsc 0 · smoke 323 suítes / 3073 testes · bundle Hermes 8.4 MB
(dentro do ADR-0027 10,5 MB) · `npm audit` 0 · `expo config` exit 0 · CI build nativo
verde. `@react-navigation` não é importado direto (breaking do Expo Router não afeta).

**Pendência (não-bloqueante):** validação live no device (runtime no Xiaomi) — o build
compila e assina; o runtime real é o próximo passo de qualquer release.

## Fonte canônica

`npm audit` 2026-05-26 + `docs/sprints/R-SEC-6-NPM-AUDIT-FIX-spec.md`: as
vulnerabilidades `postcss` (<8.5.10, XSS) e `uuid` (<11.1.1, buffer bounds) vivem na
cadeia `@expo/*` (metro-config, cli, config, config-plugins, prebuild-config) e só são
removidas de raiz pelo `npm audit fix --force`, que instala `expo@56` +
`expo-splash-screen@56` — breaking. A R-SEC-6 mitigou via `overrides` cirúrgicos; esta
sprint resolve a raiz subindo o SDK quando for seguro.

## Objetivo

Migrar Expo SDK 54 → 56 (RN 0.81 → versão alvo do 56), zerando `postcss`/`uuid` +
as ~18 vulnerabilidades transitivas `@expo/*` contadas pelo audit, e mantendo 100%
das features e dos 3061+ testes verdes.

## Checklist de re-validação (gate de aceitação)

- [ ] `npx expo install --fix` + bumps coordenados de todas as deps `expo-*`.
- [ ] **Rebuild dos módulos nativos** — `modules/health-connect/` (bridge Kotlin) e
  `modules/widget-homescreen/` (Glance) recompilam contra o SDK 56 sem erro
  (atenção à `connect-client` e ao `expo-modules-core` novo).
- [ ] Revisar as armadilhas que mudam por major: **A8** (versões SDK), **A14**
  (`unstable_conditionNames` / `import.meta`), **A25** (`unstable_enablePackageExports`
  + `react-native-calendars`), **A26** (`react-native-worklets/plugin` last em
  `babel.config.js`), **A1/A7** (ordem do plugin reanimated/nativewind).
- [ ] `metro.config.js` e `babel.config.js` revalidados contra o resolver do SDK 56.
- [ ] `npm audit` → `postcss`/`uuid` resolvidos; contagem ≈ 0.
- [ ] `npx tsc --noEmit` = 0 (tipos `@types/react`/RN podem mudar).
- [ ] `npm test` ≥ 3061 verde.
- [ ] `npx expo export --platform android` verde + bundle Hermes dentro do limite do
  ADR-0027 (10,5 MB).
- [ ] Build dev-client novo (`build-dev-client.yml`) + validação live no Xiaomi HyperOS
  (autopull HC, pickers, badge passos) — major pode regredir runtime nativo.
- [ ] Atualizar `VALIDATOR_BRIEF.md` (versões), `README.md` (stack), `docs/BRIEFING.md`
  (A8), `docs/SECURITY.md` (remover o "risco aceito" da R-SEC-6).

## Dependências

- **Bloqueia**: fechamento definitivo das vulnerabilidades postcss/uuid.
- **Bloqueado por**: **v1.0.0 release estável** (não fazer antes) + R-SEC-6 (mitigação
  intermediária já no lugar).
- **Decisão pendente**: confirmar com o dono a janela (provável pós-alpha-32 / pós-v1.0.0).

## OFF-LIMITS

Quando executada (futuro): toca `package.json`, `package-lock.json`, `babel.config.js`,
`metro.config.js`, `app.json`, `modules/**` (rebuild nativo). **Todos exigem confirmação
explícita do dono no momento da execução** — é upgrade de plataforma, não mudança
cirúrgica.

## Proof-of-work (quando executar)

Checklist acima 100% verde + diff de `package.json` + 2 builds (export android + dev-client)
+ validação live no device + hash do commit + atualização de toda a doc de versões.
