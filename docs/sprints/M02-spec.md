# Sprint M02 — Vault Bridge + Tela 01 (hoje)

```
DEPENDE: M01 (tag v0.1.0-m01, commit 14b1d29)
SUCEDE: M03 (Onboarding com input de nomes)
ESTIMATIVA: 3-4 horas
```

## Objetivo

Conectar o app ao Vault Obsidian em `~/Controle de Bordo/` (que o
backend desktop `protocolo-ouroboros` já usa via Syncthing) e renderizar
a **Tela 01 (hoje)** lendo `.md` reais do Vault. Esta é a primeira
sprint que faz o app deixar de ser só componentes em isolamento e
virar produto: lê dados reais, mostra na tela, com filtros e
empty states.

## Contexto Técnico

- **Vault físico:** `~/Controle de Bordo/` no celular (sincronizado
  via Syncthing). Mobile precisa pedir permissão SAF (Storage Access
  Framework) **uma vez** no primeiro uso, e persiste o URI da pasta
  raiz em SecureStore.
- **Schemas .md:** definidos em `docs/BRIEFING.md` §7. Tela 01 lê
  principalmente `daily/YYYY-MM-DD.md` (humor do dia) e
  `inbox/mente/diario/YYYY-MM-DD-*.md` (diário emocional).
- **Tela 01 layout:** `docs/Ouroboros_22_telas-standalone.html`
  artboard "tela 01 — hoje" é fonte de verdade visual.
- **Sem rede:** tudo é local. Zero analytics, zero crash reporter
  (ADR-007).

### Estado real do Vault no celular

Inspeção em 2026-04-29 mostrou que `~/Controle de Bordo/` **já tem
conteúdo humano** do usuário (Diario/, Inbox/, Pessoal/, Trabalho/,
Agents.md, planos financeiros, etc.). As pastas canônicas do BRIEFING
(`daily/`, `eventos/`, `inbox/mente/diario/`) **não existem**.

**Política de coexistência:**
- Mobile **só lê e escreve nas pastas canônicas que ele cria**:
  `daily/`, `eventos/`, `inbox/mente/`, `treinos/`, `medidas/`,
  `marcos/`, `.ouroboros/cache/`.
- Mobile **nunca toca** em `Diario/`, `Inbox/` (capitalizada),
  `Pessoal/`, `Trabalho/`, `Projetos/`, `Conceitos/`, `Arquivo/`,
  `_Attachments/`, ou qualquer arquivo `.md` na raiz.
- Filesystem ext4 é case-sensitive: `daily/` e `Diario/` coexistem
  sem colisão.
- Reader/lister deve **listar somente** os paths canônicos.
- Writer deve criar pastas faltantes via SAF antes de escrever.

### Dados de Teste para Checkpoint Visual

Como o Vault real não tem ainda nenhum `daily/2026-04-29.md` ou
`eventos/...md`, a Tela 01 mostraria só empty states. Para validação
visual ficar útil, esta sprint **cria também 3 .md de exemplo** em
um script `scripts/seed_vault_demo.sh` que o usuário roda manualmente:

```
~/Controle de Bordo/daily/2026-04-29.md           (humor pessoa_a)
~/Controle de Bordo/eventos/2026-04-29-cafe.md    (evento positivo)
~/Controle de Bordo/inbox/mente/diario/2026-04-29-1430.md  (diario vitoria)
```

Conteúdo seguindo schemas do BRIEFING, com `autor: pessoa_a` e
strings genéricas. Script é idempotente (não sobrescreve se já
existir).

## Entregáveis

### 1. Vault Bridge (`src/lib/vault/`)

- `paths.ts` — funções para construir paths canônicos do Vault:
  - `dailyPath(date: Date): string`
  - `eventosPath(date: Date, slug: string): string`
  - `diarioEmocionalPath(date: Date, slug: string): string`
  - `assetsPath(filename: string): string`
- `frontmatter.ts` — parser/serializer de YAML frontmatter usando
  `yaml` (já instalado). Funções:
  - `parseFrontmatter<T>(raw: string, schema: ZodSchema<T>): { meta: T; body: string }`
  - `stringifyFrontmatter<T>(meta: T, body: string): string`
