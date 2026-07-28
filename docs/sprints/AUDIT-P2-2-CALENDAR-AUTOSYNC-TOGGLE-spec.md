# AUDIT-P2-2-CALENDAR-AUTOSYNC-TOGGLE — expor o toggle que libera o auto-sync do Google Calendar

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (a sprint R-INT-2 inteira — sync periódico e notificação pré-evento —
            está construída, testada e permanentemente desligada por falta de um Toggle)
DEPENDE:    nenhuma
ORIGEM:     achados [P2-2] / [NI-03] / [IN-02] da auditoria de 2026-07-28. Encontrado ao
            cruzar as chaves de `featureToggles` com o inventário de `setFeatureToggle` na
            UI. Reverificado nesta materialização em `main @ b5bf2db`: das 16 chaves que a
            UI de produção passa a `setFeatureToggle`, `googleCalendarSync` não é nenhuma.
```

## Problema (feature gated por um toggle sem UI)

`src/lib/stores/settings.ts:317-320` declara o toggle com default OFF e um comentário que
promete uma UI de opt-in:

```ts
// R-INT-2-CALENDAR-SYNC-EVENTOS: default OFF (opt-in). O auto-sync
// periodico do Calendar so dispara quando o usuario liga em
// Configuracoes; ate la, a agenda atualiza apenas ao abrir /agenda.
googleCalendarSync: false,
```

O gate é real e bloqueia tudo — `app/_layout.tsx:333-336`:

```tsx
function podeDisparar(): boolean {
  const s = useSettings.getState();
  if (!s.featureToggles.googleCalendarSync) return false;
```

O comentário diz "quando o usuário liga em Configurações". **Não existe onde ligar.**
Inventário completo dos `setFeatureToggle` de produção (`grep -rn "setFeatureToggle("
--include="*.ts" --include="*.tsx" src app`, excluindo os testes) — 16 chaves distintas,
nenhuma delas `googleCalendarSync`:

| Arquivo | Chaves |
|---|---|
| `app/settings/index.tsx:321..471` | `todoLeve`, `alarmePessoal`, `contadorDiasSem`, `cicloMenstrual`, `calendarioConquistas`, `widgetHomescreen`, `widgetMostraNome`, `mostrarFinancasEmDesenvolvimento`, `recapMusicaFundo`, `recapAudioAnexadoAutoplay`, `reduzirMovimento` |
| `app/settings/integracoes.tsx:115,135,168` | `healthConnectSync`, `hcAutopullBackground` |
| `app/settings/contas-google.tsx:284` | `backupDriveAutomatico` |
| `src/components/settings/SecaoBackupAutomatico.tsx:191` | `backupAutomaticoSemanal` |
| `app/widget-config.tsx:158` | `widgetHomescreen` (rota órfã, achado [P2-6]) |
| `app/recap-memorias.tsx:518` | `recapMusicaFundo` |
| `app/_components.tsx:306-309` | storybook `__DEV__` |

`grep -rn "googleCalendarSync" app/settings/ src/components/settings/
src/components/screens/IntegracoesScreen.tsx` → **0 hits**. O único caminho que liga a
chave é a API de desenvolvimento `src/lib/dev/gauntlet.ts:778`, guardada por
`Platform.OS === 'web' && __DEV__`.

Cenário de falha concreto: `pessoa_a` conecta a conta Google, abre `/agenda` e vê os
eventos sincronizarem. Fecha o app. A seção "Próximos" da Tela Hoje nunca mais atualiza
sozinha, e nenhuma notificação de 15 minutos antes de compromisso chega — para sempre,
em qualquer instalação, sem mensagem de erro. A única forma de atualizar a agenda é
reabrir `/agenda` manualmente.

### O que fica desligado junto

- `src/lib/integracoes/calendarSync.ts` — 188 linhas.
- `src/lib/integracoes/scheduler.ts` — 101 linhas (só é acionado por este caminho).
- `app/_layout.tsx:328-399` — 72 linhas de wiring de boot e foreground, com throttle de
  60 min e listener de `AppState`.
- `src/lib/notifications/calendarPreEvent.ts` — a notificação pré-evento é injetada
  apenas dentro deste caminho (`app/_layout.tsx:360`, `agendarNotifs:
  agendarNotifsPreEvento`). O cabeçalho do arquivo (`calendarPreEvent.ts:14`) confirma:
  *"guardado pelo toggle `googleCalendarSync`"*.

## Ligar ou remover

**Recomendação: LIGAR.** Justificativa:

1. O trabalho é de aproximadamente 10 linhas de UI; o resto está pronto, testado e já
   ligado ao boot.
2. O comportamento entregue é o que a documentação já promete: a seção "Próximos" da Tela
   Hoje fresca sem abrir `/agenda`, e aviso 15 min antes de compromisso.
3. Remover custaria mais: apagar 361 linhas de código funcional, a chave do store, o
   schema do Vault e a integração do `scheduler.ts` — que ficaria sem nenhum consumidor
   e por sua vez viraria órfão.

### Onde expor — decisão

Investigados os dois candidatos citados no achado:

- **`app/settings/integracoes.tsx`** — é a tela de detalhe de Health Connect (título e
  conteúdo). Colocar um toggle de Google Calendar ali mistura duas integrações sem
  relação. **Descartado.**
- **`app/settings/contas-google.tsx`** — é a tela das contas Google, alcançável por
  `app/settings/index.tsx:213`. Já contém o toggle de par exato
  (`backupDriveAutomatico`, `:284`), com o mesmo padrão visual (título + subtítulo
  explicativo + `<Toggle>`) e o mesmo gate de habilitação (`disabled=
  {!algumGoogleConectado}`). **Escolhido.** O auto-sync do Calendar depende de conta
  Google conectada exatamente como o backup do Drive; a simetria é literal.

### Default — decisão

**Manter `false` (opt-in).** Justificativa: o projeto tem postura declarada de "sem rede
de saída sem consentimento" (mesma razão do `backupDriveAutomatico` e do
`hcAutopullBackground` nascerem OFF). Ligar por padrão faria o app fazer requisição a
servidor externo a cada foreground sem o usuário ter pedido. O ganho de conveniência não
justifica inverter a postura; a correção do achado é dar a alavanca, não puxá-la.

## Escopo (mínimo)

1. Adicionar um bloco `<Toggle>` para `googleCalendarSync` em
   `app/settings/contas-google.tsx`, imediatamente acima do bloco "Backup automático no
   Drive" (`:255-289`), reusando o mesmo layout e o mesmo `disabled=
   {!algumGoogleConectado}`. Copy sugerida — título "Sincronizar agenda automaticamente",
   subtítulo "Atualiza os próximos compromissos em segundo plano e avisa 15 minutos antes
   de cada um.". `accessibilityLabel` sem acento, conforme convenção de screen reader.
2. Manter o default `false` em `src/lib/stores/settings.ts:320` e corrigir o comentário
   de `:317-319` para apontar o lugar real onde o usuário liga (hoje ele diz apenas
   "Configurações").
3. Quando o toggle está OFF, a linha da agenda em `IntegracoesScreen.tsx` deve dizer que
   o auto-sync está desligado (mesmo tratamento que o card do Drive já dá em `:595`) —
   evitar criar o defeito de "estado silencioso" que este próprio achado descreve.
4. Atualizar `docs/FEATURES-CANONICAS.md` §3.8 (bloco Agenda / Google Calendar):
   registrar que o auto-sync periódico e a notificação pré-evento existem, são opt-in, e
   onde se liga.
5. Caso E2E em `tests/e2e/playwright/audit-p2-2-calendar-autosync-toggle.e2e.ts`, copiado
   de `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: partindo de
   `/settings/contas-google`, acionar o toggle e verificar via
   `__gauntlet.estado()` que `featureToggles.googleCalendarSync` mudou de `false` para
   `true` (e volta a `false` no segundo toque). Presença do controle não basta.
6. NÃO-objetivo: alterar o throttle de 60 min, a lógica de `calendarSync.ts` ou o
   conteúdo da notificação pré-evento. Esta sprint só abre a porta.
7. NÃO-objetivo: ligar `criarIntegracaoDriveBackup` no mesmo orquestrador — é o achado
   [P2-3], com spec própria (`AUDIT-P2-3-DRIVE-BACKUP-AUTOMATICO-spec.md`).

## Proof-of-work

```bash
# 1. Antes: nenhuma UI passa a chave
grep -rn "setFeatureToggle('googleCalendarSync'" --include="*.tsx" src app   # 0 hits

# 2. Depois: exatamente 1 call site de producao
grep -rn "setFeatureToggle('googleCalendarSync'" --include="*.tsx" src app   # 1 hit
# esperado: app/settings/contas-google.tsx

# 3. O gate continua existindo e continua sendo respeitado
grep -n "featureToggles.googleCalendarSync" app/_layout.tsx                  # linha 335

# 4. Default segue OFF (opt-in preservado)
grep -n "googleCalendarSync: false" src/lib/stores/settings.ts               # linha 320

# 5. Gates do projeto
npx tsc --noEmit                                                             # exit 0
npm test -- settings                                                         # verde
./scripts/smoke.sh                                                           # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Configuracoes -> Contas Google -> acionar "Sincronizar agenda automaticamente"
# no console: await window.__gauntlet.estado() -> featureToggles.googleCalendarSync === true
# screenshots em docs/sprints/AUDIT-P2-2-CALENDAR-AUTOSYNC-TOGGLE-screenshots-gauntlet/
```

## Commit

```
feat: audit-p2-2 expoe toggle googlecalendarsync em contas google e libera auto-sync
```
