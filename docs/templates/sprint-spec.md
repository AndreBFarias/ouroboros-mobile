# Template canônico de spec de sprint — v2

Este arquivo é a **forma canônica** de toda spec de sprint nova do
Ouroboros Mobile a partir da Onda R (`R-DX-1`, 2026-05-17).
Consolida o padrão observado em 48+ specs entregues (Q-series,
M-series, AUDIT-series, INFRA-series, I-series, R-series).

Quando criar `docs/sprints/<ID>-spec.md`:

1. Copie a seção `Estrutura canônica` abaixo (entre os blocos
   `<!-- TEMPLATE-INICIO -->` e `<!-- TEMPLATE-FIM -->`).
2. Preencha todas as 8 seções obrigatórias.
3. Mantenha a ordem e o cabeçalho do bloco de código.
4. Cite paths absolutos quando referenciar arquivos a tocar.

A regra de fundo: qualquer Opus em sessão fresh deve conseguir
**executar a sprint sem precisar do histórico da conversa**, lendo
apenas a spec + os arquivos referenciados nela.

---

## Por que v2

A v1 (`docs/sprints/_template-spec.md`) tinha 10 seções com prosa
longa, refletindo o padrão das sprints M-series (M01-M19) onde
ainda cabia "Procedimento sugerido" e "Dúvidas em aberto" como
seções de primeira classe. As 48 sprints da Onda R (R-CRIT,
R-RECAP, R-HOME, R-FAB, R-MEDIA, R-CROSS-FLOW, R-DX, R-OPS) já
operam num modelo enxuto, com OFF-LIMITS explícito, Proof-of-work
numerado e Fonte canônica apontando para `ONDA-R-BRIEFING.md` ou
relatório de auditoria.

A v2 destila esse padrão recente. Mantém v1 como referência
histórica — não substitui em retrofit.

---

## Lições incorporadas

Cada item abaixo já apareceu em pelo menos uma sprint da Onda R
como achado durável. O template força a sprint nova a respeitá-los
antes de gerar débito.

### Lição 1 — Validar identifiers via grep antes de implementar

Spec que cita função, store, hook ou path como já existente **deve
ter sido conferida via `rg "<identificador>"`** antes de virar
texto. Caso contrário, o executor para no Passo 0.3 e devolve a
sprint como hipótese divergente.

Aplicado nas seções: **Hipóteses técnicas** e **Entregáveis**
(quando citarem reutilização).

### Lição 2 — Reutilizar > criar novo

Antes de criar componente, store ou helper novo, listar
explicitamente em **APIs reutilizáveis** o que já existe e por
que não cobre o caso. Se cobre parcial, refatorar antes de criar.

Aplicado na seção: **APIs reutilizáveis**.

### Lição 3 — Worktree isolation obrigatório

Todo agente executor trabalha em
`.claude/worktrees/agent-<id>/`. Nunca commitar direto na raiz.
Hook `hooks/agent-worktree-check.sh` bloqueia bypass; o executor
sempre roda `./scripts/bootstrap-worktree.sh` antes de tocar
qualquer arquivo.

Aplicado na seção: **Verificação canônica** (passos preparatórios)
e **Proof-of-work** (path do worktree + branch).

### Lição 4 — accessibilityLabel sem acento; UI com acento

Strings visíveis em PT-BR com acentuação completa (Sentence case).
`accessibilityLabel` sem acento (convenção screen reader; o
`check_strings_ui_ptbr.py` ignora automaticamente).

Aplicado na seção: **Restrições** (item explícito).

### Lição 5 — Tests primeiro em sprints novas

Sprint que introduz comportamento testável entrega o teste no
mesmo commit. Cobertura mínima: 1 caso positivo + 1 caso
negativo/edge. Sem teste, validador-sprint recusa.

Aplicado na seção: **Entregáveis** (subseção "Testes") e
**Proof-of-work** (saída `npx jest`).

### Lição 6 — Commit no worktree antes de cherry-pick

O executor commita no worktree dele (branch
`worktree-agent-<id>`); o orquestrador é quem decide se faz
cherry-pick para `main`. Não pushar do worktree sem instrução
explícita.

Aplicado na seção: **Proof-of-work** (hash do commit + branch
worktree).

### Lição 7 — Aritmética de refactor (ADR-06 Luna)

Spec que declara meta numérica (`arquivo.py < 800L`) deve listar
a extração planejada em linhas e o projetado final. Se
`atual − extração > meta`, a spec é rejeitada formalmente antes
da implementação.

Aplicado na seção: **Hipóteses técnicas** (item explícito quando
o tipo é `refactor`).

### Lição 8 — Decisões explícitas, não implícitas

Spec que escolheu Opção C entre A/B/C deve documentar **qual** e
**por quê**. Sem isso, a próxima sprint não sabe se a opção foi
deliberada ou acidental.

Aplicado na seção: **Decisões herdadas**.

### Lição 9 — OFF-LIMITS explícito sempre

