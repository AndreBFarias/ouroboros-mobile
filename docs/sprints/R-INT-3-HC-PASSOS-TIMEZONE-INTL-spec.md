# R-INT-3-HC-PASSOS-TIMEZONE-INTL — Refator timezone do puxadorPassos para Intl

**Tipo**: refactor (correção de invariante runtime)
**Prioridade**: P3
**Estimativa**: 45min
**Tranche**: R-INT (integrações Health Connect)
**Fase**: pós-validação PASSOS

## Contexto

Executor da sprint `R-INT-3-HC-AUTOPULL-PASSOS` implementou
`TZ_OFFSET_MIN = -180` (UTC-3 BRT hardcoded) em
`src/lib/health/puxadores/passos.ts:32-76` quando spec original
exigia `Intl.DateTimeFormat('en-CA', {timeZone: ...})`.

Validador aceitou o merge com ressalva: o desvio é tolerável
hoje (BRT correto para 99% dos usuários atuais + consistência
com `formatDateYmd` em `src/lib/vault/paths.ts`), mas a dívida
ficou registrada porque:

1. Usuário que viajar para outro fuso (ex: visita ao exterior)
   teria barreira "dia em curso" computada incorretamente.
2. Padrão `TZ_OFFSET_MIN` hardcoded contradiz a recomendação
   moderna de usar Intl para qualquer cálculo de calendário
   local.
3. Manter o puxador alinhado com a evolução futura do Vault
   (quando `paths.ts` migrar para Intl em sprint dedicada).

Esta sprint corrige **apenas o puxador**, mantendo o Vault
inalterado (decisão arquitetural ADR pendente sobre `paths.ts`
está fora de escopo).

## Dependências

- **Bloqueia**: nada (refactor isolado).
- **Bloqueado por**: nada. `R-INT-3-HC-AUTOPULL-PASSOS` já está
  mergeada em `main`.

## Escopo (touches autorizados)

### Arquivos a modificar

1. **`src/lib/health/puxadores/passos.ts`** (modificar):
   - Remover constantes `TZ_OFFSET_MIN` (linha 35) e
     `TZ_SHIFT_MS` (linha 36).
   - Remover comentário "Fuso fixo São Paulo (UTC-3...)" das
     linhas 32-34.
   - Introduzir helper `function dataLocalYmd(d: Date, tz?: string): string`
     usando `Intl.DateTimeFormat('en-CA', {timeZone: tz ?? 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'})`.
     `en-CA` retorna formato `YYYY-MM-DD` nativo (sem split manual).
     Fallback `'America/Sao_Paulo'` mantém comportamento BRT
     atual quando `tz` não é passado.
   - Reescrever `isoToDataLocalYmd(iso: string)` (linhas 51-63)
     para delegar a `dataLocalYmd(new Date(iso))`.
   - Reescrever `startOfTodayLocal(now: Date)` (linhas 67-76)
     para usar Intl. Estratégia:
     - Computar string YMD via `dataLocalYmd(now)`.
     - Construir Date a partir desse YMD interpretando `00:00`
       no timezone alvo (técnica: usar `Intl.DateTimeFormat`
       reverso, ou construir ISO `YYYY-MM-DDT00:00:00-03:00`
       quando tz é `America/Sao_Paulo`).
     - Alternativa robusta: usar formatter para extrair offset
       atual do tz, construir Date com shift apropriado.
     - **Detalhe de implementação fica a critério do executor**
       desde que: (a) função aceite parâmetro `tz` opcional com
       default `'America/Sao_Paulo'`; (b) testes com `TZ=UTC` e
       `TZ=America/Los_Angeles` passem (ver seção Testes).
   - Manter assinatura pública de `puxadorPassos` intocada
     (export e shape).

