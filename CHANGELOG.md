# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Sprint M01.1: bootstrap Expo SDK 54 em-place preservando docs.
  Stack confirmada: Expo Router, NativeWind 4, Reanimated 4,
  Moti, gluestack-ui, @gorhom/bottom-sheet, JetBrains Mono via
  `@expo-google-fonts/jetbrains-mono`, zustand, zod, yaml.
  Configs: `tailwind.config.js` com paleta Dracula completa,
  `babel.config.js` com `nativewind/babel` antes e
  `react-native-reanimated/plugin` por último (Armadilha A1),
  `metro.config.js` com `withNativeWind`, `tsconfig.json` strict
  + paths `@/*`, `app.json` com tema dark e package
  `com.ouroboros.mobile`. Telas placeholder em `app/_layout.tsx`
  e `app/index.tsx` com classes Tailwind.
- Bootstrap do repositório git (Fase 0).
- Layout canônico `docs/` com `BRIEFING.md`, `CONTEXTO.md`,
  `PLANO_TECNICO_APK.md`, `Ouroboros_22_telas-standalone.html` e
  pastas `ADRs/`, `sprints/`, `design-canvas-export/`.
- Scripts de validação: `check_anonimato.sh`, `check_test_data.sh`,
  `smoke.sh`, `sprint_iniciar.sh`.
- Hooks `pre-commit` e `pre-push` ativos via `core.hooksPath=hooks`.
- `LICENSE` GPL-3.0, `README.md`, `CLAUDE.md` com regras invioláveis,
  `.gitignore` com exceção para `pessoas.config.runtime.json`.

### Changed
- `docs/design-canvas-export/project/BRIEFING_PARTE3_SPEC.md` marcado
  como `SUPERSEDED` (legado, stack era Kotlin/Compose).