Toda sprint declara `Pode tocar` e `Não pode tocar` em paths
exatos. Sem isso, achado colateral vira fix inline silencioso e
gera débito que aparece 3 sprints depois.

Aplicado na seção: **OFF-LIMITS**.

### Lição 10 — Fonte canônica é o vínculo com a origem

Spec aponta para o briefing, relatório de auditoria ou issue que
a originou. Sem fonte canônica, sprint vira ideia solta e a
intenção original perde-se quando o autor sai de férias.

Aplicado na seção: **Fonte canônica**.

---

<!-- TEMPLATE-INICIO -->

## Estrutura canônica (copie a partir daqui)

````markdown
# <ID> — <NOME-CURTO-EM-CAIXA-ALTA>

**Tipo**: <feature | fix | refactor | infra | docs | perf | test | style>
**Prioridade**: <P0-critical | P1-high | P2-medium | P3-low>
**Estimativa**: <30min | 1-2h | 2-3h | 3-5h | 1d>
**Tranche**: <R-CRIT | R-RECAP | R-HOME | R-FAB | R-MEDIA | R-CROSS-FLOW | R-DX | R-OPS | M | Q | I | AUDIT | INFRA>
**Fase**: <1 | 2 | 3>

## Fonte canônica

Briefing em [`/ONDA-<X>-BRIEFING.md`](../../ONDA-<X>-BRIEFING.md) §<seção>.
(ou) Auditoria em `docs/auditoria-<contexto>-<data>/RELATORIO.md` cenário <N>.
(ou) Issue GitHub `gh issue view <N>`.

<1 a 3 parágrafos resumindo o sintoma, contexto e motivação.
Foque em comportamento observável, não em implementação.>

## Hipóteses técnicas

<Lista numerada das hipóteses sobre causa raiz ou caminho de
solução. Cada item DEVE ter sido validada por grep antes de virar
spec (lição 1). Exemplo:>

1. **`<identificador>`** já existe em `<path>:<linha>` — comprovado
   via `rg "<identificador>" src/`. Cobre <X> mas falta <Y>.
2. **Regressão em <feature>** — `git log -- <path>` mostra commit
   `<sha>` introduzindo o caminho atual; possível side effect de
   <outra sprint>.
3. **Aritmética de refactor** (lição 7, somente se tipo = refactor):
   - Arquivo atual: <path> tem <N>L
   - Extração planejada: <E>L para <novo path>
   - Projetado final: <N-E>L
   - Meta declarada: <M>L — projetado deve ser menor ou igual a M.
     Se projetado > M, REJEITAR a sprint antes de implementar.

## APIs reutilizáveis

<Componentes, stores, hooks e schemas existentes que devem ser
usados. Cite paths exatos para evitar reimplementação (lição 2).>

- `<path>` — <o que reaproveitar>
- `<path>` — <o que reaproveitar>

## Entregáveis

### Arquivos novos

- `<path absoluto>` — <descrição do conteúdo>
- `tests/<area>/<arquivo>.test.tsx` — <caso positivo + edge>
  (lição 5)

### Arquivos modificados

- `<path absoluto>` — <descrição da mudança e por quê>

### Testes

- Caso positivo: <descrição>
- Caso negativo/edge: <descrição>
- (se aplicável) E2E Gauntlet em
  `tests/e2e/playwright/<id>.e2e.ts` copiado de
  `docs/templates/e2e-template.e2e.ts`.

### Documentação

- [ ] `docs/FEATURES-CANONICAS.md` atualizado (obrigatório se
  toca UI, schema ou feature visível ao usuário).
- [ ] `STATE.md` atualizado.
- [ ] `ROADMAP.md` atualizado (status do tile).
- [ ] `CHANGELOG.md` em `[Unreleased]` atualizado.
- [ ] `VALIDATOR_BRIEF.md` §1.9 atualizado (se mudou política
  de validação visual).

## Dependências

- **Bloqueia**: <lista de sprints que esperam esta>
- **Bloqueado por**: <lista de sprints que precisam fechar antes>
- **Decisão pendente**: <D<N> em ONDA-X-BRIEFING ou ADR-NNNN>

## OFF-LIMITS

Padrão T1 (lição 9).

**Pode tocar**:
- `<path absoluto>` — <razão>
- `<path absoluto>` — <razão>

**Não pode tocar**:
- <padrão de path> — <razão; tipicamente "sprint paralela ativa">
- `pessoas.config.ts` — nomes reais nunca neste arquivo
- `package.json` — sem permissão explícita do dono
- `tsconfig.json`, `babel.config.js`, `metro.config.js` — sem
  permissão explícita do dono

## Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Validado por `./scripts/check_anonimato.sh`.
- **Sem emojis** em código, docs, commits, mensagens de UI.
- **Strings de UI em Sentence case com acentuação completa PT-BR**
  (lição 4). Validado por
  `python3 scripts/check_strings_ui_ptbr.py`.
