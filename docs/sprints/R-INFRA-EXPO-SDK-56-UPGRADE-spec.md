# R-INFRA-EXPO-SDK-56-UPGRADE — Subir Expo SDK 54 para 56 (zera postcss/uuid + cadeia @expo/*)

**Tipo**: infra (upgrade major)
**Prioridade**: P2-medium
**Estimativa**: 2-4d (onda dedicada)
**Tranche**: R-INFRA
**Fase**: pós-v1.0.0

> **STATUS: `[todo-futuro]` — NÃO EXECUTAR AGORA.** Materializada como débito mapeado
> por decisão do dono (AskUserQuestion 2026-05-26). O upgrade é breaking (2 saltos de
> major: 54→55→56) e arriscado às vésperas do v1.0.0. Executar só depois do release
> estável, em onda dedicada com janela própria.

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
