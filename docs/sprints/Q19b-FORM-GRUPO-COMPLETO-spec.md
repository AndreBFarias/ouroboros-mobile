# Q19.b — Form completo de Grupo + sheet "Qual treino hoje?" + Iniciar

> **Tamanho:** Médio (4–6h)
> **Bloqueia v1.0.0?** Não — feature aditiva.
> **Pré-requisitos:** Q19 entregue (schema + vault + rotas stub) e
> Q11.c entregue (executor de treino).

## Contexto

Q19 (commit `1fcbaf5`) entregou esqueleto:
- `GrupoTreinoSchema` (1..10 rotinas por slug).
- `vault/grupo_treino.ts` CRUD canônico.
- Rotas `/grupos/{index,novo,[slug]}.tsx` — só lista funciona;
  `novo` e `[slug]` são stubs que mostram "Em desenvolvimento".

Esta sprint completa a feature: o usuário cria um Grupo escolhendo
rotinas, abre o detalhe e toca "Iniciar treino" → escolhe qual
rotina do grupo executar hoje → cai no executor Q11.c.

## Objetivo da sprint

Substituir os 2 stubs por implementações reais:
- `app/grupos/novo.tsx` — form com nome + descrição + multi-select
  de rotinas existentes.
- `app/grupos/[slug].tsx` — detalhe com lista das rotinas + botão
  "Iniciar" pill verde no header → sheet "Qual treino hoje?".

## Decisões técnicas firmes

- **Reuso máximo.** Reutilizar `FormRotina` style + `MidiaPicker`
  conceitual; o form do grupo é mais simples (sem listas de
  exercícios; só multi-select).
- **Multi-select de rotinas.** Componente novo
  `<SeletorMultiRotinas>` em `src/components/treino/` (mesma pasta de
  `SeletorRotina`). Lista todas rotinas do autor com checkboxes;
  guarda slugs selecionados. Cap 10 reforçado.
- **Sheet "Qual treino hoje?"** vive em
  `src/components/treino/SeletorTreinoDoGrupo.tsx`. Recebe `GrupoTreino`
  como prop; renderiza um `Pressable` por rotina. Tap navega para
  `/treinos/executar/<rotina_slug>` (mesma rota Q11.c).
- **Iniciar sem precisar do executor:** caso o grupo tenha 1 rotina só,
  o botão "Iniciar" pula o sheet e vai direto ao executor.

## Arquivos a criar/modificar

### Novos

1. `src/components/treino/FormGrupo.tsx`
   - Props: `inicial?`, `onSubmit`, `onCancelar`, `onApagar?`,
     `rotuloSalvar`, `salvando`.
   - Body: Input "Nome" + Textarea "Descrição" + lista checkable
     de rotinas via novo subcomponente `<SeletorMultiRotinas>`.
   - Validação: nome obrigatório, 1..10 rotinas selecionadas.

2. `src/components/treino/SeletorMultiRotinas.tsx`
   - Lista de rotinas com checkboxes (multi-select).
   - Carregamento via `listarRotinas(vaultRoot, pessoaAtiva)`.
   - Estado de "nenhuma rotina disponível" → botão "Criar rotina"
     navega para `/rotinas/novo`.

3. `src/components/treino/SeletorTreinoDoGrupo.tsx`
   - BottomSheet com lista de rotinas vinculadas ao grupo.
   - Tap em rotina chama `onSelect(rotinaSlug)`.

4. `tests/lib/schemas/grupo_treino.test.ts`
   - 10+ testes (parse OK, cap 10, slug regex, autor enum).

5. `tests/lib/vault/grupo_treino.test.ts`
   - 8+ testes (CRUD + filter autor + sort PT-BR).

### Modificações

- `app/grupos/novo.tsx` — substituir stub por implementação real.
  Reusar `FormGrupo`. Slug único via `slugifyTitulo` + `sufixoRandom`.

- `app/grupos/[slug].tsx` — substituir stub por detalhe real:
  - Header com pill verde "Iniciar" (mesmo pattern do
    `/rotinas/<slug>`).
  - Body: descrição + lista de rotinas vinculadas (clicáveis → abre
    detalhe da rotina).
  - Footer: botão "Editar" abre form (reusa `FormGrupo`) e botão
    "Apagar" com modal confirm.

- `src/lib/schemas/index.ts` — exportar `GrupoTreinoSchema` e tipo
  (já feito em Q19).

## Proof-of-work esperado

1. **Schema + vault cobertos:**
   ```bash
   npx jest tests/lib/schemas/grupo_treino.test.ts tests/lib/vault/grupo_treino.test.ts --silent
   # 18+ testes verde
   ```

2. **Criar grupo via UI:**
   ```bash
   # Menu → Grupos → FAB+ → Novo
   # Nome "Treino do Quaresma", multi-select 3 rotinas existentes
   # Salvar
   adb shell run-as com.ouroboros.mobile cat \
     /data/user/0/com.ouroboros.mobile/files/Ouroboros/markdown/grupo-treino-do-quaresma.md
   # Frontmatter: rotina_slugs: [a, b, c]
   ```

3. **Iniciar via grupo:**
   ```bash
   # /grupos/treino-do-quaresma → tap "Iniciar" pill verde
   # Sheet "Qual treino hoje?" abre com 3 opções
   # Escolher A → executor Q11.c carrega rotina A correta
   ```

4. **Grupo com 1 rotina pula sheet:**
   ```bash
   # Criar grupo com 1 rotina só → tap Iniciar → executor direto
   ```

5. **Smoke verde:**
   ```bash
   ./scripts/smoke.sh
   # 1892+18 testes verde
   ```

## Critérios de aceite

- [ ] `FormGrupo` valida campos corretamente (rejeita 0 rotinas / >10)
- [ ] `SeletorMultiRotinas` lista rotinas do autor com checkboxes
- [ ] `app/grupos/novo.tsx` cria grupo válido + persiste no Vault
- [ ] `app/grupos/[slug].tsx` mostra detalhe + botão Iniciar
- [ ] Botão Iniciar abre `SeletorTreinoDoGrupo` (ou direto se 1 rotina)
- [ ] Tap em rotina do sheet roteia para executor Q11.c sem regressão
- [ ] Editar grupo regrava `.md` correto
- [ ] Apagar grupo remove `.md` (rotinas vinculadas permanecem)
- [ ] 1892+18 testes verde mínimo
- [ ] Sprint `[ok]` em ROADMAP + FEATURES-CANONICAS §4.6

## Anti-débito

Achados colaterais durante implementação (ex.: "FormGrupo precisa
drag-reorder das rotinas") viram Q19.b.x específicos.
