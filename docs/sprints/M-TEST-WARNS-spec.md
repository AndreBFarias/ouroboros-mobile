# Sprint M-TEST-WARNS — Zerar warnings runtime evitáveis em `npm test`

```
DEPENDE:    HEAD em 7cced9c (Bloco H–O fechados, o1 marcado [ok])
            + working tree de M-LINT-CLEANUP (PRONTO_PARA_VALIDACAO,
            31 arquivos staged/modificados, ainda não commitada)
BLOQUEIA:   Bloco P (release v1.0) — entrar em release com ruído
            de console em testes mascara regressões reais
ESTIMATIVA: 20-40min (mecânico, 2 arquivos, sem mudança de
            comportamento de produção)
PRIORIDADE: baixa-média (anti-débito transversal, sprint irmã de
            M-LINT-CLEANUP no mesmo gênero "qualidade silenciosa")
```

## 1. Achado / motivação

Durante a execução de **M-LINT-CLEANUP** foi observado que
`npm test --silent` continua produzindo **3 warnings runtime
evitáveis** no console (não são warnings ESLint — são warnings
emitidos pelo React e pelo Jest **em runtime de teste**, durante a
execução das suites). M-LINT-CLEANUP zera o ruído estático
(50 warnings ESLint → 0); esta sprint zera o ruído dinâmico
remanescente (3 warnings runtime → 0), fechando o ciclo.

Inventário linha-por-linha (confirmado em `7cced9c` via
`grep` direto nos arquivos, 2026-05-07):

### A. Warnings de `act(...)` — 2 ocorrências em 1 path

- `tests/components/chrome/FABMenu.test.tsx:49` —
  `useNavegacao.setState({ sheetCapturaAberto: true });` chamado
  fora de `act(...)` dentro do `it('M34.1.1: ...')`. O FABMenu
  re-renderiza reativamente em resposta à mutação do store, e o
  React emite `console.error` warning "An update to FABMenu inside
  a test was not wrapped in act(...)".
- `tests/components/chrome/FABMenu.test.tsx:53` — mesmo padrão,
  agora com `setState({ sheetCapturaAberto: false })`.
- Linha 21 (`beforeEach` com `setState({ menuAberto: false,
  sheetCapturaAberto: false })`) **não** dispara warning porque
  roda **antes** do `render`, então não há componente montado para
  React reportar update. Permanece intacta.
- `act` ainda **não está importado** em `FABMenu.test.tsx`
  (confirmado: linha 8 só importa `fireEvent, render` de
  `@testing-library/react-native`). Esta sprint adiciona `act` ao
  import composto.

### B. Warnings de fake timer — 1 ocorrência em 1 path

- `tests/components/diario/MicrofoneButton.test.tsx:189` —
  `jest.advanceTimersByTime?.(0);` chamado no meio do `it('pressOut
  encerra gravacao e dispara callbacks com texto + path')`. O
  describe `MicrofoneButton ciclo press/release` (linha 157) **não
  ativa fake timers** no `beforeEach` global (linha 127, só faz
  `jest.clearAllMocks()` + reset de listeners). Jest emite
  `console.warn` "A function to advance timers was called but the
  timers APIs are not replaced with fake timers".
- A chamada está cercada por dois loops de drenagem de microtasks
  (`for (let i = 0; i < 10; i++) await Promise.resolve();` nas
  linhas 188 e 191) e por `await new Promise((r) => setTimeout(r,
  0));` na linha 190 — o que sugere que o `advanceTimersByTime?.(0)`
  é **redundante** (operador `?.` indica que o autor já antecipava
  que a API podia não estar disponível). Decisão da sprint:
  **remover a linha redundante**. Validação: rodar o teste após
  remoção e confirmar que continua passando (drenagem por
  microtasks + `setTimeout(r, 0)` é suficiente).
- `act` já está importado no arquivo (linha 12) e o teste já roda
  dentro de `act(async () => { ... })` no escopo das linhas 184-192.

