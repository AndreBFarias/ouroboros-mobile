# Ouroboros Mobile

App Android pessoal para captura ativa em Vault Obsidian compartilhado
entre duas pessoas. Mobile escreve `.md`; o pipeline desktop
[`protocolo-ouroboros`](https://github.com/AndreBFarias/protocolo-ouroboros)
processa.

## Stack

Expo SDK 51+ · React Native · TypeScript · NativeWind · Moti ·
Reanimated 3 · gluestack-ui · @gorhom/bottom-sheet · zustand · zod ·
JetBrains Mono.

## Setup

```bash
git clone <repo-url>
cd Protocolo-Mob-Ouroboros
npm install

# Identidade de pessoas (genérica por padrão; o app pergunta os nomes
# no onboarding e persiste em SecureStore — Regra -1 do CONTEXTO.md)
cp src/config/pessoas.config.example.ts src/config/pessoas.config.ts

# Hooks de validação (anonimato + smoke test)
git config core.hooksPath hooks
chmod +x hooks/* scripts/*.sh
```

## Desenvolvimento

```bash
npx expo start
# escanear o QR code com o app Expo Go no celular
```

Fast refresh < 1s. Sem build de Android Studio.

## Validação

```bash
./scripts/smoke.sh        # anonimato + dados de teste + typecheck + lint + tests
./scripts/check_anonimato.sh
```

## Documentação

- [`docs/BRIEFING.md`](docs/BRIEFING.md) — design system, princípios estéticos, telas, schemas
- [`docs/CONTEXTO.md`](docs/CONTEXTO.md) — ecossistema, regras invioláveis, anonimato
- [`docs/PLANO_TECNICO_APK.md`](docs/PLANO_TECNICO_APK.md) — playbook operacional, ADRs, scripts
- [`docs/Ouroboros_22_telas-standalone.html`](docs/Ouroboros_22_telas-standalone.html) — fonte de verdade visual
- [`docs/ADRs/`](docs/ADRs/) — Architecture Decision Records
- [`docs/sprints/`](docs/sprints/) — TODO lists e checkpoints visuais por sprint

## Licença

GPL-3.0 — ver [`LICENSE`](LICENSE).
