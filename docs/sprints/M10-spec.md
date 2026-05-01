# Sprint M10 — Mini Humor (Tela 21)

```
DEPENDE:    M00.5 fechada (tabs layout existe, schema barrel existe)
            + M02 (Vault Bridge) + M05 (Humor Rápido grava daily/) +
            MOB-bridge-2 (cache humor-heatmap.json gerado pelo backend)
BLOQUEIA:   M11.5 (calendário compartilha estética de heatmap)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Renderizar a página completa de humor: heatmap 13x7 (91 dias), stats
de média 30 dias e contagem de registros, modo sobreposto pessoa_a +
pessoa_b com 50% opacity e atalho para registrar humor agora. A
fonte de dados é o cache JSON gerado pelo backend
(`~/Protocolo-Ouroboros/.ouroboros/cache/humor-heatmap.json`). O
Mobile só lê (ADR-0012). Empty state quando o cache não existe
educa o usuário a rodar o pipeline no desktop.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/(tabs)/humor.tsx`
  — Rota do tab "humor" (Tela 21). Renderiza `<MiniHumorScreen />`
  com header e ChipGroup pessoa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MiniHumorScreen.tsx`
  — Tela completa: header, stats, heatmap, modo sobreposto, botão
  "Registrar humor agora" no topo (atalho do FAB).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/data/HumorHeatmap.tsx`
  — Componente do heatmap 13 colunas (semanas) por 7 linhas (dias da
  semana). Recebe `celulas: HumorCacheCell[]` e `pessoa: PessoaId |
  'sobreposto'`. Cores por nível: sem registro `bg-elev`, humor 1
  red 70%, humor 2 orange 60%, humor 3 yellow 60%, humor 4 cyan 70%,
  humor 5 green solid. Tap em quadrado emite `onSelectDia(date)`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/data/HumorHeatmapStats.tsx`
  — Bloco "Média 30d: 3,4" cyan + "Registros: 22 / 30" muted,
  derivados das estatísticas do cache.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/cache/humor-heatmap.ts`
  — Reader tipado do JSON: `lerHumorHeatmap() => Promise<HumorHeatmapCache | null>`.
  Usa `getVaultRoot()` + `StorageAccessFramework.readAsStringAsync`
  e valida com zod schema. Retorna `null` se cache inexistente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/humor_heatmap_cache.ts`
  — Schema zod do JSON gerado pelo backend (espelha ADR-0012):
  `schema_version`, `gerado_em`, `periodo_dias`, `pessoas`, `celulas`,
  `estatisticas`. Valida `humor` 1-5, `autor` em pessoa_a/pessoa_b.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useHumorHeatmap.ts`
  — Hook que devolve `{ cache, loading, error, recarregar }`.
  Filtra por pessoa ativa quando não está em modo sobreposto.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/DiaHumorModal.tsx`
  — Bottom sheet 60% que aparece quando o usuário toca num quadrado
  com registro. Mostra os 4 sliders readonly, tags e frase do dia
  (se existir).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/cache/humor-heatmap.test.ts`
  — Testes do reader: cache válido, cache inválido (schema
  desconhecido), cache ausente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/humor_heatmap_cache.test.ts`
  — Testes do schema zod com fixtures do exemplo da ADR-0012.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/data/HumorHeatmap.test.tsx`
  — Testes de render: cores corretas por nível, estado vazio, modo
  sobreposto.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — Adicionar `humorHeatmapCachePath()` que devolve
  `.ouroboros/cache/humor-heatmap.json`. Usar
  `VAULT_FOLDERS.cache` já existente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/index.ts`
  — Re-exportar `HumorHeatmapCacheSchema`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/(tabs)/_layout.tsx`
  — Substituir o redirect `/(tabs)/humor → /em-construcao` da M00.5
  por aba real apontando para `app/(tabs)/humor.tsx`.

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/permissions.ts`
  — `getVaultRoot()` para resolver o URI do cache.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa()` para a pessoa ativa default.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/index.ts`
  — `Screen`, `Header`, `Chip`, `ChipGroup`, `PersonAvatar`,
  `EmptyState`, `BottomSheet`, `Button`, `Toast`. O heatmap em si é
  componente novo em `src/components/data/`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/motion.ts`
  — `spring_default` para animação de entrada do heatmap (stagger
  50ms entre células até 600ms total).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/theme/tokens.ts`
  — Cores `red`, `orange`, `yellow`, `cyan`, `green`, `bgElev`.
  Aplicar opacidade via `rgba()` derivada (ver mapa abaixo).

### Mapa de cores do heatmap (Tela 21 do BRIEFING §6 D)

| Nível          | Token          | Opacidade |
|---------------|----------------|-----------|
| sem registro  | `bg-elev`      | 100%      |
| humor 1       | `red`          | 70%       |
| humor 2       | `orange`       | 60%       |
| humor 3       | `yellow`       | 60%       |
| humor 4       | `cyan`         | 70%       |
| humor 5       | `green`        | 100%      |

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** ativa a aba fixa `/(tabs)/humor` registrada como
  redirect-stub em M00.5; agora aponta para `app/(tabs)/humor.tsx`
  real. Ícone `BarChart3` da lucide.
- **Schema:** `HumorHeatmapCacheSchema` exportado via barrel.
- **Store:** consome `usePessoa` e `useVault`. Não cria store novo.
- **app.json:** sem mudança.
- **Boot hook:** nenhum.
- **FAB:** sem mudança; botão "Registrar humor agora" no topo
  navega para `/humor-rapido` (rota M05).
- **Settings:** sem dependência.
- **Backend:** consome `~/Protocolo-Ouroboros/.ouroboros/cache/humor-heatmap.json`
  gerado por MOB-bridge-2.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais.
  Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- **Cache readonly** (ADR-0012): Mobile **lê** o JSON e nunca o
  escreve. Empty state explica: `"Rode o pipeline no desktop pra
  carregar dados."`.
