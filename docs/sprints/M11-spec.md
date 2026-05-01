# Sprint M11 — Memórias e Marcos (Telas 09, 10, 11)

```
DEPENDE:    M00.5 fechada (tabs layout, schemas barrel)
            + M02 (Vault Bridge) + M05 (humor) + M06 (diário emocional)
            + M07 (eventos)
BLOQUEIA:   M11.5 (calendário visual de conquistas reusa schemas)
            + MOB-bridge-3 (marcos auto-gerados pelo backend)
ESTIMATIVA: 8-10h
```

## 1. Objetivo

Entregar a aba "Memórias" do app: heatmap de treinos com 91 dias de
histórico (Tela 09), modal de detalhe de dia passado (Tela 10) e
timeline gentil de marcos (Tela 11), **com CRUD completo** de
sessões de treino e marcos manuais. A aba "Fotos" é concretizada
como **galeria agregada** que varre todas as fotos referenciadas em
schemas existentes (`medidas/`, `eventos/`, `inbox/mente/diario/`,
`marcos/`, `assets/`) e exibe em grid cronológico. A sprint **cria
dois schemas novos** no Vault: `treino_sessao` e `marco`. Marcos
não têm ranking, níveis, badges ou pontos.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/(tabs)/memoria.tsx`
  — Rota do tab "memória" (raiz da aba). Renderiza
  `<MemoriasScreen />` com tabs internas: Treinos / Fotos / Marcos.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasScreen.tsx`
  — Container com 3 tabs internas via `react-native-tab-view` (já
  no roadmap se ainda não instalado, ou reimplementado com pager
  custom). Cada tab renderiza um sub-componente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasTreinosTab.tsx`
  — Tela 09: heatmap 13x7 de treinos, stats `"26 treinos em 90 dias"`
  cyan + legenda `"Menos [|||||] Mais"` muted. Reutiliza
  `<HeatmapBase>` extraído com prop de paleta (verde 30/60/100%).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasFotosTab.tsx`
  — Galeria agregada. `useFotosAgregadas()` varre 5 fontes do Vault
  (`medidas/`, `eventos/`, `inbox/mente/diario/` se mídia, `marcos/`,
  `assets/`) e devolve lista cronológica desc com origem (de qual
  schema veio) e thumbnail. Grid 3 colunas; tap abre `<FotoDetalhe>`
  em bottom sheet 70% mostrando metadata + botão `"Abrir registro"`
  navegando para o schema de origem (ex: `/(tabs)/medidas/<data>`).
  Empty state quando zero fotos: `"Suas fotos vão aparecer aqui
  conforme você registrar."`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useFotosAgregadas.ts`
  — Hook que faz a varredura cruzada e devolve
  `{ fotos: FotoAgregada[], loading, error, recarregar }`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SheetNovoTreino.tsx`
  — Bottom sheet 90% para CRUD de sessão de treino. Form com:
  rotina (input livre), duração min (Slider 1-240), array dinâmico
  de exercícios (cada item: `<ChipGroup>` exercício do `exercicios/`
  da M13 + Slider series/reps/carga), textarea observações, botão
  Salvar verde. Toast `"Treino salvo."` + haptic light.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SheetNovoMarco.tsx`
  — Bottom sheet 70%. Form: textarea descrição (obrigatória),
  ChipGroup multi tags, botão Salvar verde. Toast
  `"Marco anotado."` + haptic success.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/treinos/saveTreino.ts`
  — Função pura: valida + escreve em `treinos/YYYY-MM-DD-<slug>.md`
  via Vault Bridge.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/marcos/saveMarco.ts`
  — Função pura: valida + escreve em `marcos/YYYY-MM-DD-<slug>.md`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/marcos/marcosAuto.ts`
  — `verificarMarcosAuto()`: heurística client-side complementar à
  MOB-bridge-3 (backend gera quando rodando; client gera localmente
  para garantir disponibilidade offline). Critérios:
  - 3 treinos em 7 dias → marco auto `"Tres treinos nesta semana."`
  - Retorno após hiato 5+ dias → marco auto `"Voltou apos N dias parados."`
  - 7 dias consecutivos com humor registrado → marco auto.
  Idempotente via hash do conteúdo (não duplica). Plugado em
  `BOOT_HOOKS` da M00.5.
