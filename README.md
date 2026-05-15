# Ouroboros Mobile

App Android pessoal para captura ativa em Vault Obsidian compartilhado
entre duas pessoas. Mobile escreve `.md`; o pipeline desktop
[`protocolo-ouroboros`](https://github.com/AndreBFarias/protocolo-ouroboros)
processa. Construído com Expo + React Native, sem rede de saída,
estética premium nativa desde o dia um.

## Status v1.0 — Onda Q FECHADA (alpha-4 + alpha-5 publicados)

**APKs publicados:**
- **[v1.0.0-alpha-5](https://github.com/AndreBFarias/ouroboros-mobile/releases/tag/v1.0.0-alpha-5)** (2026-05-13 madrugada) — Q17 Health Connect completo + Q18 player + Q19 grupos esqueleto. 65 MB (arm64-v8a only). Via GitHub Actions (workflow `build-android-apk.yml`) porque EAS Free Tier esgotou. OAuth Google quebrado nesse APK (debug keystore — workaround: usar alpha-4).
- **[v1.0.0-alpha-4](https://github.com/AndreBFarias/ouroboros-mobile/releases/tag/v1.0.0-alpha-4)** (2026-05-12 noite) — 21 sprints da Onda Q entregues em 3 dias de maratona. APK universal 157 MB via EAS preview:

- **Q0** OAuth Google Calendar (scope `calendar.events.readonly` registrado + `env.json` Android client)
- **Q1–Q4** Rename "Ouroboros" + Recap visível + MenuLateral suave + FABs 64dp
- **Q5.1+Q5.2** TranscreverButton separado (resolve aborto de mic) + speech-recognition continuous
- **Q6** Ref guard `goBackOnce()` no diário (resolve `GO_BACK was not handled`)
- **Q7** Sheet câmera com retry 800ms (cobre A30)
- **Q8** Ciclo persistência — simetria save/load via `autorPadrao`
- **Q9** Galeria unificada `/galeria` (Vault Explorer)
- **Q10** Share Intent expandido — Pix/boleto/extrato regex classifier
- **Q11.a+b+c** Rotinas completas (CRUD + SeletorRotina + executor com timer)
- **Q12** Bridge ETL Mobile↔Backend (`_schema_version: 1` em todos writers)
- **Q14** Entry "Rotinas" no MenuLateral
- **Q15** Sheets desempilhados durante seletor
- **Q17** Integração Health Connect Android completa (pacote, permissions, tela `/settings/integracoes`, sync read+write)
- **Q18** `MidiaExecucaoPlayer` para GIFs em exercícios (integração visual em Q18.b)
- **Q19** Grupos de Treino esqueleto (schema + vault + rotas)
- **Q20–Q21** Specs detalhadas em `docs/sprints/`

Métricas pós-Onda Q: 1892 testes Jest verde · typecheck silent · smoke OK · anonimato (Regra −1) OK · PT-BR audit OK.

**Pendências priorizadas pré-v1.0:**
- **Q17.e** keystore EAS em GitHub Secrets — desbloqueia OAuth Google em APKs do CI local (spec em `docs/sprints/Q17e-KEYSTORE-EAS-EM-SECRETS-spec.md`).
- **Validação live integrada do alpha-4** no celular real (Q5.1 mic, Q6 save sem erro, Q0 OAuth runtime, Q11.c executor, Q17 HC conexão real, Q9 Galeria, Q14/Q15).
- **Q17.d/Q18.b/Q19.b** — completar features semi-entregues (specs detalhados em `docs/sprints/`).

Log completo em [`docs/ONDA-Q-2026-05-12.md`](docs/ONDA-Q-2026-05-12.md) (7 sessões registradas) e [`docs/RELATORIO-ONDA-Q-FINAL.md`](docs/RELATORIO-ONDA-Q-FINAL.md).

### Releases anteriores

- **APK alpha-3 (2026-05-09 madrugada)** — vault HyperOS-proof + BottomSheet New Arch + saves E2E (V4.0.2 part 1-8). Bug raiz tripla do alpha-2 corrigida. Vault default em `documentDirectory` (HyperOS-proof — Armadilha A31), BottomSheet abre em New Arch + Reanimated 4 (Armadilha A30), sync `tipoCompanhia` entre stores, 4 saves end-to-end validados no celular real.
- **v1.0.0** (2026-05-02) — publicada e retirada do GitHub Releases no mesmo dia ao identificarmos bugs críticos. Tag git permanece em `main` por histórico.
- Refundação em 21 sprints (M21 → M41) fechada em 2026-05-07 (31/31 sprints H–O).

Acompanhe em [`STATE.md`](STATE.md), [`ROADMAP.md`](ROADMAP.md),
[`CHANGELOG.md`](CHANGELOG.md) Onda E e [`docs/sprints/`](docs/sprints/).

Sem Play Store. Sem auto-update. Cada release é distribuição manual
deliberada. Veja [`docs/RELEASE.md`](docs/RELEASE.md) para o pipeline
completo (build EAS production → AAB → APK universal → tag git).

> **Para retomar o projeto em uma sessão fresh**: leia
> [`STATE.md`](STATE.md) → [`ROADMAP.md`](ROADMAP.md) →
> [`HOW_TO_RESUME.md`](HOW_TO_RESUME.md) (5 passos).

## Stack

Expo SDK 54 · React Native 0.81 · TypeScript strict · NativeWind 4 ·
Moti · Reanimated 4 · gluestack-ui · @gorhom/bottom-sheet · zustand ·
zod · JetBrains Mono.

## Setup rápido

```bash
git clone https://github.com/AndreBFarias/ouroboros-mobile.git
cd ouroboros-mobile
./install.sh        # instala dependências, hooks de git e pessoas.config
./run.sh            # inicia Metro com IP da WiFi e gera QR code
```

Escaneie o QR no Expo Go do celular Android (mesma rede WiFi). Fast
refresh em menos de 1 segundo, sem build de Android Studio.

### Quando usar cada um

| Comando | Para que | Dependências |
|---|---|---|
| `./gauntlet.sh` | Validação visual web rápida (UI, CSS, routing) | Nenhuma (Chrome) |
| `./run.sh` | Teste nativo no celular físico | Wi-Fi + QR code |
| `./run.sh --emulator` | Teste nativo no emulador Android | AVD configurado |

## Scripts

| Script | Função |
|---|---|
| `./install.sh` | Setup do projeto: confere Node 20+, instala deps com `--legacy-peer-deps`, configura hooks, cria `pessoas.config.ts`, valida com smoke. |
| `./install-dev.sh` | Setup do desktop em uma passada: pede sudo só uma vez, instala ADB, scrcpy, Android cmdline-tools, system image e emulador. Configura `~/.zshrc` com `ANDROID_HOME` e PATH. Cria AVD `ouroboros-test` otimizado por hardware (cores, RAM, GPU host, KVM) e snapshot inicial pra boot <10s. Default sem flags instala tudo. `--skip-emulator` para só ADB+scrcpy. |
| `./run.sh` | Inicia Metro com QR. Flags: `--clear` (limpa cache), `--tunnel` (ngrok), `--web` (Chrome desktop, zero conflito com celular), `--emulator` (sobe AVD `ouroboros-test` antes do Metro), `--mirror` (abre janela scrcpy do device conectado em paralelo). |
| `./scripts/start-emulator.sh` | Inicia emulador `ouroboros-test` com flags de performance (`-gpu host`, `-accel auto`, snapshot). `--headless` para sem janela, `--cold` para ignorar snapshot. |
| `./scripts/mirror-device.sh` | Abre `scrcpy` espelhando celular físico ou emulador. Latência <50ms. |
| `./uninstall.sh` | Apaga `node_modules`, `.expo`, caches. Não toca em `.git`, código, `pessoas.config.ts` nem no Vault. |
| `./scripts/smoke.sh` | Roda anonimato + dados de teste + typecheck + lint + tests. Usado pelo pre-push. |
| `./scripts/check_anonimato.sh` | Valida Regra −1: zero IA, zero nomes reais hardcoded. Roda no pre-commit. |
| `./scripts/adb-wireless.sh` | Habilita ADB sem cabo após pareamento USB inicial. Gerado pelo `install-dev.sh`. |

## Política de validação visual (3 níveis)

Detalhe em `VALIDATOR_BRIEF.md` §1.9 e `CLAUDE.md`. Resumo:

- **Nível A** (default): `./run.sh --web` + Chrome no desktop. Cobre fluxos JS, sem conflito com seu celular.
- **Nível B** (sob demanda): emulador Android no desktop (instalado pelo `install-dev.sh`). Cobre APIs nativas.
- **Nível C** (precisa sua permissão): celular físico via ADB. Só para Syncthing real, share intent de outros apps e checkpoint visual de fim de sprint.

## Documentação

### Para próxima sessão (leitura obrigatória PRIMEIRO)

- [`docs/ORCHESTRATOR_PLAYBOOK.md`](docs/ORCHESTRATOR_PLAYBOOK.md) — playbook mestre de orquestração (filosofia, ciclo de sprint em 10 passos, template de prompt do executor, workflow Chrome MCP, padrões aprendidos, erros e recuperação)
- [`docs/SESSION-2026-05-01-log.md`](docs/SESSION-2026-05-01-log.md) — log narrativo das 11 sprints fechadas em sequência (M00.5 → M18)
- [`STATE.md`](STATE.md) — estado atual: commit, sprint em execução, próximo passo
- [`HOW_TO_RESUME.md`](HOW_TO_RESUME.md) — guia em 7 passos para retomar do zero (Passo 0 identifica papel)

### Mapa do projeto

- [`ROADMAP.md`](ROADMAP.md) — mapa de todas as sprints
- [`docs/sprints/INTEGRATION-CONTRACT.md`](docs/sprints/INTEGRATION-CONTRACT.md) — contrato mestre de integração (pontos canônicos onde toda sprint pluga)
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de sprints e mudanças
- [`CLAUDE.md`](CLAUDE.md) — regras invioláveis na raiz para visibilidade automática
- [`VALIDATOR_BRIEF.md`](VALIDATOR_BRIEF.md) — invariantes e contratos do projeto
- [`docs/BRIEFING.md`](docs/BRIEFING.md) — design system, princípios estéticos, telas, schemas
- [`docs/CONTEXTO.md`](docs/CONTEXTO.md) — ecossistema, regras invioláveis, anonimato
- [`docs/PLANO_TECNICO_APK.md`](docs/PLANO_TECNICO_APK.md) — playbook operacional, ADRs originais
- [`docs/Ouroboros_24_telas-standalone.html`](docs/Ouroboros_24_telas-standalone.html) — fonte de verdade visual (22 telas core)
- [`docs/Ouroboros_telas_25_26-standalone.html`](docs/Ouroboros_telas_25_26-standalone.html) — Telas 25 (calendário) e 26 (widget) adicionadas em M00.6
- [`docs/ADRs/`](docs/ADRs/) — Architecture Decision Records (formalizados na M00.docs)
- [`docs/sprints/`](docs/sprints/) — specs executáveis por sprint, screenshots e checkpoints

## Filosofia

- **Baixa fricção.** 1-2 taps para registrar qualquer coisa.
- **Nada de gamificação.** Sem streaks, badges, reforço positivo artificial.
- **Dados são arquivos.** Tudo `.md` no Vault. Portável, auditável.
- **Mobile captura, desktop processa.** Não duplica funcionalidade.
- **Estética é função.** Beleza não é adorno; é ferramenta para reduzir a fricção de abrir.
- **Sem rede de saída.** Zero analytics, zero crash reporter remoto. Tudo on-device.

Detalhes em `docs/BRIEFING.md` Seção 1 e 2.

## Licença

GPL-3.0 — ver [`LICENSE`](LICENSE).
