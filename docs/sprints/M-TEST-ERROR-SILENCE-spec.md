# Sprint M-TEST-ERROR-SILENCE — Silenciar `console.error` esperado nos 3 testes de path de erro do save

```
DEPENDE:    HEAD em 6b347a6 (M-TEST-WARNS fechada e pushed) e em
            1b7c663 (M-LINT-CLEANUP fechada e pushed). Working tree
            limpo. Sprint encerra o batch anti-ruído de install.
BLOQUEIA:   Bloco P (release v1.0). Entrar em release com 3 stack
            traces de ~25 linhas cada poluindo `npm test` no
            install.sh mascara regressoes reais e suja a primeira
            impressao para colaboradores novos.
ESTIMATIVA: 15-30min (mecanico, 3 arquivos de teste, sem mudanca
            de comportamento de producao)
PRIORIDADE: baixa-media (anti-debito transversal, sprint irma de
            M-LINT-CLEANUP e M-TEST-WARNS no genero "qualidade
            silenciosa")
```

## 1. Achado / motivação

Após M-LINT-CLEANUP zerar 50 warnings ESLint estáticos e M-TEST-WARNS
zerar 3 warnings runtime de `act`/fake timers, o `./install.sh` e o
`npm test` ainda emitem **3 stack traces gigantes** (~25 linhas cada,
total ~75 linhas) durante a execução de testes que exercem o **path
de erro** do save em SAF off:

```
console.error
  save humor fail Error: SAF off
    at Object.<anonymous> (.../tests/app/humor-rapido.test.tsx:208:...)
    [trace ~25 linhas]
console.error
  save evento fail Error: SAF off
    [trace ~25 linhas]
console.error
  save diario fail Error: SAF off
    [trace ~25 linhas]
```

Os testes **passam** (asserts verdes — `toast error` aparece, `mockBack`
não é chamado, `setSalvando` volta a `false`). O ruído vem do
`console.error` real do código de produção, que continua sendo o
comportamento certo em runtime de app: quando o save falha, o app
loga o erro e mostra toast ao usuário.

### Inventário linha-por-linha (confirmado em working tree limpo, 2026-05-08)

#### A. Emissores em produção (NÃO TOCAR)

```
app/humor-rapido.tsx:181:      console.error('save humor fail', e);
app/eventos.tsx:290:           console.error('save evento fail', e);
app/diario-emocional.tsx:381:  console.error('save diario fail', e);
```

São logs legítimos do path de erro. Permanecem **intactos**.

#### B. Casos de teste que exercem o path de erro

Cada um é um `it` standalone com mock isolado via
`mockX.mockRejectedValueOnce(new Error('SAF off'))`:

| Arquivo | Linha do `mockRejectedValueOnce` | `it` que dispara | Asserts do `it` |
|---|---|---|---|
| `tests/app/humor-rapido.test.tsx` | 208 | `it('toast de erro quando saveHumor falha', ...)` (linhas 207-216) | `expect(queryByLabelText('toast error')).toBeTruthy()` + `expect(mockBack).not.toHaveBeenCalled()` |
| `tests/app/eventos.test.tsx` | 310 | `it('toast de erro quando saveEvento rejeita', ...)` (linhas 309-323) | `expect(queryByLabelText('toast error')).toBeTruthy()` + `expect(mockBack).not.toHaveBeenCalled()` |
| `tests/app/diario-emocional.test.tsx` | 278 | `it('toast de erro quando saveDiario rejeita', ...)` (linhas 277-291) | `expect(queryByLabelText('toast error')).toBeTruthy()` + `expect(mockBack).not.toHaveBeenCalled()` |

Confirmado via grep: **zero ocorrências de `console.error` ou
`spyOn(console, ...)` nos 3 arquivos de teste**. Asserts NÃO dependem
do `console.error` em nenhum dos 3 casos. Spy localizado é seguro e
não destrói cobertura.

#### C. Revisão da decisão de M-TEST-WARNS

Spec da M-TEST-WARNS §C declarou as 3 ocorrências como
"intencionais — permanecem 3 ocorrências após a sprint". Esta sprint
**revoga essa decisão** com base na auditoria atualizada:

