# Sprint M16 — F-15 Alarme Pessoal (com Snooze)

```
DEPENDE:    M00.5 fechada (toggle alarmePessoal + reagendamento boot)
            + M02 (Vault Bridge) + M03 (identidade dinâmica)
            + M15 (UI do toggle em Settings)
BLOQUEIA:   nenhuma sprint Mobile direta
ESTIMATIVA: 5-6h
```

## 1. Objetivo

Entregar um **alarme pessoal opt-in** persistido em
`alarmes/<slug>.md` no Vault, com tela de cadastro (título,
horário, dias da semana, tag, som, toggle ativo) e tela de
listagem em cards com toggle inline. Disparo via
`expo-notifications` com horários recorrentes. Só aparece no
menu lateral quando `featureToggles.alarmePessoal === true` em
Settings (M15).

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/alarmes/index.tsx` — Tela de listagem. Cards com
  título + horário + dias + toggle ativo inline. Botão flutuante
  `+` que abre `/alarmes/novo`. Empty state:
  `"Crie seu primeiro alarme."`
- `app/(tabs)/alarmes/novo.tsx` — Tela de cadastro. Form com
  todos os campos + botão Salvar. Reusada como `/alarmes/[slug]`
  para edição (mesma rota).
- `src/lib/schemas/alarme.ts` — Schema zod para
  `alarmes/<slug>.md`.
- `src/lib/vault/alarmes.ts` — Helpers:
  - `listarAlarmes(): Promise<Alarme[]>`
  - `lerAlarme(slug: string): Promise<Alarme | null>`
  - `escreverAlarme(meta: Alarme, body: string): Promise<void>`
  - `excluirAlarme(slug: string): Promise<void>`
- `src/lib/services/alarmesNotificacoes.ts` — Wrapper
  `expo-notifications` para esta feature. Funções:
  - `agendarAlarme(alarme: Alarme): Promise<string[]>` — retorna
    array de notification IDs (1 por dia da semana).
  - `cancelarAlarme(slug: string): Promise<void>` — cancela todos
    os IDs salvos para o slug.
  - `reagendarAlarmes(): Promise<void>` — exportada e adicionada
    a `BOOT_HOOKS` (M00.5) para reidratar agendamentos.
  - `agendarSnooze(slug: string, minutos: number): Promise<string>`
    — agenda uma notificação one-shot daqui a N minutos para
    snooze.
  - `cancelarSnooze(slug: string): Promise<void>` — cancela
    snooze ativo.
- `src/lib/services/notificationActions.ts` — registra **categorias
  com action buttons** via `Notifications.setNotificationCategoryAsync`.
  Categoria `alarme` tem 2 botões:
  - `"Soneca 5 min"` → handler chama `agendarSnooze(slug, 5)`.
  - `"Desligar"` → handler chama `cancelarSnooze(slug)` e marca
    `alarme.ultimo_disparo = now()`.
  Plugado em `app/_layout.tsx` no boot (idempotente).
- `src/components/alarmes/CardAlarme.tsx` — Card com título +
  horário + dias + toggle inline.
- `src/components/alarmes/SeletorDias.tsx` — ChipGroup multi de
  dias da semana (D, S, T, Q, Q, S, S).
- `tests/schemas/alarme.test.ts`
- `tests/lib/vault/alarmes.test.ts`
- `tests/components/alarmes/CardAlarme.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `AlarmeSchema` e tipo
  `Alarme`.
- `app/(tabs)/_layout.tsx` — registrar rota `alarmes` condicional
  ao toggle `useSettings.featureToggles.alarmePessoal`.
- `src/lib/boot/reagendamento.ts` — adicionar `reagendarAlarmes`
  ao array `BOOT_HOOKS` (M00.5).

## 3. Schema YAML completo

`alarmes/<slug>.md`:

```yaml
---
tipo: alarme
slug: medicacao-manha
titulo: "Medicação da manhã"
horario: "08:30"
dias_semana: [1, 2, 3, 4, 5]   # 0=domingo, 1=segunda, ..., 6=sabado
tag: medicacao                 # medicacao | treino | outro
som: gentle                    # gentle | normal | forte
ativo: true
snooze_minutos: 5              # padrao do botao Soneca
criado_em: 2026-04-29T10:00:00-03:00
ultimo_disparo: null           # ISO timestamp; atualizado via Desligar
notification_ids: [abc123, def456, ...]   # gerenciado pelo wrapper
snooze_id: null                # id ativo de snooze, se houver
---
```

## 4. APIs reutilizáveis

- `src/components/ui/Input.tsx` — input título.
- `src/components/ui/Toggle.tsx` — toggle ativo.
- `src/components/ui/Chip.tsx` — chips dia da semana e tag.
- `src/components/ui/Button.tsx` — botão Salvar.
- `src/components/ui/Card.tsx` — base do CardAlarme.
- `src/components/ui/EmptyState.tsx` — empty state.
- `src/components/ui/Header.tsx` — header `"Alarmes"` laranja.
- `src/lib/vault/reader.ts`, `writer.ts`, `paths.ts` — Vault
  Bridge.
- `src/lib/haptics.ts` — `selection` em chips, `light` no Salvar.
- `src/lib/motion.ts` — `spring_subtle` no toggle inline do card.
- `expo-notifications` — para agendamento + categorias de ação
  (snooze).
- `@react-native-community/datetimepicker` — para horário.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** aba condicional `/(tabs)/alarmes` (consome
  `useSettings.featureToggles.alarmePessoal`). Sub-rotas
  `/alarmes/{novo,[slug]}`.