2. **`tests/lib/health/puxadores/passos.test.ts`** (modificar):
   - Adicionar 2 cenários novos ao final do `describe`:
     - **Cenário 10**: timezone UTC (`process.env.TZ = 'UTC'`)
       com clock `2026-05-22T01:00:00.000Z` (que é 22/05 em UTC
       mas ainda 21/05 22:00 BRT). Record com endTime
       `2026-05-22T00:30:00.000Z` deve ser **escrito** quando
       o puxador usa `tz='UTC'` (pois 00:30 está antes da
       barreira `2026-05-22T00:00:00Z`... testar a barreira
       correta para o tz selecionado).
     - **Cenário 11**: timezone America/Los_Angeles (`tz` passado
       explicitamente ou via mock) com clock arbitrário,
       validando que a string `YYYY-MM-DD` retornada e a
       barreira refletem horário de LA, não BRT.
   - **Estratégia para os 2 cenários**: como o puxador não tem
     API pública para passar `tz` (assina apenas
     `{since, pageSize}`), os testes podem:
     - (a) Mockar `Intl.DateTimeFormat` globalmente forçando
       `timeZone` retornar valor controlado, ou
     - (b) Refatorar o puxador para aceitar `tz` opcional via
       parâmetro extra (preferível: extender contrato
       `Puxador.puxar` em `autopullScheduler.ts` é fora de
       escopo; melhor expor helper interno
       `_internals.startOfTodayLocal` para teste).
     - **Decisão final**: executor adota abordagem (b) com
       export `__test__only__` namespace, sem alterar contrato
       público. Documentar a escolha no commit.
   - Manter os 9 cenários antigos intocados (smoke regression).

### Arquivos a NÃO tocar (OFF-LIMITS)

- `src/lib/vault/paths.ts` — `formatDateYmd` mantém
  `TZ_OFFSET_MIN = -180` hardcoded. Vault como um todo migrar
  para Intl é sprint dedicada futura (rastreado em ADR
  pendente). Tocar aqui dispararia revalidação ampla de
  contadores, humor, diário, marcos, medidas, treinos, ciclo,
  exercícios, rotinas — todos com mesma constante local
  (`grep TZ_OFFSET_MIN src/` retorna 12 arquivos).
- `src/lib/health/autopullScheduler.ts` — contrato `Puxador`
  intocado.
- `src/components/data/HumorHeatmap.tsx`, `HeatmapBase.tsx`,
  `src/lib/vault/marcos.ts`, `medidas.ts`, `treinos.ts`,
  `ciclo.ts`, `exercicios.ts`, `src/lib/rotinas/marcacao.ts` —
  todas as constantes `TZ_OFFSET_MIN` locais ficam.

## Acceptance criteria

1. `grep -E "TZ_OFFSET_MIN|TZ_SHIFT_MS" src/lib/health/puxadores/passos.ts`
   retorna **0 matches**.
2. `grep -E "UTC-3|São Paulo|Sao Paulo" src/lib/health/puxadores/passos.ts`
   retorna **0 matches** (comentários antigos limpos).
3. `grep "Intl.DateTimeFormat" src/lib/health/puxadores/passos.ts`
   retorna **≥ 1 match** (helper `dataLocalYmd`).
4. `npx tsc --noEmit` retorna **exit 0**.
5. `npx jest tests/lib/health/puxadores/passos.test.ts` retorna
   exit 0 com **11 cenários** rodados (9 antigos + 2 novos
   timezone).
6. `./scripts/smoke.sh` verde (baseline atual: 1126/130).
7. Comportamento default (`tz` omitido) idêntico ao anterior:
   strings `YYYY-MM-DD` calculadas em BRT batem com o que o
   Vault escreve via `formatDateYmd`.

## Invariantes a preservar

- **Contrato `Puxador<Steps>`**: assinatura
  `puxar({since, pageSize})` intocada; shape de retorno
  `{novos, erro}` intocado. Schedulers e integrações chamam o
  puxador via essa assinatura.
- **Consistência com Vault**: para o default BRT, as strings
  `YYYY-MM-DD` geradas pelo puxador devem bater **bit-a-bit**
  com `formatDateYmd` aplicado ao mesmo Date. Cenário 5
  (idempotência) já cobre isso indiretamente — não pode
  regredir.
- **Não-propagação de exceção**: `puxar` continua capturando
  internamente e retornando `{novos: 0, erro: msg}`. Refactor
  de helpers internos não pode vazar throw.
- **Comentários sem acento**: convenção shell/CI (linha 21 do
  arquivo atual). Manter no código modificado.
- **Anonimato absoluto**: zero menção a "Claude", "AI",
  "Anthropic", autoria. Refactor é cirúrgico (Seção 3 do
  GUIDE.md).

## Plano de implementação

1. Ler `src/lib/health/puxadores/passos.ts` (175 linhas atuais).
2. Ler `tests/lib/health/puxadores/passos.test.ts` (270 linhas
   atuais).
3. Implementar `dataLocalYmd(d: Date, tz?: string): string`
   usando `Intl.DateTimeFormat('en-CA', {timeZone, year, month, day})`.
   Validar manualmente em REPL: `dataLocalYmd(new Date('2026-05-22T15:00:00Z'))`
   deve retornar `'2026-05-22'` com default tz.
