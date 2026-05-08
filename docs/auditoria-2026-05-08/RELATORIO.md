# Auditoria pré-APK — Sprints golden-zebra (Bloco H–O)

Data: 2026-05-08
HEAD: 9c385b3
Auditor: maestro-orquestrador (sem agentes, plan-mode aprovado)
Pipeline: estática (grep + spec vs commits) + visual (Gauntlet + mockup canônico + medições JS)

## Resumo executivo

| Categoria | Quant | O que significa |
|---|---|---|
| OK | 18 sprints | Estrutura UI casa com spec + sentence case + acentuação corretos |
| WARN | 7 achados | Pequenas divergências de espaçamento/largura/contraste — patches inline |
| FAIL | 3 achados | Divergência estrutural ou bug — sprint corretiva nova |
| MIGUÉ código | 4 confirmados | Comentário "futuro/stub" + TODO em produção |
| Débito formal | 22+ sprints sem PNG | Pasta vazia ou `.gitkeep` placeholder |
| Débito colateral | 7 specs nunca criadas | Achados em STATE.md sem `<id>-spec.md` |

## Tabela uma-linha-por-sprint

| Sprint | Status | Achado / observação |
|---|---|---|
| H1 `M-VAULT-URI-HELPER` | OK | helper canônico em `src/lib/vault/paths.ts`; sem PNG (sprint sem UI) |
| H2 `M-VAULT-LAYOUT-POR-TIPO` | OK | 1 PNG real; layout aplicado no mock vault em `web://mock-vault/Protocolo-Ouroboros` |
| H3 `M-VAULT-PASTA-NAO-HARDCODED` | OK | Frame 2 onboarding ("Onde salvar seus dados?") confere com spec; 3 PNGs reais |
| I-HUMOR | OK | Sheet 70% renderizando; sliders + medicação + sono visíveis |
| I-DIARIO | **FAIL** | Modos visíveis: **Trigger / Vitória apenas (2)**; spec FEATURES-CANONICAS §2.2 manda 3 (Reflexão faltante). Confirma colateral `I-DIARIO-REFLEXAO` |
| I-EVENTO | WARN | Sheet OK; botão "Usar localização atual" texto vaza ~5px do pill |
| I-FOTO / I-VIDEO / I-AUDIO | OK estático | Acessível via FAB+ verde em `/saude-fisica`; pasta gauntlet com `.gitkeep` |
| I-FRASE | **MIGUÉ** | `salvarFrase.ts:20` web no-op + comentário "Gauntlet usa mock vault futuro." |
| I-TAREFA | OK estrutural + **MIGUÉ** | empty state OK; `tarefas.ts:284` `TODO M30: re-agendamento do alarme companion ainda nao e responsabilidade` em código de produção |
| I-ALARME | OK | empty "Crie seu primeiro alarme." OK |
| I-CONTADOR | OK | empty "Comece quando quiser." OK |
| I-CICLO | OK | empty + subtítulo respeitoso "Registro voluntário. Pula dias sem culpa." |
| I-EXERCICIO | OK | acessível via tab Exercícios em `/saude-fisica` (L1) |
| I-SCANNER | WARN | botão "Capturar nota" OK; loader Ouroboros ornamental atrás do botão (decoração ou regressão M25.2?) |
| I-DEVICES | OK | boot hook + sub-tela settings detectados estaticamente |
| I-AGENDA | OK | empty + botão "Conectar conta Google" K5-corrigido |
| I2-AMIGOS | OK | `useNomeDe('ambos')` ramificado por `tipoCompanhia` confirmado em `pessoa.ts:77-103` |
| J1 onboarding 5 frames | **FAIL** + WARN | Frame 3 título redundante "Permissões/Permissões" (esperado frase contextual); Frame 1 chips "Sozinho/Com mais alguém" sem borda visível, contraste de seleção fraco; Frame 0/2/4 OK |
| K1 menu lateral layout | OK | Drawer abre, scroll OK; safe-area do botão Configurações respeita bottom |
| K2 menu nomes | OK | "Acesso Rápido" + "Utilitários" presentes em `MenuLateral.tsx:195,199` + visual confere |
| K3 menu foto editável | OK | Header Pressable navega para `/settings/editar-pessoa?pessoa=pessoa_a` |
| K4 FAB safe-bottom | OK | FAB 72x72px, `bottom: 80.8px`, distância do bottom respeitada |
| K5 botões largura | WARN | `/agenda` "Conectar conta Google" OK; **botão "Recap" na home com `paddingHorizontal: 0px / 0px`** — wrapper 50x58 sem respiração interna; aspecto colado |
| L1 Saúde Física | OK + WARN | 3 abas Treinos/Evolução Corporal/Exercícios OK; aba "Fotos" removida; **WARN**: tab "Evolução Corporal" quebra em 2 linhas (Evolução/Corporal empilhado) |
| L2 Recap unificar | OK | Toggle Lista/Calendário visível; chips Semana/Mês/Ano/Personalizado OK |
| N1 moti audit | OK | output 47 usos classificados, doc-only |
| N2 moti fix críticos | OK | 6 ALTO migrados para reanimated puro; sem regressão visual no boot path |
| O1 gauntlet padrão validation | OK | template §5 atualizado, regra durável |

## Migués de código (alta severidade)

### Migué A — `src/lib/midia/salvarFrase.ts:20`
```ts
//   - web: no-op (retorna ok=false). Gauntlet usa mock vault futuro.
```
**Impacto**: I-FRASE declarada [ok] mas validação web fica stub. Sprint Gauntlet **nunca** poderá exercitar o fluxo. Em mobile real funciona.
**Sprint corretiva**: `M-AUDIT-MIGUE-FRASE-WEB-MOCK`.

