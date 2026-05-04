# Sprint M-ROTINA-TREINO — Cadastro de rotina/programa de treino reutilizável

```
DEPENDE:    M11 (sessao de treino) + M13 (exercicios)
BLOQUEIA:   nenhuma (feature aditiva)
ESTIMATIVA: 5-6h
PRIORIDADE: alta (lacuna funcional descoberta 2026-05-04)
STATUS:     [todo]
```

## 1. Achado / motivação

Auditoria de features (2026-05-04) revelou lacuna estrutural:
o app permite cadastrar **movimentos isolados** (M13 — agachamento,
supino) e **registrar sessões executadas** (M11 — "hoje fiz rotina
A, 45min"), mas **não permite cadastrar a rotina/programa em si**
como template reutilizável.

Hoje no `TreinoSessaoSchema` o campo `rotina` é apenas
`z.string().optional()` (texto livre). Cada sessão repete
manualmente os mesmos 5 exercícios + séries/reps. Sem entidade
"Rotina" o usuário:

- Digita o mesmo treino toda vez (alto atrito → flow >5min).
- Não consegue ajustar a rotina e propagar para sessões futuras.
- Não tem visualização de "quais rotinas eu mantenho ativas".

## 2. Objetivo

Adicionar entidade `Rotina` como **template** com lista de
exercícios pré-definidos. Sessões registradas escolhem rotina e
vêm pré-preenchidas, mas continuam editáveis (sessão é snapshot
imutável; rotina é template mutável).

## 3. Modelo de dados

### 3.1 Schema novo `RotinaSchema`

`src/lib/schemas/rotina.ts`:

```ts
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';
import { Iso8601 } from '@/lib/schemas/_iso';

export const RotinaItemSchema = z.object({
  // Slug do exercício cadastrado em exercicios/
  exercicio_slug: z.string().min(1),
  // Nome cacheado (denormalizado para evitar broken refs se
  // exercício for renomeado).
  exercicio_nome: z.string().min(1),
  series: z.number().int().min(1).max(20),
  reps_alvo: z.number().int().min(1).max(100),
  carga_kg_alvo: z.number().min(0).optional(),
  observacao: z.string().optional(),
});

export const RotinaSchema = z.object({
  tipo: z.literal('rotina'),
  slug: z.string().min(1),
  nome: z.string().min(1).max(60),
  // Cor opcional para diferenciar rotinas no UI (paleta Dracula).
  cor: z.enum(['purple', 'pink', 'cyan', 'green', 'yellow', 'orange'])
    .default('purple'),
  // Frequencia sugerida (informativa, nao agenda automatica).
  frequencia_semanal: z.number().int().min(1).max(7).optional(),
  // Lista ordenada de exercicios.
  exercicios: z.array(RotinaItemSchema).min(1).max(20),
  // Notas livres sobre a rotina (objetivo, periodizacao).
  notas: z.string().optional(),
  // Auditoria.
  autor: PessoaAutorSchema,
  criada_em: Iso8601,
  atualizada_em: Iso8601,
  // Soft delete -- rotina arquivada nao some, mas nao aparece no
  // seletor padrao. Sessoes antigas continuam apontando para o slug.
  arquivada: z.boolean().default(false),
});

export type Rotina = z.infer<typeof RotinaSchema>;
export type RotinaItem = z.infer<typeof RotinaItemSchema>;
```

### 3.2 Vault path

`rotinas/<slug>.md` (irmão de `exercicios/<slug>.md`).

### 3.3 Mudança em `TreinoSessaoSchema`

Adicionar campo opcional `rotina_slug`:

```ts
// existente: rotina: z.string().optional() -- texto livre legado
rotina_slug: z.string().optional(), // novo: refere a rotinas/<slug>.md
```

**Backward-compat:** sessões antigas sem `rotina_slug` continuam
funcionando. Campo `rotina` (texto livre) continua existindo como
fallback / display name. Migração: `rotina_slug` é só leitura
adicional, sem reescrita do Vault.

## 4. Entregáveis

### Schema + vault

- `src/lib/schemas/rotina.ts` (novo).
- `src/lib/schemas/treino_sessao.ts` — adiciona `rotina_slug`.
- `src/lib/schemas/index.ts` — exporta `RotinaSchema`,
  `RotinaItemSchema`, `Rotina`, `RotinaItem`.
- `src/lib/vault/rotinas.ts` (novo) — `escreverRotina`,
  `lerRotina`, `listarRotinas`, `arquivarRotina`,
  `desarquivarRotina`, `apagarRotina`.
- `src/lib/vault/paths.ts` — adiciona `rotinasPath(slug)` e
  `rotinasDirPath()`.

### Hooks

- `src/lib/hooks/useRotinas.ts` (novo) — lê todas as rotinas do
  Vault, filtra arquivadas, retorna ordenadas por `atualizada_em
  desc`.

### Helpers

- `src/lib/treinos/slugRotina.ts` — gera slug a partir do nome
  (similar a `slugifyTreino` de M11).
- `src/lib/treinos/sessaoFromRotina.ts` — função pura que
  transforma `Rotina` em payload inicial de `TreinoSessao`
  (copia `exercicios` para `ExercicioSessaoSchema`,
  preenchendo `nome`/`series`/`reps`/`carga_kg` a partir do
  template).

### UI

- `app/rotinas/index.tsx` (nova rota) — lista de rotinas ativas +
  botão "Nova rotina" + seção colapsável "Arquivadas".
- `app/rotinas/[slug].tsx` (nova rota) — detalhe + edição de
  rotina (CRUD inline; ao salvar grava no Vault).
- `app/rotinas/novo.tsx` (nova rota) — form de criação:
  - Nome + cor (chip 6 opções) + frequência semanal opcional.
  - Lista de exercícios via `<SeletorExercicios>` (componente
    novo) que abre busca/seleção de exercícios cadastrados em M13.
  - Para cada exercício escolhido: séries / reps_alvo / carga_kg
    / observação inline.
  - Notas livres no rodapé.
  - Validação: pelo menos 1 exercício, nome obrigatório.
- `src/components/treinos/SeletorExercicios.tsx` (novo) — busca
  + lista virtualizada de exercícios cadastrados; tap adiciona
  ao array; long-press remove.
- `src/components/treinos/ItemRotinaExercicio.tsx` (novo) — card
  visual de exercício dentro da rotina (drag-handle + nome +
  séries × reps × carga + remover).

### Integração com M11 (`SheetNovoTreino`)

- `src/components/screens/SheetNovoTreino.tsx` — adicionar no topo
  do form um `<SeletorRotina>` (componente novo):
  - Chip com texto "Sem rotina" (default) + chips das rotinas
    ativas + chip "+ Nova rotina" (navega para `/rotinas/novo`).
  - Selecionar rotina chama `sessaoFromRotina()` que pré-preenche
    duracao_min, exercicios, observacoes.
  - Edição da sessão NÃO afeta a rotina (snapshot imutável).
- `src/components/treinos/SeletorRotina.tsx` (novo).

### MenuLateral

- `src/components/chrome/MenuLateral.tsx` — adicionar item
  "Rotinas" na seção "Registrar" entre "Exercícios" e "Treinos"
  (cor `colors.cyan` ou `colors.green`).

### Testes

- `tests/lib/schemas/rotina.test.ts` — 12+ cases (campos
  obrigatórios, defaults, slug único, exercícios min/max,
  arquivar/desarquivar, migração v1).
- `tests/lib/vault/rotinas.test.ts` — CRUD completo.
- `tests/lib/treinos/sessaoFromRotina.test.ts` — transformação
  template → sessão.
- `tests/app/rotinas/novo.test.tsx` — form com validação.
- `tests/components/treinos/SeletorExercicios.test.tsx`.
- `tests/components/treinos/SeletorRotina.test.tsx`.
- `tests/e2e/playwright/m-rotina-treino.e2e.ts` — fluxo completo:
  cadastrar rotina → abrir SheetNovoTreino → escolher rotina →
  confirmar pré-preenchimento → salvar sessão → confirmar
  `rotina_slug` no .md.

## 5. APIs reutilizáveis

- `<ChipGroup mode="single">` para cor + frequência.
- `<Input>` para nome.
- `<Textarea>` para notas.
- `<DraggableList>` (M17 to-do) para reordenar exercícios na
  rotina.
- `useExercicios` (M13) hook existente para listar exercícios
  cadastrados.
- Helpers Vault: `writeVaultFile`, `readVaultFile`,
  `listVaultDir` em `src/lib/vault/io.ts`.

## 5.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Schema novo:** `Rotina`. Adiciona `rotina_slug` opcional em
  `TreinoSessao` (backward-compat).
- **Vault:** nova pasta `rotinas/`.
- **3 rotas novas:** `/rotinas`, `/rotinas/novo`, `/rotinas/[slug]`.
- **MenuLateral:** novo item.
- **Schema barrel:** `src/lib/schemas/index.ts` exporta os novos
  tipos.

## 6. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR completa ("Nova rotina",
  "Frequência semanal", "Séries × reps × carga").
