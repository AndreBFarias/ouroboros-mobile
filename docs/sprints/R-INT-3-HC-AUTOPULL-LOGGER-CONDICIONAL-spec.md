# R-INT-3-HC-AUTOPULL-LOGGER-CONDICIONAL — Logger condicional para tag `[hc-autopull]`

**Tipo:** cleanup (logger condicional, sem mudança de lógica)
**Prioridade:** P3
**Estimativa:** 20min
**Fase:** 3
**Origem:** minúcia validador SCHEDULER — `console.log('[hc-autopull]', ...)` poluem release builds em 2 pontos do `autopullScheduler.ts`. Padrão deve ser estabelecido **antes** de B.2-B.6 chegarem com logs próprios.

## Contexto

O `src/lib/health/autopullScheduler.ts` entrou no HEAD com `console.log('[hc-autopull]', ...)` literal em dois pontos (linhas que logam `inicio` e `fim` da orquestração). Em release builds Android, esses logs vazam para `logcat` indefinidamente, consumindo bateria e poluindo diagnostics.

A padronização precisa entrar **agora**, porque as sprints irmãs ainda em fila (`R-INT-3-HC-AUTOPULL-{PASSOS,EXERCICIO,MEDIDAS,MENSTRUACAO,SLEEP}`) vão introduzir logs próprios com a mesma tag — se o helper já existir, os puxadores nascem corretos. Adiar significa retrofit em 5+ arquivos depois.

Confirmado via `rg "console.log\('\[hc-autopull\]'" src/`:

- `src/lib/health/autopullScheduler.ts`: **2 ocorrências** (linhas 121 e 130, segundo varredura atual).
- `src/lib/health/puxadores/passos.ts`: **0 ocorrências** no HEAD `86df505` (ainda não foi mergeada com logs).

O spec preserva `passos.ts` como **touch preventivo opcional** — se a sprint `R-INT-3-HC-AUTOPULL-PASSOS` mergear primeiro com logs, esta sprint absorve a substituição. Se mergear depois, esta sprint só toca `autopullScheduler.ts` + criação do helper.

## Decisões registradas

1. **Helper novo em `src/lib/util/hcLog.ts`.** Verificação prévia confirmou que `src/lib/util/` existe mas não tem helper de log condicional. Não há `src/lib/dev/log.ts` nem variantes. Criar do zero.

2. **Reusar `__DEV__` (global React Native).** Não importar de outro lugar — `__DEV__` é injetado pelo Metro bundler e por Jest via `jest-expo` preset. Em release, `__DEV__ === false` e Terser elimina o bloco inteiro (dead-code elimination).

3. **Tag fixa `[hc-autopull]`.** O helper já carrega a tag — call sites passam apenas os args restantes. Padroniza visual no console dev e facilita grep.

4. **Escopo restrito a `[hc-autopull]`.** A tag `[hc-sync]` em `src/lib/health/sync.ts` (2 ocorrências detectadas) **NÃO entra nesta sprint**. Sprint paralela `R-INT-3-HC-AUTOPULL-LOGGER-CONDICIONAL-SYNC` pode ser materializada depois se necessário — não-objetivo desta.

## Objetivo

Substituir `console.log('[hc-autopull]', ...args)` por `hcLog(...args)` em todos os call sites atuais, criando o helper canônico que call sites futuros (B.2-B.6) vão reusar.

## Escopo (touches autorizados)

**Arquivos a criar:**

- `src/lib/util/hcLog.ts` — ~10L. Conteúdo canônico:

  ```ts
  // Logger condicional para autopull do Health Connect.
  // Tag fixa [hc-autopull]; sumido em release (Terser dead-code).
  // R-INT-3-HC-AUTOPULL-LOGGER-CONDICIONAL.
  export function hcLog(...args: unknown[]): void {
    if (__DEV__) {
      console.log('[hc-autopull]', ...args);
    }
  }
  ```

**Arquivos a modificar:**

- `src/lib/health/autopullScheduler.ts` — substituir as 2 ocorrências `console.log('[hc-autopull]', ...)` por `hcLog(...)`. Adicionar `import { hcLog } from '@/lib/util/hcLog';` no topo (alias `@` já configurado em `tsconfig.json` + `babel.config.js`, verificado em outros imports do mesmo arquivo: `@/lib/stores/settings`).

