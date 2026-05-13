# Q19 — Grupos de exercícios (Treino A/B/C) e "Iniciar Treino"
> via grupo selecionado

> **Tamanho:** Médio (4–8h)
> **Bloqueia v1.0.0?** Não. Candidata a v1.0.x (alpha-5).
> **Pré-requisitos:** Q11.a+b+c (rotinas + executor) entregue.

## Contexto

Pedido literal do dono (sessão 2026-05-12):

> "Crio o grupo de exercícios. Crio cada exercício com cada gif de
> execução. Aí eu tenho que ter um botão de Iniciar Treino. Seleciono
> o grupo de Exercícios sei lá B. Aí aparece um tipo de exercício por
> vez com timer e os caramba"

Hoje (Q11.a+b+c entregue), Rotina = lista plana de exercícios sem
agrupamento. O dono quer um nível acima: **Grupo** (ex.: "Treino A",
"Treino B", "Treino C") como container de exercícios. Ao iniciar um
treino, ele escolhe o grupo, não exercícios soltos.

### Conceito atual vs proposto

```
ANTES (Q11.a+b+c):
Rotina "Treino A — peito e tríceps"
  ├ Exercício 1: Supino reto (3×10, 40 kg, 90s)
  ├ Exercício 2: Crucifixo (3×12, 14 kg, 60s)
  └ Exercício 3: Tríceps testa (4×10, 20 kg, 90s)

PROPOSTO Q19:
Grupo "Treino do Quaresma"
  ├ Treino A — peito e tríceps  (= rotina atual)
  ├ Treino B — costas e bíceps
  └ Treino C — perna inteira

Ao tocar "Iniciar Treino" no Grupo:
  Sheet pergunta "Qual treino hoje?"
  Opções: A | B | C
  Após escolher → executor padrão Q11.c
```

> **Compatibilidade**: rotinas existentes (no Vault como
> `markdown/rotina-<slug>.md`) continuam funcionando como Grupo de 1
> treino só. Sem migração destrutiva.

## Decisões técnicas firmes

- **Schema novo `GrupoTreino`** em `src/lib/schemas/grupo_treino.ts`:
  ```ts
  export const GrupoTreinoSchema = z.object({
    tipo: z.literal('grupo_treino'),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    nome: z.string().min(1).max(80),
    descricao: z.string().nullable(),
    // Lista de slugs de rotinas. Cada rotina e' o "Treino A/B/C".
    // 1..10 rotinas (cap pra UX nao virar lista absurda).
    rotina_slugs: z.array(z.string()).min(1).max(10),
    data_criacao: DataYmd,
    autor: PessoaAutorSchema,
  });
  ```

- **Path canônico**: `markdown/grupo-<slug>.md`
- **Helpers vault** em `src/lib/vault/grupo_treino.ts`: `listarGrupos`,
  `lerGrupo`, `escreverGrupo`, `removerGrupo` (mesmo padrão de
  `vault/rotina.ts`).

- **Sem migração**: rotina existente NÃO é convertida automaticamente.
  Usuário pode criar Grupo novo que aponta para rotinas existentes
  (composição vs herança).

- **UI nova rota** `/grupos/`:
  - `app/grupos/index.tsx` — lista de Grupos.
  - `app/grupos/novo.tsx` — criar grupo (form com nome + descrição +
    multi-select de Rotinas existentes).
  - `app/grupos/[slug].tsx` — detalhe/edição.

- **Botão "Iniciar Treino" no Grupo**:
  - Header de `/grupos/[slug]`: pill verde "Iniciar" (mesmo padrão
    do Q11.c em `/rotinas/[slug]`).
  - Tap → Sheet "Qual treino hoje?" com lista de Rotinas do grupo.
  - Escolher → navega para `/treinos/executar/<rotina_slug>` (reusa
    executor Q11.c).

- **MenuLateral**: adicionar item "Grupos" em Utilitários
  (`featureToggles.grupoTreino` ON por default — ou direto se a
  feature for canônica).

