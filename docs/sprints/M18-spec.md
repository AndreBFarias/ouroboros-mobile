# Sprint M18 — F-17 Contador "Dias Sem X"

```
DEPENDE:    M02 (Vault Bridge) + M03 (identidade dinâmica) + M15 (toggle de ativação)
BLOQUEIA:   nenhuma sprint Mobile direta
ESTIMATIVA: 3h
```

## 1. Objetivo

Entregar um **contador pessoal de "dias sem X"** persistido em
`contadores/<slug>.md` no Vault. Tela única com cards grandes; cada
um mostra o número de dias atual (gigante), o nome em laranja, o
recorde discreto em muted e um botão pequeno `"Resetei"` para
registrar um reset com timestamp. **Sem celebração visual, sem
fogo, sem badge** (ADR-0005). Empty state:
`"Comece quando quiser."`. Só aparece no menu quando
`featureToggles.contadorDiasSem === true`.

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/contadores/index.tsx` — Tela de listagem. Cards
  grandes (1 por linha em mobile, 2 em web). Empty state.
  FAB `+` que abre `/contadores/novo`.
- `app/(tabs)/contadores/novo.tsx` — Form simples com input
  título + date picker início + botão Criar.
- `src/lib/schemas/contador.ts` — Schema zod para
  `contadores/<slug>.md`.
- `src/lib/vault/contadores.ts` — Helpers:
  - `listarContadores(): Promise<Contador[]>`
  - `lerContador(slug: string): Promise<Contador | null>`
  - `escreverContador(meta: Contador, body: string): Promise<void>`
  - `registrarReset(slug: string): Promise<void>` — adiciona
    timestamp ao array `resets`, recalcula `inicio = now()`,
    atualiza `recorde` se necessário.
- `src/lib/util/diasEntre.ts` — Função pura
  `diasEntre(a: Date, b: Date): number` (UTC, sem horas).
- `src/components/contadores/CardContador.tsx` — Card grande com
  número de dias + nome + recorde + botão reset.
- `src/components/contadores/ModalConfirmaReset.tsx` — Modal de
  confirmação destrutivo simples.
- `tests/schemas/contador.test.ts`
- `tests/lib/vault/contadores.test.ts`
- `tests/lib/util/diasEntre.test.ts`
- `tests/components/contadores/CardContador.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `ContadorSchema`.
- `app/(tabs)/_layout.tsx` — registrar rota `contadores`
  condicional ao toggle.

## 3. Schema YAML completo

`contadores/<slug>.md`:

```yaml
---
tipo: contador
slug: sem-cigarro
titulo: "Sem cigarro"
inicio: 2026-04-01            # data atual de inicio (atualiza em cada reset)
recorde: 28                   # int auto-atualizado; melhor sequencia em dias
resets: [                     # historico de resets em ISO
  "2026-03-04T10:30:00-03:00",
  "2026-04-01T08:00:00-03:00"
]
criado_em: 2026-02-04T14:00:00-03:00
---
```

Corpo livre (motivo opcional, em prosa). Não exibido na lista; só
no detalhe (futuro).

## 4. APIs reutilizáveis

- `src/components/ui/Input.tsx` — input título.
- `src/components/ui/Button.tsx` — botão Criar / botão Resetei.
- `src/components/ui/Card.tsx` — base do CardContador (variante
  `large`).
- `src/components/ui/Header.tsx` — header `"Contadores"` laranja.
- `src/components/ui/EmptyState.tsx` — empty state.
- `src/lib/vault/reader.ts`, `writer.ts`, `paths.ts` — Vault
  Bridge.
- `src/lib/haptics.ts` — `light` no botão Criar; **`medium` (não
  `success`)** no Resetei após confirmação. Sem haptic em hover ou
  scroll.
- `src/lib/motion.ts` — `spring_subtle` no fade-in do número novo
  após reset. Nada animado de forma triunfal.
- `src/lib/stores/pessoa.ts` — `pessoaAtiva` define o `autor` no
  frontmatter (mesmo que não use no agregado, ajuda em filtro
  futuro).