- `src/lib/health/puxadores/passos.ts` — **touch condicional**. Se `rg "console.log\('\[hc-autopull\]'" src/lib/health/puxadores/passos.ts` retornar matches no momento da execução, substituir. Se retornar 0, **não tocar** o arquivo. Executor deve rodar o `rg` no passo 0.3 e ajustar o plano.

**Arquivos NÃO tocar:**

- `src/lib/health/sync.ts` — tag `[hc-sync]` é escopo de sprint paralela (ver Decisão 4).
- Demais puxadores (`exercicio.ts`, `medidas.ts`, etc.) ainda não existem no HEAD; nascem corretos via reuso do helper nas sprints irmãs.
- Lógica de orquestração, contratos `Puxador`, store de settings — intocados.

## Acceptance criteria

1. Arquivo `src/lib/util/hcLog.ts` existe, exporta `function hcLog(...args: unknown[]): void`, e implementa o guard `if (__DEV__)`.

2. `rg "console.log\('\[hc-autopull\]'" src/` retorna **0 matches**.

3. `rg "hcLog\(" src/` retorna **≥ 2 matches** (no mínimo as 2 substituições em `autopullScheduler.ts`; até 4 se `passos.ts` também tinha logs no momento da execução).

4. `rg "import.*hcLog.*from '@/lib/util/hcLog'" src/lib/health/` retorna **≥ 1 match** (autopullScheduler.ts; +1 se passos.ts foi tocado).

5. `npx tsc --noEmit` exit 0 (nenhum erro de tipo introduzido).

6. `./scripts/smoke.sh` exit 0 (suite Jest 1126/130 baseline preservada — esta sprint não muda comportamento).

7. `scripts/check_anonimato.sh` exit 0 (sem nomes reais nos arquivos novos/tocados).

8. `python3 scripts/check_strings_ui_ptbr.py` exit 0 (nenhuma string UI alterada).

## Invariantes a preservar

- **Comentários sem acento (convenção shell/CI).** Replica do padrão estabelecido em `autopullScheduler.ts:24` e `puxadores/passos.ts:21`. O comentário canônico do `hcLog.ts` segue isso: "Logger condicional para autopull do Health Connect" (sem acento em "condicional").

- **Anonimato absoluto (CLAUDE.md Regra −1).** Helper genérico, zero nome de IA, zero `// by Claude`, zero "AI generated".

- **Identidade de pessoas.** Não aplicável — arquivo só lida com logging, sem identificadores de pessoa.

- **Acoplamento mínimo.** `hcLog.ts` não importa nada do projeto — só usa `console.log` e `__DEV__`. Não deve introduzir ciclos com `stores/`, `health/`, `vault/`.

- **Contrato `Puxador` (autopullScheduler.ts:40-46) intocado.** Substituição é puramente cosmética.

## Plano de implementação

1. **Verificar contagem real no HEAD do executor:**

   ```bash
   rg "console.log\('\[hc-autopull\]'" src/ -c
   ```

   Anotar quantas ocorrências e em quais arquivos. Plano abaixo assume `autopullScheduler.ts:2`, mas se aparecer mais (e.g., `passos.ts:1` se a sprint PASSOS já mergeou), incluir todos no escopo.

2. **Verificar que `src/lib/util/hcLog.ts` NÃO existe ainda:**

   ```bash
   test -f src/lib/util/hcLog.ts && echo "JA EXISTE" || echo "OK criar"
   ```

3. **Criar `src/lib/util/hcLog.ts`** com o conteúdo canônico da seção Escopo.

4. **Editar `src/lib/health/autopullScheduler.ts`:**
   - Adicionar `import { hcLog } from '@/lib/util/hcLog';` agrupado com outros imports `@/lib/...`.
   - Substituir `console.log('[hc-autopull]', 'inicio', { ... })` por `hcLog('inicio', { ... })`.
   - Substituir `console.log('[hc-autopull]', 'fim', { ... })` por `hcLog('fim', { ... })`.

5. **Se `passos.ts` tinha matches no passo 1**, repetir o padrão (import + substituição).

6. **Rodar suite de validação local:**
   - `npx tsc --noEmit`
   - `./scripts/smoke.sh`
   - `scripts/check_anonimato.sh`
   - `python3 scripts/check_strings_ui_ptbr.py`

7. **Confirmar acceptance criteria 2-4 via grep:**

   ```bash
   rg "console.log\('\[hc-autopull\]'" src/    # esperado: 0
   rg "hcLog\(" src/                            # esperado: >= 2
   rg "from '@/lib/util/hcLog'" src/lib/health/ # esperado: >= 1
   ```

