# Sprint M17 — F-16 To-do Leve (com Drag & Drop)

```
DEPENDE:    M00.5 fechada (toggle todoLeve)
            + M02 (Vault Bridge) + M03 (identidade dinâmica)
            + M15 (UI do toggle em Settings)
BLOQUEIA:   nenhuma sprint Mobile direta
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Entregar uma lista de tarefas **deliberadamente leve**: sem
projetos, sem subtarefas, sem due-date complexo. Apenas título,
data de criação, flag de feito e timestamp de conclusão. Persistido
em `tarefas/YYYY-MM-DD-slug.md` no Vault. Tela única com 2 grupos
(Pendentes + Feitas em collapse), tap marca feito, long-press abre
menu Editar/Excluir, FAB `+` cria tarefa nova. Só aparece no menu
quando `featureToggles.todoLeve === true`.

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/todo.tsx` — Tela única com lista. Grupos Pendentes /
  Feitas (Feitas em collapse com fade 60%).
- `src/lib/schemas/tarefa.ts` — Schema zod para
  `tarefas/YYYY-MM-DD-slug.md`.
- `src/lib/vault/tarefas.ts` — Helpers:
  - `listarTarefas(): Promise<Tarefa[]>`
  - `lerTarefa(path: string): Promise<Tarefa | null>`
  - `escreverTarefa(meta: Tarefa, body: string): Promise<void>`
  - `marcarFeito(path: string, feito: boolean): Promise<void>`
  - `excluirTarefa(path: string): Promise<void>`
- `src/components/todo/ItemTarefa.tsx` — Item de lista com checkbox
  visual à esquerda + título + data muted à direita.
- `src/components/todo/SheetNovaTarefa.tsx` — BottomSheet com
  input + botão Salvar.
- `src/components/todo/MenuLongPress.tsx` — Menu contextual com
  Editar / Excluir.
- `src/components/todo/ListaArrastavel.tsx` — Wrapper sobre
  `react-native-draggable-flatlist` que suporta drag & drop com
  haptic medium ao iniciar. Reordenação persiste em SecureStore
  (chave `ouroboros.todo.ordem.v1`) como array de paths em ordem
  custom; quando vazio, volta para ordem por data desc.
