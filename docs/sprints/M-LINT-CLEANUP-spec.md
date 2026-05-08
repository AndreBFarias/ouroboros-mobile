# Sprint M-LINT-CLEANUP — Limpeza mecânica de warnings ESLint

```
DEPENDE:    HEAD em 7cced9c (Bloco H–O fechados, o1 marcado [ok])
BLOQUEIA:   Bloco P (APK preview + field test + release) — release
            v1.0 com warnings residuais é débito acumulado
ESTIMATIVA: 1-2h (mecânico, sem mudança de comportamento)
PRIORIDADE: média (anti-débito transversal, executa em janela curta
            entre blocos temáticos)
```

## 1. Achado / motivação

Após o fechamento do plano golden-zebra principal (Bloco H–O,
sprint o1 marcada `[ok]` em `7cced9c`), o lint do projeto acumula
warnings residuais de:

1. **Diretivas `eslint-disable` órfãs** — sobreviveram a refactors
   das sprints H–O. A regra que justificava o disable foi removida
   ou desativada do `eslint.config.js` (config flat minimalista
   herdada do M01.1 — ver `VALIDATOR_BRIEF.md` §A9), e o ESLint
   agora reporta cada disable como "Unused eslint-disable directive".
2. **Imports e variáveis não-usadas** — sobras de iterações
   anteriores onde o autor extraiu blocos de código mas não removeu
   o `import` correspondente.
3. **Warnings em `tests/`** — fora do escopo do `npm run lint` /
   `smoke.sh` (que rodam apenas `eslint app/ src/`), mas aparecem
   quando o agente roda `eslint .` no proof-of-work. Ruído visual
   recorrente que mascara warnings reais futuros.

Aritmética verificada via `npx eslint <escopo>` em `7cced9c`
(2026-05-07):

| Escopo | Warnings | Paths | Comentário |
|---|---|---|---|
| `eslint app/ src/` (smoke + npm run lint) | **36** | **24** | Esta sprint zera para 0 |
| `eslint .` (full, inclui `tests/`) | **50** | **30** | +14 em 6 paths de testes — esta sprint também zera |
| `eslint .` (após esta sprint) | **0** | **0** | Meta |

Validação visual via Gauntlet **não se aplica** — sprint puramente
mecânica de manutenção de qualidade de código. Sem impacto em UI,
runtime, schemas ou comportamento observável. Dispensa de E2E
justificada na seção 5.

## 2. Objetivo

Zerar warnings ESLint em todo o repo (escopo `eslint .`), sem
alterar comportamento de runtime nem regras do `eslint.config.js`.
Após esta sprint: `npx eslint .` deve sair com `exit 0` e zero
linhas de warning. Preserva os **3 `console.error` intencionais**
em `src/lib/dev/gauntlet.ts` (capturador de erros do auditoria
2026-05-04 item 27) — esses não geram warning porque a regra
`no-console` não está ativa no `eslint.config.js`.

## 3. Entregáveis

### Arquivos novos

Nenhum. Sprint puramente de remoção/limpeza.

### Arquivos modificados

#### Bloco 1 — Diretivas `eslint-disable` órfãs em `app/` e `src/` (31 ocorrências, 22 paths)

Remover `// eslint-disable-next-line ...` (ou variante de bloco)
que reporta "Unused eslint-disable directive". Linha-por-linha
abaixo, todas confirmadas em `7cced9c`:

**Subgrupo 1A — `no-console` órfão (17 ocorrências, 12 paths em `app/` + 4 paths em `src/`)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/alarmes/novo.tsx:410`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/ciclo/registrar.tsx:212`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/[slug].tsx:145`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/[slug].tsx:178`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/novo.tsx:192`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/diario-emocional.tsx:381`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx:290`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/exercicios/novo.tsx:63`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/humor-rapido.tsx:181`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuCapturaVerde.tsx:283`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuCapturaVerde.tsx:320`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuCapturaVerde.tsx:358`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/diario/MicrofoneButton.tsx:207`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/diario/MicrofoneButton.tsx:261`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/ScannerPreview.tsx:210`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntlet.ts:376`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/sessao.ts:199`

**Subgrupo 1B — `no-require-imports` órfão (9 ocorrências em 6 paths)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_dev/gauntlet.tsx:26`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntletBootstrap.ts:36`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntletBootstrap.ts:43`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntletBootstrap.ts:50`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntletBootstrap.ts:57`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useFotosAgregadas.ts:226`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useHumorHeatmap.ts:85`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/adicionarFotoManual.ts:57`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarFoto.ts:133`

