# Auditoria de bundle Hermes Android — Sprint C1 M-BUNDLE-DIET

Data: 2026-05-04
Sprint: C1 (Bloco C — release-readiness)
Spec: `docs/sprints/M-BUNDLE-DIET-spec.md`

## Resumo executivo

| Métrica | Baseline | Final | Delta |
|---|---|---|---|
| Bundle Hermes Android | 8.836.379 B (8.84 MB) | 7.084.361 B (7.08 MB) | **-1.752.018 B (-19.8%)** |
| Sources no bundle | 4.086 | ~2.400 | -41% |
| Testes | 1349/149 | 1349/149 | mantido |
| tsc | 0 | 0 | mantido |
| smoke | OK | OK | mantido |

Meta da spec: ≤ 8.55 MB. **Atingida com 1.47 MB de folga**, suficiente
para A5 (export MANIFEST + JSZip já presente), Bloco B (M40, M36) e
Bloco E (microfone, OCR, calendário).

## Top 30 deps por tamanho de source no bundle (baseline)

```
total bytes (raw source): 10289.0 KB
    2416.2 KB ( 23.5%)  react-native
    1334.9 KB ( 13.0%)  lucide-react-native        <-- alvo principal
    1175.7 KB ( 11.4%)  __other__
     786.0 KB (  7.6%)  react-native-reanimated
     506.4 KB (  4.9%)  zod
     404.8 KB (  3.9%)  expo-router
     333.3 KB (  3.2%)  framer-motion              <-- via moti, NAO removido
     272.5 KB (  2.6%)  yaml
     261.0 KB (  2.6%)  react-native-gesture-handler
     245.3 KB (  2.4%)  react-native-svg
     209.6 KB (  2.0%)  @gorhom/bottom-sheet
     174.0 KB (  1.7%)  expo
     165.7 KB (  1.6%)  @react-navigation/core
     119.3 KB (  1.2%)  react-native-screens
     116.0 KB (  1.1%)  react-native-css-interop
     103.0 KB (  1.0%)  react-native-worklets
      95.3 KB (  0.9%)  jszip
      86.5 KB (  0.8%)  expo-notifications
      74.3 KB (  0.7%)  assert
      72.7 KB (  0.7%)  @motionone/dom             <-- via framer/moti
      70.5 KB (  0.7%)  whatwg-url-without-unicode
      64.6 KB (  0.6%)  expo-av
      58.7 KB (  0.6%)  react-native-draggable-flatlist
      57.2 KB (  0.6%)  @react-navigation/elements
      48.9 KB (  0.5%)  buffer
      40.7 KB (  0.4%)  semver
      40.2 KB (  0.4%)  @react-navigation/native-stack
      37.4 KB (  0.4%)  @react-navigation/bottom-tabs
      37.2 KB (  0.4%)  expo-file-system
      36.4 KB (  0.4%)  expo-modules-core
```

## Top 20 deps por tamanho de source no bundle (final)

```
total bytes: 8991.7 KB
    2416.2 KB ( 26.9%)  react-native
    1180.1 KB ( 13.1%)  __other__                  <-- absorveu lucide reduzido
     786.0 KB (  8.7%)  react-native-reanimated
     506.4 KB (  5.6%)  zod
     404.8 KB (  4.5%)  expo-router
     333.3 KB (  3.7%)  framer-motion
     272.5 KB (  3.0%)  yaml
     261.0 KB (  2.9%)  react-native-gesture-handler
     245.3 KB (  2.7%)  react-native-svg
     209.6 KB (  2.3%)  @gorhom/bottom-sheet
     174.0 KB (  1.9%)  expo
     165.7 KB (  1.8%)  @react-navigation/core
     119.3 KB (  1.3%)  react-native-screens
     116.0 KB (  1.3%)  react-native-css-interop
     103.0 KB (  1.1%)  react-native-worklets
      95.3 KB (  1.1%)  jszip
      86.5 KB (  1.0%)  expo-notifications
      74.3 KB (  0.8%)  assert
      72.7 KB (  0.8%)  @motionone/dom
      70.5 KB (  0.8%)  whatwg-url-without-unicode
```

`lucide-react-native` desapareceu do top — caiu de 1334.9 KB para
estimados ~10-30 KB (50 ícones individuais, em `__other__`).

## Ações tomadas

### 1. Tree-shake real de `lucide-react-native` (ganho principal)

**Causa raiz**: o pacote publica `sideEffects: false` no `package.json`,
mas o Metro bundler do Expo SDK 54 **não** faz tree-shake de barrel
files re-exports por padrão em React Native. Mesmo importando apenas
`{ Plus }`, todos os 1700+ ícones eram puxados (1334 KB no bundle).

**Solução**: shim local em `src/lib/icons.ts` que re-exporta cada
ícone do path direto `lucide-react-native/dist/esm/icons/<name>.mjs`.
Os 44 arquivos consumidores trocaram `from 'lucide-react-native'`
por `from '@/lib/icons'`. Total: 50 ícones re-exportados.

Metro só inclui no bundle os arquivos `.mjs` realmente importados
pelo shim — bypassa o barrel `lucide-react-native.mjs` (1712 linhas
de re-exports).