- **Dependência crítica MOB-bridge-2**: a sprint backend
  `MOB-bridge-2` precisa ter gerado pelo menos um
  `humor-heatmap.json` para o checkpoint visual. Caso contrário, a
  validação Nível A/B mostra apenas o empty state. Documentar isso
  no checkpoint.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
  Exemplos canônicos: `"Humor"`, `"Média 30d"`, `"Registros"`,
  `"Modo sobreposto"`, `"Registrar humor agora"`,
  `"Rode o pipeline no desktop pra carregar dados."`,
  `"Cache em formato desconhecido. Rode o pipeline atualizado."`.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`.
- Imports via alias `@/*`.
- Animação de entrada do heatmap em `spring_default` com stagger
  50ms entre células, máx 600ms total. Sem timing linear.

## 5. Procedimento sugerido

1. Criar schema zod `humor_heatmap_cache.ts` baseado na ADR-0012.
   Validar `schema_version === 1` e devolver erro explícito quando
   `> 1`.
2. Criar reader `src/lib/cache/humor-heatmap.ts` que abre o JSON via
   `getVaultRoot()` + SAF, parse + valida zod e retorna o cache
   tipado. Retornar `null` se ausente, `Error` se schema inválido.
3. Criar hook `useHumorHeatmap` filtrando por pessoa ativa.
4. Implementar `<HumorHeatmap>` em `src/components/data/` com matriz
   13x7. Mapear data ISO em coluna/linha. Aplicar cores conforme
   mapa. Animação de entrada via Moti com stagger.
5. Implementar `<HumorHeatmapStats>` com média 30d e contagem de
   registros derivados de `cache.estatisticas[pessoa]`.
6. Implementar modo sobreposto: dois `<HumorHeatmap>` empilhados
   (z-index) com 50% opacity cada.
7. Implementar `<DiaHumorModal>` bottom sheet 60% com sliders
   readonly + tags + frase. Aparece em tap.
8. Implementar `<MiniHumorScreen>` com Header laranja "Humor",
   ChipGroup pessoa (opções: pessoa_a, pessoa_b, sobreposto), botão
   "Registrar humor agora" no topo (`router.push('/humor-rapido')`),
   `<HumorHeatmapStats>` e `<HumorHeatmap>`. Empty state quando
   `cache === null`.
9. Tratar erro de schema desconhecido com EmptyState próprio.
10. Testes: schema, reader, render do heatmap.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m10-export && rm -rf /tmp/m10-export
```

Todos exit 0. Para validação visual com dados reais, é necessário
rodar o pipeline backend (MOB-bridge-2) e gerar
`~/Protocolo-Ouroboros/.ouroboros/cache/humor-heatmap.json`.

## 7. Commit

```
feat: m10 mini humor tela 21 heatmap 90d cache readonly
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Nível A (Chrome web):** valida o layout do heatmap, ChipGroup
  pessoa, modo sobreposto, animação de entrada e empty state.
  Fixture local de cache para o build web.
  `./run.sh --web` + claude-in-chrome MCP.
- **Nível B (emulador Android):** valida a leitura do JSON via SAF
  com cache real sincronizado via Syncthing simulado.
- **Nível C (celular físico):** **só com permissão explícita**.
  Validar com cache real do desktop sincronizado via Syncthing.
  Capturar `docs/sprints/M10-screenshots/` lado a lado com mockup
  `docs/Ouroboros_22_telas-standalone.html` artboard "tela 21".

## 9. Definição de Pronto

- [ ] Aba `/(tabs)/humor` ativa com tela real.
- [ ] Heatmap 13x7 renderizado com cores por nível.
- [ ] Stats "Média 30d" e "Registros: N / 30" cyan/muted.
- [ ] Modo sobreposto pessoa_a + pessoa_b com 50% opacity cada.
- [ ] Tap em quadrado em modo sobreposto abre modal listando
      **ambos** os registros do dia.
- [ ] Botão "Registrar humor agora" navega para `/humor-rapido`.
- [ ] Empty state quando cache ausente:
      `"Rode o pipeline no desktop pra carregar dados."`.
- [ ] Banner muted rodapé "Atualizado em <data>" quando
      `gerado_em` < 24h; em vermelho se > 7 dias.
- [ ] Smoke + tests + tsc + expo export OK.

## 10. Decisões tomadas

- **Tooltip modo sobreposto:** tap abre modal com ambos os
  registros do dia (pessoa_a + pessoa_b empilhados); single tap em
  modo individual abre modal do dia da pessoa filtrada.
- **Média 30d só dias com registro:** evita penalizar por hiatos.
  Documentado em micro caption muted ao lado do número.
- **Cache stale banner:** rodapé muted "Atualizado em <data>"
  sempre visível; vira `--red` quando `gerado_em` > 7 dias para
  alertar que pipeline não rodou recentemente.
- **Outline hoje:** `purple` 2px (mesmo padrão do heatmap de
  treinos da M11 — consistência visual).

Sprint pronta para execução sem perguntas pendentes.