**Subgrupo 1C — `no-explicit-any` órfão (3 ocorrências em 3 paths)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_dev/showcase.tsx:93`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/googleAuth.ts:308`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/sessao.ts:277`

**Subgrupo 1D — `no-undef` órfão (2 ocorrências em 2 paths)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/services/calendarApi.ts:136`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/googleAuth.ts:88`

#### Bloco 2 — Imports e variáveis não-usadas em `app/` e `src/` (5 ocorrências, 4 paths)

Remover o `import` (ou o símbolo dentro de import composto) ou a
declaração de variável que não é referenciada em nenhum lugar do
arquivo.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/[slug].tsx:18` —
  remover `Pressable` do import composto de `react-native`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/index.tsx:17` —
  remover `View` do import composto de `react-native`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/todo.tsx:18` —
  remover `useEffect` do import composto de `react`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntlet.ts:40` —
  remover declaração `const __DEV__` não-referenciada (verificar
  via `rg "__DEV__" src/lib/dev/gauntlet.ts` antes — globais do RN
  podem aparecer; se for binding local órfão, remover).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/googleAuth.ts:20` —
  remover `WebBrowser` do import composto (legado de fluxo OAuth
  que I2-OAUTH ainda não consolidou; sprint I2-OAUTH **continua
  pendente**, mas o símbolo não é usado no estado atual e pode ser
  re-importado quando necessário).

#### Bloco 3 — Warnings em `tests/` (14 ocorrências, 6 paths)

Fora do escopo do `npm run lint` e do `smoke.sh`, mas dentro do
escopo de `eslint .`. Remover para zerar ruído visual no
proof-of-work do executor e em qualquer agente futuro.

**Subgrupo 3A — `no-explicit-any` órfão (8 ocorrências em 2 paths)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx:93`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx:99`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx:118`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx:120`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx:141`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx:156`

**Subgrupo 3B — `no-require-imports` órfão (2 ocorrências em 1 path)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/dev/gauntletBootstrap.test.ts:33`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/dev/gauntletBootstrap.test.ts:48`

**Subgrupo 3C — `no-unused-vars` (6 ocorrências em 4 paths)**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/todo/SheetNovaTarefa.test.tsx:190` —
  remover `getByLabelText` do destructuring (ou prefixar `_` se
  intencional para futuro).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/playwright/m-save-humor.e2e.ts:50` —
  prefixar `nomeA` → `_nomeA` (parâmetro de fixture inevitável,
  segue convenção `argsIgnorePattern: '^_'` do `eslint.config.js`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/playwright/m-save-humor.e2e.ts:51` —
  prefixar `nomeB` → `_nomeB` pela mesma razão.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/marcos/marcosAuto.test.ts:49` —
  remover `fakeHumor` (declaração não-referenciada).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/marcos/marcosAuto.test.ts:62` —
  remover `fakeDiario` (declaração não-referenciada).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/ui/useLarguraFrame.test.ts:13` —
  remover `useWindowDimensions` do import composto.

### Out-of-scope (não tocar nesta sprint)

- **3 `console.error` intencionais** em `src/lib/dev/gauntlet.ts`
  (capturador de erros — auditoria 2026-05-04 item 27, linhas 397-412).
  Não geram warning hoje (regra `no-console` não está no
  `eslint.config.js`) e devem permanecer intactos.
- **Regras do `eslint.config.js`**. Sprint não altera o config —
  apenas remove diretivas que ficaram órfãs do config atual. Se
  o usuário quiser ativar `no-console`/`no-explicit-any`/etc.
  no futuro, isso é sprint separada (`M-ESLINT-RULES-V2` ou
  similar) e exige decisão de produto.
- **Conteúdo funcional dos arquivos**. Mudança cirúrgica: remover
  linha de comentário `// eslint-disable-...`, remover símbolo
  não-usado de import, ou prefixar `_` em fixture. Nada mais.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes
  reais, zero assinaturas. Detalhes em `CLAUDE.md` e
  `VALIDATOR_BRIEF.md` §1.1.
- **Mudanças cirúrgicas** (`GUIDE.md` §3): tocar apenas nas linhas
  listadas no Bloco 1, 2 e 3. Não "melhorar" código adjacente.
  Não reformatar. Não refatorar imports compostos preservados.
- **Sem mudança de comportamento**: nenhuma alteração de runtime.
  `npm test` continua reportando exatamente **1742 passed, 1
  skipped, 176 suites**. Se algum teste mudar de status, parar e
  reportar — significa que algo foi tocado fora do escopo.
- **Sem alterar `eslint.config.js`**: regras do flat-config M01.1
  permanecem como estão. Se aparecer novo warning de regra ativa
  durante a execução, parar e reportar como achado colateral
  (`Task(planejador-sprint)` para registrar `INFRA-NN`).
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013). Não aplicável a esta sprint (não toca em strings UI),
  mas auditoria PT-BR continua rodando no smoke.
