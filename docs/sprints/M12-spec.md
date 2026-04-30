# Sprint M12 — Medidas Corporais e Comparativo

```
DEPENDE:    M02 (Vault Bridge + Tela 01) + M03 (onboarding com identidade dinâmica)
BLOQUEIA:   M11.5 (calendário) só de forma indireta (usa pasta `medidas/` para timeline futura, mas não bloqueia)
ESTIMATIVA: 5-6h
```

## 1. Objetivo

Entregar duas telas de **medidas corporais**: a **Tela 12** (form de
registro de 9 medidas + 3 fotos + 3 textareas de reflexão) e a
**Tela 13** (comparativo de evolução com sparklines, deltas e galeria
comparativa de fotos lado a lado). Foco em registro semanal rápido e
em visualização longitudinal sem competitividade. Pré-preenchimento da
última medida para acelerar entrada e reduzir esquecimento de campos.

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/medidas/index.tsx` — Tela 13 (Comparativo). Filtro
  período, grid de cards com sparkline, galeria comparativa.
- `app/(tabs)/medidas/novo.tsx` — Tela 12 (Form de registro). Grid
  2 colunas com 9 inputs numéricos + bloco fotos + bloco reflexão.
- `src/lib/schemas/medidas.ts` — Schema zod para `medidas/YYYY-MM-DD.md`
  conforme `docs/BRIEFING.md` §7.
- `src/lib/vault/medidas.ts` — Helpers para listar, ler última medida e
  escrever nova. Funções:
  - `listarMedidas(periodo: '30d' | '90d' | 'tudo'): Promise<Medida[]>`
  - `lerUltimaMedida(): Promise<Medida | null>`
  - `escreverMedida(meta: Medida, body: string): Promise<void>`
- `src/components/data/SparklineMedida.tsx` — Componente leve de
  sparkline com 12 pontos para visualização da série temporal.
  Implementa `react-native-svg` `<Polyline>` com fill `--cyan` 30% e
  stroke `--cyan` 1.5px.
- `src/components/medidas/CardComparativo.tsx` — Card de medida com
  nome (laranja), valor atual (cyan heading), sparkline e delta vs
  primeira medida (em muted).
- `src/components/medidas/SliderFotos.tsx` — Slider entre 2 datas,
  exibindo fotos lado a lado com fade cruzado.
- `tests/schemas/medidas.test.ts` — Testes do schema (válido,
  inválido, defaults).
- `tests/lib/vault/medidas.test.ts` — Testes dos helpers (mock do
  filesystem).
- `tests/components/medidas/CardComparativo.test.tsx`
- `tests/components/medidas/SliderFotos.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `MedidasSchema`, `Medida`.
- `app/(tabs)/_layout.tsx` — adicionar tab `medidas` com ícone
  apropriado (peso). Pode usar `lucide-react-native` `Scale`.
- `docs/BRIEFING.md` — adicionar empty state da Tela 13 ao bloco §8
  ("Estados Especiais"): `"Suas medidas vão aparecer aqui."`.

## 3. APIs reutilizáveis

- `src/components/ui/Input.tsx` — usado para os 9 inputs numéricos.
  Tipo `number`, com `keyboardType="decimal-pad"`.
- `src/components/ui/Button.tsx` — botão `Salvar` green full width.
- `src/components/ui/Chip.tsx` — chips do filtro período (30d / 90d /
  tudo).
- `src/components/ui/Textarea.tsx` — 3 textareas (sentindo /
  objetivos / observações).
- `src/components/ui/Header.tsx` — header `"Medidas"` laranja.
- `src/components/ui/Card.tsx` — base do card de comparativo.
- `src/lib/vault/reader.ts`, `writer.ts`, `paths.ts` — Vault Bridge
  já existente da M02.
- `src/lib/haptics.ts` — `light` no Salvar; `selection` ao trocar
  filtro.
- `src/lib/motion.ts` — `spring_default` para fade do slider de fotos;
  `spring_subtle` para entrada de cards.
- `src/lib/stores/pessoa.ts` — `pessoaAtiva` para pré-preencher campo
  `autor` no frontmatter.
