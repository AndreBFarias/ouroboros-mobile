# ORDEM DE EXECUCAO — caminho ao v1.0 [MESTRE]

```
STATUS:  proposta 2026-07-11 (dono pediu avaliar a ordem do backlog inteiro
         para evitar retrabalho, ex.: gerar migracao desnecessaria).
REGRA:   v1.0 lanca SO depois de TODAS as sprints (decisao do dono).
         Execucao acontece em sessao futura; esta ordem e' o roteiro.
```

## Principio: minimizar retrabalho (2 armadilhas)

1. **Audio em `expo-av` que depois migra.** A superficie de audio ja esta
   ~fechada: R-RECAP-9 (trilha) FEITO; o resto do Recap v2 (10/11/13/14) NAO
   adiciona audio; R-RECAP-12 e' link-externo + Spotify nativo (quase nada de
   expo-av). Logo NAO e' preciso migrar antes das features JS — a migracao
   continua sendo **uma vez so'**.
2. **Modulo NATIVO construido no SDK 54 e depois rebuildado no 56.** Esse e' o
   retrabalho caro. Construir o despertador nativo (DESP-3..8) e o Spotify App
   Remote no 54 e depois subir pro 56 forca refazer integracao nativa.

**Regra derivada:** JS primeiro (no 54) → **um** bump de infra (expo-av +
SDK 56) → todo o nativo pesado depois, direto no 56.

## Fases (ordem de execucao) — audit (R-AUDIT-*) integrado com as originais

### FASE 0 — Fundacao de qualidade (antes de TUDO)
- **R-AUDIT-CI-GATES** — CI (smoke/tsc/jest/lint/PT-BR) como required check,
  hooks do projeto ativos (core.hooksPath), gate no build de release,
  check_anonimato robusto. Sem isto, todo o resto pode regredir em silencio —
  foi o que deixou o drift de docs e o bug do settings passarem sem barreira.

### FASE 1 — Bugs + fechar o que ja esta codado (SDK 54, JS)
- **R-RECAP-9** — validar audio no device (musica LIGADA por default) + merge.
- **R-RECAP-9b** — validar no device (estado limpo) + merge + follow-up do
  teste tautologico (audit achado 8). [ja codado, 2 portas]
- **R-RECAP-9c** — barra de progresso (width 50% estatico) + pausa (closure race).
- **R-HOME-5** — z-index do balao "tarefa concluida" + botao ">" pro to-do.
- **M37.2** — Calendar escrita: OAuth no device + validar criar/deletar + merge.
- **R-AUDIT-DATAS** — timezone BRT nas janelas (bug do marco 7 dias) + helper unico.
- **R-AUDIT-VAULT-PERF** — camada de leitura do Vault (arquitetural; antes de
  empilhar mais leitura no Recap/Home).

### FASE 2 — Recap v2 + Home, tudo JS (SDK 54)
- **R-BRAND-1-LOGO** — troca da logo do app (icone + splash + logo in-app +
  README). Assets estaticos, NAO depende de reduce-motion — prioridade do dono,
  pode ir cedo (Fase 1 ou 2). EXIGE REBUILD do dev-client/APK pra ver icone/
  splash no device (nao e JS live). ATENCAO: `notification-icon.png`
  monocromatico separado (nao reusar o icon colorido — quebra notificacao
  Android). Spec: `docs/sprints/R-BRAND-ASSETS-APP-spec.md` (§ R-BRAND-1).
- **R-AUDIT-A11Y-MOVIMENTO** — reduce-motion global. **ANTES de R-RECAP-10 e de
  R-BRAND-2-ANIMACOES** (as transicoes/animacoes consomem o hook; senao refaz).
- **R-BRAND-2-ANIMACOES** — loaders animados da marca (C1 fechamento do ciclo no
  save · C2 onda no sync do Vault · E2 ring inline · B1 respiracao = fallback
  reduce-motion). JS puro (Reanimated+rn-svg, ZERO dep nativa nova), Metro live.
  **DEPENDE de R-AUDIT-A11Y-MOVIMENTO** (consome `useReduceMotion()`). Spec: idem
  (§ R-BRAND-2). REAVALIACAO 2026-07-13: dos 5 conceitos antes rotulados "site",
  so' G1 (diagrama ETL) fica fora; B1 entra aqui, C3/F2/D1 vao pra R-BRAND-3.