- `accessibilityLabel` sem acento (não tocado nesta sprint).
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
  Esta sprint não introduz nem remove `any`; apenas remove
  diretivas de disable de `no-explicit-any` que viraram órfãs.
- Imports via alias `@/*` configurado em `tsconfig.json` —
  preservar os existentes ao remover símbolos individuais.
- **Não tocar arquivos de sprints I2-OAUTH e Bloco P** que ainda
  não fecharam (sem permissão explícita). `googleAuth.ts` está
  no escopo desta sprint apenas para remover símbolo `WebBrowser`
  não-usado e duas diretivas órfãs — qualquer outra mudança em
  `googleAuth.ts` é fora do escopo.

## 5. Validação Gauntlet OU validação humana adb

**Sprint mecânica de manutenção — sem validação Gauntlet/adb.**

Justificativa formal:

1. **Sem toque em UI**: nenhuma alteração de componente
   renderizável, layout, estilo, animação ou string UI.
2. **Sem toque em runtime nativo**: nenhuma alteração de chamada
   de API nativa, SecureStore, SAF, Camera, Haptics ou Notification.
3. **Sem toque em schemas ou dados persistidos**: zero migração,
   zero alteração de Zustand store ou Vault path.
4. **Comportamento observável idêntico**: meta da sprint é
   `git diff` puramente cosmético (remoções de comentários e
   símbolos não-referenciados). Validador-sprint confirma que
   `npm test` mantém baseline 1742/1 e que `git diff --stat` só
   reporta linhas removidas (ou `-` no diff para linhas substituídas
   por equivalente curto).

Validação efetiva é estática e mecânica:

- `npx eslint .` → exit 0, zero warnings.
- `npx tsc --noEmit` → exit 0.
- `npm test` → 1742 passed, 1 skipped, 176 suites.
- `./scripts/smoke.sh` → exit 0.
- `npx expo export --platform android` → exit 0 (sanity de bundle).

## 6. Procedimento sugerido

1. **Snapshot baseline.** Confirmar `git rev-parse HEAD = 7cced9c`.
   Rodar `npx eslint . --max-warnings=9999 2>&1 | tail -5` e
   confirmar `50 problems (0 errors, 50 warnings)`. Rodar
   `npm test --silent 2>&1 | tail -3` e confirmar `1742 passed,
   1 skipped, 1743 total`.
2. **Bloco 1 — diretivas órfãs (subgrupos 1A → 1B → 1C → 1D).**
   Para cada path da seção 3, abrir o arquivo na linha indicada e
   remover apenas a linha do comentário `eslint-disable-...`.
   Se a linha tiver outro conteúdo além do comentário, remover só
   a parte do comentário (preservar código).
3. **Bloco 2 — imports e variáveis não-usadas.** Para cada item
   do Bloco 2, verificar com `rg "<simbolo>" <arquivo>` que não
   existe outro uso no arquivo antes de remover. Em imports
   compostos `import { A, B, C } from 'x'`, remover apenas o
   símbolo apontado, manter o resto.
4. **Bloco 3 — warnings em `tests/`.** Mesma operação dos blocos
   1 e 2 aplicada aos arquivos de teste. Para fixtures de
   Playwright que recebem parâmetros não-usados, prefixar com `_`
   (não remover — quebra contrato da fixture).
5. **Verificação intermediária.** Após cada bloco, rodar
   `npx eslint .` e confirmar redução incremental (50 → 19 → 14 → 0).
6. **Verificação final.** Rodar a bateria runtime-real da seção 7.
7. **Commit único.** `style: m-lint-cleanup zero warnings pos bloco a`
   (sem acento, lowercase). Diff esperado: ~50 linhas removidas
   ou alteradas em ~30 arquivos.
