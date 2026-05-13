# Relatório Final — Onda Q (2026-05-11 a 2026-05-13)

> Documento consolidado de fechamento da maratona pré-v1.0.0.
> Audiência: dono do projeto + qualquer dev sucessor.
> Versão: HEAD `d24ce6e` em `main`.

## Sumário executivo

Maratona de 3 dias (6 sessões) entregou 21 sprints (Q0–Q21) cobrindo
bugs críticos de UX, features novas (Rotinas + Executor de treino +
Galeria + Share intent Pix + Health Connect), infraestrutura
(GitHub Actions build local + bridge ETL) e specs detalhadas das
sprints faltantes.

**Releases gerados:**

- [`v1.0.0-alpha-4`](https://github.com/AndreBFarias/ouroboros-mobile/releases/tag/v1.0.0-alpha-4) — EAS preview build (commit `a1dd3c9`), 157 MB.
- `v1.0.0-alpha-5` — GitHub Actions build local em andamento
  (commit `d24ce6e` após otimização ABI arm64-v8a + timeout 90min).

**Métricas finais:**

- 1892 testes Jest verde (192 suites, 1 skip histórico).
- typecheck silent (0 erros).
- smoke + anonimato (Regra −1) + PT-BR audit verde.
- Push contínuo em `main` durante toda a maratona.

## Linha do tempo

| Sessão | Data | Foco | Commits relevantes |
|---|---|---|---|
| 1 | 2026-05-12 manhã | 8 fixes UX + Q0 OAuth liberado | `557319f` |
| 2 | 2026-05-12 tarde | Bloqueador A (ciclo persistência) | `47f5564` |
| 3 | 2026-05-12 noite | Q9 Galeria + Q10 Share + Q11.a+b + Q12 schema | `3f919f5`, `7d3332a`, `6d96ae4`, `245954f` |
| 4 | 2026-05-12 noite tarde | Q5.1/Q5.2/Q6/Q11.c + bug runtime triagiado | `c6abaa5`, `2edbc98` |
| 5 | 2026-05-13 madrugada | Auditoria + specs Q17-Q21 + bump alpha-4 | `ff20d2c`, `6904977`, `a1dd3c9` |
| 6 | 2026-05-13 manhã | APK alpha-4 publicado + Q17 completo + CI local | `1fcbaf5`, `cee0d17`, `26dbf85`, `67c3022`, `142efac`, `c2232fd`, `d24ce6e` |

## Sprints entregues

### Bugs críticos resolvidos

| Sprint | Problema | Solução |
|---|---|---|
| Q2 | "Recap" invisível na Home | `BotaoRecap` Pressable inline (5 iterações) + Header right slot `minWidth 40` |
| Q3 | MenuLateral com animação "poing" | `springs.smooth` (damping=32 stiffness=170) |
| Q5.1 | Transcrição não aparecia no diário | 2 botões separados — MicrofoneButton (m4a) + TranscreverButton (texto). Android SpeechRecognizer não compartilha mic com expo-av |
| Q5.2 | Transcrição parava após 6-8s | `continuous=true` no SpeechRecognizer Android |
| Q6 | "GO_BACK was not handled" pós-save | Ref guard `goBackOnce()` evita dupla chamada |
| Q7 | Sheet câmera não abria | Retry 800ms se sheet não abriu em primeira tentativa (cobre A30) |
| Q8 | Ciclo menstrual sumia entre sessões | Simetria save/load via `autorPadrao(tipoCompanhia, sexoA, sexoB)` |
| Q0 | OAuth `Error 400 invalid_request` | Scope `calendar.events.readonly` adicionado ao consent screen no Cloud Console + env.json chave `installed`→`android` |

### Features novas

| Sprint | Entrega |
|---|---|
| Q1 | Rename display "ouroboros-mobile" → "Ouroboros" (slug EAS preservado) |
| Q4 | FABs unificados em 64dp (menu lateral + captura verde) |
| Q9 | Galeria unificada `/galeria` com Vault Explorer agrupando por prefixo de filename |
| Q10 | Share Intent Pix/boleto/extrato com regex classifier (Nubank/Itaú/Bradesco/Santander/Inter/C6) |
| Q11.a | Schema Rotina + CRUD vault + rotas `/rotinas/{index,novo,[slug]}` |
| Q11.b | SeletorRotina dentro do SheetNovoTreino + modal "Substituir treino atual?" |
| Q11.c | Executor de treino com state machine + timer regressivo +/-10s + snapshot imutável |
| Q12 | `_schema_version: 1` em todos os writers (bridge ETL Mobile↔Backend) |
| Q14 | Entry "Rotinas" no MenuLateral (Utilitários, ícone Dumbbell) |
| Q15 | SeletorRotina fecha SheetNovoTreino antes de abrir (anti-empilhamento visual) |
| Q17 | Health Connect Android — pacote, 11 permissions, intent-filter rationale, tela `/settings/integracoes`, sync read+write |
| Q18 | `MidiaExecucaoPlayer` para GIFs em exercícios (integração visual em Q18.b) |
| Q19 | Grupos de Treino esqueleto — schema + vault + rotas (form em Q19.b) |

### Infraestrutura

| Sprint | Entrega |
|---|---|
| CI local | `.github/workflows/build-android-apk.yml` com Setup Node 22 + Java 17 + Android SDK 34 + Gradle assembleRelease (ABI arm64-v8a) |
| Q20/Q21 | Specs detalhadas em `docs/sprints/` para validação Share Pix + ETL unificação Python |
| Q17.d/e + Q18.b + Q19.b | Specs follow-up detalhados pra desbloqueios e completar features semi-entregues |

## Armadilhas runtime descobertas (A32–A39)

Adicionadas a `VALIDATOR_BRIEF.md` §4 (gitignored):

- **A32** HyperOS bloqueia `adb install -r` → bypass via
  `adb push /data/local/tmp/app.apk` + `pm install -r -t`.
- **A33** Header `w-10` corta right slot → trocar por `minWidth: 40`.
- **A34** Button MotiView colapsa flex row → usar Pressable inline.
- **A35** ADB tap coords físicas (1080×2400), não screencap escalado.
- **A36** ANR DevLauncherErrorActivity → diagnose via
  `logcat -d --pid=$PID | grep -iE 'TypeError|Invariant|Cannot|fatal'`.
- **A37** Build EAS dev-client 10–25min → reusar `builds/dev-client-*.apk`
  + `adb reverse` quando só JS muda.
- **A38** EAS Free Tier esgota quota mensal → GitHub Actions
  workflow `.github/workflows/build-android-apk.yml`.
- **A39** `env.json` gitignored quebra build no CI → `env.json.example`
  versionado + step "Provision env.json" no workflow tenta
  `secrets.ENV_JSON_BASE64` primeiro.

## Lessons learned

### Validação live no celular real é insubstituível

Bugs Q2 (Recap invisível), Q5.1 (mic conflito), Q6 (router.back duplo),
Q7 (sheet câmera) e Q8 (ciclo autor mismatch) só apareceram em
runtime no Xiaomi 2312DRAABG HyperOS. Web (Gauntlet) + Jest unitário
não capturaram. Protocol canônico via dev-client + `adb reverse 8081`
+ `uiautomator dump` por bounds passa a ser obrigatório pré-release.

### Refactor menor > rewrite ambicioso

Q5.1 começou como "refactor unified WAV pipeline" (~1-2h, alto risco)
e virou "2 botões separados" (~30min, zero risco). Decisão do dono
focada em UX clareza ("um botão de áudio, outro de transcrever")
foi mais simples que a sugestão técnica inicial.

### Documentar conforme avança, não no final

Sessão 5 fez auditoria + specs Q17-Q21 detalhados antes de implementar.
Quando alpha-4 buildava em background, sessão 6 já tinha plano +
specs prontos pra Q17 completo + esqueletos Q18/Q19 sem improvisar.

### Quota grátis externa esgota — ter plano B

EAS Free Tier esgotou no meio da Onda Q. GitHub Actions resolveu sem
precisar pagar upgrade. Boa prática: ter pipeline CI próprio mesmo
quando o EAS está OK, pra independência.

## Riscos e pendências (entrada pra próxima sessão)

### Alta prioridade

- **Q17.e** keystore EAS em GitHub Secrets — sem isso, OAuth Google
  quebra em qualquer APK gerado pelo workflow Actions.
- **Validação live pendente** do alpha-4: Q5.1 mic, Q6 save sem
  erro, Q0 OAuth runtime, Q11.c executor, Q17 Health Connect
  conexão real, Q9 Galeria, Q14 entry, Q15 anti-empilhamento.
- **Q11.c gap conhecido**: executor não tem alerta sonoro/notificação
  ao terminar descanso (só haptic). Pode entrar como Q17 ou Q22.

### Média prioridade

- **Q17.d** UI Saúde Física → Evolução mostrando dados HC importados
  (readers prontos, falta plugar).
- **Q18.b** Integração visual do `MidiaExecucaoPlayer` em
  `/exercicios/<slug>`, executor Q11.c e galeria.
- **Q19.b** Form completo de Grupos + sheet "Qual treino hoje?".

### Baixa prioridade

- **Q20** Validação runtime real do Share Pix (alpha-4 implementou,
  falta testar com Nubank/Itaú/etc reais).
- **Q21** Auditoria final do contrato Mobile↔Backend (CSV/MD canônico,
  abrir issues no sibling Python).

## Estatísticas

- **Commits da Onda Q em `main`**: 14
- **Arquivos modificados**: ~40
- **Linhas adicionadas**: ~3500
- **Specs em docs/sprints/**: 9 novos (Q17/Q17.d/Q17.e/Q18/Q18.b/Q19/Q19.b/Q20/Q21)
- **Memórias persistentes adicionadas**: 3 (eas-quota-esgotada, pos-onda-q-2026-05-13, build-alpha-4 — depois apagada)
- **Tempo total estimado**: ~30h ativas em 3 dias

## Próximo passo recomendado

1. Aguardar conclusão do build alpha-5 (run `25774779518` em andamento).
2. Se FINISHED → download artifact + `gh release create v1.0.0-alpha-5`.
3. Implementar Q17.e (keystore em secrets) — desbloqueia OAuth no CI.
4. Validação live integrada do alpha-4 no celular real.
5. Completar Q17.d + Q18.b + Q19.b.
6. Disparar v1.0.0 production (EAS quando quota voltar em 01/Jun) com
   tag oficial.