### C. Out-of-scope confirmado (NÃO TOCAR)

3 ocorrências de `console.error` "save (humor|evento|diario) fail"
permanecem **intencionais**: testes de `tests/lib/escrita/`
verificam o caminho de erro do save quando `SAF off` é o cenário
testado. Não são bugs nem ruído — são asserts implícitos do path
de erro. Permanecem 3 ocorrências após a sprint.

### D. Aritmética de baseline (a confirmar pelo executor antes de iniciar)

Validação prévia obrigatória (lição 7 do GUIDE):

```bash
npm test 2>&1 | grep -c "wrapped in act"   # esperado: 2
npm test 2>&1 | grep -c "fake timers"      # esperado: 1
npm test 2>&1 | grep -c "save .* fail"     # esperado: 3
```

Se algum dos três contadores divergir do esperado, **parar e
reportar** — aritmética desalinhada significa que a baseline
mudou entre a auditoria do orquestrador (2026-05-07) e o início
da execução, e o plano precisa ser revisto.

## 2. Objetivo

Zerar os 2 warnings de `act(...)` e o 1 warning de fake timer em
`npm test --silent`, sem alterar a lógica de teste, sem mudar
asserts e sem afetar o baseline 1742 passed / 1 skipped / 176
suites. Ao final, `npm test 2>&1 | grep -E "wrapped in act|fake
timers"` retorna zero linhas. Os 3 `console.error` intencionais
de `save (humor|evento|diario) fail` permanecem como estavam.

## 3. Entregáveis

### Arquivos novos

Nenhum. Sprint puramente de ajuste em 2 arquivos de teste já
existentes.

### Arquivos modificados

Apenas **2 arquivos**, todos em `tests/`. Nenhum arquivo de
produção (`src/` ou `app/`) é tocado.

#### Bloco A — `tests/components/chrome/FABMenu.test.tsx`

1. **Linha 8** — adicionar `act` ao import composto:
   ```tsx
   import { act, fireEvent, render } from '@testing-library/react-native';
   ```
   (manter ordenação alfabética dos símbolos importados, padrão do
   restante dos arquivos de teste do projeto.)

2. **Linhas 49 e 53** (dentro do `it('M34.1.1: esconde quando
   sheetCapturaAberto=true e volta quando false', ...)`) — envolver
   cada `useNavegacao.setState({ ... })` em `act(() => { ... })`
   síncrono. Resultado:
   ```tsx
   act(() => {
     useNavegacao.setState({ sheetCapturaAberto: true });
   });
   rerender(<FABMenu />);
   ```
   E equivalente para `false` na linha 53. Asserts (`expect(...)`)
   permanecem fora do `act`, conforme convenção do
   `@testing-library/react-native`.

3. **Não tocar `beforeEach` (linha 21)** — roda antes do render,
   não dispara warning. Tocar amplia escopo desnecessariamente.

4. **Não tocar `it('M34.1.1: setSheetCapturaAberto alterna a flag
   corretamente', ...)` (linhas 58-64)** — esse teste usa
   `useNavegacao.getState().setSheetCapturaAberto(...)` e **não
   renderiza** componente, portanto não dispara warning de act.
   Mexer amplia escopo.

#### Bloco B — `tests/components/diario/MicrofoneButton.test.tsx`

1. **Linha 189** — remover a chamada redundante:
   ```diff
   -      jest.advanceTimersByTime?.(0);
   ```
   A drenagem de microtasks via dois loops de `Promise.resolve()`
   (linhas 188 e 191) somada ao `await new Promise((r) =>
   setTimeout(r, 0));` (linha 190) já garante que o `setTimeout(0)`
   disparado por `Voice.onSpeechResults` propague antes dos asserts.
   O `?.` no `advanceTimersByTime?.(0)` confirma que o autor
   anteviu o cenário onde fake timers não estão ativos —
   removê-lo é cirúrgico e fiel à intenção original.