8. **Atualização de docs.** `CHANGELOG.md` em `[Unreleased]`:
   bullet `- style: zera warnings ESLint (50 → 0) em escopo full
   `eslint .` (M-LINT-CLEANUP).` Sem alteração em
   `FEATURES-CANONICAS.md` (sprint não toca features). Sem
   alteração em `STATE.md` ou `ROADMAP.md` (sprint anti-débito
   transversal, orquestrador encaixa posição depois se quiser
   registrar histórico).

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# 1. Anonimato (Regra -1)
./scripts/check_anonimato.sh

# 2. Lint full — meta da sprint
npx eslint . --max-warnings=0

# 3. Typecheck — confirma que remoções não quebraram tipos
npx tsc --noEmit

# 4. Tests — confirma baseline 1742/1
npm test --silent

# 5. Smoke completo (anonimato + PT-BR + typecheck + lint app/src + tests)
./scripts/smoke.sh

# 6. Sanity de bundle (opcional mas recomendado em sprint que toca import)
npx expo export --platform android --output-dir /tmp/m-lint-cleanup-export \
  && rm -rf /tmp/m-lint-cleanup-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

**Aritmética esperada de proof-of-work** (validador-sprint vai
checar):

| Métrica | Antes | Depois | Delta esperado |
|---|---|---|---|
| `npx eslint .` warnings | 50 | 0 | −50 |
| `npx eslint app/ src/` warnings | 36 | 0 | −36 |
| Paths com warning (full) | 30 | 0 | −30 |
| `npm test` passed | 1742 | 1742 | 0 (preservar) |
| `npm test` skipped | 1 | 1 | 0 (preservar) |
| `npm test` suites | 176 | 176 | 0 (preservar) |
| `npx tsc --noEmit` exit | 0 | 0 | 0 |
| Bundle Hermes Android | 7,7 MB | 7,7 MB ±0,01 MB | ~0 (remoções triviais) |

## 8. Commit

```
style: m-lint-cleanup zero warnings pos bloco a
```

Tipo `style`: mudança puramente cosmética/cleanup, sem efeito em
runtime nem em comportamento observável (`CLAUDE.md` Regra de
Commits — tipos válidos incluem `style`).

## 9. Checkpoint visual

**Não aplicável.** Sprint mecânica de manutenção — sem toque em
UI, sem render diferente, sem alteração de comportamento.
Justificativa detalhada na seção 5.

### Checklist obrigatório de manutenção

- [ ] `docs/FEATURES-CANONICAS.md` — **não atualizar** (sprint não
  introduz/modifica/remove feature). Validador-sprint **dispensa**
  este check porque seção 5 declara explicitamente que sprint não
  toca UI nem schema.
- [ ] `STATE.md` — **não atualizar** neste commit (sprint
  transversal anti-débito; orquestrador decide encaixe histórico
  posterior).
- [ ] `ROADMAP.md` — **não atualizar** (sprint não pertence a bloco
  temático numerado).
- [x] `CHANGELOG.md` atualizado em `[Unreleased]` com bullet
  `style: m-lint-cleanup zero warnings ESLint`.
- [ ] `VALIDATOR_BRIEF.md` §1.9 — **não atualizar** (sprint não
  altera política de validação visual).

## 10. Dúvidas em aberto

Nenhuma. Aritmética verificada em `7cced9c` e todos os 50 warnings
catalogados linha-por-linha na seção 3. Hipótese técnica do
orquestrador (36 warnings, 25 paths em escopo `app/ src/`) confere
com a auditoria — divergência de 1 path (24 reais vs 25 hipotetizados)
é margem aceitável e não muda o plano.

---

## Referências

- **Template canônico**: `docs/sprints/_template-spec.md`.
- **Spec irmã (anti-débito mecânico transversal)**:
  `docs/sprints/M-PT-BR-AUDIT-spec.md` — mesmo gênero de sprint.
- **Config ESLint atual**: `eslint.config.js` (flat-config v9+,
  minimalista do M01.1; ver `VALIDATOR_BRIEF.md` §A9).
- **Smoke pipeline**: `scripts/smoke.sh` linhas 22-25 (escopo lint
  é `app/ src/`, não `tests/`).
- **HEAD baseline**: `7cced9c` (`docs: marca o1 [ok] no roadmap`,
  2026-05-07).
