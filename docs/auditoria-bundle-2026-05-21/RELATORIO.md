# Auditoria de bundle Hermes Android — Sprint R-BUNDLE-SIZE-AUDIT

Data: 2026-05-21
Sprint: R-BUNDLE-SIZE-AUDIT (Fase 3, achado colateral de
M-GAUNTLET-DEAD-CODE-V2)
Spec: `docs/sprints/R-BUNDLE-SIZE-AUDIT-spec.md`
Worktree: `agent-a11c0952c5c0470b7`
HEAD: `0f8b604`

## Resumo executivo

| Métrica | M-BUNDLE-DIET (2026-05-04) | Agora (2026-05-21) | Delta |
|---|---|---|---|
| **Bundle Hermes Android** | **7.084.361 B (7,08 MB)** | **10.233.199 B (10,23 MB)** | **+3.148.838 B (+44,5%)** |
| Bundle em MiB (du -sh) | 6,8M | 9,8M | +3,0M |
| Sources mapeadas no bundle | ~2.400 | 4.582 | +91% |
| Raw source total (pre-Hermes) | ~9 MB | 12,68 MB | +41% |
| Leak check gauntlet | 0/6 | 0/6 | mantido |
| Smoke (testes Jest) | 1349/149 suites | 2584/277 suites | crescimento natural |

**Bundle atual: 10,23 MB. Limite hipotético histórico era 8,55–8,85
MB. Excedemos em ~1,4–1,7 MB.** Crescimento de +44,5% em 17 dias é
significativo — não é vazamento (leak check 0/6 mantido), é resultado
de novas features + regressão tree-shake do lucide-react-native.

## Comparativo com M-BUNDLE-DIET (top contribuintes)

| Pacote / Área | 2026-05-04 (KB) | 2026-05-21 (KB) | Delta (KB) | Causa |
|---|---|---|---|---|
| react-native | 2417 | 2417 | 0 | estável |
| **lucide-react-native** | **~30** | **1335** | **+1305** | **REGRESSÃO tree-shake** |
| react-native-reanimated | 786 | 786 | 0 | estável |
| **lodash** (transitiva) | 0 | 704 | **+704** | nova via react-native-calendars |
| zod | 506 | 524 | +18 | crescimento normal |
| expo-router | 405 | 405 | 0 | estável |
| framer-motion (via moti) | 333 | 333 | 0 | estável |
| yaml | 273 | 273 | 0 | estável |
| react-native-gesture-handler | 261 | 261 | 0 | estável |
| react-native-svg | 245 | 245 | 0 | estável |
| **react-native-calendars** | 0 | 219 | **+219** | nova feature (M37, agenda) |
| @gorhom/bottom-sheet | 210 | 210 | 0 | estável |
| **moment** (transitiva) | 0 | 172 | **+172** | nova via calendars |
| **recyclerlistview** (transitiva) | 0 | 137 | **+137** | nova via calendars |
| **app code (src+app)** | ~? | **2109** | varia | crescimento natural Onda Q/R/3J/3K |
| Outros (jszip, expo-*, etc.) | ~ | ~ | ~ | mínimas variações |

### Top 5 contribuintes do crescimento

1. **`lucide-react-native` regressão tree-shake**: +1305 KB raw
   (~+650 KB Hermes). **Maior contribuinte único.**
2. **`react-native-calendars` + transitivas**: +1252 KB raw
   (lodash 704 + moment 172 + recyclerlistview 137 + xdate 20 +
   calendars 219). **Segundo maior contribuinte.**
3. **App code (src/ + app/)**: crescimento natural por features
   (Onda Q OAuth + R-INT integrações + R-VAULT + R-RECAP + R-MEDIA +
   R-BACKUP + Onda 3J/3K) estimado em +500 KB raw.
4. **expo-share-intent + expo-speech-recognition + expo-auth-session**:
   ~128 KB combinados (novos).
5. **react-native-health-connect**: 20 KB (negligível JS, peso real
   no nativo .so do APK).

## Causa raiz da regressão de lucide-react-native

