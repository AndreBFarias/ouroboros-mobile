# Sprint M17 — F-16 To-do Leve

```
DEPENDE:    M02 (Vault Bridge) + M03 (identidade dinâmica) + M15 (toggle de ativação)
BLOQUEIA:   nenhuma sprint Mobile direta
ESTIMATIVA: 3-4h
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
- `tests/schemas/tarefa.test.ts`
- `tests/lib/vault/tarefas.test.ts`
- `tests/components/todo/ItemTarefa.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `TarefaSchema`.
- `app/(tabs)/_layout.tsx` — registrar rota `todo` condicional ao
  toggle.

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
- **Sem busca textual** nesta sprint. Lista cresce até virar
  problema; otimização vira sprint futura.
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

## 10. Dúvidas em aberto

- O "header" de Pendentes precisa existir? Sugestão: não, lista
  começa direto. Header só para Feitas (collapse).
- A edição inline no título (tap fora do checkbox) ou via menu
  long-press? Sugestão: long-press → Editar abre o sheet com
  título preenchido (mais previsível que edição inline).
- Reordenação manual (drag and drop) está fora do escopo.
  Confirmar.