- "Intencional" no sentido de "é o efeito esperado do código de
  produção quando save falha" — verdadeiro, mantemos.
- "Intencional" no sentido de "asserts dependem do `console.error`" —
  **falso**, asserts validam `toast error` e `mockBack`, não o
  log. O log é só ruído de teste.

Conclusão: silenciar é seguro. Comportamento de produção fica
inalterado.

#### D. Aritmética de baseline (confirmada por grep no working tree)

```bash
npm test 2>&1 | grep -cE "^\s+save (humor|evento|diario) fail Error: SAF off$"
# Atual: 3 (confirmado 2026-05-08)
# Esperado pos-sprint: 0
```

Se baseline divergir de **3** no início da execução, parar e reportar
— a baseline mudou entre a auditoria do orquestrador (2026-05-08) e
o início da execução, e o plano precisa ser revisto.

## 2. Objetivo

Silenciar os 3 `console.error` "save (humor|evento|diario) fail"
emitidos durante os 3 `it`s do path de erro nos testes de
`tests/app/`, sem alterar a lógica de teste, sem mudar asserts e
sem afetar o baseline 1742 passed / 1 skipped / 176 suites. Ao
final, `npm test 2>&1 | grep -cE "^\s+save (humor|evento|diario) fail Error: SAF off$"`
retorna `0`. Os 3 `console.error` em produção (`app/humor-rapido.tsx`,
`app/eventos.tsx`, `app/diario-emocional.tsx`) permanecem **intactos**.

## 3. Entregáveis

### Arquivos novos

Nenhum. Sprint puramente cirúrgica em 3 arquivos de teste já
existentes.

### Arquivos modificados

Apenas **3 arquivos**, todos em `tests/app/`. Nenhum arquivo de
produção (`src/` ou `app/`) é tocado.

#### Bloco A — `tests/app/humor-rapido.test.tsx`

Editar o `it('toast de erro quando saveHumor falha', ...)` (linhas
207-216). Padrão Jest canônico **dentro do escopo do `it`**:

```diff
   it('toast de erro quando saveHumor falha', async () => {
+    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
     mockSaveHumor.mockRejectedValueOnce(new Error('SAF off'));
     const { getByLabelText, queryByLabelText } = renderTela();
     fireEvent.press(getByLabelText('Salvar'));
     await waitFor(() =>
       expect(queryByLabelText('toast error')).toBeTruthy()
     );
     // Nao deve voltar quando o save falha.
     expect(mockBack).not.toHaveBeenCalled();
+    errorSpy.mockRestore();
   });
```

Edits exatos: **2 linhas adicionadas** (spy + restore). Asserts
preservados. Demais `it`s do `describe` **NÃO tocados** —
`console.error` segue não silenciado neles, garantindo que regressor
futuro com erro inesperado vai aparecer no log.

#### Bloco B — `tests/app/eventos.test.tsx`

Editar o `it('toast de erro quando saveEvento rejeita', ...)` (linhas
309-323):

```diff
   it('toast de erro quando saveEvento rejeita', async () => {
+    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
     mockSaveEvento.mockRejectedValueOnce(new Error('SAF off'));
     const utils = renderTela();
     const { getByLabelText, queryByLabelText } = utils;
     fireEvent.changeText(
       getByLabelText('campo o que aconteceu'),
       'algo aconteceu.'
     );
     adicionarMidiaYoutube(utils);
     fireEvent.press(getByLabelText('Registrar'));
     await waitFor(() =>
       expect(queryByLabelText('toast error')).toBeTruthy()
     );
     expect(mockBack).not.toHaveBeenCalled();
+    errorSpy.mockRestore();
   });
```

Edits exatos: **2 linhas adicionadas**. Asserts preservados.

#### Bloco C — `tests/app/diario-emocional.test.tsx`

Editar o `it('toast de erro quando saveDiario rejeita', ...)` (linhas
277-291):