Em M-BUNDLE-DIET (2026-05-04), o shim `src/lib/icons.ts` reduziu
lucide de 1335 KB para ~30 KB. **A regressão NÃO veio de mudança de
versão** (`lucide-react-native@1.12.0` idêntica nos dois snapshots) nem
de mudança em `metro.config.js` (o flag `unstable_enablePackageExports`
foi adicionado em 29-abr, ANTES do M-BUNDLE-DIET).

A causa real é um **único import direto** que bypassa o shim:

```ts
// app/index.tsx:29
import { Sparkles } from 'lucide-react-native';
```

Esse import resolve o root do pacote, carregando o barrel
`dist/esm/lucide-react-native.mjs` (222 KB) que re-exporta os 1700+
ícones. Como `sideEffects: false` no `package.json` do lucide NÃO é
respeitado pelo Metro/Hermes para tree-shake real (limitação A-not-mapped
do BRIEF), todos os ícones entram no bundle.

**Suficiente UM consumer bypassando o shim para arrastar a regressão
inteira de +1,3 MB.** O shim `@/lib/icons` continua funcionando para
os 44 outros consumidores; só este escapou.

`src/lib/icons.ts:73` (`export type { LucideIcon, LucideProps } from
'lucide-react-native'`) NÃO causa o problema: `export type` é elided
pelo TypeScript compile, não entra no runtime bundle.

## Análise transitiva: react-native-calendars

Adicionada em M37 (2026-05-05, calendário de agenda) APÓS o
M-BUNDLE-DIET. Importada em 3 arquivos legítimos:

- `src/components/agenda/CalendarGrid.tsx` — wrapper Dracula
- `src/components/agenda/calendarLocalePtBr.ts` — locale pt-BR
- `src/components/screens/RecapModoCalendario.tsx` — recap modo calendário

A dep traz consigo 4 transitivas:

- `lodash@^4.17.15` — biblioteca gorda, **704 KB** importação
  completa pelo calendars (peso enorme; calendars NÃO usa
  lodash-es, então não há tree-shake).
- `moment@^2.29.4` — date library legacy (substituída por
  date-fns/luxon no mundo moderno), **172 KB**.
- `recyclerlistview@^4.0.0` — list virtualization, **137 KB**.
- `xdate@^0.8.2` — extension de Date, **20 KB**.

**Total transitivo: ~1.033 KB + 219 KB da própria calendars = 1.252
KB raw source.** No bundle Hermes minificado: ~500–600 KB efetivos.

## Recomendações priorizadas

### Prioridade 1: Quick win — fixar bypass do shim de lucide (sub-sprint)

**Sub-sprint candidata:** `R-BUNDLE-LUCIDE-RESHIM`

- Trocar `app/index.tsx:29` de `from 'lucide-react-native'` para
  `from '@/lib/icons'`.
- Garantir `Sparkles` está exportado no shim (já está,
  `src/lib/icons.ts:64`).
- Adicionar regra ESLint `no-restricted-imports` banindo
  `lucide-react-native` (forçando uso do shim).
- Reexportar (opcional) usando explícita `import type` na linha 73 do
  shim para deixar claro que é só tipos.

**Ganho esperado:** -1,3 MB raw source → -650 KB Hermes (estimado).
Bundle voltaria a ~9,58 MB. **Fix de <10 linhas em código fonte.**

**Justificativa:** alta relação ganho/custo. Restaura o comportamento
de M-BUNDLE-DIET sem mudança arquitetural.

### Prioridade 2: Decisão durável — limite de bundle ADR

Mesmo após o quick win acima, o bundle ainda será ~9,58 MB. As novas
features (calendars + integrações + media + backup + recap) são
trabalho legítimo e o crescimento natural é justificável.

**Sub-sprint candidata:** `R-ADR-LIMITE-BUNDLE-V2` (curta, só docs).

- Registrar nova ADR (ex: `0019-limite-bundle-v1-0.md`) com:
  - Limite anterior: 8,55 MB (meta) / 8,85 MB (teto histórico).
  - Limite novo proposto: **10,5 MB** (com folga de 300 KB para A5 +
    eventuais features pequenas até v1.0).
  - Justificativa: crescimento de features Onda Q (OAuth) + R-INT (5
    integrações) + R-VAULT (schemas + ZIP) + R-RECAP (Ken Burns) +
    R-MEDIA (audio anexado) + R-BACKUP (auto) + Onda 3J/3K
    (refactors); todos parte da v1.0 declarada.
  - Trade-off: APK final maior por ~3 MB; tempo de download +1s em
    LTE típico; parse Hermes inicial +200ms estimado.

