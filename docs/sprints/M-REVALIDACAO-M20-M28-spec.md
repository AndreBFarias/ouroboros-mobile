# Sprint M-REVALIDACAO-M20-M28 — Re-validar todas as sprints concluídas via Gauntlet

```
DEPENDE:    M-GAUNTLET (interface unificada de teste em Chrome)
BLOQUEIA:   M29 em diante (qualquer sprint nova precisa de baseline
            visual confiavel das sprints anteriores)
ESTIMATIVA: 4-6h
PRIORIDADE: alta — fecha o "fim da era de validacao por agente
            automatico" e estabelece o padrao novo
```

## 1. Contexto e justificativa

Validação manual de 2026-05-03 (sessão M21-M28) descobriu 3 bugs
em sprints já marcadas `[ok]`:
- M14.1 (eslint-disable órfão) — silencioso, vazou pelo validador.
- M25.1 (animação cobra não funciona em web) — falso positivo do
  validador-sprint que considerou screenshot estático suficiente.
- M27.1 (boot screen oscilante) — só apareceu em uso real.

Conclusão: **validador-sprint dispatchado por agente isolado tem
ponto-cego visual**. Screenshot estático em rota web bloqueada
por gate não prova que o app funciona; só prova que renderizou
algo.

Após M-GAUNTLET fornecer interface determinística de Chrome,
**revalidar TODAS as sprints concluídas (M20-M28)** vira possível
e necessário. Esta sprint estabelece a baseline visual do projeto
antes de prosseguir M29-M41.

## 2. Escopo — sprints a revalidar

Inventário das sprints concluídas no ciclo de Refundação v1.0 e
adjacentes mais relevantes:

| Sprint | Aspecto crítico a validar visualmente |
|---|---|
| M20 + M20.1 | Widget homescreen — visual no `/_dev/showcase` (tela 26 mockup) |
| M21 | (despublicação de release; sem tela própria — pular) |
| M22 | Vault auto-criado: `/_dev/gauntlet` mostra `vaultRoot` setado pós-seed |
| M23 | Onboarding 3 frames: completar e capturar cada frame |
| M24 | Resume state: `setUltimaRota('/memoria')` + reload, confirma redirect |
| M25 | OuroborosLogo (estatico) + OuroborosLoader (animado): captura t=0 e t=1500ms, transform diferente |
| M25.1 | Animação cobra: revalida M25 mas com fix aplicado (transform string) |
| M26 | 4 sheets opacas: para cada uma, abrir via `__gauntlet.abrirSheet`, fundo Dracula confirmado |
| M27 | MenuLateral + FABMenu: abrir via API, 3 seções renderizadas, FAB no canto inferior esquerdo |
| M27.1 | Boot screen sem oscilar: medir tempo entre `mostrarBootScreen=true` e `=false`, deve ser <1s e nunca voltar |
| M28 | Nomes reais: `setNomes('TestA', 'TestB')`, navega `/settings/editar-pessoa`, título mostra "TESTA" e "TESTB" |

Sprints anteriores ao ciclo de refundação (M01-M19, M19.x, etc.)
ficam fora desta sprint — podem ser revalidadas em sprint futura
M-REVALIDACAO-M01-M19 se necessário.

## 3. Entregáveis

### 3.1 Arquivos novos

#### Casos E2E (1 por sprint a revalidar)

Em `tests/e2e/playwright/`, criar usando o template
`docs/templates/e2e-template.e2e.ts` (criado em M-GAUNTLET):

- `m20-widget-homescreen.e2e.ts` — captura tela 26 do mockup em
  `/_dev/showcase` confirmando que o widget aparece. Em runtime
  Android real é Nível B (anotar pendência se ficar fora do
  escopo).
- `m22-vault.e2e.ts` — após `seed()`, confirma que
  `useVault.getState().vaultRoot` é
  `'web://mock-vault/Ouroboros'` e que Home renderiza sem
  redirecionar.
- `m23-onboarding.e2e.ts` — `reset()` + navegar `/onboarding`,
  preencher Frame 1 com `Nome_A`, clicar Continuar, preencher
  Frame 2 (Sozinho), clicar Continuar, confirmar Frame 3 com
  texto "Tudo pronto, Nome_A.", clicar Começar, confirmar redirect
  para `/`. Captura screenshot em cada frame.
- `m24-resume-state.e2e.ts` — `seed()` + `setUltimaRota('/memoria')`
  + recarregar, confirma que `pathname` final é `/memoria`.
- `m25-cobra-glifo.e2e.ts` — navega `/_dev/showcase`, busca SVG
  `width="320"`, captura `OuroborosLogo` estático e
  `OuroborosLoader` animado em uma única página. Confirma 4 anéis
  + cabeça + wordmark renderizados.
- `m25-1-cobra-anima.e2e.ts` — repete medição de transform t=0 e
  t=1500ms, confirma que valor mudou (animação rodando).
