# _HANDOFF-ONDA-3Q — Cadeia de valor das 5 integracoes + estado handoff

**Data:** 2026-05-22 (apos sessao massiva 8h+ HC + alpha-31)
**Objetivo deste arquivo:** dar a uma nova sessao Claude (Opus) tudo que precisa para executar as proximas ondas sem ler historico longo.

---

## 1. Estado atual do projeto

- **HEAD origin/main:** `494214d` (docs: onda 3p materializada 13 specs)
- **APK estavel:** `v1.0.0-alpha-31` (commit `601ab30`, instalado no Xiaomi 2312DRAABG HyperOS)
- **Smoke baseline:** 287 suites / 2744 testes verde
- **Onda 3N:** 8/8 fechada (R-ROT-1-A/B/D + R-RECAP-PERIODO-DIA + R-SEC-4 + R-SCHEMA-TREINO + R-SF-3 + R-ROT-2)
- **Onda 3O (R-INT-3-HC-EMPIRICAL):** Health Connect funcionando live — Ouroboros aparece na lista de apps do HC nativo + 11/11 permissoes granted=true. Bridge nativa propria em `modules/health-connect/` substitui `react-native-health-connect` velho.
- **Onda 3P:** 13 specs materializadas (sub-sprints bridge HC + autopull HC + integracoes complementares Calendar/Spotify/YouTube/Drive). Nao executadas ainda.

### Pendencias humanas remanescentes para v1.0.0

| ID | Acao | Tempo dono | Propagacao |
|---|---|---|---|
| R-CRIT-2 | Cloud Console OAuth consent (app name + logo 120x120) | 5 min | imediato |
| R-OPS-4 | Rodar `./scripts/setup-branch-protection.sh` | 1 min | imediato |
| R-ROT-1-C | Review copy emocional | 10-15 min | imediato |
| R-SEC-1 | Google OAuth verification testers | 2-3h | 24-72h |
| R-SEC-2 + R-PLAYCONSOLE-SETUP | $25 + 40 min setup Play Console | 40 min | 24-48h |

---

## 2. Specs ja materializadas (Onda 3P, 13 sprints)

Todas em `docs/sprints/`, ainda nao executadas.

### 3P.A — Sub-sprints bridge HC (3, sequenciais)

1. `R-INT-3-HC-BRIDGE-NATIVA-B-READ-RECORDS-spec.md` (P1, 1d) — readRecords 7 tipos
2. `R-INT-3-HC-BRIDGE-NATIVA-C-WRITE-RECORDS-spec.md` (P1, 1d) — insertRecords 4 tipos com factory methods
3. `R-INT-3-HC-BRIDGE-NATIVA-D-CLEANUP-MIGRATION-spec.md` (P1, 0.5d) — migrar sync.ts + remover lib upstream

### 3P.B — Autopull HC -> Vault (6)

4. `R-INT-3-HC-AUTOPULL-SCHEDULER-spec.md` (P1, 0.5-1d) — orquestrador central
5. `R-INT-3-HC-AUTOPULL-PASSOS-spec.md` (P1, 0.5d)
6. `R-INT-3-HC-AUTOPULL-EXERCICIO-spec.md` (P1, 0.5d)
7. `R-INT-3-HC-AUTOPULL-MEDIDAS-spec.md` (P2, 0.5d)
8. `R-INT-3-HC-AUTOPULL-MENSTRUACAO-spec.md` (P2, 0.5d)
9. `R-INT-3-HC-AUTOPULL-SLEEP-spec.md` (P3, 0.5d)

### 3P.C — Integracoes complementares (4)

10. `R-INT-2-CALENDAR-SYNC-EVENTOS-spec.md` (P1, 1d) — eventos Google Calendar -> Proximos
11. `R-INT-4-SPOTIFY-RECENTLY-PLAYED-spec.md` (P2, 0.5d) — timeline Spotify
12. `R-INT-4-YOUTUBE-WATCH-HISTORY-spec.md` (P3, 0.5d) — Liked Videos YouTube
13. `R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO-spec.md` (P2, 1-1.5d) — backup ZIP local -> Drive semanal

---

## 3. Onda 3Q — 11 sprints novas (esta onda, materializadas aqui)