- **ONDA R-BRAND-SYSTEM** — SUBSTITUI a antiga R-BRAND-3-ESTADOS-VIVOS
  (spec marcada [superseded]; escopo C3/F2/D1 migrado). Design doc aprovado
  pelo dono 2026-07-14: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` — os 17
  conceitos da marca (A1-G1) sobre o glifo canonico animavel, substituicao
  TOTAL da geracao v1. Ordem interna (cada uma com spec proprio):
  **R-BRAND-3-GLIFO** (fundacao + gate de perf no device; bloqueia todas) →
  **R-BRAND-4-ABERTURAS** (A1 boot + A2 onboarding) →
  **R-BRAND-5-FEEDBACK** (C1/C2 fieis + C3) →
  **R-BRAND-6-LONGA-DURACAO** (D3/D2/D1, progresso real) →
  **R-BRAND-7-ESTADOS-VIVOS** (B1/B2 in-app/B3) →
  **R-BRAND-8-RITUAIS** (F1/F2/G1) →
  **R-BRAND-9-MIGRACAO** (aposenta Loader/Loading/Fechamento v1) →
  **R-BRAND-10-WIDGET-B2** (opcional, nativo, rebuild dev-client).
  JS puro ate a 9; so a 10 toca nativo.
- **R-AUDIT-RECAP-TECIDO** — ligar contador/ciclo ao Recap. **Com/antes de
  R-RECAP-13** (a evolucao puxa de todas as features).
- **R-RECAP-14** — botao "Memoria" na Home (entrada dos stories).
- **R-RECAP-13** — mensagens `.md` focadas em progresso + evolucao (guardrail
  zero comparacao negativa).
- **R-RECAP-10** — transicoes/animacoes com fisica (reduce-motion = requisito).
- **R-RECAP-11** — finale com as fotos reais.
- **R-RECAP-12 (a)** — musica do usuario: link + abrir externo (JS puro).
- **DESP-1** — sons de notificacao melhores (assets + config).
- **DESP-2** — schema `modo`/`musica_id` + orquestrador (JS).
- Limpeza/doc em paralelo: **R-DOC-VISAO** (integracao no BRIEFING),
  **#6** .ptbr-violations, **#5** R-RECAP-7 spec retro + E2E,
  **R-AUDIT-DOCS-CONTAGENS** (reconciliar contagens + doctor no smoke),
  **R-AUDIT-HARDENING-MENOR** (single-flight no auth + cache no loader web).

### FASE 3 — Bump de infra (UMA vez, com gate)
- **Migracao expo-av → expo-audio/expo-video** (8 arquivos; ~1-2 dias).
- **Upgrade SDK 54 → 56** + revalidar os modulos nativos EXISTENTES
  (health-connect, widget-homescreen) no device.
- **GATE:** se o SDK 56 nao estabilizar (o crash do expo-av some com a
  migracao, mas pode haver outros), NAO forcar — manter SDK 54, e o nativo da
  Fase 4 fica no 54. O gate protege contra travar o v1.0 num SDK instavel.

### FASE 4 — Nativo pesado, direto no SDK alvo (56 se o gate passou)
- **Despertador DESP-3..8** — modulo Kotlin (AlarmManager + ForegroundService
  loop + FullScreenActivity lockscreen + onboarding OEM). Construido UMA vez,
  no SDK final.
- **R-RECAP-12 (b)** — Spotify App Remote (bridge nativa, Premium opt-in).
- Integracoes que exigem native novo (se houver).

### FASE 5 — Release
- **R-AUDIT-PRIVACIDADE-LOC** — remover ACCESS_FINE_LOCATION (minimo
  privilegio + limpeza de privacidade antes de publicar na Play Store).
- **M41** — release v1.0.0 (ultimo de tudo). Assets, release notes, tag.

## Por que esta ordem

- **JS primeiro:** features JS toleram bump de SDK; validar no 54 e revalidar
  no 56 e' barato (revalidacao, nao redesenvolvimento).
- **Migracao expo-av so' uma vez:** a superficie ja esta settled apos
  R-RECAP-9; nenhuma feature JS da Fase 2 adiciona audio novo.
- **Native depois do bump:** o despertador e o Spotify Remote sao construidos
  UMA vez, no SDK final — sem rebuildar modulo nativo por causa de troca de SDK.
- **Gate no SDK 56:** valvula de escape se o 56 nao colaborar — o v1.0 nao
  fica refem de um SDK instavel.

## Dependencias-chave (nao violar)
- **R-AUDIT-CI-GATES primeiro de tudo** (Fase 0) — gate que protege o resto.
- **R-AUDIT-A11Y-MOVIMENTO antes de R-RECAP-10 e de qualquer R-BRAND animada** (animacoes consomem o hook; ja mergeada).
- **R-BRAND-3-GLIFO antes de TODAS as demais da onda R-BRAND-SYSTEM** (fundacao + gate de perf; a 9-MIGRACAO exige 3..8 mergeadas; a 10-WIDGET-B2 exige a 7).
- **R-AUDIT-RECAP-TECIDO com/antes de R-RECAP-13 e de R-BRAND-8 (F2)** (evolucao/ritual puxam das features/Recap).
- expo-av migration ANTES do SDK 56 (o 56 nao aceita expo-av).
- SDK 56 estavel ANTES do despertador nativo e do Spotify Remote (Fase 4).
- R-RECAP-10 antes de R-RECAP-11 (fotos usam o motor de transicao).
- R-RECAP-9/9b mergeados antes de mexer de novo em recap-memorias.tsx (9c/10/11).

## Riscos de ordenacao
- Se o SDK 56 for adiado pelo gate, o nativo da Fase 4 vai pro 54 e a onda
  SDK 56 vira pos-v1.0 de verdade — decisao do dono no momento do gate.
- A Fase 3 exige rebuild do dev-client (native). A Fase 4 idem. Planejar
  builds (GitHub Actions) nesses pontos.