- `tests/schemas/tarefa.test.ts`
- `tests/lib/vault/tarefas.test.ts`
- `tests/components/todo/ItemTarefa.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `TarefaSchema` e tipo `Tarefa`.
- `app/(tabs)/_layout.tsx` — registrar rota `todo` condicional ao
  toggle `useSettings.featureToggles.todoLeve`.
- `src/lib/boot/reagendamento.ts` — adicionar
  `limparLixeiraExpirada` ao `BOOT_HOOKS` (idempotente).
- `package.json` — adicionar `react-native-draggable-flatlist`
  via `npx expo install`.

## 3. Schema YAML completo

`tarefas/YYYY-MM-DD-slug.md`:

```yaml
---
tipo: tarefa
data: 2026-04-29              # data de criacao
autor: pessoa_a
titulo: "Comprar pao"
feito: false
feito_em: null                # ISO timestamp quando feito; null se pendente
---
```

Corpo do `.md` em branco por default (sem descrição extra). Edição
futura pode adicionar prosa livre.

## 4. APIs reutilizáveis

- `src/components/ui/BottomSheet.tsx` — base do
  SheetNovaTarefa.
- `src/components/ui/Input.tsx` — input título.
- `src/components/ui/Button.tsx` — botão Salvar.
- `src/components/ui/Header.tsx` — header `"Tarefas"` laranja.
- `src/components/ui/EmptyState.tsx` — empty state.
- `src/lib/vault/reader.ts`, `writer.ts`, `paths.ts` — Vault
  Bridge.
- `src/lib/haptics.ts` — `light` no Salvar; `selection` ao marcar
  feito; `medium` no long-press.
- `src/lib/motion.ts` — `spring_default` na transição entre
  Pendente e Feita (item desliza para baixo, fade 60%).
- `src/lib/stores/pessoa.ts` — `pessoaAtiva` define o `autor`.
- `react-native-draggable-flatlist` — drag & drop nativo.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** aba condicional `/(tabs)/todo` (consome
  `useSettings.featureToggles.todoLeve`).
- **Schema:** `TarefaSchema` exportado via barrel.
- **Store:** consome `usePessoa` e `useSettings`. Não cria store
  novo; ordem custom persiste em chave separada do SecureStore.
- **app.json:** sem mudança.
- **Boot hook:** `limparLixeiraExpirada` adicionado a `BOOT_HOOKS`.
- **FAB:** sem mudança no FAB radial. Sprint usa FAB dedicado `+`.
- **Settings:** consome toggle existente.

## 5. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes
  reais hardcoded.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict.
- Imports via alias `@/*`.
- **Sem gamificação** (ADR-0005). Sem contador de tarefas
  concluídas, sem celebração ao marcar feito, sem progresso em
  porcentagem. Apenas a animação suave de transição entre grupos.
- **Sem due date complexo**: data salva é apenas dia de criação.
  Sem hora, sem prazo, sem prioridade. Quem precisar de mais que
  isso usa um app dedicado.
- **Sem subtarefas e sem projetos**. Lista plana global.
- **Busca textual entrega na M17:** input no header filtra
  por substring no título (case-insensitive, sem acento).
- **Drag & drop entrega na M17:** long-press inicia drag (haptic
  medium); soltar reordena. Ordem persiste em SecureStore (chave
  separada). "Reordenar" botão na header limpa ordem custom e
  volta ao default.
- **Tap simples = marcar feito** (sem modal de confirmação). Long
  press = menu. Toque na área do título sem checkbox = abre edição
  inline (input expandido).
- **Excluir é destrutivo**: pede confirmação modal. Move o `.md`
  para `${cacheDirectory}/lixeira/<timestamp>-<slug>.md` (não
  apaga de imediato). Lixeira vazia automaticamente após 30 dias
  (cleanup feito em background no boot).
- Não tocar em arquivos fechados de sprints anteriores.

## 6. Procedimento sugerido

1. Criar `src/lib/schemas/tarefa.ts`. Slug derivado do título via
   `kebab-case` + sufixo random 4 chars (evita colisão).
2. Implementar `src/lib/vault/tarefas.ts`. `listarTarefas` retorna
   array ordenado por `feito_em` desc / `data` desc para feitas e
   `data` desc para pendentes. `marcarFeito` reescreve o frontmatter
   com `feito: true` e `feito_em: now()`.
3. Implementar `src/components/todo/ItemTarefa.tsx`. Checkbox 24dp
   com border `--muted-decor` (vazio) ou `--green` cheio + ícone
   check.
4. Implementar `src/components/todo/SheetNovaTarefa.tsx`. BottomSheet
   60%. Input com autoFocus. Botão Salvar.
5. Implementar `src/components/todo/MenuLongPress.tsx`. Modal
   inferior com 2 opções (Editar / Excluir).
6. Implementar `app/(tabs)/todo.tsx`. Render condicional:
   - Empty state se zero tarefas:
     `"Sem tarefas. Crie quando quiser."`
   - Senão: grupo "Pendentes" no topo (sem header), separador
     muted micro, grupo "Feitas" colapsável (header
     `"Feitas (N)"` em muted, com chevron).
7. Implementar lixeira soft. Função `limparLixeiraExpirada()` no
   boot do app, chamada uma vez por dia (controle via SecureStore
   `ouroboros.lixeira.ultimaLimpeza`).
8. Rodar smoke + tests + tsc + expo export.

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m17-export && rm -rf /tmp/m17-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 8. Commit

```
feat: m17 to-do leve opt-in com pendentes feitas e lixeira soft
```

## 9. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Validar:
  - Sem ativar toggle → tab `/todo` não aparece.
  - Ativar → tab aparece, empty state visível.
  - FAB `+` abre sheet, criar 3 tarefas → aparecem em Pendentes.
  - Tap em uma → desliza para Feitas com fade.
  - Long press em Pendente → menu Editar/Excluir.
  - Excluir → confirmação modal → some da lista; conferir que
    `.md` foi para lixeira em `cacheDirectory`.
- **APIs nativas — Nível B (emulador Android):** validar
  persistência via SAF.
- **Final — Nível C (celular físico):** apenas com permissão.
  Validar Syncthing real do `.md` em `tarefas/`.

Capturar screenshots em `docs/sprints/M17-screenshots/`.

## 10. Definição de Pronto

- [ ] Aba `/(tabs)/todo` aparece com toggle on; some com off.
- [ ] FAB `+` abre sheet de criação.
- [ ] Tap em pendente marca feito (anima slide para Feitas).
- [ ] Long-press abre menu Editar / Excluir.
- [ ] Drag & drop reordena pendentes (haptic medium ao iniciar).
- [ ] Busca textual filtra por título.
- [ ] Excluir move para lixeira soft (`cacheDirectory/lixeira/tarefas/`).
- [ ] `limparLixeiraExpirada` roda 1x/dia (30 dias retenção).
- [ ] Smoke + tests + tsc + expo export OK.

## 11. Decisões tomadas

- **Sem header de Pendentes:** lista começa direto. Header só
  aparece para Feitas (collapse com chevron + contagem).
- **Edição via long-press → Editar:** abre sheet com título
  preenchido. Mais previsível que edição inline.
- **Drag & drop entrega na M17:** via
  `react-native-draggable-flatlist`. Long-press inicia drag.
- **Busca textual entrega na M17:** input no header filtra por
  substring sem acento, case-insensitive.

Sprint pronta para execução sem perguntas pendentes.