- `@react-native-community/datetimepicker` — date picker no form de
  criação.

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
- **Sem celebração visual** (ADR-0005). Reforço explícito desta
  sprint:
  - Sem fogo, chama, ícone trofeu, badge.
  - Sem "parabéns", "você conseguiu", motivacional algum.
  - Sem cor especial em milestones (7 dias, 30 dias, 100 dias).
    O número fica sempre em `--cyan`, igual qualquer outro.
  - Sem som ao abrir a tela ou ao incrementar dia.
  - Sem confete, sem bounce extra. Animação de fade-in única no
    valor após reset (transição sutil, não comemorativa).
  - Recorde aparece em `--muted` com label simples
    `"Recorde: N dias"`. Sem destaque visual.
- **Botão Resetei**: red text small (não fundo red). Confirmação
  obrigatória via modal. Modal text:
  `"Marcar reset hoje? O contador volta para 0."`. Botões: `"Sim,
  resetei"` red text, `"Cancelar"` muted. Após confirmar, haptic
  `medium` + toast `"Reset registrado."` (sem ponto exclamação,
  sem julgamento).
- **Cálculo de dias**: pura função em UTC sem horas. Evita
  off-by-one por timezone. Reset registrado às 23:59 conta como
  dia 0; novo dia começa à meia-noite local.
- **Recorde nunca diminui**. Se reset acontece com `dias <
  recorde`, mantém `recorde`. Se `dias > recorde`, atualiza
  `recorde` antes do reset.
- Não tocar em arquivos fechados de sprints anteriores.

## 6. Procedimento sugerido

1. Criar `src/lib/schemas/contador.ts` com schema completo. Slug
   gerado do título via `kebab-case` + sufixo random 4 chars.
   Testes.
2. Implementar `src/lib/util/diasEntre.ts`. Função pura.
3. Implementar `src/lib/vault/contadores.ts`. `registrarReset`
   coordena: ler contador atual → calcular dias até now → comparar
   com recorde → atualizar `recorde` se necessário → adicionar
   timestamp ao array `resets` → atualizar `inicio = now()` →
   reescrever .md.
4. Implementar `src/components/contadores/CardContador.tsx`. Layout:
   - Linha 1: número de dias em `--cyan` heading-1 (48dp), com
     label "dia"/"dias" pequena ao lado (em muted, 14dp).
   - Linha 2: título em `--orange` heading-3.
   - Linha 3: `"Recorde: N dias"` em `--muted` micro caption.
   - Linha 4: botão `"Resetei"` red text alinhado à direita.
5. Implementar `ModalConfirmaReset.tsx`. Modal central simples.
6. Implementar `app/(tabs)/contadores/novo.tsx`. Form com input
   título + date picker início (default hoje) + botão Criar.
7. Implementar `app/(tabs)/contadores/index.tsx`. Lista de cards,
   empty state, FAB `+`.
8. Rodar smoke + tests + tsc + expo export.

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m18-export && rm -rf /tmp/m18-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 8. Commit

```
feat: m18 contador dias sem x opt-in sem celebracao visual
```

## 9. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Validar:
  - Sem ativar toggle → tab `/contadores` não aparece.
  - Ativar → tab aparece, empty state com texto
    `"Comece quando quiser."`.
  - Criar 1 contador com início ontem → card mostra `"1 dia"` em
    cyan e título em laranja.
  - Botão Resetei → modal → confirmar → contador volta para 0.
  - **Confirmar ausência de:** fogo, badge, mensagem motivacional,
    confete, som, animação triunfal. Comparar visualmente com
    apps comuns desse gênero (qualquer toque comemorativo é falha
    de validação).
- **APIs nativas — Nível B (emulador Android):** validar
  persistência via SAF.
- **Final — Nível C (celular físico):** apenas com permissão.
  Validar Syncthing real.

Capturar screenshots em `docs/sprints/M18-screenshots/`.

## 10. Dúvidas em aberto

- O label `"dia"`/`"dias"` deve aparecer ao lado do número
  gigante ou abaixo? Sugestão: ao lado em micro muted, mantendo
  hierarquia visual.
- Histórico de resets é visível em algum lugar nesta sprint?
  Sugestão: **não**. Lista só mostra dias atuais. Histórico fica
  para sprint futura (M18.x).
- Quando o usuário cria um contador com data de início no futuro,
  o que mostrar? Sugestão: bloquear no form (date picker
  `maximumDate={now}`).