```diff
   it('toast de erro quando saveDiario rejeita', async () => {
+    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
     mockSaveDiario.mockRejectedValueOnce(new Error('SAF off'));
     const utils = renderTela();
     const { getByLabelText, queryByLabelText } = utils;
     fireEvent.changeText(
       getByLabelText('campo o que aconteceu'),
       'algo aconteceu.'
     );
     adicionarMidiaYoutube(utils);
     fireEvent.press(getByLabelText('Anotar'));
     await waitFor(() =>
       expect(queryByLabelText('toast error')).toBeTruthy()
     );
     expect(mockBack).not.toHaveBeenCalled();
+    errorSpy.mockRestore();
   });
```

Edits exatos: **2 linhas adicionadas**. Asserts preservados.

### Out-of-scope (não tocar nesta sprint)

- **Código de produção** (`app/humor-rapido.tsx`, `app/eventos.tsx`,
  `app/diario-emocional.tsx`). `console.error` continua emitindo em
  runtime real — comportamento correto do app quando save falha.
  Validador-sprint deve confirmar `git diff --stat app/` **vazio**.
- **Outros `it`s** dos 3 arquivos de teste. Spy é estritamente
  localizado dentro dos 3 `it`s do path de erro. `console.error`
  legítimo em outro teste continuará aparecendo no log — comportamento
  desejado para detectar regressões.
- **Configuração Jest** (`jest.config.js`, `jest.setup.ts`).
  Silenciamento global em `beforeEach` global foi rejeitado pela
  mesma razão acima.
- **Refactor de logger configurável em produção** (alternativa
  descartada). Mais invasiva, exige refactor em 3 arquivos de
  produção e mock de boundary novo. Sprint cirúrgica prefere a
  abordagem mínima.

## 4. APIs reutilizáveis

Nenhuma. Sprint usa apenas o padrão Jest canônico
`jest.spyOn(console, 'error').mockImplementation(() => {})` +
`mockRestore()`. Não introduz helper, não importa símbolo novo,
não toca em nenhum arquivo de fixture.

## 5. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes
  reais, zero assinaturas. Detalhes em `CLAUDE.md` e
  `VALIDATOR_BRIEF.md` §1.1. Sprint não cria conteúdo novo, apenas
  ajusta 3 arquivos de teste.
- **Mudanças cirúrgicas** (`GUIDE.md` §3): tocar apenas as 2
  linhas adicionadas em cada `it` do path de erro. Total: **6
  linhas adicionadas em 3 arquivos**, zero linhas removidas, zero
  linhas alteradas. Se diff reportar mais de 3 arquivos modificados
  ou linhas além das enumeradas, parar e reportar.
- **Sem mudança de comportamento de teste**: os 3 `it`s
  continuam testando exatamente as mesmas invariantes
  (`toast error` aparece, `mockBack` não é chamado), com os mesmos
  asserts. `npm test` mantém **1742 passed / 1 skipped / 176
  suites**. Se algum teste mudar de status, parar e reportar — algo
  foi tocado fora do escopo.
- **Sem alterar config Jest** (`jest.config.js`, `jest.setup.ts`,
  `babel.config.js`). Regras flat-config M01.1 e setup global
  permanecem como estão.
- **NÃO TOCAR código de produção**: `app/humor-rapido.tsx`,
  `app/eventos.tsx`, `app/diario-emocional.tsx`. `console.error`
  em produção continua emitindo em runtime real.
- **Verificação obrigatória pós-spy**: após adicionar o spy,
  executor confirma que cada teste ainda passa individualmente
  (rodando `npm test -- tests/app/humor-rapido.test.tsx
  tests/app/eventos.test.tsx tests/app/diario-emocional.test.tsx`).
  Se silenciar fizer algum teste perder valor (ex: passar a
  reportar zero asserts efetivos), **REJEITAR** — neste caso a
  stack trace é justificada e a sprint é abortada.
- **Escopo do silenciamento estritamente local ao `it`**: se o
  executor identificar que precisaria de `beforeEach`/`afterEach`
  no `describe` (ex: porque o describe tem múltiplos `it`s do path
  de erro), inspecionar primeiro se isso amplia o silenciamento
  para outros `it`s. Inspeção atual confirma que cada arquivo tem
  **exatamente 1 `it` do path de erro**, então spy localizado no
  próprio `it` é o padrão correto. Caso descoberta divergente,
  parar e reportar.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013). **Não aplicável** a esta sprint — não toca em
  strings UI.
