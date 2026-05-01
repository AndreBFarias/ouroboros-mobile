# Sprint M17 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (ac1ec79a3ecb3a08e)
ORQUESTRADOR: Claude principal
DECISÃO: APROVADO
```

## Camada A — Agente executor (playwright headless)

4 screenshots:

- `A-01-toggle-off-aba-some.png` — 5 abas (sem Tarefas)
- `A-02-toggle-on-empty-state.png` — Aba "Tarefas" aparece (6ª) com empty state "Sem tarefas. Crie quando quiser." + FAB
- `A-03-settings-toggle-on.png` — Settings ativa cross-rota mostra Tarefas na bottom bar
- `A-05-sheet-nova-tarefa.png` — Sheet "Nova tarefa" com TÍTULO + input "Comprar pão"

A-04 (collapse Feitas) e A-06 (menu long-press) requerem Nível B/C porque dependem de SAF real. Registrados no spec §9.

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       813 passing (95 suites)  [+73 vs baseline 740]
smoke.sh:     OK
expo export:  ~8.43 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] Aba `/(tabs)/todo` substitui redirect-stub; tela única com BarraBusca + ListaArrastavel + Collapse Feitas + FAB + Sheet + Menu + Modal
- [ok] Schema `TarefaSchema` exportado via barrel + `slugifyTarefa` + `sufixoRandom`
- [ok] CRUD em `vault/tarefas.ts` + lixeira soft 30d
- [ok] `tarefasPath` + `VAULT_FOLDERS.tarefas` em `paths.ts`
- [ok] Boot hook `limparLixeiraTarefasHook` em `BOOT_HOOKS`
- [ok] `react-native-draggable-flatlist@^4.0.3` instalado
- [ok] Persistência ordem custom em SecureStore (`ouroboros.todo.ordem.v1`)
- [ok] Consome `useSettings.featureToggles.todoLeve` (sem mudar shape)

## Decisões implementadas

- [ok] Sem header de Pendentes; lista direto
- [ok] Long-press → Editar abre sheet com título preenchido
- [ok] Drag & drop via long-press (haptic medium)
- [ok] Busca textual sem acento, case-insensitive
- [ok] Lixeira soft com retenção 30d e limpeza diária no boot

## Achados colaterais

**Armadilha A17 reincidiu** em SheetNovaTarefa (autoFocus + RN Web crash). Resolvido inline com `Platform.OS !== 'web'`. Comentário documenta. Sem efeito em mobile.

## Decisão final

**APROVADO.** M17 entrega to-do leve completo.

**Próxima sprint executável:** [M18 — Contador "Dias sem X" opt-in com Histórico](M18-spec.md).
