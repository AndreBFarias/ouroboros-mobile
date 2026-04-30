# Sprint M11 — Memórias e Marcos (Telas 09, 10, 11)

```
DEPENDE:    M02 (Vault Bridge) + M05 (humor) + M06 (diário emocional)
BLOQUEIA:   M11.5 (calendário visual de conquistas reusa schemas)
ESTIMATIVA: 6-8h
```

## 1. Objetivo

Entregar a aba "Memórias" do app: heatmap de treinos com 91 dias de
histórico (Tela 09), modal de detalhe de dia passado (Tela 10) e
timeline gentil de marcos (Tela 11). A sprint **cria dois schemas
novos** no Vault: `treino_sessao` (em `treinos/YYYY-MM-DD-slug.md`)
e `marco` (em `marcos/YYYY-MM-DD-slug.md`). A sprint não escreve
nesses schemas a partir do app (CRUD é trabalho de sprint futura);
apenas lê. Marcos não têm ranking, níveis, badges ou pontos.

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
  — Tela placeholder por ora. Empty state: `"Em breve."`. Reaproveita
  schema de medidas/fotos numa sprint futura M12. Não fica vazio sem
  contexto: explica que a aba virá com M12.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasMarcosTab.tsx`
  — Tela 11: timeline vertical com linha `bg-elev` à esquerda, dots
  green 12dp e cards à direita. Cada card mostra data muted + frase
  do marco em `fg`. Sem hierarquia visual de níveis ou ranking.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/DetalheDiaTreinoModal.tsx`
  — Tela 10: bottom sheet 60%, header laranja com data
  (`"23 de abril, terça"`), subtitle cyan
  (`"Rotina B - 28 min - pessoa_a"` formatado via `formatPessoa()`),
  lista compacta de exercícios (check verde + nome + `"3x8 - 4 kg"`),
  bloco observações em itálico muted, botões Editar / Duplicar pra
  hoje (esta sprint só dispara toast `"Em breve."`; CRUD em sprint
  futura).
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
- A sprint **só lê** schemas treino_sessao e marco; não escreve.
  CRUD vem em sprints futuras de exercício e marcos manuais.
- Hoje destacado no heatmap usa outline `purple` 2px (igual ao
  Tela 21 padrão).

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

## 9. Dúvidas em aberto

- Aba Fotos: deixar realmente como placeholder ou remover do
  navigator até M12 chegar?
- Lista de exercícios na Tela 10 mostra "carga_kg" diferente em
  cada série (drop set, pirâmide) ou só a carga média?
- Marcos podem ser auto-gerados pelo backend (após N treinos numa
  semana, p.ex.), ou são sempre manuais? Hoje a spec assume só
  manuais (CRUD futuro).
- Critério de quando criar marco automático após M11: 3 treinos em
  7 dias, retorno após hiato de 5+ dias?