## Aritmética

- **`src/lib/util/hcLog.ts` criado:** ~10L (incluindo comentário cabeçalho de 3L + função de 5L + linha em branco final).
- **`src/lib/health/autopullScheduler.ts` modificado:** +1L (import) / 0 net (2 substituições in-place não mudam linecount, apenas conteúdo).
- **`src/lib/health/puxadores/passos.ts`:** condicional — 0L se não tinha logs no HEAD (caso atual); +1L import + 0 net nas substituições se tiver.

**Total esperado:** +10L (criação) + 1L (import scheduler) = **+11L**. Se passos.ts for tocado: +12L.

## Testes

Nenhum teste novo. A mudança é puramente cosmética e o helper é trivialmente correto:

- `__DEV__` é mockado como `true` em Jest (jest-expo preset), então `hcLog` continua logando em testes e mantém paridade com o `console.log` anterior.
- Em release Android, `__DEV__ === false` e o bloco inteiro vira dead-code via Terser (validado empiricamente pelo padrão react-native estabelecido).

**Baseline Jest:** 1126/130 (passing/test files atual em HEAD `86df505`).
**FAIL_BEFORE / FAIL_AFTER esperados:** ambos iguais ao baseline. Nenhum teste deve mudar comportamento.

## Proof-of-work esperado

- **Diff final:** ≤ 12L net (criação de `hcLog.ts` + import + substituições in-place).

- **Comandos a executar e logar saída no PR:**

  ```bash
  rg "console.log\('\[hc-autopull\]'" src/         # exit code != 0 (sem matches)
  rg "hcLog\(" src/                                 # >= 2 matches
  npx tsc --noEmit                                  # exit 0
  ./scripts/smoke.sh                                # exit 0, baseline 1126/130
  scripts/check_anonimato.sh                        # exit 0
  python3 scripts/check_strings_ui_ptbr.py          # exit 0
  ```

- **Não precisa validação visual (Gauntlet).** Sprint não toca UI nem rotas. Acceptance criteria 1-8 cobrem 100% do escopo.

- **Hipótese verificada** (lição 4): grep do identificador novo (`hcLog`) e do path (`@/lib/util/hcLog`) antes de declarar pronto.

## Riscos e não-objetivos

**Riscos:**

- **Race com sprints irmãs em fila.** Se `R-INT-3-HC-AUTOPULL-PASSOS` mergear entre o spec e a execução, o executor pode encontrar logs novos em `passos.ts` que ele precisa incluir no escopo. O passo 1 do plano cobre isso via `rg` no momento da execução.

- **Alias `@/` funcionando.** Confirmado funcionando em `autopullScheduler.ts:26` (`@/lib/stores/settings`), então `@/lib/util/hcLog` deve resolver sem novas configs.

**Não-objetivos (sprints futuras se justificadas):**

- Substituir `console.log('[hc-sync]', ...)` em `src/lib/health/sync.ts`. Tag diferente, sprint paralela.
- Logger condicional para outros módulos (vault, calendar, spotify). Cada qual deve ter seu helper próprio quando vier sprint nova com logs.
- Migrar para um logger estruturado (winston, pino). Overkill para o estado atual; reavaliar pós-v1.0 se diagnostics em produção virarem requisito.
- **Protocolo anti-débito:** se executor identificar outras tags de log poluindo release (`[vault-write]`, `[calendar-sync]`, etc.) durante a execução, **registrar como sprint nova** (`R-INT-3-LOGGER-CONDICIONAL-<TAG>-spec.md`), não absorver nesta.

## Referências

- BRIEF: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md`
- Sprint mãe (origem da minúcia): `docs/sprints/R-INT-3-HC-AUTOPULL-SCHEDULER-spec.md` (HEAD `86df505`)
- Sprints irmãs em fila (vão reusar o helper): `R-INT-3-HC-AUTOPULL-{PASSOS,EXERCICIO,MEDIDAS,MENSTRUACAO,SLEEP}-spec.md`
- Padrão `__DEV__` em React Native: convenção Metro bundler, dead-code elimination via Terser em release.
- CLAUDE.md raiz — Regra −1 (anonimato), Regra de Linguagem (comentários PT-BR com acento; este caso opta por sem-acento seguindo precedente do arquivo).
