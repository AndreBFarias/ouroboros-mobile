# Ouroboros Mobile

App Android pessoal para captura ativa em Vault Obsidian compartilhado
entre duas pessoas. Mobile escreve `.md`; o pipeline desktop
[`protocolo-ouroboros`](https://github.com/AndreBFarias/protocolo-ouroboros)
processa. Construído com Expo + React Native, sem rede de saída,
estética premium nativa desde o dia um.

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
- [`docs/Ouroboros_22_telas-standalone.html`](docs/Ouroboros_22_telas-standalone.html) — fonte de verdade visual (22 telas core)
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