4. Implementar `startOfTodayLocal(now: Date, tz?: string): Date`.
   Estratégia recomendada:
   - Pegar YMD via `dataLocalYmd(now, tz)`.
   - Computar offset do tz alvo no instante `now` extraindo
     `timeZoneName: 'shortOffset'` ou via formatter `'longOffset'`.
   - Construir ISO `${ymd}T00:00:00${offset}` → `new Date(iso)`.
5. Substituir corpo de `isoToDataLocalYmd` por
   `return dataLocalYmd(new Date(iso))`.
6. Reescrever `startOfTodayLocal` antigo (linhas 67-76).
7. Remover `TZ_OFFSET_MIN` e `TZ_SHIFT_MS` (linhas 32-36).
8. Limpar comentários obsoletos (linhas 32-34, 47-50, 66-67,
   73-74).
9. Exportar namespace `__test__only__` (ou nome equivalente
   convencional) contendo `dataLocalYmd` e `startOfTodayLocal`
   para os testes.
10. Adicionar cenários 10 e 11 no `passos.test.ts`. Cobrir:
    - Cenário 10: `tz='UTC'`, validar que barreira é `00:00 UTC`
      e que record com endTime no mesmo dia UTC mas dia
      diferente em BRT é tratado conforme tz selecionado.
    - Cenário 11: `tz='America/Los_Angeles'`, validar string
      YMD bate com calendário de LA (PST/PDT — Intl resolve DST
      automaticamente, ao contrário do hardcode atual).
11. Rodar `npx jest tests/lib/health/puxadores/passos.test.ts`
    iterativamente até verde.
12. Rodar `npx tsc --noEmit`.
13. Rodar `./scripts/smoke.sh` (baseline 1126/130).
14. Verificar acentuação dos arquivos modificados:
    `python3 ~/.config/zsh/scripts/validar-acentuacao.py --paths src/lib/health/puxadores/passos.ts tests/lib/health/puxadores/passos.test.ts docs/sprints/R-INT-3-HC-PASSOS-TIMEZONE-INTL-spec.md`.

## Aritmética (delta esperado)

- `src/lib/health/puxadores/passos.ts`: atual 175L.
  - Remoção: ~15L (constantes TZ + comentários + corpo antigo
    de `startOfTodayLocal`).
  - Adição: ~25L (helper `dataLocalYmd` + nova
    `startOfTodayLocal` Intl-based + export `__test__only__`).
  - **Projetado**: 175 - 15 + 25 = **~185L** (delta +10L).

- `tests/lib/health/puxadores/passos.test.ts`: atual 270L.
  - Adição: ~30L (2 cenários novos com setup tz + asserts).
  - **Projetado**: 270 + 30 = **~300L** (delta +30L).

- **Delta total**: ~40L em 2 arquivos. (Spec original
  mencionava ~20L — revisado para cima após análise dos
  helpers efetivamente afetados; ainda dentro de "cirúrgico".)

## Testes

### Cenários novos (10 e 11)

**Cenário 10**: timezone UTC
- Setup: clock `2026-05-22T01:00:00.000Z`, `tz='UTC'`.
- Records: `[{endTime: '2026-05-21T23:00:00.000Z', count: 100}]`.
- Esperado: 1 write com data `'2026-05-21'` (BRT) ou
  `'2026-05-21'` (UTC — neste instante coincidem por azar; o
  teste deve usar instantes que **divirjam** entre BRT e UTC
  para ser significativo).
- **Reformulação**: usar clock `2026-05-22T02:30:00.000Z`
  (que é 22/05 02:30 UTC mas ainda 21/05 23:30 BRT). Record com
  endTime `2026-05-22T00:30:00.000Z` (22/05 em UTC, 21/05 em
  BRT). Validar que com `tz='UTC'` o record é **filtrado**
  (endTime ≥ barreira `2026-05-22T00:00:00Z`), enquanto com
  default BRT seria **escrito** como `'2026-05-21'`.

**Cenário 11**: timezone America/Los_Angeles
- Setup: clock `2026-05-22T15:00:00.000Z` (08:00 PDT / 12:00 BRT),
  `tz='America/Los_Angeles'`.
- Validar que `dataLocalYmd(now, 'America/Los_Angeles')` retorna
  `'2026-05-22'` (correto em LA).
- Validar que `startOfTodayLocal(now, 'America/Los_Angeles')`
  retorna `2026-05-22T07:00:00Z` (00:00 PDT = 07:00 UTC).
- Record com endTime `2026-05-22T06:00:00.000Z` (antes da
  barreira PDT) é **escrito** como `'2026-05-21'` (que era o
  dia em LA naquele instante).