Suporte:
- `lucide-icons.d.ts` na raiz declara `declare module
  'lucide-react-native/dist/esm/icons/*.mjs'` com tipo `LucideIcon`.
- `tsconfig.json` inclui `lucide-icons.d.ts`.
- `package.json` jest moduleNameMapper rebate `.mjs` → `.js` (cjs)
  para Jest, que não transforma `.mjs` por padrão.

Aliases necessários (PascalCase divergente de kebab-case):
- `AlertTriangle` → `triangle-alert`
- `BarChart` → `chart-no-axes-column-increasing`
- `Fingerprint` → `fingerprint-pattern`
- `HelpCircle` → `circle-question-mark`
- `Home` → `house`
- `Trash2` → `trash-2`
- `ImageIcon` → `image` (alias de `Image`)

**Ganho medido**: -1.752 KB no bundle Hermes.

### 2. Remoção de deps mortas (ganho on-disk, zero bundle)

Confirmado via `rg` que zero arquivos do código fonte importam:
- `@gluestack-ui/themed` (7.3 MB on-disk)
- `@gluestack-style/react` (3.5 MB on-disk)
- `expo-blur` (384 KB on-disk)
- `expo-image-manipulator` (624 KB on-disk)
- `expo-status-bar` (96 KB on-disk)

`npm uninstall` removeu 114 pacotes (incluindo transitivas). Bundle
não mudou (já estavam fora por dead-code), mas `node_modules`
ficou ~12 MB mais leve, instalações mais rápidas em CI/dev fresh.

Justificativas:
- **Gluestack themed**: legado da sprint M01, substituído integralmente
  por componentes próprios em `src/components/ui/` ao longo de M01-M05.
- **expo-blur**: nunca integrado; design Dracula usa elevations
  sólidas via `colors.bg-elev`, sem efeitos de blur.
- **expo-image-manipulator**: scanner usa `@dariyd/react-native-document-scanner`
  com pipeline próprio; image-picker já entrega tamanhos OK.
- **expo-status-bar**: SDK 54 usa Expo Router com integração nativa
  da status bar via `app.json` userInterfaceStyle.

## Ações NÃO tomadas (justificadas)

### `framer-motion` (333 KB, via moti)

Verificado: `moti` no Native usa `react-native-reanimated` direto
(`node_modules/moti/build/core/use-motify.js` importa só
`react-native-reanimated`). `framer-motion` aparece no bundle
Android porque outras partes de `moti` (helpers, sequence, com
imports estáticos) puxam módulos de `framer-motion` que são
compatíveis com RN.

Spec **proíbe explicitamente** remover Moti (animações dependem).
Substituir Moti por Reanimated puro é refactor maior, fora do
escopo. Sub-sprint candidata: `M-BUNDLE-DIET-MOTI-REPLACE`.

### `yaml` (272 KB)

Usado em 2 arquivos (`src/lib/vault/frontmatter.ts`,
`src/lib/vault/midiaCompanion.ts`). Substituir por `js-yaml` (peso
similar) ou parser manual exigiria reescrever lógica de
serialização (lineWidth, ordenação determinística, escape de
strings com caracteres especiais). Risco alto vs ganho ~150 KB.
Sub-sprint candidata: `M-BUNDLE-DIET-YAML-REPLACE`.

### `react-native-draggable-flatlist` (59 KB)

Usado em 1 arquivo (`src/components/todo/ListaArrastavel.tsx`).
Substituir por implementação custom com `Reanimated.Gesture` é
viável mas adiciona ~100 LOC de código gesture+layout custom.
Ganho marginal (59 KB). Sub-sprint candidata se margem voltar a
ficar crítica: `M-BUNDLE-DIET-DRAGGABLE-CUSTOM`.

## Verificação final

```bash
$ ./scripts/check_anonimato.sh
OK: anonimato preservado (Regra -1)

$ python3 scripts/check_strings_ui_ptbr.py
(zero violações)

$ npx tsc --noEmit
(zero erros)

$ npm test --silent
Test Suites: 149 passed, 149 total
Tests:       1349 passed, 1349 total

$ ./scripts/smoke.sh
OK: smoke test passou

$ ./scripts/check_gauntlet_leak.sh
OK: bundle Android sem gauntlet
    bundle: 6,8M	/tmp/.../entry-...hbc

$ npx expo export --platform android --output-dir /tmp/c1-final
android bundles (1):
  entry-a648d7b4eecbff9110d73b1fd684e6db.hbc (7.08 MB)
```

Bundle final: **7.084.361 bytes (7.08 MB decimal / 6.76 MiB)**.
Margem para teto histórico de 8.85 MB: **1.77 MB**.
Margem para meta da spec (8.55 MB): **1.47 MB**.

## Sub-sprints geradas (anti-débito)

Nenhuma sub-sprint foi gerada nesta execução — todos os achados
colaterais foram documentados na seção "Ações NÃO tomadas" como
candidatos opcionais a sprints futuras se a margem voltar a ficar
crítica. O ganho atingido (1.47 MB de folga) cobre as próximas 3-4
features médias com folga.