- Botão flutuante FAB secundário no topo direito da Tela 11
  (Marcos) e Tela 09 (Treinos) com `+` para abrir os sheets.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasMarcosTab.tsx`
  — Tela 11: timeline vertical com linha `bg-elev` à esquerda, dots
  green 12dp e cards à direita. Cada card mostra data muted + frase
  do marco em `fg`. Sem hierarquia visual de níveis ou ranking.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/DetalheDiaTreinoModal.tsx`
  — Tela 10: bottom sheet 60%, header laranja com data
  (`"23 de abril, terça"`), subtitle cyan
  (`"Rotina B - 28 min - pessoa_a"` formatado via `formatPessoa()`),
  lista compacta de exercícios (check verde + nome + `"3x8 - 4 kg"`),
  bloco observações em itálico muted, botões **Editar** (abre
  `<SheetNovoTreino>` pré-preenchido), **Duplicar pra hoje** (cria
  nova sessão hoje copiando exercícios), **Excluir** (modal de
  confirmação destrutivo, move .md para `cacheDirectory/lixeira/`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/data/HeatmapBase.tsx`
  — Componente abstrato 13x7 que recebe `celulas: HeatmapCell[]` e
  `paleta: HeatmapPaleta`. Usado por treinos (verde 30/60/100%) e,
  no futuro, por humor (cores variadas). M10 pode posteriormente
  refatorar `HumorHeatmap` para usar este base.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/treino_sessao.ts`
  — Schema zod do `.md` de sessão de treino. Schema YAML completo
  abaixo na seção 3.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/marco.ts`
  — Schema zod do `.md` de marco. Schema YAML completo abaixo na
  seção 3.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useTreinos.ts`
  — Hook que devolve `{ sessoes, loading, error }` lendo a pasta
  `treinos/` filtrada pela pessoa ativa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useMarcos.ts`
  — Hook que devolve `{ marcos, loading, error }` lendo a pasta
  `marcos/` filtrada pela pessoa ativa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/treino_sessao.test.ts`
  — Testes zod: campos obrigatórios, validação de duração, lista de
  exercícios.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/marco.test.ts`
  — Testes zod: tipo, autor, data, descrição, opcional `tags`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/data/HeatmapBase.test.tsx`
  — Testes de render: paleta verde, paleta humor, hoje destacado em
  outline purple 2px.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — Adicionar `marcosPath(date, slug)` no padrão. `treinosPath(date,
  slug)` segue padrão similar a `eventosPath`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/BottomTabs.tsx`
  — Garantir tab "memória" presente. Ícone `lucide-react-native`
  `Layers` ou `Calendar`.

### Schemas YAML completos criados nesta sprint

#### `treinos/YYYY-MM-DD-slug.md` — schema `treino_sessao`

```yaml
---
tipo: treino_sessao
data: 2026-04-23T18:00:00-03:00
autor: pessoa_a
rotina: "rotina B"
duracao_min: 28
exercicios:
  - nome: "supino reto"
    series: 3
    reps: 8
    carga_kg: 4
    observacao: "tranquilo, sem dor"
  - nome: "remada baixa"
    series: 3
    reps: 8
    carga_kg: 6
observacoes: "leve, voltei depois de 3 dias parado."
---
```

Regras zod:
- `tipo: z.literal('treino_sessao')`
- `data` ISO 8601 com hora.
- `autor` em `PessoaAutorSchema`.
- `rotina` string opcional.
- `duracao_min` int 1-240.
- `exercicios` array (min 1) de `{ nome, series, reps, carga_kg?,
  observacao? }`.
- `observacoes` string opcional.

#### `marcos/YYYY-MM-DD-slug.md` — schema `marco`

```yaml
---
tipo: marco
data: 2026-04-23T20:15:00-03:00
autor: pessoa_a
descricao: "três treinos nesta semana."
tags: [treino, consistencia]
---

contexto opcional em texto livre.
```

Regras zod:
- `tipo: z.literal('marco')`
- `data` ISO 8601 com hora.
- `autor` em `PessoaAutorSchema`.
- `descricao` string min 1 char.
- `tags` array de strings (default `[]`).

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/reader.ts`
  — `readVaultFile<T>` e `listVaultFolder` para varrer
  `treinos/` e `marcos/`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `formatDateYmd`, `VAULT_FOLDERS.treinos`, `VAULT_FOLDERS.marcos`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/pessoa.ts`
  — `PessoaAutorSchema` para o campo `autor` em ambos os schemas.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa()` para filtrar treinos/marcos pela pessoa ativa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/index.ts`
  — `Screen`, `Header`, `Chip`, `EmptyState`, `BottomSheet`,
  `Button`, `PersonAvatar`. Estética herda.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/motion.ts`
  — `spring_default` para entrada do heatmap, `spring_subtle` para
  cards de timeline.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** ativa aba fixa `/(tabs)/memoria` registrada na M00.5.
  Sub-rota `/(tabs)/memoria` com tabs internas via
  `react-native-tab-view` (Treinos / Fotos / Marcos).
- **Schema:** `TreinoSessaoSchema`, `MarcoSchema` e tipos exportados
  via `src/lib/schemas/index.ts`.
- **Store:** consome `usePessoa`. Não cria store novo.
- **app.json:** sem mudança.
- **Boot hook:** registra `verificarMarcosAuto` em `BOOT_HOOKS`
  (M00.5) — roda 1x/dia.
- **FAB:** sem mudança no FAB radial principal. Cada sub-tab
  (Treinos, Marcos) tem seu próprio botão `+` no canto superior
  direito que abre os sheets.
- **Settings:** sem dependência direta.
- **Backend:** consome marcos auto-gerados de MOB-bridge-3 quando
  presentes; senão usa heurística client.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais.
  Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- **Sem gamificação** (ADR-0005): timeline de marcos não tem
  ranking, níveis, badges, pontos, fogo, troféus, streak visível,
  comparativo entre pessoas.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
  Exemplos canônicos: `"Memórias"`, `"Treinos"`, `"Fotos"`,
  `"Marcos"`, `"Rotina B"`, `"Editar"`, `"Duplicar pra hoje"`,
  `"Vai aparecer aqui assim que você treinar."`,
  `"Marcos vão aparecer com o tempo."`,
  `"23 de abril, terça"`.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`.
- Imports via alias `@/*`.
- A sprint entrega **CRUD completo** de treinos e marcos manuais.
  Galeria de fotos é leitura agregada de schemas existentes (não
  duplica fotos no Vault).
- Hoje destacado no heatmap usa outline `purple` 2px (igual ao
  Tela 21 padrão).
- Marcos auto-gerados pelo client são **idempotentes** — hash do
  conteúdo evita duplicatas quando MOB-bridge-3 também roda no
  backend.

## 5. Procedimento sugerido

1. Criar schemas `treino_sessao.ts` e `marco.ts` com testes zod.
2. Adicionar paths em `src/lib/vault/paths.ts`.
3. Criar `<HeatmapBase>` em `src/components/data/`. Receber paleta
   como prop. Animação stagger 50ms entre células, máx 600ms total.
4. Criar hooks `useTreinos` e `useMarcos` consumindo
   `listVaultFolder` + `readVaultFile` em paralelo.
5. Implementar `<MemoriasTreinosTab>` com `<HeatmapBase>` + paleta
   verde + stats `"26 treinos em 90 dias"`. Tap em quadrado abre
   `<DetalheDiaTreinoModal>`.
6. Implementar `<MemoriasMarcosTab>` com timeline vertical: linha
   `bg-elev` 1px à esquerda, dot 12dp green em cada item, card à
   direita com data muted + descrição fg. Mais recente primeiro.
   Empty state: `"Marcos vão aparecer com o tempo."`.
7. Implementar `<MemoriasFotosTab>` placeholder com EmptyState
   `"Em breve."` + texto educativo apontando M12.
8. Implementar `<DetalheDiaTreinoModal>` em bottom sheet 60% com
   header laranja, subtitle cyan, lista de exercícios com check
   verde 16dp + nome + `"<series>x<reps> - <carga>"`. Botões
   Editar e Duplicar disparam toast `"Em breve."`.
9. Implementar `<MemoriasScreen>` com tabs internas e router
   passando para o sub-componente certo.
10. Testes de schemas, render do heatmap base e timeline.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m11-export && rm -rf /tmp/m11-export
```

Todos exit 0. Para checkpoint visual, usar `scripts/seed_vault_demo.sh`
estendido (esta sprint pode estendê-lo) com 3 sessões de treino e 2
marcos de exemplo.

## 7. Commit

```
feat: m11 memorias e marcos telas 09 10 11 schemas treino sessao e marco
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Nível A (Chrome web):** valida o layout das 3 tabs, heatmap base,
  timeline, bottom sheet. Empty states. `./run.sh --web` +
  claude-in-chrome MCP.
- **Nível B (emulador Android):** valida leitura via SAF de
  `treinos/` e `marcos/` no Vault físico do emulador.
- **Nível C (celular físico):** **só com permissão explícita**.
  Capturar `docs/sprints/M11-screenshots/` lado a lado com mockup
  `docs/Ouroboros_22_telas-standalone.html` artboards "tela 09",
  "tela 10" e "tela 11".

## 9. Definição de Pronto

- [ ] Aba `/(tabs)/memoria` ativa com 3 tabs internas (Treinos /
      Fotos / Marcos).
- [ ] Heatmap 13x7 de treinos renderizado.
- [ ] Tap em quadrado abre `<DetalheDiaTreinoModal>` com Editar /
      Duplicar / Excluir funcionais.
- [ ] Aba Fotos com galeria agregada de 5 fontes, grid 3 cols,
      tap abre detalhe + atalho para registro origem.
- [ ] Aba Marcos com timeline + botão `+` para criar manual.
- [ ] CRUD de treinos completo (criar, editar, duplicar, excluir).
- [ ] CRUD de marcos completo.
- [ ] Marcos auto-gerados pelo client (idempotentes) rodando uma
      vez por dia via boot hook.
- [ ] Marcos auto do backend (MOB-bridge-3) reconhecidos sem
      duplicação.
- [ ] Smoke + tests + tsc + expo export OK.

## 10. Decisões tomadas

- **Aba Fotos concretizada como galeria agregada:** varre
  `medidas/`, `eventos/`, `inbox/mente/diario/`, `marcos/`,
  `assets/`. Sem duplicação de arquivos.
- **CRUD treinos e marcos entrega na M11:** sheets de criação,
  Editar/Duplicar/Excluir nos modais de detalhe. Lixeira soft em
  `cacheDirectory/lixeira/<tipo>/<timestamp>-<slug>.md`.
- **Carga drop set:** Tela 10 mostra cargas separadas por série
  quando há variação (formato `"4 kg → 6 kg → 4 kg, 3x8"`); senão,
  carga única.
- **Marcos auto-gerados (3 critérios):**
  - 3 treinos em 7 dias → `"Tres treinos nesta semana."`
  - Retorno após hiato 5+ dias → `"Voltou apos N dias parados."`
  - 7 dias consecutivos com humor → `"Sete dias acompanhando."`
  Critérios fixos; revisão sob demanda.
- **Origem dos marcos auto:** tanto MOB-bridge-3 (backend) quanto
  `verificarMarcosAuto` (client) podem gerar. Hash do conteúdo
  evita duplicação cruzada.

Sprint pronta para execução sem perguntas pendentes.