2. **Não ativar fake timers no describe** (alternativa rejeitada).
   Ativar `jest.useFakeTimers()` no `beforeEach` muda o
   comportamento de **todos os outros testes do describe**,
   incluindo `pressIn dispara startRecording...` (linha 158) e
   demais. Risco de cascata de mudanças em asserts que dependem de
   timers reais. Remoção da linha 189 é estritamente menos
   invasiva.

3. **Não tocar imports** — `act` já está em uso (linha 12).
   Nenhum símbolo precisa entrar ou sair.

### Out-of-scope (não tocar nesta sprint)

- **3 `console.error` intencionais** "save (humor|evento|diario)
  fail" em `tests/lib/escrita/` — verificam path de erro do save,
  são asserts implícitos do cenário `SAF off`. Permanecem
  exatamente 3 ocorrências após a sprint.
- **Qualquer outro teste** que não esteja nos 2 arquivos do
  Bloco A e Bloco B. Se durante a execução aparecer novo warning
  runtime que não estava na auditoria, parar e reportar como
  achado colateral via `Task(planejador-sprint)` para gerar
  `INFRA-NN`.
- **Configuração Jest** (`jest.config.js`, `jest.setup.ts`).
  Sprint não toca config — apenas remove uma chamada redundante
  e adiciona `act` em dois pontos.
- **Os 31 arquivos da sprint M-LINT-CLEANUP** que estão em
  working tree. Esta sprint adiciona **2 arquivos novos ao diff
  agregado** (`FABMenu.test.tsx` e `MicrofoneButton.test.tsx`)
  sem tocar nenhum dos 31 já modificados por M-LINT-CLEANUP.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes
  reais, zero assinaturas. Detalhes em `CLAUDE.md` e
  `VALIDATOR_BRIEF.md` §1.1. Sprint não cria conteúdo novo, apenas
  ajusta 2 arquivos de teste.
- **Mudanças cirúrgicas** (`GUIDE.md` §3): tocar apenas as linhas
  enumeradas no Bloco A (8, 49, 53 — 3 edits) e Bloco B (189 —
  1 edit). Total: **4 linhas tocadas em 2 arquivos**. Se diff
  reportar mais de 2 arquivos modificados ou linhas além das
  enumeradas, parar e reportar.
- **Sem mudança de comportamento de teste**: os 5 `it(...)` dos 2
  arquivos continuam testando exatamente as mesmas invariantes,
  com os mesmos asserts. `npm test` mantém **1742 passed / 1
  skipped / 176 suites**. Se algum teste mudar de status, parar e
  reportar — algo foi tocado fora do escopo.
- **Sem alterar config Jest** (`jest.config.js`, `jest.setup.ts`,
  `babel.config.js`). Regras do flat-config M01.1 e setup global
  permanecem como estão.
- **Working tree compartilhado com M-LINT-CLEANUP**: a sprint
  M-LINT-CLEANUP está em `PRONTO_PARA_VALIDACAO` com 31 arquivos
  em working tree (modificados, ainda não commitados). Esta
  sprint **adiciona 2 arquivos novos ao diff agregado** sem
  conflito de paths. O validador-sprint deve receber o diff
  conjunto e separar mentalmente: 31 arquivos = M-LINT-CLEANUP,
  2 arquivos = M-TEST-WARNS. Os 2 commits podem sair em sequência
  (`style: m-lint-cleanup ...` primeiro, `style: m-test-warns ...`
  depois) ou serem agregados a critério do orquestrador
  posteriormente.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013). **Não aplicável** a esta sprint — não toca em
  strings UI.
- `accessibilityLabel` sem acento (não tocado nesta sprint).
- Comentários em código `.ts`/`.tsx` sem acento (convenção
  shell/CI). Sprint não adiciona comentários novos.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem
  justificativa. Esta sprint não introduz nem remove `any`.