### Prioridade 3: Avaliar substituição react-native-calendars

A dep traz 1+ MB de transitivas pesadas (lodash, moment). Alternativas
modernas que NÃO trazem lodash/moment:

- `@react-native-community/datetimepicker` (já temos! 26 KB) +
  custom grid → ~200 KB total, mas exige reescrever views de agenda.
- Custom calendar com Reanimated 4 → 100% controle, ~300 LOC.

**Sub-sprint candidata:** `R-BUNDLE-DIET-CALENDARS-REPLACE` (P3-low,
v1.1).

- Avaliar viabilidade de substituir `react-native-calendars` por
  implementação custom ou `@react-native-community/datetimepicker` +
  grid próprio.
- Ganho potencial: -1 a -1,2 MB raw source.
- Custo: 3-5 dias engenharia, risco visual médio (testar tema
  Dracula + locale pt-BR + interações de mês/ano).

### Prioridade 4: Auditar lodash imports do calendars (sub-sprint, opcional)

`react-native-calendars` usa lodash sem tree-shake (importação
completa do barrel `lodash`). Possíveis caminhos:

- **Patch local (patch-package)**: substituir imports lodash de
  `react-native-calendars/src/**` por `lodash/<fn>` específicos.
  Mas requer manter patch a cada update.
- **Resolution alias**: forçar `lodash` → `lodash-es` no resolver
  Metro para tree-shake. Pode quebrar se calendars usa CJS internamente.

**Sub-sprint candidata:** `R-BUNDLE-LODASH-PATCH` (P3-low, v1.1).
Risco médio, ganho potencial -400 KB raw.

### Prioridade 5: Polyfills check (verificação rápida, sem ação)

Bundle anterior tinha `whatwg-url-without-unicode` (70 KB), `buffer`
(49 KB), `assert` (74 KB), `regenerator-runtime` (25 KB), `event-target-shim`
(23 KB), `whatwg-fetch` (19 KB) — total ~260 KB de polyfills. **No
audit atual estão idênticos**, sem duplicação detectada. Não há ação.

## Decisão durável

**O caminho recomendado para fechar a sprint M41 (release v1.0.0) é:**

1. **Aplicar Prioridade 1** (sub-sprint `R-BUNDLE-LUCIDE-RESHIM`,
   fix <10 LOC). Bundle volta para ~9,58 MB.
2. **Aplicar Prioridade 2** (ADR formal `R-ADR-LIMITE-BUNDLE-V2`)
   documentando o novo limite **10,5 MB** com justificativa.
3. **Não fazer Prioridades 3-4** antes de v1.0 (risco/custo
   desproporcional ao ganho estimado).

Ambas Prioridade 1 e 2 são leves (1h e 30min respectivamente),
viáveis antes de M41.

**Limite revisado oficialmente proposto: 10,5 MB** (10.500.000 bytes
de Hermes bytecode Android, medido via `npx expo export --platform
android` sem source-maps). Atualmente em 10,23 MB (98% do novo
limite). Após R-BUNDLE-LUCIDE-RESHIM, esperado ~9,58 MB (91% do
limite, com 920 KB de folga).

## Sub-sprints candidatas geradas (anti-débito)

| ID candidato | Prioridade | Esforço | Ganho estimado |
|---|---|---|---|
| `R-BUNDLE-LUCIDE-RESHIM` | P1-high | ~1h | -650 KB Hermes |
| `R-ADR-LIMITE-BUNDLE-V2` | P1-high | ~30min | 0 (doc) |
| `R-BUNDLE-DIET-CALENDARS-REPLACE` | P3-low | 3-5 dias | -500 KB Hermes |
| `R-BUNDLE-LODASH-PATCH` | P3-low | 1-2 dias | -400 KB Hermes |

Sprints P1 são pré-requisito do M41 (release v1.0.0). P3 são candidatas
v1.1.

## Verificação canônica desta audit