- **Schema:** `AlarmeSchema` exportado via barrel.
- **Store:** consome `useSettings`. Não cria store novo.
- **app.json:** plugin `expo-notifications` com canal `alarmes`
  + ícone notificação + permissão `SCHEDULE_EXACT_ALARM` para
  Android 12+.
- **Boot hook:** `reagendarAlarmes` adicionado a `BOOT_HOOKS`.
  Categoria `alarme` com action buttons registrada uma vez no
  boot.
- **FAB:** sem mudança no FAB radial principal. FAB dedicado `+`
  na lista navega para `/alarmes/novo`.
- **Settings:** consome toggle existente; M15 implementa UI.

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
- **Sem gamificação** (ADR-0005). Alarme é utilitário; sem mensagem
  motivacional, sem celebração ao tocar, sem badge de "alarmes
  cumpridos consecutivos".
- **Notificação simples**: título do alarme como `title`, vazio em
  `body`. Sem call-to-action, sem botões na notificação.
- **Alarme exato em Android 12+:** `expo-notifications` requer
  permissão `SCHEDULE_EXACT_ALARM` para garantir disparo no
  horário; o plugin é declarado no `app.json` e o usuário precisa
  conceder via dialog system. Sem essa permissão, agendamentos
  ficam aproximados (±15 min). Documentar no `app.json` strings
  PT-BR pedindo permissão.
- **Sons predefinidos**: `gentle`, `normal`, `forte`. Empacotar 3
  arquivos `.wav` em `assets/sounds/alarmes/` (curtos, <2s).
  Direitos autorais: usar sons CC0 ou gerados.
- Não tocar em arquivos fechados de sprints anteriores.

## 6. Procedimento sugerido

1. Criar `src/lib/schemas/alarme.ts` com schema completo. Slug
   é único, validar formato (`^[a-z0-9-]+$`). Testes.
2. Implementar `src/lib/vault/alarmes.ts`. CRUD via Vault Bridge.
3. Implementar `src/lib/services/alarmesNotificacoes.ts`. Para
   cada `dia_semana` no array, criar 1 schedule recorrente
   `weekday + hour + minute`. Salvar IDs no frontmatter para
   permitir cancelamento.
4. Adicionar 3 sons em `assets/sounds/alarmes/` e mapear em
   `src/lib/services/alarmesNotificacoes.ts`.
5. Implementar `src/components/alarmes/CardAlarme.tsx`. Toggle
   inline chama `agendarAlarme` ou `cancelarAlarme` e salva
   estado no Vault.
6. Implementar `src/components/alarmes/SeletorDias.tsx`. ChipGroup
   compacto com chips redondos 36dp.
7. Implementar `app/(tabs)/alarmes/index.tsx`. Lista de cards.
   Empty state. FAB `+`.
8. Implementar `app/(tabs)/alarmes/novo.tsx` (e [slug]). Form
   completo. Botão Salvar com haptic light → escrever .md →
   agendar → toast `"Alarme salvo."` → voltar para lista.
9. Adicionar `reagendarTodos()` em `app/_layout.tsx`.
10. Rodar smoke + tests + tsc + expo export.

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m16-export && rm -rf /tmp/m16-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 8. Commit

```
feat: m16 alarme pessoal opt-in com agendamento via expo-notifications
```

## 9. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Validar:
  - Sem ativar toggle em Settings → tab `/alarmes` não aparece.
  - Após ativar → tab aparece, empty state visível.
  - Cadastro de 1 alarme → aparece no card.
  - Toggle inline desativa/ativa.
  - Edição via tap no card.
- **APIs nativas — Nível B (emulador Android):**
  - Validar agendamento real via
    `getAllScheduledNotificationsAsync`.
  - Ajustar relógio do emulador para próximo do horário e
    confirmar disparo.
- **Final — Nível C (celular físico):** apenas com permissão.
  Validar disparo real após processo morto (`force-stop` no app
  e aguardar horário) — confirma se a limitação documentada
  ocorre na prática.

Capturar screenshots em `docs/sprints/M16-screenshots/`.

## 10. Definição de Pronto

- [ ] Aba `/(tabs)/alarmes` aparece com toggle on; some com off.
- [ ] CRUD completo de alarmes (criar, editar, ativar/desativar,
      excluir).
- [ ] Notificação dispara no horário com som correto.
- [ ] Categoria `alarme` com botões `Soneca 5 min` e `Desligar`
      registrada e funcional.
- [ ] Snooze re-agenda one-shot no horário escolhido.
- [ ] `reagendarAlarmes` no boot reidrata todos os schedules.
- [ ] 3 sons em `assets/sounds/alarmes/` com `CREDITS.md`.
- [ ] Limite 64 schedules respeitado com toast informativo.
- [ ] Permissão `SCHEDULE_EXACT_ALARM` solicitada se Android 12+.
- [ ] Smoke + tests + tsc + expo export OK.

## 11. Decisões tomadas

- **Sons CC0 do freesound.org:** 3 arquivos `.wav` (gentle/normal/
  forte) <2s cada em `assets/sounds/alarmes/`. Documentar origem
  em `assets/sounds/CREDITS.md`.
- **Limite 64 schedules:** `expo-notifications` cap nativo do
  Android. Toast `"Limite de 64 alarmes atingido. Desative algum
  antes de criar."` quando usuário tenta o 65º.
- **Snooze entrega na M16:** botões na notificação via category
  com action buttons. Padrão 5 min (configurável por alarme).
- **Permissão exact alarm Android 12+:** declarada no `app.json`;
  usuário concede via dialog system na primeira criação de alarme.

Sprint pronta para execução sem perguntas pendentes.
