# Sprint R-INFRA-JEST-FLAKY-TIMEOUT — Estabilizar smoke jest sob paralelismo

```
DEPENDE:    HEAD em 3702b08 (post r-nav-3-v2). R-RECAP-LISTA-FIX-LOOP em execução achou esse débito.
BLOQUEIA:   nenhuma sprint funcional; bloqueia confiança no CI/pre-push.
ESTIMATIVA: 1-2h
ORIGEM:     achado colateral durante execução de R-RECAP-LISTA-FIX-LOOP (2026-05-17).
```

## 1. Objetivo

Eliminar a flakiness sistêmica do `./scripts/smoke.sh` causada por
timeouts de 5000ms em `afterEach` do `@testing-library/react-native`
quando jest workers competem por CPU. Hoje o smoke alterna entre
verde e 3-8 testes falhando aleatoriamente entre runs sem que tenha
havido mudança no código; isso erode a função do smoke como
guard-rail de pre-commit/pre-push e gera ruído de "ERRO: testes
falharam" em sprints saudáveis.

## 2. Entregáveis

### Arquivos novos

- Nenhum.

### Arquivos modificados

- `package.json` — adicionar bloco `jest.testTimeout` (sugerido 15000ms)
  e investigar `jest.maxWorkers` (alvo: número que estabiliza sem
  serializar — provavelmente `'50%'` ou `2`).
- `jest.setup.cjs` — opcionalmente adicionar `jest.setTimeout(15000)`
  global (mesmo efeito do `testTimeout`, escolher o caminho mais
  idiomático para jest-expo 54).

### Arquivos a NÃO tocar

- Qualquer arquivo de teste em `tests/` (a flakiness não é por bug
  de teste; é por timeout). Se a investigação revelar teste que está
  realmente lento por design, registrar nova sprint específica para
  o teste em questão, fora do escopo desta.
- Código em `app/` ou `src/` (não muda runtime, só configura test
  runner).

## 3. APIs reutilizáveis

- `package.json#jest` — bloco de config jest já existente; adicionar
  campos sem reorganizar o existente.
- `jest.setup.cjs` — arquivo de setup já existente (19KB).

## 4. Restrições

- **Regra −1** (Anonimato): aplicável ao spec/docs/commits — sem
  referência a IA, sem nomes reais.
- Comentários em config sem acento (convenção shell/CI).
- Mensagem de commit sem acento.
- Sem `any`, sem `@ts-ignore`.
- Não introduzir dependência nova (sem `npm install` de novo pacote).
  Solução é só ajuste de config.
- Não rodar `npx expo prebuild` ou comando que altere lockfile como
  efeito colateral.

## 5. Validação Gauntlet OU validação humana adb

Sprint puramente de infraestrutura de testes — **sem toque em UI**.
Declarar: "Sprint documental/infra — sem validação Gauntlet/adb."

## 6. Procedimento sugerido

1. **Baseline empírico pre-fix** (10 runs consecutivos):
   ```bash
   cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
   for i in 1 2 3 4 5 6 7 8 9 10; do
     echo "--- run $i ---"
     ./scripts/smoke.sh > /tmp/smoke-pre-$i.log 2>&1
     echo "exit=$?"
     grep -E "^Tests:" /tmp/smoke-pre-$i.log | tail -1
   done
   ```
   Registrar média de falhas e taxa de passagem (passes/10).

2. **Investigar quem são os principais "lentos":**
   ```bash
   for f in /tmp/smoke-pre-*.log; do
     grep "^FAIL " "$f"
   done | sort | uniq -c | sort -rn | head -10
   ```
   Confirmar hipótese: falhas são sempre `Exceeded timeout of 5000 ms
   for a hook` (não falha lógica de assertion).

3. **Caminho A — bump testTimeout:**
   Editar `package.json` adicionando ao bloco `"jest"`:
   ```json
   "testTimeout": 15000
   ```
   Re-rodar 10 runs. Se passar 10/10, registrar e parar.

4. **Caminho B — maxWorkers explícito (se A não bastar):**
   Editar bloco `"jest"`:
   ```json
   "maxWorkers": "50%"
   ```
   (ou valor menor como `2`). Avaliar trade-off de duração total vs
   estabilidade. Re-rodar 10 runs.