Cada sprint listada abaixo segue o mesmo padrao:
- **Objetivo:** 1 linha do que entrega de valor
- **Depende de:** sprint(s) Onda 3P pre-requisitas
- **Arquivos a criar/modificar:** lista enxuta
- **Pattern reusar:** caminho de arquivo existente como referencia
- **Estimativa:** dias

### 3Q.B — Consumer UI por integracao (5 sprints, entregam visibilidade)

#### R-INT-3-HC-RECAP-CARD (P1, 0.5d)
**JA TEM SPEC INDIVIDUAL:** `docs/sprints/R-INT-3-HC-RECAP-CARD-spec.md` (criado nesta onda)

#### R-INT-2-CALENDAR-RECAP-CARD (P2, 0.5d)
- **Objetivo:** card "Agenda essa semana" no Recap mostrando N eventos + top 3 organizadores/categorias.
- **Depende:** R-INT-2-CALENDAR-SYNC-EVENTOS (autopull popula `agenda/*.md`)
- **Cria:** `src/lib/recap/agenda.ts` (agregador), `src/components/recap/RecapSecaoAgenda.tsx`.
- **Modifica:** `src/components/screens/RecapScreen.tsx` (adicionar secao), `src/lib/recap/destinos.ts` (entry agenda).
- **Pattern:** `RecapSecaoConquistas.tsx` + helper `calcularConquistas.ts`.

#### R-INT-4-SPOTIFY-RECAP-CARD (P2, 0.5d)
- **Objetivo:** card "Trilha sonora" no Recap — top 5 artistas + total minutos escutados.
- **Depende:** R-INT-4-SPOTIFY-RECENTLY-PLAYED (popula `spotify/*.md`)
- **Cria:** `src/lib/recap/musicas.ts`, `src/components/recap/RecapSecaoMusicas.tsx`.
- **Modifica:** `RecapScreen.tsx`, `destinos.ts`.

#### R-INT-4-YOUTUBE-RECAP-CARD (P3, 0.5d)
- **Objetivo:** card "Conteudo curtido" no Recap — top 5 canais + N videos liked.
- **Depende:** R-INT-4-YOUTUBE-WATCH-HISTORY (popula `youtube/*.md`)
- **Cria:** `src/lib/recap/conteudo.ts`, `src/components/recap/RecapSecaoConteudo.tsx`.
- **Modifica:** `RecapScreen.tsx`, `destinos.ts`.

#### R-INT-5-DRIVE-HUB-ATIVO (P2, 0.5d)
- **Objetivo:** Hub Integracoes deixa de mostrar Drive como "Em breve" — exibe N backups + MB total + ultimo backup + botoes "Fazer agora" / "Restaurar".
- **Depende:** R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (Drive scope + upload pronto)
- **Modifica:** `src/components/screens/IntegracoesScreen.tsx` (descritor Drive ativo).

### 3Q.C — Loops de valor reativos (5 sprints, entregam engajamento)

#### R-INT-3-HC-NOTIF-META-PASSOS (P2, 0.5d)
- **Objetivo:** meta diaria configuravel (default 8000) + notif silenciosa ao atingir + badge "X / Y passos" na Tela Hoje.
- **Depende:** R-INT-3-HC-AUTOPULL-PASSOS (dados disponiveis no Vault)
- **Cria:** `src/lib/notifications/metaPassos.ts`, `src/components/hoje/BadgePassos.tsx`.
- **Modifica:** `app/index.tsx` (renderiza badge), `app/settings/integracoes.tsx` (toggle meta), `src/lib/stores/settings.ts` (campo `metaPassosDia: number`).
- **Pattern notif:** `src/lib/services/alarmesNotificacoes.ts` (channel `default` existente).