- `expo-image-picker` — já instalado (vide M03.2). Usado para os 3
  botões de foto (frente / costas / lado).

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013).
- `accessibilityLabel` sem acento (convenção screen reader).
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
- Imports via alias `@/*`.
- **Sem cores positivas/negativas no delta** (ADR-0005). O delta vai
  em `--muted`, sem verde para "ganhou" ou vermelho para "perdeu".
  Decisão deliberada: medida corporal não é métrica de performance.
- Pré-preenchimento usa cor `--muted-decor` (placeholder visual) para
  deixar claro que é sugestão da última medida, não valor real.
- Fotos salvas em `assets/m-YYYY-MM-DD-frente.jpg` etc. dentro do
  Vault, conforme schema. Nomes sem acento e em snake_case.
- Não tocar em arquivos fechados de sprints anteriores sem permissão
  explícita do planejador.

## 5. Procedimento sugerido

1. Criar `src/lib/schemas/medidas.ts` com o schema zod completo
   espelhando `docs/BRIEFING.md` §7. Campos numéricos opcionais
   (`peso`, `cintura`, ..., `quadril`), array `fotos`, string
   `reflexao`. Adicionar testes em `tests/schemas/medidas.test.ts`.
2. Implementar `src/lib/vault/medidas.ts` com `listarMedidas`,
   `lerUltimaMedida`, `escreverMedida`. Testes mock do filesystem em
   `tests/lib/vault/medidas.test.ts`.
3. Implementar `app/(tabs)/medidas/novo.tsx` (Tela 12). Grid 2 colunas
   de 9 inputs com pré-preenchimento via `lerUltimaMedida()`. Bloco
   fotos com 3 botões 100x100dp (estado vazio: ícone câmera em
   `--muted-decor`; estado preenchido: thumbnail com X para remover).
   Bloco reflexão com 3 textareas. Botão `Salvar` green com haptic
   `light`. Após salvar: toast `"Medidas salvas."` e navegação para
   Tela 13.
4. Implementar `src/components/data/SparklineMedida.tsx` e
   `src/components/medidas/CardComparativo.tsx`. Sparkline mostra
   últimos 12 valores; se houver menos de 2 pontos, mostrar texto
   muted `"Aguardando mais registros."` no lugar do gráfico.
5. Implementar `app/(tabs)/medidas/index.tsx` (Tela 13). Filtro
   período via ChipGroup single-select. Grid 2 colunas de cards. Bloco
   fotos no fim da tela com `SliderFotos` (slider que troca entre 2
   datas selecionáveis via dropdown). Empty state explícito quando
   não há registros.
6. Adicionar tab `medidas` em `app/(tabs)/_layout.tsx`. Ordem:
   `index`, `humor`, `eventos`, `medidas`, `mais`.
7. Rodar smoke + tests + tsc. Capturar screenshots em
   `docs/sprints/M12-screenshots/` (Nível A, web Chrome).

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m12-export && rm -rf /tmp/m12-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 7. Commit

```
feat: m12 medidas corporais form e comparativo com sparkline
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Validar fluxo completo:
  - Abrir Tela 13 sem registros → empty state visível.
  - Tap em FAB radial (Exercício) → toast "em breve" se rota não
    pronta, ou navegação para `/medidas/novo`.
  - Form preenchido → botão Salvar verde → toast `"Medidas salvas."` →
    Tela 13 com 1 card mostrando o registro.
  - Filtro 30d / 90d / tudo respondendo.
- **APIs nativas — Nível B (emulador Android):**
  `./scripts/start-emulator.sh`. Validar `expo-image-picker` para
  fotos.
- **Final — Nível C (celular físico):** apenas com permissão
  explícita do usuário. Validar gravação real de foto e leitura via
  Syncthing.

Capturar screenshots em `docs/sprints/M12-screenshots/`. Comparar com
artboards `Tela 12` e `Tela 13` do
`docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

- A unidade dos campos (kg, cm) deve aparecer no label ou só como
  placeholder? Sugestão atual: label `"Peso"` + placeholder `"kg"` em
  muted dentro do input. Confirmar antes de codar.
- O slider de fotos da Tela 13 deve permitir selecionar **datas
  arbitrárias** ou só "primeira vs última"? O BRIEFING fala em
  "slider entre 2 datas" sem detalhar. Sugestão: dropdown de datas
  para os 2 lados, default primeira/última.
- O delta vs primeira medida deve mostrar valor absoluto ou
  percentual? Sugestão: absoluto com unidade (`"-2,3 kg vs primeira"`,
  em muted), sem cor.