- Comentários sem acento.
- TS strict, defaults explícitos no zod.
- **Snapshot imutável**: editar rotina NÃO altera sessões
  passadas. Sessão guarda cópia dos campos no momento do
  registro.
- **Soft delete**: arquivar não apaga; sessões antigas continuam
  apontando.
- **Cap 20 exercícios por rotina** (sanity check).

## 7. Aritmética esperada

- Baseline atual + 30-50 testes (schema + vault + helpers + UI +
  E2E).
- 1-2 suítes Jest novas.
- 1 E2E novo.
- Bundle Hermes ≤ 8.85 MB (mudança puramente JS).

## 8. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m-rotina-export \
  && rm -rf /tmp/m-rotina-export

# Validacao Gauntlet (orquestrador):
./gauntlet.sh
# 1. seed({ nomeA: 'Alex', nomeB: 'Sam' })
# 2. abrir('/rotinas/novo') -- form com seletor exercicios.
# 3. Preencher: nome "Pernas", cor cyan, 3 exercicios (agachamento
#    4x10, leg press 3x12, panturrilha 4x15), salvar.
# 4. abrir('/rotinas') -- card "Pernas" cyan visivel.
# 5. abrir('/treinos/novo') ou trigger sheet via FABMenu --
#    SeletorRotina mostra "Pernas".
# 6. Tap em "Pernas" -- exercicios pre-preenchidos.
# 7. Salvar sessao -- arquivo .md com rotina_slug populado.
```

## 9. Checkpoint visual

Screenshots em `docs/sprints/M-ROTINA-TREINO-screenshots-gauntlet/`:
- `A-rotinas-lista-vazia.png` — empty state.
- `B-nova-rotina-form.png` — form de criação aberto.
- `C-seletor-exercicios.png` — busca + lista de exercícios.
- `D-rotina-cadastrada.png` — card visual na lista.
- `E-sheet-novo-treino-com-seletor-rotina.png` — chip "Pernas"
  selecionável no SheetNovoTreino.
- `F-sessao-pre-preenchida.png` — exercícios da rotina dentro da
  sessão.

## 10. Decisões tomadas

- **Rotina é entidade própria, não campo de TreinoSessao**:
  template reutilizável precisa CRUD próprio, com lista, edição,
  arquivamento. Manter como string livre (estado atual)
  desperdiça o potencial.
- **Snapshot imutável em sessão**: editar rotina NÃO recalcula
  sessões passadas. Sessão grava cópia dos campos no momento.
  Justificativa: histórico fiel ao que foi feito; alternativa
  (referência viva) confunde análise de evolução.
- **Soft delete (arquivada: true)**: rotina removida não some
  fisicamente — sessões antigas continuam apontando para o slug.
  UI esconde do seletor padrão.
- **Cor opcional 6 chips Dracula**: identificação visual rápida
  na lista. Default purple. Não conflita com paletas semânticas
  (M30 alarmes, M31 categorias).
- **Frequência semanal informativa**: usuário registra "treino
  3× por semana" mas o app NÃO agenda. M30 alarmes opt-in
  cobre o caso "lembrar de treinar" se o usuário quiser.
- **`exercicio_nome` denormalizado**: cache do nome dentro da
  rotina, evita "exercício deletado" virar texto vazio. Se M13
  apaga exercício, rotina mostra nome cacheado mas avisa
  "movimento removido da galeria".
- **Cap 20 exercícios**: sanity check. Rotina típica tem 5-8.
- **`<SeletorRotina>` no SheetNovoTreino**: ponto de entrada
  natural. Default "Sem rotina" preserva fluxo atual livre.
- **Rota `/rotinas` no MenuLateral**: descoberta — sem entrada no
  menu, feature fica enterrada. Item entre "Exercícios" e
  "Treinos" reflete hierarquia mental (movimento → rotina →
  sessão).

## 11. Implicações para `docs/FEATURES-CANONICAS.md`

Adicionar nova seção entre §4 (Exercícios) e §5 (Medidas):

```
## 4.5 Rotinas de Treino — M-ROTINA-TREINO (proposta)

- Template reutilizável com nome + cor + frequência sugerida +
  lista ordenada de exercícios (séries × reps_alvo × carga_kg).
- CRUD em `/rotinas`, com soft delete (arquivar).
- Selecionável no `SheetNovoTreino` para pré-preenchimento da
  sessão (snapshot imutável).
- Persiste em `rotinas/<slug>.md`.
```

E em §17 schemas: adicionar `rotina` como 19º schema canônico.

Sprint pronta para execução.