- Imports via alias `@/*` configurado em `tsconfig.json` —
  preservar os existentes; `act` entra no import composto de
  `@testing-library/react-native` (lib externa, não alias).
- **Não tocar arquivos de produção** (`src/`, `app/`). Esta
  sprint é estritamente sobre `tests/`.

## 5. Validação Gauntlet OU validação humana adb

**Sprint mecânica de manutenção em testes — sem validação
Gauntlet/adb.**

Justificativa formal (mesma estrutura de M-LINT-CLEANUP §5):

1. **Sem toque em UI**: nenhuma alteração de componente
   renderizável de produção, layout, estilo, animação, string
   UI ou navegação. Os arquivos tocados são suites de teste.
2. **Sem toque em runtime nativo**: nenhuma alteração de chamada
   de API nativa, SecureStore, SAF, Camera, Haptics, Notification
   ou Voice. Os 2 testes continuam mockando as mesmas APIs como
   já mockam hoje.
3. **Sem toque em schemas ou dados persistidos**: zero migração,
   zero alteração de Zustand store, zero alteração de Vault path.
4. **Comportamento observável idêntico**: meta da sprint é
   `npm test` reportar exatamente os mesmos números de
   passed/skipped/suites, mas com 3 linhas a menos de ruído no
   `console`. `git diff` reporta 2 arquivos modificados, ~5
   linhas tocadas no total.

Validação efetiva é estática e mecânica:

- `npm test --silent` → 1742 passed, 1 skipped, 176 suites.
- `npm test 2>&1 | grep -c "wrapped in act"` → `0`.
- `npm test 2>&1 | grep -c "fake timers"` → `0`.
- `npm test 2>&1 | grep -c "save .* fail"` → `3` (preservar).
- `npx tsc --noEmit` → exit 0.
- `./scripts/smoke.sh` → exit 0.
- `git diff --stat tests/components/chrome/FABMenu.test.tsx
  tests/components/diario/MicrofoneButton.test.tsx` → ambos
  reportados, sem outros paths.

E2E Playwright **dispensado** — sprint não toca UI nem schema.
Validador-sprint dispensa o requisito de E2E pelos critérios da
seção 5 do `CLAUDE.md` ("Toda sprint que toca UI DEVE entregar
... E2E ..." — *contraposição*: sprint que **não toca UI** não
precisa de E2E).

## 6. Procedimento sugerido

1. **Snapshot baseline.** Confirmar que working tree tem os 31
   arquivos da sprint M-LINT-CLEANUP em working copy. Rodar:
   ```bash
   npm test 2>&1 | grep -c "wrapped in act"   # esperado: 2
   npm test 2>&1 | grep -c "fake timers"      # esperado: 1
   npm test 2>&1 | grep -c "save .* fail"     # esperado: 3
   npm test --silent 2>&1 | tail -3           # esperado: 1742 passed
   ```
   Se algum contador divergir, parar e reportar (lição 7 — meta
   numérica desalinhada antes de começar é bomba-relógio).

2. **Bloco A — `tests/components/chrome/FABMenu.test.tsx`.**
   - Editar linha 8: adicionar `act` ao import composto.
   - Editar linhas 49 e 53: envolver `useNavegacao.setState(...)`
     em `act(() => { ... })` síncrono. Asserts permanecem fora
     do `act`.
   - Não tocar nada além disso.

3. **Verificação intermediária A.** Rodar:
   ```bash
   npm test --silent -- tests/components/chrome/FABMenu.test.tsx 2>&1 | tail -10
   ```
   Confirmar que os 5 `it(...)` do arquivo passam e que zero
   warning "wrapped in act" aparece nessa execução isolada.

4. **Bloco B — `tests/components/diario/MicrofoneButton.test.tsx`.**
   - Remover linha 189 (`jest.advanceTimersByTime?.(0);`).
   - Não tocar imports nem qualquer outra linha.