- `accessibilityLabel` sem acento (não tocado nesta sprint).
- Comentários em código `.ts`/`.tsx` sem acento (convenção
  shell/CI). Sprint não adiciona comentários novos.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem
  justificativa. `jest.spyOn(console, 'error')` é tipado
  corretamente pelo Jest sem casts.
- Imports via alias `@/*` configurado em `tsconfig.json` —
  preservar os existentes; `jest.spyOn` é global do Jest, não
  precisa importar.

## 6. Validação Gauntlet OU validação humana adb

**Sprint mecânica de manutenção em testes — sem validação
Gauntlet/adb.**

Justificativa formal (mesma estrutura de M-LINT-CLEANUP §5 e
M-TEST-WARNS §5):

1. **Sem toque em UI**: nenhuma alteração de componente
   renderizável de produção, layout, estilo, animação, string
   UI ou navegação. Os arquivos tocados são suites de teste.
2. **Sem toque em runtime nativo**: nenhuma alteração de chamada
   de API nativa, SecureStore, SAF, Camera, Haptics, Notification
   ou Voice. Os 3 testes continuam mockando exatamente as mesmas
   APIs como já mockam hoje.
3. **Sem toque em schemas ou dados persistidos**: zero migração,
   zero alteração de Zustand store, zero alteração de Vault path.
4. **Sem toque em código de produção**: `git diff --stat app/`
   deve sair **vazio**. Validador checa isso.
5. **Comportamento observável idêntico**: meta da sprint é
   `npm test` reportar exatamente os mesmos números de
   passed/skipped/suites, mas com 3 stack traces a menos no
   `console.error`. `git diff` reporta 3 arquivos modificados,
   6 linhas adicionadas no total.

Validação efetiva é estática e mecânica:

- `npm test --silent` → 1742 passed, 1 skipped, 176 suites.
- `npm test 2>&1 | grep -cE "^\s+save (humor|evento|diario) fail Error: SAF off$"` → `0` (antes: 3).
- `npx tsc --noEmit` → exit 0.
- `./scripts/smoke.sh` → exit 0.
- `git diff --stat tests/app/humor-rapido.test.tsx tests/app/eventos.test.tsx tests/app/diario-emocional.test.tsx`
  → 3 arquivos reportados, sem outros paths.
- `git diff --stat app/` → vazio.

E2E Playwright **dispensado** — sprint não toca UI nem schema.
Validador-sprint dispensa o requisito de E2E pelos critérios da
seção 5 do `CLAUDE.md` ("Toda sprint que toca UI DEVE entregar
... E2E ..." — *contraposição*: sprint que **não toca UI** não
precisa de E2E).

## 7. Procedimento sugerido

1. **Snapshot baseline.** Confirmar que working tree está limpo
   (`git status` vazio). Rodar:
   ```bash
   cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
   git status --short                  # esperado: vazio
   npm test 2>&1 | grep -cE "^\s+save (humor|evento|diario) fail Error: SAF off$"
   # esperado: 3
   ```
   Se baseline divergir, **parar e reportar** ao orquestrador.

2. **Inspeção de hipótese.** Confirmar que cada arquivo tem
   exatamente **1** `it` do path de erro e nenhum `jest.spyOn`
   de `console.error` pré-existente:
   ```bash
   rg -n "spyOn.*console|console\.error|mockRejectedValueOnce.*SAF" \
     tests/app/humor-rapido.test.tsx \
     tests/app/eventos.test.tsx \
     tests/app/diario-emocional.test.tsx
   # esperado: 3 hits de mockRejectedValueOnce, zero de spyOn/console.error
   ```
   Se houver `spyOn` ou `console.error` pré-existente em qualquer
   um dos 3 arquivos, parar e reportar — escopo precisa ser
   revisto antes do edit.

3. **Edit Bloco A.** Em `tests/app/humor-rapido.test.tsx`,
   localizar o `it('toast de erro quando saveHumor falha', ...)`
   (linha 207). Adicionar `const errorSpy = jest.spyOn(console,
   'error').mockImplementation(() => {});` como primeira linha do
   corpo do `it` e `errorSpy.mockRestore();` como última linha
   antes do `});` de fechamento. Manter indentação e estilo das
   linhas vizinhas.