### Baseline

- FAIL_BEFORE = **0** (suite passos verde atualmente; 9/9).
- FAIL_AFTER esperado = **0** com 11/11.

### Smoke regression

- `./scripts/smoke.sh` deve manter baseline (1126 passes / 130
  describes ou superior).

## Proof-of-work esperado

1. Lista de arquivos modificados (2: passos.ts + passos.test.ts).
2. **Diff completo** dos 2 arquivos.
3. Saída `grep -E "TZ_OFFSET_MIN|TZ_SHIFT_MS|UTC-3|São Paulo|Sao Paulo" src/lib/health/puxadores/passos.ts` → vazio.
4. Saída `grep -c "Intl.DateTimeFormat" src/lib/health/puxadores/passos.ts` → ≥ 1.
5. Saída `npx tsc --noEmit` → exit 0.
6. Saída `npx jest tests/lib/health/puxadores/passos.test.ts | tail -10` → 11 passes.
7. Saída `./scripts/smoke.sh | tail -20`.
8. **Hash do commit (OBRIGATÓRIO)**.
9. Saída `python3 ~/.config/zsh/scripts/validar-acentuacao.py --paths src/lib/health/puxadores/passos.ts tests/lib/health/puxadores/passos.test.ts docs/sprints/R-INT-3-HC-PASSOS-TIMEZONE-INTL-spec.md` → exit 0.
10. Saída `python3 scripts/check_strings_ui_ptbr.py` → 0 violações novas (puxador é runtime, não UI; mas script pode varrer; manter clean).
11. Hipótese verificada: `rg "TZ_OFFSET_MIN" src/lib/health/` retorna apenas o que sobrar (zero matches em `puxadores/passos.ts`).
12. Achados colaterais (se houver).

## Riscos e não-objetivos

### Riscos

1. **Quebra de paridade com Vault**: se executor implementar
   `dataLocalYmd` retornando string que diverge de
   `formatDateYmd(paths.ts)` para o mesmo Date em default BRT,
   cenário 5 (idempotência) regride e arquivos Vault ficam
   inconsistentes.
   - **Mitigação**: cenário 5 atual + 2 novos cobrem default
     BRT e tz alternativos. Se cenário 5 regredir, executor
     volta para revisar `dataLocalYmd`.

2. **API Intl inconsistente entre engines**: Hermes (RN) tem
   suporte parcial a `Intl`. `Intl.DateTimeFormat` com
   `timeZone` requer ICU data bundled.
   - **Mitigação**: app já bundla ICU (validado em Onda 3N pela
     suite). Caso falhe em runtime nativo, executor adiciona
     polyfill `intl-pluralrules` ou similar e justifica no
     commit.

3. **Performance**: `Intl.DateTimeFormat` é mais caro que
   aritmética de offset constante. Puxador roda em batch (até
   `pageSize` records).
   - **Mitigação**: criar formatter uma vez por chamada de
     `puxar` (não por record). Cachear instância de formatter
     em closure se necessário. Cenário 2 (3 dias × 4 records)
     já cobre batch — se latência for problema, profiler
     identifica.

### Não-objetivos (escopo fora desta sprint)

- **Migrar `paths.ts` para Intl** — sprint dedicada futura,
  rastreada em ADR pendente. Toca 12 arquivos do Vault.
- **Migrar HumorHeatmap/HeatmapBase para Intl** — UI, não
  runtime crítico. Sprint cosmética.
- **Estender `Puxador.puxar` para aceitar `tz` via contrato** —
  requer mudança em `autopullScheduler.ts` e todos os
  puxadores (Heart Rate, Sleep, etc.). Sprint de contrato.
- **Configurar tz via settings store** — feature de produto,
  não refactor. Avaliar em onda futura quando aparecer
  demanda real (usuário viajando).

## Referências

- BRIEF: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md`
- Precedente histórico: `R-INT-3-HC-AUTOPULL-PASSOS-spec.md`
  (sprint origem, mergeada em `main` com ressalva).
- Arquivo alvo: `src/lib/health/puxadores/passos.ts` (175L).
- Suite alvo: `tests/lib/health/puxadores/passos.test.ts`
  (270L, 9 cenários).
- ADR rastreado: migração futura do Vault para Intl (registrar
  como `ADR-XXXX-vault-intl-timezone.md` quando criado).
- Consistência mantida: `src/lib/vault/paths.ts:46`
  (`TZ_OFFSET_MIN = -180`) — intocado nesta sprint.