- `reader.ts` — leitura tipada de arquivos:
  - `readVaultFile<T>(uri: string, schema: ZodSchema<T>): Promise<{ meta: T; body: string } | null>`
  - `listVaultFolder(folderUri: string, ext?: string): Promise<string[]>`
- `writer.ts` — escrita atômica:
  - `writeVaultFile<T>(uri: string, meta: T, body: string): Promise<void>`
- `permissions.ts` — wrapper sobre `expo-file-system`
  StorageAccessFramework para pedir permissão da pasta raiz e
  persistir URI:
  - `requestVaultPermission(): Promise<string | null>` (retorna URI raiz)
  - `getVaultRoot(): string | null` (lê do SecureStore)
- `index.ts` — barrel.

### 2. Schemas .md (`src/lib/schemas/`)

Adicionar novos schemas zod (modelados em `docs/BRIEFING.md` §7):

- `humor.ts` — `daily/YYYY-MM-DD.md`
- `diario_emocional.ts` — `inbox/mente/diario/YYYY-MM-DD-*.md`
- `evento.ts` — `eventos/YYYY-MM-DD-*.md`
- (deixar treino/medidas/financeiro para sprints futuras)

Todos exportam type + schema, e validam `autor: 'pessoa_a' | 'pessoa_b'`
via `PessoaAutorSchema` já existente.

### 3. Store de Vault (`src/lib/stores/vault.ts`)

Zustand store global expondo:
- `vaultRoot: string | null` — URI raiz da pasta selecionada pelo
  usuário (persistido via SecureStore como `pessoa.ts` faz).
- `setVaultRoot(uri: string)`.
- `clearVaultRoot()`.

### 4. Hook de Dados — `src/lib/hooks/useHoje.ts`

Hook customizado que retorna o estado da tela "hoje":
```ts
type HojeData = {
  humor: HumorMeta | null;       // do daily/YYYY-MM-DD.md
  diarios: DiarioEmocionalMeta[]; // de inbox/mente/diario/YYYY-MM-DD-*.md
  eventos: EventoMeta[];          // de eventos/YYYY-MM-DD-*.md
  loading: boolean;
  error: string | null;
};
```

Filtra automaticamente pela `pessoaAtiva` da store.

### 5. Tela 01 (hoje) — `app/index.tsx`

Substitui o re-export do storybook. Layout segue mockup
`docs/Ouroboros_22_telas-standalone.html` artboard tela 01:

- `<Header>` "Hoje" + `<PersonAvatar>` no canto direito (filtro de pessoa).
- Card grande de **humor do dia** (se existe registro).
  - Se vazio: `<EmptyState>` "Nenhum registro de humor hoje. Toque + para começar."
  - Se preenchido: 4 sliders (humor, energia, ansiedade, foco) em
    estado readonly com valores em `--cyan`, frase em itálico
    `--muted`, tags em chips.
- Lista de **diários emocionais do dia** (timeline).
  - Cada item: cor borda esquerda (red trigger / green vitória),
    hora muted, texto truncado em 2 linhas.
- Lista de **eventos do dia**.
- `<FAB>` (componente já existente) absoluto canto inferior direito.
  Por enquanto o tap mostra um `Toast info "FAB radial chega na M04"` —
  o radial expandido vem na M04.
- **Estado sem permissão de Vault:** modal full-screen pedindo
  `requestVaultPermission()` com botão "Permitir acesso ao Vault".
  Sem isso, app não navega.

### 6. Testes

- `tests/lib/vault/frontmatter.test.ts` — parse + stringify
  round-trip preservam dados.
- `tests/lib/vault/paths.test.ts` — datas formatadas corretamente
  em UTC-3.
- `tests/lib/schemas/humor.test.ts` — aceita schema do BRIEFING,
  rejeita sem `autor`, rejeita `humor` fora de 1-5.
