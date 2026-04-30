# Ouroboros Mobile

App Android pessoal para captura ativa em Vault Obsidian compartilhado
entre duas pessoas. Mobile escreve `.md`; o pipeline desktop
[`protocolo-ouroboros`](https://github.com/AndreBFarias/protocolo-ouroboros)
processa. Construído com Expo + React Native, sem rede de saída,
estética premium nativa desde o dia um.

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
| `./install.sh` | Confere Node 20+, instala deps com `--legacy-peer-deps`, configura hooks, cria `pessoas.config.ts`, valida com smoke. |
| `./run.sh` | Detecta IP da WiFi, define `REACT_NATIVE_PACKAGER_HOSTNAME`, inicia `expo start --lan`, imprime QR ASCII. Aceita `--clear` (cache do Metro) e `--tunnel`. |
| `./uninstall.sh` | Apaga `node_modules`, `.expo`, caches. Não toca em `.git`, código, `pessoas.config.ts` nem no Vault. |
| `./scripts/smoke.sh` | Roda anonimato + dados de teste + typecheck + lint + tests. Usado pelo pre-push. |
| `./scripts/check_anonimato.sh` | Valida Regra −1: zero IA, zero nomes reais hardcoded. Roda no pre-commit. |

## Documentação

- [`ROADMAP.md`](ROADMAP.md) — mapa de todas as sprints (planejado pela Sprint M00.docs)
- [`STATE.md`](STATE.md) — estado atual: commit, sprint em execução, próximo passo (planejado pela Sprint M00.docs)
- [`HOW_TO_RESUME.md`](HOW_TO_RESUME.md) — guia em 5 passos para retomar do zero (planejado pela Sprint M00.docs)
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de sprints e mudanças
- [`CLAUDE.md`](CLAUDE.md) — regras invioláveis na raiz para visibilidade automática
- [`VALIDATOR_BRIEF.md`](VALIDATOR_BRIEF.md) — invariantes e contratos do projeto
- [`docs/BRIEFING.md`](docs/BRIEFING.md) — design system, princípios estéticos, telas, schemas
- [`docs/CONTEXTO.md`](docs/CONTEXTO.md) — ecossistema, regras invioláveis, anonimato
- [`docs/PLANO_TECNICO_APK.md`](docs/PLANO_TECNICO_APK.md) — playbook operacional, ADRs originais
- [`docs/Ouroboros_22_telas-standalone.html`](docs/Ouroboros_22_telas-standalone.html) — fonte de verdade visual
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