```bash
$ ./scripts/check_anonimato.sh
OK: anonimato preservado (Regra -1)

$ ./scripts/smoke.sh
[277 test suites, 2584 tests passados, 1 skipped]
OK: smoke test passou

$ ./scripts/check_gauntlet_leak.sh
[6 markers checked, 0 matches each]
OK: bundle Android sem gauntlet
    bundle: 9,8M  /tmp/tmp.XXX/_expo/static/js/android/entry-*.hbc

$ npx expo export --platform android --output-dir /tmp/bundle-audit-2126
[bundle gerado em 30s]
android bundles (1):
  entry-233cc55c1b8e1546161f8231afee8639.hbc (10.2 MB)

$ stat /tmp/bundle-audit-2126/_expo/static/js/android/*.hbc
    Tamanho: 10233199    Hermes JavaScript bytecode, version 96
```

## Limitações desta audit

1. **`source-map-explorer` não foi usável** porque o `.hbc` é
   bytecode Hermes (não JS); o sourcemap não bate com o bytecode.
   Workaround: parsear sourcemap manualmente via Node script
   (`/tmp/bundle-audit-2126-sm/analyze.js`), agrupar por
   pacote/path. Esse approach mede o **raw source** (antes de Hermes
   compactar), que correlaciona com o Hermes final em ~50% típico.

2. **Não medido**: tamanho exato no APK final (Hermes + nativos
   .so + assets + resources). Esta audit cobre apenas o bundle JS
   Hermes Android. APK total é tipicamente 5-10× maior. Para v1.0,
   `./scripts/release-apk.sh` produz o APK real medível, mas isso
   está fora do escopo da audit.

3. **Não medido**: bundle iOS. Esta audit é Android-only conforme
   spec. iOS tipicamente é proporcional, mas pode divergir por
   módulos `.ios.tsx`.

## Achados colaterais

Durante a audit foram detectados:

1. **Cache contaminado de Metro entre worktrees**: o primeiro
   `expo export` desta sessão produziu um bundle de 3,61 MB
   incorretamente (com `require.context` vazio referenciando
   worktree antigo `/agent-a86c4c9e918b89331/app`). Causa: cache
   `/tmp/metro-cache` + `/tmp/metro-file-map-*` compartilhado entre
   worktrees herda contexto de execuções anteriores. **Workaround
   aplicado:** `rm -rf /tmp/metro-*` + `--clear` na flag do export.
   **Sub-sprint candidata:** `R-DX-METRO-CACHE-PER-WORKTREE` —
   patch `gauntlet.sh` ou docs ensinando a sempre limpar cache em
   sessões multi-worktree.

2. **`env.json` como symlink quebra `expo export --no-bytecode`**:
   Metro com `unstable_enablePackageExports` recusa resolver
   `../../../env.json` quando é symlink. Workaround: substituir
   symlink por cópia real (`rm env.json && cp main/env.json
   env.json`). Não afeta o bundle Hermes normal (com bytecode), só
   o `--no-bytecode`. **Não é candidato a sprint** — é só pegadinha
   documentável; bootstrap-worktree.sh já cria symlink que funciona
   para uso normal.

3. **Warning persistente do lucide-react-native** (57 ocorrências
   por export): documentado acima na seção "Causa raiz". Não é
   erro, mas polui logs. **Sub-sprint candidata:** `R-DX-LUCIDE-WARNINGS-SILENCE`
   — adicionar pacote `lucide-react-native` no
   `package.json#exports` patch via `patch-package`, ou suprimir
   warnings no metro.config.js. P3-low.

## Origem

Achado colateral do agente `a86c4c9e918b89331` ao re-validar
M-GAUNTLET-DEAD-CODE-V2 em 2026-05-21. Citado textualmente:
"Bundle inflou +1,3 MB em 17 dias (8,5 MB → 9,8 MB)..."

**Correção empírica desta audit:** o bundle de 2026-05-04 era **7,08
MB** (não 8,5 MB) — verificável em
`docs/auditoria-bundle-2026-05-04/RELATORIO.md` linha 11. O bundle
atual é **10,23 MB** (não 9,8 MB — 9,8 é MiB do `du -sh`; 10,23 é MB
decimal do stat exato). O **delta real é +3,15 MB = +44,5%**, mais
significativo que o estimado (+1,3 MB = +18% que estavam no spec).
