# Sprint M13 — Galeria de Exercícios e Detalhe

```
DEPENDE:    M02 (Vault Bridge + Tela 01) + M03 (onboarding com identidade dinâmica)
BLOQUEIA:   M11.5 (calendário) só de forma indireta (referência cruzada com `treinos/`)
ESTIMATIVA: 6-7h
```

## 1. Objetivo

Entregar duas telas de **biblioteca de exercícios**: a **Tela 07**
(Galeria de exercícios cadastrados, com filtros por grupo muscular e
search opcional) e a **Tela 08** (Detalhe do exercício com GIF
animado, instrução, dicas, sparkline de histórico de cargas e botões
de ação). Ambas leem do schema `exercicio` no Vault e renderizam GIFs
locais armazenados em `assets/exercicios/`.

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/exercicios/index.tsx` — Tela 07 (Galeria). Grid 2
  colunas de cards 1:1 com GIF preview + nome em laranja, ChipGroup
  pessoa, ChipGroup grupo muscular, search opcional, botão `+ novo`
  que abre toast `"Cadastro chega na próxima sprint."` (CRUD fica
  fora de escopo desta sprint).
- `app/(tabs)/exercicios/[slug].tsx` — Tela 08 (Detalhe). GIF grande
  full width, chips grupo muscular cyan, linha
  `"Iniciante - halteres - 4 kg"`, bloco instrução, bloco dicas em
  muted lista bullet, sparkline histórico 12 execuções,
  `"Última vez: 23/04, 4 kg, 3x8"`, botões Editar / Adicionar a
  treino livre / Excluir (red text).
- `src/lib/schemas/exercicio.ts` — Schema zod para
  `exercicios/<slug>.md`. Campos: `tipo: 'exercicio'`, `slug`,
  `nome`, `grupo_muscular: enum`, `nivel: enum`, `equipamento`,
  `instrucao`, `dicas: string[]`, `gif: string` (path relativo a
  `assets/exercicios/`), `historico: { data, carga, series, reps }[]`.
- `src/lib/vault/exercicios.ts` — Helpers para listar e ler
  exercícios. Funções:
  - `listarExercicios(filtros?: { grupo?: string; pessoa?: PessoaId; search?: string }): Promise<Exercicio[]>`
  - `lerExercicio(slug: string): Promise<Exercicio | null>`
- `src/components/exercicios/CardGaleria.tsx` — Card 1:1 com GIF
  preview (estático na lista, anima no foco).
- `src/components/exercicios/HistoricoSparkline.tsx` — Sparkline
  específica para evolução de carga (12 pontos).
- `src/components/exercicios/BlocoInstrucao.tsx` — Bloco com
  instrução rica em Markdown simples.
- `tests/schemas/exercicio.test.ts`
- `tests/lib/vault/exercicios.test.ts`
- `tests/components/exercicios/CardGaleria.test.tsx`
- `tests/components/exercicios/HistoricoSparkline.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `ExercicioSchema`,
  `Exercicio`.
- `app/(tabs)/_layout.tsx` — adicionar rota `exercicios` (acessada
  via tab `Mais` ou submenu, não tab principal).
- `assets/exercicios/.gitkeep` — placeholder. GIFs reais entram via
  Vault sincronizado, não versionados no repo (binários).

## 3. APIs reutilizáveis

- `src/components/ui/Chip.tsx` — chips de grupo muscular e filtro
  pessoa.
- `src/components/ui/Input.tsx` — campo de busca opcional.
- `src/components/ui/Button.tsx` — botões Editar / Adicionar a
  treino livre / Excluir.
- `src/components/ui/Header.tsx` — header `"Galeria"` laranja.
- `src/components/ui/Card.tsx` — base do card de galeria.
- `src/components/ui/EmptyState.tsx` — empty state da galeria.
- `src/components/data/SparklineMedida.tsx` (criado em M12) — base
  reaproveitada para `HistoricoSparkline`.
- `src/lib/vault/reader.ts`, `paths.ts` — Vault Bridge da M02.
- `src/lib/haptics.ts` — `light` em botões; `selection` em chips.
- `src/lib/motion.ts` — `spring_default` na transição entre Tela 07
  e Tela 08.
