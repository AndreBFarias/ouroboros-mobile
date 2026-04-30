# Sprint M16 — F-15 Alarme Pessoal

```
DEPENDE:    M02 (Vault Bridge) + M03 (identidade dinâmica) + M15 (toggle de ativação)
BLOQUEIA:   nenhuma sprint Mobile direta
ESTIMATIVA: 4-5h
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
  - `reagendarTodos(): Promise<void>` — chamado no boot do app
    para reidratar agendamentos.
- `src/components/alarmes/CardAlarme.tsx` — Card com título +
  horário + dias + toggle inline.
- `src/components/alarmes/SeletorDias.tsx` — ChipGroup multi de
  dias da semana (D, S, T, Q, Q, S, S).
- `tests/schemas/alarme.test.ts`
- `tests/lib/vault/alarmes.test.ts`
- `tests/components/alarmes/CardAlarme.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `AlarmeSchema`.
- `app/(tabs)/_layout.tsx` — registrar rota `alarmes` condicional
  ao toggle.
- `app/_layout.tsx` — chamar `reagendarTodos()` no mount inicial
  para garantir alarmes ativos após reboot do dispositivo.

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
criado_em: 2026-04-29T10:00:00-03:00
notification_ids: [abc123, def456, ...]   # gerenciado pelo wrapper
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
- `expo-notifications` — para agendamento.
- `@react-native-community/datetimepicker` — para horário.

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
- **Limitação documentada**: `expo-notifications` no Expo Go não
  garante alarme exato em Android (quando processo morto). Para
  alarme exato robusto, requer `expo-dev-client` + plugin
  customizado (similar a M06.5). Esta sprint cobre o caso básico
  (recorrente diário) e documenta limitação na seção 9.
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

## 10. Dúvidas em aberto

- Os sons `gentle/normal/forte` precisam ser distribuídos com o
  app (3 arquivos em `assets/sounds/alarmes/`). Quem produz?
  Sugestão: usar `freesound.org` com licença CC0; documentar
  origem em `assets/sounds/CREDITS.md`.
- Limite de alarmes simultâneos: `expo-notifications` aceita até
  64 schedules por app. Documentar limite no UI (toast quando
  usuário tenta criar o 65º)?
- Snooze: nesta sprint não há snooze. Próxima sprint pode
  adicionar como botão na notificação (requer custom intent
  handler — fora do escopo).