5. **Verificação intermediária B.** Rodar:
   ```bash
   npm test --silent -- tests/components/diario/MicrofoneButton.test.tsx 2>&1 | tail -10
   ```
   Confirmar que o teste `pressOut encerra gravacao...` continua
   passando e que zero warning de fake timer aparece nessa
   execução isolada.

6. **Verificação final completa.** Rodar a bateria runtime-real
   da seção 7 inteira. Todos exit 0. Aritmética de proof-of-work
   bate.

7. **Commit único** (M-TEST-WARNS):
   ```
   style: m-test-warns zero runtime warns em jest
   ```
   Diff esperado: ~5 linhas em 2 arquivos
   (`tests/components/chrome/FABMenu.test.tsx` +
   `tests/components/diario/MicrofoneButton.test.tsx`).

8. **Atualização de docs.** `CHANGELOG.md` em `[Unreleased]`:
   bullet `- style: zera warnings runtime evitaveis em npm test
   (3 -> 0) (M-TEST-WARNS).` Sem alteração em
   `FEATURES-CANONICAS.md` (sprint não toca features). Sem
   alteração em `STATE.md` ou `ROADMAP.md` (sprint anti-débito
   transversal, orquestrador encaixa posição depois se quiser
   registrar histórico). `VALIDATOR_BRIEF.md` §1.9 não muda
   (sprint não altera política de validação visual).

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# 1. Anonimato (Regra -1)
./scripts/check_anonimato.sh

# 2. Tests — confirma baseline preservado
npm test --silent

# 3. Zero act warnings (meta da sprint, parte A)
npm test 2>&1 | grep -c "wrapped in act"
# Esperado: 0 (antes: 2)

# 4. Zero fake timer warnings (meta da sprint, parte B)
npm test 2>&1 | grep -c "fake timers"
# Esperado: 0 (antes: 1)

# 5. Console.error intencionais preservados (regressão guard)
npm test 2>&1 | grep -c "save .* fail"
# Esperado: 3 (humor + evento + diario; preservar)

# 6. Typecheck — confirma que edits nao quebraram tipos
npx tsc --noEmit

# 7. Smoke completo (anonimato + PT-BR + typecheck + lint app/src + tests)
./scripts/smoke.sh

# 8. Diff cirurgico — somente 2 arquivos novos no diff agregado
git diff --stat tests/components/chrome/FABMenu.test.tsx \
                tests/components/diario/MicrofoneButton.test.tsx
# Esperado: ambos arquivos listados, sem outros paths.

# 9. Sanity de bundle (opcional; baixa probabilidade de impacto
#    pois sprint só toca tests/, mas mantem para paridade com
#    M-LINT-CLEANUP)
npx expo export --platform android --output-dir /tmp/m-test-warns-export \
  && rm -rf /tmp/m-test-warns-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

**Aritmética esperada de proof-of-work** (validador-sprint vai
checar):

| Métrica | Antes | Depois | Delta esperado |
|---|---|---|---|
| `act(...)` warnings em `npm test` | 2 | 0 | −2 |
| `fake timers` warnings em `npm test` | 1 | 0 | −1 |
| `save (humor\|evento\|diario) fail` (intencional) | 3 | 3 | 0 (preservar) |
| Total `console.error` em testes | 5 | 3 | −2 |
| Total `console.warn` em testes | 1 | 0 | −1 |
| `npm test` passed | 1742 | 1742 | 0 (preservar) |
| `npm test` skipped | 1 | 1 | 0 (preservar) |
| `npm test` suites | 176 | 176 | 0 (preservar) |
| `npx tsc --noEmit` exit | 0 | 0 | 0 |
| Arquivos modificados (M-TEST-WARNS) | 0 | 2 | +2 |
| Linhas tocadas (M-TEST-WARNS) | 0 | ~5 | +5 |
| Bundle Hermes Android | 7,7 MB | 7,7 MB ±0,01 MB | ~0 (sprint não toca prod) |