- `tests/lib/schemas/diario_emocional.test.ts` — modos `trigger` e
  `vitoria`, campo `funcionou` opcional só se `modo === 'trigger'`.
- `tests/lib/schemas/evento.test.ts` — modos positivo/negativo.
- (sem testes de UI desta vez — tela 01 envolve filesystem que é
  difícil de mockar robustamente; vamos confiar no checkpoint visual)

### 7. Script de Seed (`scripts/seed_vault_demo.sh`)

Script bash idempotente que cria 3 `.md` de exemplo no Vault físico
(`~/Controle de Bordo/`) para o checkpoint visual da Tela 01:

- `daily/2026-04-29.md` — humor `pessoa_a` com 4 sliders, 3 tags,
  frase do dia.
- `eventos/2026-04-29-cafe.md` — evento positivo, modo positivo,
  bairro, com PESSOA_B, foto stub.
- `inbox/mente/diario/2026-04-29-1430.md` — diário vitória, emoções
  positivas, intensidade 4.

Schema YAML conforme `docs/BRIEFING.md` §7. Verificação: arquivos
existem após executar, são parseáveis com zod schemas criados nesta
sprint.

Total esperado: 65 + ~15 = **≥80 testes**.

## Sucesso = (todos verificáveis)

1. Arquivos criados nos paths exatos da seção "Entregáveis".
2. `npx tsc --noEmit` exit 0.
3. `./scripts/smoke.sh` OK.
4. `npm test --silent` OK, total ≥ 80.
5. `npx expo export --platform android --output-dir /tmp/m02-export`
   exit 0.
6. **Validação visual** (humano no celular): app abre, pede permissão
   do Vault uma vez, depois mostra tela 01 com cards de humor/diário/
   evento conforme dados reais em `~/Controle de Bordo/`.
7. Schemas zod batem com `docs/BRIEFING.md` §7 — confirmar com
   leitura cruzada.
8. **Commit:** `feat: m02 vault bridge tela 01 hoje`

## Restrições

- **Regra −1**: zero IA, zero nomes reais. `autor` é sempre
  `pessoa_a`/`pessoa_b`.
- **Sem emojis** em código ou docs.
- **Strings de UI** em **Sentence case com acentuação PT-BR completa**
  (regra revogada do BRIEFING, ver `VALIDATOR_BRIEF.md` §1.4).
- **`accessibilityLabel`** sem acento.
- **Comentários `.ts/.tsx`** sem acento.
- **TypeScript strict** — sem `any`, sem `@ts-ignore`.
- **Imports** via alias `@/*`.
- **Não mexer** em componentes UI da M01 — eles estão fechados. Se
  precisar de variação, criar novo componente.
- **Não escrever no Vault** nesta sprint — só leitura. Escrita vem
  na M03 (onboarding salva preferências) e M05 (humor rápido salva
  daily).

## Procedimento Recomendado

1. Pedir dependências adicionais via `npx expo install`:
   `expo-file-system` (já instalado, mas garantir — usado para SAF).
2. Criar primeiro `paths.ts` + `frontmatter.ts` + testes desses dois
   (sem dependência de filesystem real).
3. Depois `permissions.ts` e `vault.ts` store.
4. Schemas humor/diario/evento + testes.
5. Hook `useHoje` em cima do reader.
6. Tela 01 em `app/index.tsx` (substituir o re-export do storybook).
   Manter `app/_components.tsx` acessível via deep-link
   `exp://...?screen=_components`.
7. Validar `tsc + smoke + tests + export` antes do commit.

## Critério de Validação

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m02-export && rm -rf /tmp/m02-export
```

Todos exit 0. Após commit, eu (planejador) reabro o servidor Expo
para o usuário validar visualmente no celular real.

## Reporte ao Final

1. Lista de arquivos criados/modificados (paths absolutos).
2. Saída literal de tsc, smoke, npm test, expo export.
3. Quantidade total de testes (≥ 80).
4. Achados colaterais formatados como `ACHADO: ... | Sugestão: ...`.
5. **Faça o commit** com mensagem exata
   `feat: m02 vault bridge tela 01 hoje` e reporte o hash.