- `m26-sheets-opacas.e2e.ts` — para cada uma das 4 rotas modais
  (humor-rapido, diario-emocional, eventos, scanner), abre via
  `__gauntlet.abrirSheet(rota)`, captura screenshot, confirma:
  - Fundo Dracula opaco (`backgroundColor` do body é `#14151a`).
  - `<Screen>` está montado.
  - Loader compacto está atrás do sheet.
- `m27-menu-fab.e2e.ts` — confirma:
  - FABMenu purple visível no canto inferior esquerdo (CSS
    `position: absolute; left: ...; bottom: ...`).
  - `__gauntlet.abrirMenu()` faz MenuLateral renderizar.
  - 3 seções (VER/REGISTRAR/Configurações) com 6+6+1 itens.
  - Avatar Nome_A no header.
  - Backdrop tap fecha menu.
- `m27-1-boot-sem-oscilacao.e2e.ts` — mede transições do boot
  screen:
  - `seed()` + `location.reload()`.
  - Polla `document.querySelector('[aria-label="loader ouroboros"]')`
    a cada 100ms por 5s.
  - Confirma que loader aparece UMA vez e desaparece UMA vez (sem
    flickar).
- `m28-nomes-reais.e2e.ts` — `setNomes('Alice', null)`, navega
  `/settings/editar-pessoa`, confirma que `<h*>` tem texto
  "ALICE". Repete com `setNomes('Bob', 'Carol')` em modo dual,
  confirma que a tela mostra os 2 títulos.

#### Relatório consolidado

- `docs/validacao-gauntlet-2026-05-03/RELATORIO.md` — formato
  igual ao `docs/validacao-manual-2026-05-03/RELATORIO.md` mas
  preenchido pela execução E2E:
  - Tabela de sprints com status PASS/FAIL/INCONCLUSIVO.
  - Para cada FAIL: descrição, screenshot anexo, sprint corretiva
    proposta (M<NN>.<x>) com link para spec gerada.
  - Para cada INCONCLUSIVO: motivo (ex: precisa Nível B) e
    pendência registrada.

### 3.2 Arquivos modificados

- `STATE.md` — `[wip]` desta sprint vira `[ok]` ao final, com
  resumo: "Revalidação M20-M28 via Gauntlet — N sprints PASS,
  M FAIL viraram corretivas (lista), K INCONCLUSIVO."
- `ROADMAP.md` — para cada sprint que reprovou, adicionar linha
  M<NN>.<x> com link para spec corretiva.
- `CHANGELOG.md` — bloco "Validação consolidada via Gauntlet"
  documentando achados.
- `VALIDATOR_BRIEF.md` §1.9 — referencia
  `docs/validacao-gauntlet-2026-05-03/RELATORIO.md` como baseline
  visual oficial. Atualiza nota: "A partir desta data, qualquer
  sprint nova que toca UI deve incluir um caso E2E em
  `tests/e2e/playwright/m<NN>-*.e2e.ts` e ser revalidada na
  sprint de fechamento via Gauntlet."

### 3.3 Arquivos NÃO modificados

- Specs originais das sprints revalidadas (M20-M28) — relatórios
  ficam separados, specs originais não mudam.

## 4. Restrições

- **Regra −1 absoluta**: zero IA, zero nomes reais. Defaults
  `Nome_A`/`Nome_B`/`TestA`/`TestB`/`Alice`/`Bob`/`Carol` (nomes
  comuns ASCII para teste, sem identidade pessoal).
- **Não corrigir bugs nesta sprint**. Bugs descobertos viram
  sprints corretivas separadas (M<NN>.<x>) com spec própria, e
  ficam em `[todo]` no ROADMAP. Esta sprint só relata e organiza.
- **Bloquear seguir M29 enquanto FAIL não viraram corretivas
  fechadas**. Decisão durável: a baseline visual é pré-requisito
  para sprints novas.
- **Sentence case + acentuação PT-BR completa** em UI strings de
  novos arquivos. `accessibilityLabel` SEM acento.
- **TS strict**.
- **`expo-router` re-renders**: cada caso E2E começa com
  `__gauntlet.reset()` para garantir estado limpo. Sem isso,
  ordem de execução afeta resultado.

## 5. Procedimento sugerido

1. **Confirmar M-GAUNTLET fechada** em `main`. Se não, esta
   sprint trava aqui.
2. **Subir expo em modo gauntlet**:
   ```bash
   EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web > /tmp/expo-gauntlet.log 2>&1 &
   ```
3. **Para cada sprint do escopo** (na ordem da tabela §2):
   a. Criar o `.e2e.ts` correspondente, copiando do template.
   b. Implementar asserts específicos.
   c. Rodar via playwright MCP — orquestrador chama
      `page.evaluate(<código do e2e>)` ou usa as ferramentas
      `browser_*` direto.
   d. Capturar screenshots em
      `docs/sprints/M<NN>-screenshots-gauntlet/A-<aspecto>.png`.
   e. Anotar resultado em planilha temporária (PASS/FAIL/INCONC).