### Trade-off considerado e descartado

- **Embedding em vez de referência**: armazenar a lista completa de
  exercícios dentro do Grupo. Descartado porque duplica dados e
  exige refactor de Rotina/Exercício. Referência por slug é mais
  cirúrgico.

## Arquivos a criar/modificar

### Novos

1. `src/lib/schemas/grupo_treino.ts` — schema Zod.
2. `src/lib/vault/grupo_treino.ts` — CRUD vault.
3. `app/grupos/_layout.tsx` — Stack interno.
4. `app/grupos/index.tsx` — lista.
5. `app/grupos/novo.tsx` — criação.
6. `app/grupos/[slug].tsx` — detalhe + botão Iniciar.
7. `src/components/treino/FormGrupo.tsx` — form reusável.
8. `src/components/treino/SeletorTreinoDoGrupo.tsx` — sheet "Qual treino hoje?".
9. `tests/lib/schemas/grupo_treino.test.ts`
10. `tests/lib/vault/grupo_treino.test.ts`

### Modificações

- `src/lib/schemas/index.ts` — exportar `GrupoTreinoSchema`, `GrupoTreino`.
- `src/lib/vault/index.ts` — exportar helpers + `grupoPath`.
- `src/lib/vault/paths.ts` — `grupoPath(slug: string)` → `markdown/grupo-<slug>.md`.
- `src/components/chrome/MenuLateral.tsx` — entry "Grupos" em
  Utilitários (Dumbbell ícone, mesmo do Rotinas).
- `docs/FEATURES-CANONICAS.md` — nova seção §4.6 Grupos de Treino.

## Proof-of-work esperado

1. **Schema aceita grupo válido + rejeita inválido:**
   ```bash
   npx jest tests/lib/schemas/grupo_treino.test.ts tests/lib/vault/grupo_treino.test.ts --silent
   # 15+ tests verde
   ```

2. **Criar grupo via UI + persistir no disco:**
   ```bash
   # Menu lateral → Grupos → FAB+ → Novo
   # Nome "Treino do Quaresma", multi-select rotinas existentes
   # Salvar
   adb shell run-as com.ouroboros.mobile cat \
     /data/user/0/com.ouroboros.mobile/files/Ouroboros/markdown/grupo-treino-do-quaresma.md
   # Confirmar frontmatter com rotina_slugs: [treino-a, treino-b, ...]
   ```

3. **Iniciar treino via grupo:**
   ```bash
   # /grupos/treino-do-quaresma → tap Iniciar
   # Sheet "Qual treino hoje?" aparece com 3 opções
   # Escolher "Treino A" → executor Q11.c carrega rotina A correta
   ```

4. **Iniciar treino direto via rotina continua funcionando:**
   ```bash
   # /rotinas/<slug> → Iniciar → executor Q11.c (caminho legado preservado)
   ```

## Critérios de aceite

- [ ] Schema `GrupoTreinoSchema` aceita 1..10 rotinas, rejeita 0 ou >10
- [ ] `vault/grupo_treino.ts` CRUD completo
- [ ] Rotas `/grupos/` funcionais (index/novo/[slug])
- [ ] Entry "Grupos" no MenuLateral aparece
- [ ] Botão "Iniciar" em `/grupos/[slug]` abre seletor de rotina do grupo
- [ ] Selecionar rotina navega para executor Q11.c sem regressão
- [ ] 1892+15 testes verde (mínimo +15 novos)
- [ ] Sprint marcada `[ok]` em ROADMAP + FEATURES-CANONICAS §4.6

## Anti-débito

Achados colaterais (ex.: "FormGrupo precisa de drag-reorder", "grupos
precisam de cor distintiva", "compartilhar grupo entre pessoa_a/b")
viram Q19.x específicos. Lista em `docs/auditoria-q19/COLATERAIS.md`
se mais de 3.