5. **Caminho C — combinação A+B (fallback):**
   Aplicar ambos. Registrar duração média antes vs depois para
   garantir que smoke não passou de ~40s.

6. Atualizar `STATE.md` e `CHANGELOG.md` em `[Unreleased]` registrando:
   "infra: smoke jest 0/N runs falhos -> 10/10 verde (testTimeout
   15000ms, maxWorkers 50%)".

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# Critério forte: 10 runs consecutivos do smoke devem passar todos.
for i in 1 2 3 4 5 6 7 8 9 10; do
  ./scripts/smoke.sh > /tmp/smoke-post-$i.log 2>&1 || {
    echo "FALHA no run $i"; exit 1;
  }
done
echo "OK: 10/10 runs verdes"

# Sanity sobre duracao media (nao deve regredir mais de 50%).
grep -E "real|Time:" /tmp/smoke-post-*.log
```

Todos exit 0 em 10 runs consecutivos.

## 8. Commit

```
chore: r-infra-jest-flaky-timeout estabiliza smoke
```

Tipo: `chore`.

## 9. Checkpoint visual

Não aplicável (sprint sem UI).

### Checklist obrigatório de manutenção

- [ ] `STATE.md` atualizado (registra HEAD pós-fix).
- [ ] `CHANGELOG.md` atualizado em `[Unreleased]` com bullet
  "infra: jest testTimeout/maxWorkers ajustado".
- [ ] `ROADMAP.md` — não aplicável (infra interna).
- [ ] `VALIDATOR_BRIEF.md` — não aplicável.
- [ ] `docs/FEATURES-CANONICAS.md` — não aplicável (sem feature
  visível ao usuário).

## 10. Dúvidas em aberto

1. **Direção preferida do usuário:** caminho A (só testTimeout) ou
   caminho A+B (testTimeout + maxWorkers)? B reduz paralelismo, o
   que pode lentificar smoke em CI mas estabiliza local.
2. **Há sinalização externa de que jest 29.7 + jest-expo 54 tem bug
   conhecido de race em afterEach?** Antes de aceitar a config como
   fix, vale verificar se há issue upstream documentado (não
   bloqueante; só evita aplicar workaround se há fix oficial).
3. **`--runInBand` produz 179 falhas / 270s** (medido durante o
   achado): isso indica que serializar não é a saída — confirmar
   que isso é só má interação de mocks compartilhados entre suítes,
   sem necessidade de quarentena específica.

---

## Anexo A — Evidência empírica do achado (2026-05-17)

Capturado durante execução de R-RECAP-LISTA-FIX-LOOP em worktree
`agent-a9eaff0526dbf7366`:

- Baseline (sem fix R-RECAP-LISTA-FIX-LOOP): 3 runs => 4, 7, 8
  testes falhando.
- Pós-fix: 6 runs => 2, 3, 5, 7 testes falhando.
- Em isolado: cada teste passa em ~1s.
- `--runInBand`: piora drasticamente (179 falhas em 950s).

Mensagem de erro literal:
```
thrown: "Exceeded timeout of 5000 ms for a hook.
Add a timeout value to this test to increase the timeout, if this
is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."
  at Object.afterEach (.../node_modules/@testing-library/react-native/src/index.ts:15:5)
```

Suítes que apareceram em pelo menos 2 runs falhando (top hits):

- `tests/components/eventos/FotosBlock-permission.test.tsx`
- `tests/components/medidas/CardComparativo.test.tsx`
- `tests/components/diario/MicrofoneButton.test.tsx`
- `tests/components/screens/RecapSecaoReflexoes.test.tsx`
- `tests/components/screens/RecapSecaoTarefas.test.tsx`
- `tests/components/chrome/FABMenu.test.tsx`
- `tests/components/data/HumorHeatmap.test.tsx`
- `tests/components/tarefas/CheckboxTarefaInline.test.tsx`
- `tests/app/index.test.tsx`
- `tests/app/humor-rapido.test.tsx`
- `tests/components/ui/Toast.test.tsx`
- `tests/components/ui/PersonAvatar.test.tsx`

Padrão: todas usam `@testing-library/react-native` e a falha
sempre é no `afterEach` (cleanup), não em assertion lógica. Isso
sugere que `cleanup()` do RNTL está bloqueado pelo render de outra
suíte rodando em paralelo no mesmo worker; com timeout default
5000ms, qualquer pico de CPU dispara o erro.