4. **Edit Bloco B.** Em `tests/app/eventos.test.tsx`, localizar
   o `it('toast de erro quando saveEvento rejeita', ...)`
   (linha 309). Mesmo padrão.

5. **Edit Bloco C.** Em `tests/app/diario-emocional.test.tsx`,
   localizar o `it('toast de erro quando saveDiario rejeita',
   ...)` (linha 277). Mesmo padrão.

6. **Verificação cirúrgica do diff.**
   ```bash
   git diff --stat tests/app/humor-rapido.test.tsx tests/app/eventos.test.tsx tests/app/diario-emocional.test.tsx
   # esperado: 3 arquivos, +6 -0 (2 linhas por arquivo)
   git diff --stat app/
   # esperado: vazio
   ```
   Se diff reportar mais arquivos ou mais linhas, parar e
   investigar antes de continuar.

7. **Verificação dos 3 testes individualmente.**
   ```bash
   npm test -- tests/app/humor-rapido.test.tsx tests/app/eventos.test.tsx tests/app/diario-emocional.test.tsx 2>&1 | tail -10
   # esperado: 3 suites verdes, todos os it()s passando
   ```
   Se algum teste falhar, restaurar o spy e investigar — algum
   assert pode ter dependido implicitamente da forma de log (não
   esperado, mas é a hipótese a verificar).

8. **Verificação completa runtime-real** (seção 8).

9. **Atualizar docs** (seção 9).

10. **Commit final** (seção 10).

## 8. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# Anonimato
./scripts/check_anonimato.sh

# TypeScript strict
npx tsc --noEmit

# Suite completa
npm test --silent
# esperado: Tests: 1 skipped, 1742 passed, 1743 total
#           Test Suites: 176 passed, 176 total

# Aritmetica da meta — 3 stack traces de save fail zerados
npm test 2>&1 | grep -cE "^\s+save (humor|evento|diario) fail Error: SAF off$"
# esperado: 0

# Smoke
./scripts/smoke.sh
# esperado: OK: smoke test passou

# Export Android (sanity check de bundle)
npx expo export --platform android --output-dir /tmp/m-test-error-silence-export \
  && rm -rf /tmp/m-test-error-silence-export

# Diff cirurgico
git diff --stat tests/app/humor-rapido.test.tsx tests/app/eventos.test.tsx tests/app/diario-emocional.test.tsx
# esperado: 3 arquivos, +6 -0
git diff --stat app/
# esperado: vazio
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 9. Atualizações de documentação

### Checklist obrigatório de manutenção

- [ ] `docs/FEATURES-CANONICAS.md` **NÃO atualizar** — sprint não
  introduz, modifica ou remove feature. Apenas silencia ruído de
  log em testes.
- [ ] `STATE.md` atualizado: nova entrada na linha do tempo
  registrando M-TEST-ERROR-SILENCE como fechada, citando o trio
  M-LINT-CLEANUP + M-TEST-WARNS + M-TEST-ERROR-SILENCE como o
  batch anti-ruído de install.
- [ ] `ROADMAP.md` atualizado: marcar
  `M-TEST-ERROR-SILENCE [ok]` no bloco apropriado, mencionando
  que `./install.sh` e `npm test` agora rodam sem nenhum
  `console.error` ou stack trace evitável.
- [ ] `CHANGELOG.md` atualizado em `[Unreleased]` com entrada
  `style: silenciar console.error esperado em 3 testes do path
  de erro do save (M-TEST-ERROR-SILENCE)`.
- [ ] `VALIDATOR_BRIEF.md` **NÃO atualizar §1.9** — política de
  validação Gauntlet/adb não mudou. Se houver seção de aritmética
  ou inventário de ruído de console, atualizar lá (verificar
  durante execução).

## 10. Commit

```
style: m-test-error-silence spy console.error em testes de erro path
```

Tipo: `style` (mecânico, sem mudança de comportamento de
produção).

## 11. Aritmética de meta