#### R-INT-2-CALENDAR-NOTIF-PROXIMO (P1, 0.5d)
- **Objetivo:** notif "Evento em 15min: <titulo>" pre-event Calendar.
- **Depende:** R-INT-2-CALENDAR-SYNC-EVENTOS
- **Cria:** `src/lib/notifications/calendarPreEvent.ts` (scheduler usa expo-notifications + Date trigger).
- **Modifica:** `app/settings/integracoes.tsx` (toggle), `R-INT-2-CALENDAR-SYNC-EVENTOS` (chamar agendamento na criacao de evento agenda/*.md).
- **Pattern:** alarme companion R-ROT-1-A (channel custom + cancelarAlarme idempotente).

#### R-INT-4-SPOTIFY-AGORA-TOCANDO (P3, 0.5d)
- **Objetivo:** badge "Tocando: <titulo> - <artista>" na Tela Hoje quando Spotify ativo (refresh 30s).
- **Depende:** R-INT-4 (OAuth Spotify existente)
- **Cria:** `src/lib/integracoes/spotify/currentlyPlaying.ts`, `src/components/hoje/BadgeSpotify.tsx`.
- **Modifica:** `app/index.tsx` (renderiza badge condicional ao toggle + accessToken valido).
- **Atencao:** rate limit Spotify (180 req/min). Cap 30s entre refreshes.

#### R-INT-3-HC-INSIGHT-SEMANAL (P2, 0.5d)
- **Objetivo:** card "Voce caminhou 20% mais que semana passada" no Recap, gerado dinamicamente comparando 2 janelas.
- **Depende:** R-INT-3-HC-AUTOPULL-PASSOS + R-INT-3-HC-RECAP-CARD (reusa logica)
- **Cria:** `src/lib/recap/insights.ts` (compara semanas), `src/components/recap/CardInsightSaude.tsx`.
- **Modifica:** `RecapScreen.tsx` (renderiza no topo se insight relevante).
- **Atencao:** copy positivo somente — nunca "caminhou menos". Filtrar gerar insight so se delta positivo.

#### R-INT-5-DRIVE-NOTIF-BACKUP (P3, 0.5d)
- **Objetivo:** notif silenciosa "Backup salvo no Drive: X MB" apos upload semanal bem-sucedido.
- **Depende:** R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO
- **Modifica:** `src/lib/integracoes/google/driveBackup.ts` (emite notificacao no success path).
- **Pattern:** `expo-notifications` channel default, sem som (silenciosa).

### 3Q.D — Achado nao-materializado (1)

#### R-INT-3-HC-AUTOPULL-BACKGROUND (P2, 1d)
- **Objetivo:** scheduler autopull HC roda mesmo com app fechado, via expo-task-manager + expo-background-fetch.
- **Depende:** R-INT-3-HC-AUTOPULL-SCHEDULER (foreground ja existente)
- **Cria:** `src/lib/health/backgroundTask.ts` (registra task), `app/_layout.tsx` registra task no boot.
- **Modifica:** `app.json` adiciona permissao BACKGROUND_FETCH se necessario.
- **Atencao:** custo de bateria; toggle dono em Settings (`featureToggles.hcAutopullBackground` default `false`).
- **Origem:** mencionado em `R-INT-3-HC-AUTOPULL-SCHEDULER-spec.md` linha 38.

---

## 4. Sprint order canonica (executar nesta ordem na nova sessao)

```
FASE A — Sub-sprints bridge HC (sequenciais, 1-2d cada):
  /sprint-ciclo R-INT-3-HC-BRIDGE-NATIVA-B
  /sprint-ciclo R-INT-3-HC-BRIDGE-NATIVA-C
  /sprint-ciclo R-INT-3-HC-BRIDGE-NATIVA-D

FASE B — Autopull HC (1 sequencial + 5 paralelos via worktree):
  /sprint-ciclo R-INT-3-HC-AUTOPULL-SCHEDULER
  # Apos scheduler fechar, paralelo:
  /sprint-ciclo R-INT-3-HC-AUTOPULL-PASSOS &
  /sprint-ciclo R-INT-3-HC-AUTOPULL-EXERCICIO &
  /sprint-ciclo R-INT-3-HC-AUTOPULL-MEDIDAS &
  /sprint-ciclo R-INT-3-HC-AUTOPULL-MENSTRUACAO &
  /sprint-ciclo R-INT-3-HC-AUTOPULL-SLEEP &

FASE C — Integracoes complementares (4 paralelos):
  /sprint-ciclo R-INT-2-CALENDAR-SYNC-EVENTOS &
  /sprint-ciclo R-INT-4-SPOTIFY-RECENTLY-PLAYED &
  /sprint-ciclo R-INT-4-YOUTUBE-WATCH-HISTORY &
  /sprint-ciclo R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO &

FASE D — Cadeia de valor consumer UI (apos respectivos autopull/sync):
  /sprint-ciclo R-INT-3-HC-RECAP-CARD
  /sprint-ciclo R-INT-2-CALENDAR-RECAP-CARD
  /sprint-ciclo R-INT-4-SPOTIFY-RECAP-CARD
  /sprint-ciclo R-INT-4-YOUTUBE-RECAP-CARD
  /sprint-ciclo R-INT-5-DRIVE-HUB-ATIVO

FASE E — Loops reativos (apos respectivos consumer UI):
  /sprint-ciclo R-INT-2-CALENDAR-NOTIF-PROXIMO
  /sprint-ciclo R-INT-3-HC-NOTIF-META-PASSOS
  /sprint-ciclo R-INT-3-HC-INSIGHT-SEMANAL
  /sprint-ciclo R-INT-4-SPOTIFY-AGORA-TOCANDO
  /sprint-ciclo R-INT-5-DRIVE-NOTIF-BACKUP

FASE F — Indep:
  /sprint-ciclo R-INT-3-HC-AUTOPULL-BACKGROUND
```

**Total:** ~25 sprints (13 Onda 3P + 11 Onda 3Q + 1 R-INT-3-HC-RECAP-CARD individual). Estimativa elapsed em paralelo: ~5-7 dias dedicados.

---

## 5. Padroes do projeto a respeitar (resumo VALIDATOR_BRIEF)

- **Anonimato (Regra -1):** zero "Claude/GPT/Anthropic/OpenAI" em `src/`, `app/`, `scripts/`. Pessoas via `pessoa_a`/`pessoa_b` (`--purple`/`--pink`).
- **PT-BR:** UI com acentuacao canonica (`Não`, `Você`, `Música`). Comentarios sem acento. Commit messages sem acento.
- **Worktree isolation:** cada sub-agente executor deve criar worktree proprio. Hook PreToolUse detecta bypass.
- **Zero emojis** em codigo, docs, commits, respostas.
- **Smoke obrigatorio:** `./scripts/smoke.sh` verde antes de cada commit. 3 runs sanity antes de fechar sprint.
- **Validacao visual Gauntlet:** sprint que toca UI precisa de screenshot (skill `validacao-visual` auto-invocada).
- **Push automatico:** apos smoke verde, push direto sem perguntar (autorizacao durabel desde M05).
- **Achados colaterais viram sprint nova:** zero follow-up acumulado.

---

## 6. Comandos de retomada rapida

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
git log --oneline -5                   # esperado: 494214d no topo
git status                             # working tree clean
./scripts/smoke.sh                     # esperado: 287/2744 verde
cat docs/sprints/_HANDOFF-ONDA-3Q.md   # este arquivo (estado completo)
ls docs/sprints/R-INT-3-HC-BRIDGE-NATIVA-B-*-spec.md  # primeira sprint a executar
adb devices                            # tablet Xiaomi 2312DRAABG conectado?
```

---

## 7. Decisoes pendentes documentadas (capture antes de executar)

- **R-INT-5-DRIVE-NOTIF-BACKUP:** notif silenciosa ou audivel? Periodicidade backup Drive (1x/semana vs diario)? **Default proposto:** 1x/semana silenciosa.
- **R-INT-3-HC-AUTOPULL-BACKGROUND:** ativar default ou opt-in? **Default proposto:** opt-in (custo bateria).
- **R-INT-3-HC-NOTIF-META-PASSOS:** meta default 8000 ou 10000? **Default proposto:** 8000 (suave).
- **R-INT-2-CALENDAR-NOTIF-PROXIMO:** janela 15min default fixa ou configuravel? **Default proposto:** 15min fixo (simples).

---

## 8. Riscos conhecidos para nova sessao

1. **EAS quota esgotada ate 2026-06-01.** Builds APK via GitHub Actions (`./gauntlet.sh` nao serve — e Gauntlet web). Worflow `.github/workflows/build-android-apk.yml` (push tag `v*-alpha-*` dispara).
2. **HC autopull pode ser lento na primeira sync** — usuario tem 30+ dias de Steps/passos. SCHEDULER cap em 1000 records/exec por tipo.
3. **Token Spotify/YouTube/Calendar expiram** — fluxo refresh ja entregue em R-INT-4 e Q22.B, validar antes de autopull.
4. **HyperOS bloqueia adb install** quando "USB debugging (Security settings)" off — dono precisa toggle se quiser instalar APK alpha-XX gerado.