- `expo-image` — render de GIF animado (já avaliado em M01.1).

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict.
- Imports via alias `@/*`.
- **GIFs locais apenas**: nada de URL externa. Caminhos relativos
  a `assets/exercicios/`. GIFs maiores que 2MB devem ser otimizados
  com `gifsicle` antes de entrar no Vault (recomendação não
  bloqueante, citada na Tela 02 quando o CRUD chegar).
- **Botão Excluir** com red text só pede confirmação modal
  destrutiva. Sem haptic warn forte (haptic `medium` é o limite). Não
  apaga GIF do disco; só remove `.md`.
- Não tocar em arquivos fechados de sprints anteriores.

## 5. Procedimento sugerido

1. Criar `src/lib/schemas/exercicio.ts` com schema completo. Testes
   cobrindo schema válido, slug ausente, gif ausente, histórico
   vazio.
2. Implementar `src/lib/vault/exercicios.ts`. `listarExercicios`
   aceita filtros opcionais e aplica sequencialmente (grupo →
   pessoa → search). Testes mock do filesystem.
3. Implementar `src/components/exercicios/CardGaleria.tsx`. GIF
   preview via `expo-image` com `transition={150}`. Tap navega para
   `/exercicios/[slug]`.
4. Implementar `app/(tabs)/exercicios/index.tsx` (Tela 07). Header,
   ChipGroup pessoa, ChipGroup grupo muscular, input search, grid
   2 colunas. Empty state:
   `"Nenhum exercício cadastrado ainda. Use o + para criar."` (no
   spec original do BRIEFING era lowercase; convertido).
5. Implementar `src/components/exercicios/HistoricoSparkline.tsx`.
   Reusa base do `SparklineMedida`, adiciona label de eixo Y em
   muted (carga em kg).
6. Implementar `app/(tabs)/exercicios/[slug].tsx` (Tela 08). GIF
   full width topo (ratio 16:9), header com nome do exercício,
   chips grupo muscular cyan, linha `nivel - equipamento - carga
   recente`, BlocoInstrucao, bloco dicas (lista bullet em muted),
   HistoricoSparkline, linha
   `"Última vez: <data>, <carga> kg, <series>x<reps>"`, 3 botões
   na ordem Editar / Adicionar / Excluir. Botão Excluir com text
   `--red`, sem fundo.
7. Adicionar rota em `app/(tabs)/_layout.tsx`. Sugestão:
   sub-rota dentro de tab `Mais`, ou nova tab dedicada se houver
   espaço (ver com humano antes de codar).
8. Rodar smoke + tests + tsc + expo export.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m13-export && rm -rf /tmp/m13-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 7. Commit

```
feat: m13 galeria e detalhe de exercicio com gif e sparkline historico
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Carregar 2 ou 3 exercícios de exemplo no
  Vault de teste (criar `scripts/seed_exercicios_demo.sh` se
  necessário, mantendo idempotência). Validar:
  - Grid renderiza com GIFs estáticos no Chrome (animação pode não
    rodar via DOM `<img>` em modo web; documentar limitação).
  - Filtro grupo muscular reduz cards.
  - Search filtra por nome.
  - Tap em card vai para detalhe; botões respondem com haptic.
- **APIs nativas — Nível B (emulador Android):** validar render real
  de GIF animado via `expo-image`.
- **Final — Nível C (celular físico):** apenas com permissão
  explícita.

Capturar screenshots em `docs/sprints/M13-screenshots/`. Comparar com
artboards `Tela 07` e `Tela 08` do
`docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

- O CRUD de exercícios (criar / editar) fica em sprint separada
  (provavelmente M13.x). Esta sprint só oferece read + filtros.
  Toast `"Cadastro chega na próxima sprint."` aceitável?
- Quando o GIF não existe em disco, a galeria deve mostrar
  placeholder (ícone halter em muted-decor) ou ocultar o card? Sugestão:
  placeholder, com label `"Sem mídia"` em muted micro embaixo do
  nome.
- O sparkline precisa de tooltip ao tocar em ponto, ou só linha
  estática? Sugestão: estática nesta sprint; tooltip vira M13.x.