- **`accessibilityLabel` sem acento** (lição 4; convenção screen
  reader).
- **Comentários em código `.ts`/`.tsx` sem acento** (convenção
  shell/CI).
- **Mensagens de commit sem acento** (convenção shell/CI).
- **TypeScript strict** — sem `any`, sem `@ts-ignore` sem
  justificativa inline.
- **Imports via alias `@/*`** configurado em `tsconfig.json`.
- **Worktree obrigatório** (lição 3): trabalhar em
  `.claude/worktrees/agent-<id>/`, branch
  `worktree-agent-<id>`. Hook
  `hooks/agent-worktree-check.sh` bloqueia bypass.

## Verificação canônica

```bash
# Preparação obrigatória (lição 3):
git rev-parse --show-toplevel
./scripts/bootstrap-worktree.sh

# Checks de invariantes:
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent -- --testPathPattern="<TEST_PATTERN>"

# Smoke completo:
./scripts/smoke.sh
```

Para sprints que tocam UI runtime, adicionar:

```bash
./scripts/check_gauntlet_leak.sh
# Gauntlet em sessão paralela (somente sprints que tocam UI):
# ./gauntlet.sh  -> http://localhost:8081/_dev/gauntlet
```

Todos exit 0. Se algum quebrar, parar e reportar — não bypassar.

## Decisões herdadas

<Decisões que esta sprint absorve e que a próxima sprint precisa
herdar (lição 8). Exemplos:>

- **Toggle X é opt-in default OFF** porque <razão>.
- **Timeout 10s** porque SAF write em /sdcard/Documents/ leva
  menos de 500ms em devices saudáveis; 10s cobre OEMs lentos.
- **Opção C escolhida** entre A/B/C porque <razão registrada em
  ADR-NNNN>.

## Proof-of-work

1. Lista de arquivos criados/modificados (`git diff --name-only`).
2. Saída `npx jest --silent | tail -5` (lição 5).
3. Saída `./scripts/smoke.sh` (últimas 10 linhas).
4. **Hash do commit (OBRIGATÓRIO)** — `git rev-parse HEAD`.
5. Path do worktree + branch (lição 6) — `git rev-parse
   --show-toplevel` + `git branch --show-current`.
6. (se aplicável) E2E novo + screenshots em
   `docs/sprints/<ID>-screenshots-gauntlet/`.
7. (se aplicável) Validação Nível C ADB descrita
   explicitamente com path esperado no Vault.
8. Achados colaterais — lista de bugs/débitos descobertos fora
   do escopo, com path:linha e proposta de sprint nova
   (NUNCA fix inline silencioso).
````

<!-- TEMPLATE-FIM -->

---

## Convenções comuns

### Numeração

- **R-`<TRANCHE>`-`<N>`** — sprints Onda R (R-CRIT-1, R-HOME-2,
  R-DX-3, R-CROSS-FLOW-FIX-1).
- **M`<NN>`** — sprints inteiras Onda M (M04, M05).
- **M`<NN>`.`<x>`** — sub-sprints de fix da sprint mãe.
- **Q`<N>`** — sprints Onda Q (Q0-Q21).
- **I-`<FEATURE>`** — sprints isoladas por feature (I-DIARIO,
  I-FOTO).
- **AUDIT-`<ID>`** — sprints de auditoria sistemática.
- **INFRA-`<ID>`** — sprints de infraestrutura.

### Sumário de testes

Cada sprint deve **manter ou aumentar** o total de testes. Não
reduzir. Se um teste virar inválido por mudança de API,
atualizar — não deletar — e justificar no commit.

### Política de validação visual

Toda sprint que toca UI termina com **pedido explícito ao usuário**
para checkpoint visual. Política de 3 níveis em
`VALIDATOR_BRIEF.md` §1.9:

- **Nível A+ — Gauntlet (default e obrigatório para sprints
  novas).** `./gauntlet.sh` + playwright MCP.
- **Nível B — Emulador Android** (sob demanda, sem permissão).
  APIs nativas (haptic, SAF, SecureStore).
- **Nível C — Celular físico** (**precisa permissão explícita**).
  Só para Syncthing real, share intent, fotos reais, checkpoint
  visual de fim de sprint.

### Templates relacionados

- **`docs/sprints/_template-spec.md`** — template v1, padrão
  Onda M. Mantido para retrofit histórico.
- **`docs/sprints/_TEMPLATE-SAVE-FEATURE.md`** — template
  específico para sprints `M-SAVE-<FEATURE>-VALIDA` do Bloco I.
- **`docs/templates/e2e-template.e2e.ts`** — template de caso
  E2E para validação via Gauntlet. Copiar para
  `tests/e2e/playwright/<id>.e2e.ts`.

### Sprints sem UI

Sprints de docs, refactor de stores ou backend não precisam de
checkpoint visual. Registrar na seção **Verificação canônica**
apenas: "Sprint documental/refactor — sem validação Gauntlet/adb."