| Métrica | Antes | Depois |
|---|---|---|
| `console.error save * fail` (regex preciso) | 3 | 0 |
| Stack trace de console.error em `npm test` (linhas estimadas) | ~75 (3×~25) | 0 |
| Tests passed | 1742 | 1742 |
| Tests skipped | 1 | 1 |
| Test suites passed | 176 | 176 |
| Arquivos de teste modificados | 0 | 3 |
| Arquivos de produção modificados | 0 | 0 |
| Linhas adicionadas (total) | 0 | 6 |
| Linhas removidas (total) | 0 | 0 |

Se executor confirmar baseline de **3** no passo 1 e diff de **3
arquivos / +6 -0** no passo 6, a sprint está alinhada com a
projeção. Qualquer divergência (baseline ≠ 3, ou diff fora do
escopo enumerado) → parar e reportar.

## 12. Riscos e não-objetivos

### Riscos

- **R1 — Spy localizado conflita com fixture global**: se algum
  `beforeEach` global em `jest.setup.ts` ou no próprio describe
  já estiver fazendo spy de `console.error`, o `mockRestore` da
  sprint pode restaurar o spy global ao estado original
  inadequadamente. **Mitigação**: passo 2 do procedimento força
  inspeção via `rg`. Se conflito existir, parar e reportar.
- **R2 — Teste passa a reportar zero asserts efetivos**: pouco
  provável dado que cada `it` tem 2 asserts explícitos
  (`toast error` + `mockBack`), mas validar via passo 7. Se o
  teste passa mesmo com `mockSaveX` retornando sucesso (cenário
  trivial), há regressão escondida. **Mitigação**: rodar com
  `--verbose` se passo 7 levantar suspeita.
- **R3 — Stack trace ainda aparece em outro teste fora do
  escopo**: pode existir teste em outro path (`tests/lib/escrita/`,
  `tests/components/`) que dispare o mesmo `console.error` por via
  indireta. **Mitigação**: verificação 8 com regex preciso captura
  qualquer `save * fail` remanescente; se restar > 0 após sprint,
  achado colateral → dispatchar `INFRA-NN`.

### Não-objetivos

- Refactor de `console.error` em produção para logger
  configurável. Sprint dedicada à abstração de logger fica para
  decisão separada (não há sprint planejada).
- Silenciamento global de `console.error` em `jest.setup.ts`.
  Anti-padrão: esconde regressões legítimas.
- Mudança em outros `it`s dos 3 arquivos. Mesmo que outros
  testes emitam `console.error` no futuro, este será detectado
  pelo log e tratado em sprint própria — escopo desta é
  estritamente os 3 `it`s do path de erro do save.

## 13. Referências

- BRIEF: `VALIDATOR_BRIEF.md` (946 linhas, atualizado 2026-05-08).
- Sprint irmã prévia: `docs/sprints/M-LINT-CLEANUP-spec.md` (commit
  `1b7c663`, 50→0 ESLint warnings).
- Sprint irmã prévia: `docs/sprints/M-TEST-WARNS-spec.md` (commit
  `6b347a6`, 3→0 runtime warns; §C declarava out-of-scope as 3
  ocorrências de `save * fail` — esta sprint revoga essa decisão
  com base em auditoria do escopo dos asserts).
- Template canônico: `docs/sprints/_template-spec.md`.
- `GUIDE.md` global (`~/.claude/CLAUDE.md`): §3 (mudanças
  cirúrgicas) e §4 (execução focada em objetivos).
- `CLAUDE.md` projeto: Regra de Validação Visual (E2E dispensado
  para sprints sem UI).

## 14. Dúvidas em aberto

Nenhuma. Hipótese validada via Read+Grep no working tree limpo
(2026-05-08):

- 3 arquivos de teste cada um com 1 `it` standalone do path de
  erro confirmado.
- Asserts dos 3 `it`s independem do `console.error` (zero
  ocorrências de `console.error` ou `spyOn(console, ...)` nos 3
  arquivos).
- 3 emissores em produção confirmados em paths e linhas exatos.
- Baseline de 3 stack traces confirmado via regex preciso.
- Decisão prévia da M-TEST-WARNS §C revisada e revogada com
  justificativa explícita.

Executor pode prosseguir direto ao passo 1 do procedimento.
