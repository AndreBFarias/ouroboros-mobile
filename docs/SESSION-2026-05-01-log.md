# Log da Sessão Maratona — 2026-05-01

```
DOC: SESSION-2026-05-01-log.md
USO: Histórico narrativo das 11 sprints fechadas em sequência.
     Próxima sessão usa para entender contexto de decisões
     tomadas. Não é fonte de verdade operacional (essa é o
     ORCHESTRATOR_PLAYBOOK.md); é registro do que aconteceu.
```

---

## Contexto inicial

Sessão começou com HEAD em `9deb590` (M07 Eventos com lugar
fechada). 19 sprints `[todo]` no ROADMAP. 259 testes passing
(40 suites). Bundle Hermes 7,55 MB.

Usuário pediu **estudo profundo** do projeto, depois pediu
para **melhorar todas as specs pendentes** garantindo que
features não ficassem soltas no APK final, com tudo entrando
no v1 (zero v2). Em seguida pediu para disparar agentes para
execução real, com validação Chrome MCP pelo orquestrador
substituindo o checkpoint humano por sprint.

## Pré-trabalho (antes das sprints)

1. **Estudo profundo** — leitura de ~80 arquivos (CONTEXTO,
   BRIEFING, PLANO_TECNICO_APK, 15 ADRs, 19 specs Mobile, 2
   specs Backend, todos os schemas, vault layer, stores,
   componentes UI, telas). Resultado: plano de melhoria em
   `~/.claude/plans/soft-greeting-hearth.md`.

2. **Meta-melhoria de 17 specs + 5 sprints novas** —
   reescrita absorvendo todas as features antes "v2/futuro":
   - Novo `docs/sprints/INTEGRATION-CONTRACT.md` formaliza
     pontos canônicos (tabs layout, schemas barrel, stores
     barrel, useSettings shape, captureRoutes, boot hooks,
     app.json, eas.json).
   - 5 sprints novas: M00.5 (infra), M00.6 (polish),
     M19 (release), M20 (widget), MOB-bridge-3 (marcos auto
     backend).
   - 17 specs reescritas com §3.5 Integração + § Definição
     de Pronto + § Decisões tomadas (substitui Dúvidas).
   - VALIDATOR_BRIEF §5 reescrita com 5 grupos de checks.
   - BRIEFING §9 deixou de listar widget como anti-feature.