## 8. Commit

```
style: m-test-warns zero runtime warns em jest
```

Tipo `style`: mudança puramente cosmética/cleanup, sem efeito em
runtime de produção nem em comportamento observável de teste
(asserts permanecem). Sprint irmã de M-LINT-CLEANUP no mesmo
gênero "qualidade silenciosa" — mesma justificativa de tipo de
commit (`CLAUDE.md` Regra de Commits — tipos válidos incluem
`style`).

## 9. Checkpoint visual

**Não aplicável.** Sprint mecânica de manutenção em arquivos de
teste — sem toque em UI de produção, sem render diferente, sem
alteração de comportamento observável. Justificativa detalhada
na seção 5.

### Checklist obrigatório de manutenção

- [ ] `docs/FEATURES-CANONICAS.md` — **não atualizar** (sprint não
  introduz/modifica/remove feature). Validador-sprint **dispensa**
  este check porque seção 5 declara explicitamente que sprint não
  toca UI nem schema.
- [ ] `STATE.md` — **não atualizar** neste commit (sprint
  transversal anti-débito; orquestrador decide encaixe histórico
  posterior, junto com M-LINT-CLEANUP).
- [ ] `ROADMAP.md` — **não atualizar** (sprint não pertence a
  bloco temático numerado).
- [x] `CHANGELOG.md` atualizado em `[Unreleased]` com bullet
  `style: m-test-warns zera warnings runtime evitaveis em npm
  test (3 -> 0)`.
- [ ] `VALIDATOR_BRIEF.md` §1.9 — **não atualizar** (sprint não
  altera política de validação visual).
- [ ] `VALIDATOR_BRIEF.md` §4 (Armadilhas) — **não atualizar**
  (sprint não descobriu armadilha de plataforma; o `act` warning
  e o fake timer warning são padrões conhecidos de
  React/Jest, não armadilhas específicas do projeto).

## 10. Dúvidas em aberto

Nenhuma. Hipótese técnica do orquestrador (2 act warnings em
`FABMenu.test.tsx:49,53` e 1 fake timer warning em
`MicrofoneButton.test.tsx:189`) confere com auditoria via
`grep` direto nos arquivos do HEAD `7cced9c`. Decisão
arquitetural de **remover linha 189** em vez de **ativar fake
timers no describe** é justificada por princípio de menor
invasividade (`GUIDE.md` §3 — mudanças cirúrgicas) — uma
alternativa ampliaria o escopo para todos os testes do describe
`MicrofoneButton ciclo press/release`, que dependem de timers
reais (`setTimeout(r, 0)` na linha 190 já é parte da estratégia
de drenagem de microtasks pós-pressOut).

---

## Referências

- **Template canônico**: `docs/sprints/_template-spec.md`.
- **Spec irmã (mesmo gênero anti-débito mecânico)**:
  `docs/sprints/M-LINT-CLEANUP-spec.md` — sprint imediatamente
  anterior, working tree compartilhada.
- **Spec irmã anterior (mesmo gênero)**:
  `docs/sprints/M-PT-BR-AUDIT-spec.md` — auditoria de acentuação,
  precedente de validação automática.
- **`@testing-library/react-native` `act`**: API canônica para
  envolver mutações que disparam re-render. Já usada em outros
  arquivos do projeto (`MicrofoneButton.test.tsx:12,161,178,184`,
  entre outros). Esta sprint apenas estende seu uso ao
  `FABMenu.test.tsx`.
- **HEAD baseline**: `7cced9c` (`docs: marca o1 [ok] no roadmap`,
  2026-05-07). Mesmo HEAD de M-LINT-CLEANUP.
- **GUIDE.md §3** (Mudanças cirúrgicas) e **§4** (Execução focada
  em objetivos) — princípios aplicados na decisão de remover
  linha 189 em vez de reconfigurar fake timers globalmente.