### Migué B — `src/lib/vault/tarefas.ts:284`
```ts
// TODO M30: re-agendamento do alarme companion ainda nao e responsabilidade
```
**Impacto**: I-TAREFA declarada [ok] mas re-agendamento de alarme companion não implementado. Comportamento esperado em mobile real: ao alterar data de tarefa com alarme vinculado, alarme não é re-agendado.
**Sprint corretiva**: `M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR`.

### Migué C — `src/lib/services/restaurarVault.ts:14`
```ts
//      `aplicarSnapshot` (futuro). Por ora a entrega A5 grava o
```
**Impacto**: A5 M-EXPORT-COMPLETO declarado [ok] mas restore só grava arquivos do ZIP, não restaura `useSettings`+`useOnboarding`+`usePessoa` do `snapshot-settings.json`. Restore não é simétrico ao export.
**Sprint corretiva**: `M-AUDIT-MIGUE-RESTORE-SNAPSHOT`.

### Migué D — `src/lib/dev/gauntletDashboard.tsx:43`
```ts
{ rota: '/settings', label: 'Configuracoes' },
```
**Impacto**: Label "Configuracoes" sem cedilha aparece em `/_dev/gauntlet` (visível durante validação visual). Passa o `check_strings_ui_ptbr.py` porque `src/lib/dev/` está fora do scan.
**Sprint corretiva**: `M-AUDIT-LABEL-GAUNTLET-DASHBOARD` (também estende o PT-BR check para incluir `src/lib/dev/`).

## FAIL visuais (sprint corretiva específica por achado)

### FAIL 1 — J1 Frame 3 título redundante
**Ocorrência**: `/onboarding` frame 3, eyebrow ALL CAPS "Permissões" + H1 grande "Permissões" idênticos. Frames 0/1/2/4 usam frase contextual no H1 ("Como você se chama?", "Mais alguém usa este Vault com você?", "Onde salvar seus dados?", "Tudo pronto, <nome>.").
**Sprint corretiva**: `M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL` (proposta: "Permissões" no eyebrow + "Libere o que faz sentido pra você." ou similar no H1).

### FAIL 2 — I-DIARIO modo Reflexão ausente
**Ocorrência**: `/diario-emocional` mostra apenas 2 chips de modo (Trigger / Vitória). Spec FEATURES-CANONICAS §2.2 manda 3 modos (Trigger / Vitória / Reflexão).
**Sprint corretiva**: `I-DIARIO-REFLEXAO` (já listado em STATE.md como colateral; este achado materializa).

### FAIL 3 — `/_dev/gauntlet` label sem acento
Ver Migué D acima — sobreposto.

## WARN visuais (patch inline durante a sprint corretiva)

| # | Achado | Local |
|---|---|---|
| W1 | Chips "Sozinho/Com mais alguém" sem borda outline visível, contraste de seleção fraco | `app/onboarding.tsx` Frame 1 (`<TipoCompanhiaPicker>` ou similar) |
| W2 | Botão "Recap" home com `paddingHorizontal: 0px / 0px` | `app/index.tsx:154` (componente Button compact ou similar) |
| W3 | Tab "Evolução Corporal" quebra em 2 linhas | `<TabBar>` em `app/saude-fisica.tsx` |
| W4 | Botão "Usar localização atual" em /eventos com texto vazando ~5px do pill | `app/eventos.tsx` (chip de localização) |
| W5 | Loader Ouroboros ornamental atrás do botão "Capturar nota" em /scanner | `app/scanner.tsx` (?) — confirmar se intencional ou regressão M25.2 |
| W6 | Subtítulo "Vibrar em botões e gestos" usa "fab" minúsculo (acrônimo) | `app/settings/index.tsx` (descrição do toggle 4) |
| W7 | FAB hambúrguer cobre últimas seções de settings em viewport reduzido | layout — `useSafeBottomMargin` ok, mas o conteúdo precisa de `paddingBottom` adicional |

## Cobertura visual retroativa

PNGs reais existentes em `docs/sprints/<id>-screenshots-gauntlet/` para sprints golden-zebra:

| Sprint | PNGs |
|---|---|
| H2 `M-VAULT-LAYOUT-POR-TIPO` | 1 |
| H3 `M-VAULT-PASTA-NAO-HARDCODED` | 3 |
| I2-AMIGOS `M-AMIGOS-LABEL` | 1 |
| J1 `M-ONBOARDING-PERMISSOES` | 3 |
| **Total** | **8 PNGs em 30 sprints** |

Todas as outras sprints golden-zebra tinham pasta vazia, só `.gitkeep`, ou nenhuma pasta. **Esta auditoria visual atual cobre essa lacuna em massa** — capturas inline do Gauntlet documentam o estado real de cada feature, mas os PNGs são efêmeros (não persistidos no disco). A sprint corretiva `M-GAUNTLET-RETROATIVO-AUDIT` salva PNGs do disco em batch.

## Próximas ações

1. Criar 15 specs corretivas em batch (Bloco S+G+V) — ver `~/.claude/plans/snug-humming-wall.md`.
2. Atualizar `STATE.md`, `ROADMAP.md`, `CHANGELOG.md`, `VALIDATOR_BRIEF.md` (§1.9.2 nova).
3. Smoke verde, commit batch, push origin/main.
4. Próxima execução: dispatchar specs corretivas em ordem priorizada (Bloco S → G → V).