4. **Compilar `docs/validacao-gauntlet-2026-05-03/RELATORIO.md`**
   com os 11 resultados.
5. **Para cada FAIL**, gerar spec corretiva
   `docs/sprints/M<NN>.<x>-spec.md` seguindo o protocolo padrão
   (objetivo claro, hipótese da causa, fix mínimo, aritmética
   esperada).
6. **Atualizar STATE.md, ROADMAP.md, CHANGELOG.md, BRIEF §1.9**.
7. **Smoke + tsc + anonimato verde** antes do commit.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

# 1. Smoke pré-sprint
./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh

# 2. Confirma que cada e2e ts compila isolado
npx tsc --noEmit --project tsconfig.e2e.json  # se houver split

# 3. Para cada e2e: roda via playwright MCP no orquestrador.
#    Ou, se quiser CI, adicionar:
EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web > /tmp/expo-gauntlet.log 2>&1 &
until curl -s http://localhost:8081 | grep -q "ouroboros-mobile"; do sleep 2; done
# orquestrador roda os 11 e2e via MCP, capturando screenshots e
# escrevendo PASS/FAIL no relatório.
```

## 7. Commit

```
docs: m revalidacao m20 m28 baseline visual via gauntlet
```

(Se nenhum FAIL: commit é só docs+e2e. Se houver FAIL, commits
separados para cada corretiva subsequente.)

## 8. Checkpoint visual

Em `docs/validacao-gauntlet-2026-05-03/`:
- `RELATORIO.md` — texto consolidado.
- `screenshots/` com 1 subpasta por sprint
  (`M20/`, `M22/`, `M23/`, ...) contendo screenshots E2E em PNG.

Padrão de naming dos PNGs:
`<sprint>-<aspecto>-<estado>.png`
Ex: `m23-onboarding-frame1.png`, `m26-humor-sheet-aberto.png`,
`m25-1-cobra-frame1.png`, `m25-1-cobra-frame2.png`.

## 9. Decisões tomadas

- **Por que escopo M20-M28 e não M01-M28?** Sprints M01-M19 são
  do MVP original que JÁ FOI publicado e usado. O foco desta
  baseline é a Refundação v1.0 (M21+), com M20 incluso como
  contexto (widget homescreen relevante para tela 26).
- **Por que sprints corretivas separadas e não fix inline?**
  Disciplina de spec por sprint — cada bug merece análise da
  causa raiz e teste de regressão próprio. Inline criaria PRs
  monolíticos difíceis de revisar.
- **Por que bloquear M29 até zerar FAIL?** Sem baseline visual
  confiável, sprints novas vão acumular novos bugs em cima dos
  existentes. Decisão durável aprovada pelo usuário em
  2026-05-03.
- **Por que `validacao-gauntlet-2026-05-03/` e não
  `validacao-manual-2026-05-03/v2/`?** Pasta nova marca a
  mudança de era de validação (manual → gauntlet). A pasta
  manual anterior fica preservada como histórico.
- **Por que não rodar via npm test?** E2E em playwright real
  precisa browser carregado e expo rodando. Orquestrador (Claude)
  roda via MCP; CI pode rodar via `npx playwright test` em
  pipeline futura, fora do escopo desta sprint.

## 10. Aritmética de proof-of-work

- Baseline pós-M-GAUNTLET (estimada): **~1133 testes / 130 suítes**
  (M-GAUNTLET adiciona 5-10 testes unitários do módulo
  `gauntlet.ts`).
- Esperado pós-sprint: **mesma baseline Jest** (e2e não conta) +
  **11 arquivos E2E novos** em `tests/e2e/playwright/`.
- Smoke verde, tsc 0 erros, anonimato OK.
- Bundle Hermes Android: ≤ 8.85 MB (E2E não vai pra mobile).
- FAIL tolerado em E2E: 0 ao final, mas durante execução é
  esperado ter alguns FAIL que viram corretivas.

## 11. Plano de adoção pós-sprint

Após M-REVALIDACAO-M20-M28 fechar com 11 PASS, **toda sprint
nova de M29 em diante** deve:

1. Entregar o código + testes Jest + 1 caso E2E em
   `tests/e2e/playwright/m<NN>-*.e2e.ts`.
2. Rodar o E2E via Gauntlet antes de declarar a sprint pronta.
3. Capturar screenshots em
   `docs/sprints/M<NN>-screenshots-gauntlet/`.

VALIDATOR_BRIEF.md §1.9 enforça essa regra: validador-sprint
recusa sprints sem E2E correspondente.

Sprint pronta para execução, condicionada a M-GAUNTLET fechada
em `main`.