3. **Validação inicial** — agente investigação produziu
   relatório de 600 palavras confirmando entendimento ("ENTENDI
   E POSSO EXECUTAR"). Identificou bug pré-existente em
   `app/(tabs)/index.tsx:81` (Rules of Hooks) que ficou
   registrado como achado colateral M00.5.x.

## As 11 sprints

### Bloco 1 — Infraestrutura

#### M00.5 — Infraestrutura de integração (`9c3e28c`)

Cria `app/(tabs)/_layout.tsx` com 5 abas fixas + 5 condicionais,
`BottomTabs.tsx` chrome custom, barrels schemas/stores,
`useSettings` shape completo (M15 implementa UI depois),
`eas.json` 3 profiles, helpers boot (deepLink/biometriaGate
placeholder/reagendamento). Move `app/index.tsx` →
`app/(tabs)/index.tsx`.

22 arquivos novos + 4 modificados + 1 movido. **288 testes
(+29).**

Decisão importante feita pelo agente: criou tabs separadas
(`humor.tsx`, `memoria.tsx`, etc) que redirecionam para
`em-construcao?sprint=MNN` em vez de redirect inline no
layout. Solução mais limpa que o spec previa.

Achado colateral preservado: Rules of Hooks em
`app/(tabs)/index.tsx:81` (`useOnboarding(s => s.tipoCompanhia)`
chamado depois de early returns das linhas 70 e 75). Não
corrigido inline (anti-débito). Sprint M00.5.x registrada.

#### M00.6 — Polish web Dracula + snap presets (`ae16a40`)

`SHEET_PRESETS.ts` (60/70/80/90/DEFAULT), `draculaPolish.ts`
injection web, mockup HTML novo `Ouroboros_telas_25_26-standalone.html`
para Tela 25 (calendário) e Tela 26 (widget) — arquivo separado
porque o bundle principal `Ouroboros_22_telas-standalone.html`
é React+Babel comprimido não-editável.

8 arquivos novos. **295 testes (+7).**

Achado colateral M19.x registrado: bundle HTML toolchain
precisa de regeneração do JSX-fonte para release final.

### Bloco 2 — Captura ativa sem dev-client

#### M08 — Share Intent Receiver (`9202273`)

Rota modal raiz `/share-receive` com 8 subtipos
(`pix`/`extrato`/`nota`/`exame`/`receita`/`garantia`/`contrato`/`outro`),
estende `deepLink.ts` da M00.5 para `action.SEND` (sem
duplicar listener), schema genérico `InboxArquivoSchema`,
intent filters em `app.json`. Cópia foreground com indicador
`Salvando...` → `Salvo.`.

11 arquivos novos. **376 testes (+81).**

Zero achados colaterais.

#### M13 — Galeria + Detalhe + Cadastro Exercícios (`82cc519`)

CRUD completo (Telas 02/07/08): galeria com filtros, detalhe
com sparkline+tooltip, cadastro com `expo-document-picker`
para GIF. Substitui `app/em-breve.tsx` no `captureRoutes.ts`
e **deleta** o stub. "Adicionar a treino livre" cria
`treinos/draft/<slug>.md` (placeholder; M11 migra depois).

34 arquivos novos. **437 testes (+61).**

#### M11 — Memórias + CRUD treinos/marcos (`ca77ed3`)

Aba Memórias com 3 sub-tabs (Treinos/Fotos/Marcos). Schemas
`treino_sessao` + `marco`. Galeria agregada lê de 5 fontes.
**Migra drafts da M13** via `migrarDraftsParaTreinoSessao`
plugado em `BOOT_HOOKS`. **5 heurísticas de marcos auto** no
client (idempotentes via hash SHA-256 truncado 12 chars):
3 treinos em 7d / retorno após hiato 5+d / 7d humor consecutivo
/ 30d sem trigger / primeira vitória da semana.

28 arquivos novos. **517 testes (+80).**

Armadilha A13 reincidiu (npm install playwright trocou
`react-test-renderer` 19.1 → 19.2.5). Resolvido com pin
`-D react-test-renderer@19.1.0 --legacy-peer-deps`.

#### M12 — Medidas (`d6a2b43`)

Telas 12/13: form 9 medidas + 3 fotos + reflexão; comparativo
com sparkline cyan polygon fill + delta absoluto sem cor
(ADR-0005). **Integração cruzada com M11**: `useFotosAgregadas`
ganha helper `lerMedidas`; galeria da M11 cresceu sem mudança
de consumer.

15 arquivos novos. **568 testes (+51).**

### Bloco 5 — Settings + opt-ins

(Bloco 3 e 4 são backend Python — pulei para sessão dedicada.)

#### M15 — Settings 7 grupos (`27f6bbd`)

Aba Settings com Som/Lembretes/Pessoa/Sync/Features/Privacidade/Sobre.
**Biometria gate real** (`LocalAuthentication.authenticateAsync`)
substitui placeholder M00.5. Lembretes via `expo-notifications`
3 schedules diários recorrentes. Export ZIP via `jszip` +
`expo-sharing`. Toggles reativos (ativar Ciclo faz aba aparecer
imediatamente — comprovado por screenshot A-02).

15 arquivos novos. **618 testes (+50).**

Anotação: botões `<Button>` com baixo contraste em RN-Web
(pré-existente desde M01.2; não regressão; polish futuro).

#### M14.5 — Ciclo menstrual opt-in (`5a6e578`)

Tom sóbrio absoluto: "Acompanhamento" (não "Controle"); "Pula
dias sem culpa"; sem alertas push; sem patologização.
Calendário 28/35 dias adaptativo com cores por fase. Fase
inferida + override manual via radio. Abas separadas por
pessoa (privacidade). Pasta dedicada `inbox/saude/ciclo/`.

13 arquivos novos. **663 testes (+45).**

#### M16 — Alarme com Snooze (`739b993`)

Categoria `alarme` com action buttons (Soneca 5 min / Desligar)
registrada em `notificationActions.ts`. Permissão
`SCHEDULE_EXACT_ALARM` Android 12+. Sons CC0 gerados via ffmpeg
sine wave (gentle 440Hz / normal 660Hz / forte 880Hz, 1.5s,
PCM 16-bit) — tons puros = domínio público.

15 arquivos novos. **740 testes (+77).**

#### M17 — To-do leve (`2c3fbf6`)

Drag&drop via `react-native-draggable-flatlist`. Busca
textual sem acento case-insensitive. Lixeira soft 30 dias com
`limparLixeiraExpirada` em `BOOT_HOOKS`. Persistência ordem
custom em SecureStore.

A17 reincidiu (BottomSheetTextInput autoFocus + RN Web crash);
resolvido inline com `Platform.OS !== 'web'`.

10 arquivos novos. **813 testes (+73).**

#### M18 — Contador "Dias sem X" (`3989851`)

Sem celebração visual absoluta (sem fogo, badge, milestones,
sons, confete). Histórico de resets em sub-tela timeline.
Recorde nunca diminui. Datepicker `maximumDate=now`. Função
pura `diasEntre(a, b)` em UTC sem horas. Toast pós-reset:
`"Reset registrado."` (sem exclamação, sem julgamento).

12 arquivos novos. **878 testes (+65).**

Stream timeout do agente no final; arquivos foram criados,
orquestrador validou via Chrome MCP (V-01/V-02/V-03) e fechou.

## Métricas finais

```
Sprints fechadas:    11 (M00.5/M00.6/M08/M13/M11/M12/M15/
                          M14.5/M16/M17/M18)
Testes:              878 passing (99 suites)
Δ vs baseline 259:   +619 testes
Bundle Hermes:       ~8.4 MB Android
Anonimato:           OK (Regra −1 preservada em todo código novo)
TypeScript:          0 erros
Smoke:               OK em todas as 11 sprints
Achados colaterais:  2 (M00.5.x rules of hooks, M19.x bundle HTML)
                     Ambos preservados; nenhum corrigido inline
```

## Decisões arquiteturais relevantes

1. **Validação dupla obrigatória descontinuada após M00.5.**
   O usuário decidiu que validação Chrome MCP pelo
   orquestrador substitui o checkpoint Expo Go por sprint.
   Expo Go fica como gate exclusivo da M19 (release final) e
   sprints específicas com APIs nativas pesadas (M06.5, M09).
   Atualizado em `INTEGRATION-CONTRACT.md` §2.3.

2. **Backend Python pulado.** MOB-bridge-1/2/3 ficam para
   sessão dedicada no repo
   `~/Desenvolvimento/protocolo-ouroboros/`. M10 e M14
   bloqueadas até backend; resto da sessão executou Mobile
   independente.

3. **Web mock é stub.** SAF, file system, notifications,
   camera, mic — todos stubbed em web. Estados que dependem
   de SAF real (galeria com cards, sparkline tooltip ao tap,
   navegação após save real) só aparecem em Nível B/C. O
   orquestrador aceitou os screenshots playwright headless
   do agente (em viewport mobile correto) como evidência
   suficiente.

4. **Hook anti-emoji bloqueia o emoji de check (codepoint
   U+2705) e similares.** Substituir por `[ok]`. Hook bloqueia
   também atribuições a IA (literal `Co-Authored-By: <nome IA>`)
   em arquivos sob versão; placeholders genéricos resolvem.

5. **Integrações cruzadas funcionaram.** M11 ganhou medidas/
   automaticamente quando M12 entregou; M11 migrou drafts da
   M13 sem mudança de consumer; M00.6 desbloqueou M11.5+M20
   via mockup separado; M07 cross-feature em M09 para
   auto-bairro do scanner. **Sinal de que o
   INTEGRATION-CONTRACT está funcionando.**

## O que falta para v1.0.0

```
[Bloco 3]  MOB-bridge-1 → 2 → 3       (sessão Python; ~5-7h)
[Bloco 4]  M10 → M14                  (cache readers; ~8-10h)
[Bloco 6]  npm run build:dev          (~25min EAS cloud)
           M06.5 → M07.x → M11.5      (~17-21h)
           M09 (paralelo)             (~7-9h)
[Bloco 7]  M20 (widget)               (~6-7h)
           M19 (release v1.0.0)       (~6-8h, tag git)
```

Total ~50-60h em ritmo similar.

## Pontos a registrar para próxima sessão

1. **Ler `docs/ORCHESTRATOR_PLAYBOOK.md` PRIMEIRO** depois de
   `STATE.md`. Tem todo o how-to de orquestração (template
   de prompt, padrão de validação Chrome MCP, workflow commit,
   armadilhas).
2. **Achados colaterais pendentes** em `ROADMAP.md`:
   - M00.5.x — fix Rules of Hooks em `(tabs)/index.tsx:81`
   - M19.x — bundle HTML toolchain regenerar
3. **Backend Python** é o caminho mais econômico para
   destrancar M10/M14 (mas exige sessão dedicada).
4. **dev-client pendente** para M06.5/M07.x/M09. Comando:
   `npm run build:dev` (script criado em M00.5).
5. **IDs de agentes** em §11 do PLAYBOOK podem ser retomados
   via `SendMessage` se preciso (ex: continuar M18 que sofreu
   stream timeout, embora o trabalho tenha sido fechado
   manualmente).

---

*Sessão fechou com 11 sprints `[ok]` em ~12h de trabalho real.
Cadência de ~1h por sprint do executor + 5-10min de validação
e commit do orquestrador. Push automático ao final de cada uma
mantém main sempre verde.*
