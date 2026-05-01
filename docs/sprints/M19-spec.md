# Sprint M19 — APK Release Hardening (v1.0.0)

```
DEPENDE:    Todas as sprints Mobile do MVP fechadas (M00.5, M00.6, M06.5,
            M07.x, M08, M09, M10, M11, M11.5, M12, M13, M14, M14.5, M15,
            M16, M17, M18) + MOB-bridge-1, MOB-bridge-2, MOB-bridge-3
            no backend.
BLOQUEIA:   Tag git `v1.0.0` e distribuição manual do APK.
ESTIMATIVA: 6-8h (inclui ciclos de build EAS e validação ponta-a-ponta)
```

## 1. Objetivo

Empacotar o APK release `v1.0.0` com toda a polidez exigida para
distribuição manual. Configurar ícone, splash screen, versão,
keystore reproducível, smoke E2E completo via Maestro dos 4 flows
críticos do BRIEFING §5, validar bundle final < 35 MB instalado e
documentar processo. Tag git ao final.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/assets/icon.png`
  — Ícone do app 1024x1024 PNG. Fundo `--bg-page` (#14151a),
  símbolo do projeto (proposta: anel de Ouroboros estilizado em
  `--purple` com toque `--cyan`). Sem texto. Polished.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/assets/icon-foreground.png`
  — 1024x1024 PNG do foreground do adaptive icon Android (apenas
  o anel, sem fundo).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/assets/splash.png`
  — 2400x2400 PNG com ícone centralizado no canvas
  `--bg-page`. Resize automático conforme densidade.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow1-pix.yaml`
  — Maestro flow do PIX via share intent (alvo <5s).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow2-trigger.yaml`
  — Diário emocional trigger em <30s.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow3-evento.yaml`
  — Evento positivo com lugar em <25s.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow4-scanner.yaml`
  — Scanner de nota fiscal em <20s.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/onboarding-completo.yaml`
  — Onboarding 4 frames + primeiro humor + primeiro evento.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/release-apk.sh`
  — Pipeline completo: smoke → build production → tamanho → tag git.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/docs/RELEASE.md`
  — Documento de processo de release: assinatura, distribuição
  manual, instalação manual nos celulares, rollback.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/credentials/README.md`
  — instruções de geração de keystore via `eas credentials`. O
  keystore real fica fora do git (gitignored).

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — `"version": "1.0.0"`,
  `"runtimeVersion": "1.0.0"`,
  `"android.versionCode": 1`,
  `"icon": "./assets/icon.png"`,
  `"splash.image": "./assets/splash.png"`,
  `"android.adaptiveIcon.foregroundImage": "./assets/icon-foreground.png"`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/eas.json`
  — Profile `production` ganha `android.gradleCommand`,
  `autoIncrement: 'versionCode'`, e `env.NODE_ENV='production'`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/package.json`
  — script `test:e2e: "maestro test tests/e2e/"`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/.gitignore`
  — adicionar `credentials/keystore.jks` e
  `credentials/keystore.json`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/docs/Ouroboros_22_telas-standalone.html`
  — rename para `Ouroboros_24_telas-standalone.html` (atualizar
  referências em README, CLAUDE.md, BRIEFING, CONTEXTO,
  HOW_TO_RESUME, CHANGELOG, validators).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/STATE.md`
  — após sprint, marca commit final `v1.0.0`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/ROADMAP.md`
  — todas as sprints `[ok]`; tag `v1.0.0` registrada.

## 3. APIs reutilizáveis

- `eas-cli` — `eas build --profile production` e
  `eas credentials`.
- `expo-splash-screen` — já configurado em M01.1.
- `maestro` — testes E2E.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint:

- **Fechamento:** consolida todos os pontos canônicos — todas as
  abas funcionais, todos os schemas no barrel, todos os toggles
  testados, todos os boot hooks plugados.
- **Versão:** bumps `app.json` para 1.0.0, `versionCode` 1.
- **Ícone e splash:** assets finais em `assets/`.
- **E2E:** 5 fluxos Maestro cobrindo onboarding + 4 flows
  críticos.
- **Distribuição:** APK release distribuído manualmente via ADB
  para os 2 celulares; sem Play Store.

## 4. Restrições

- **Regra −1**, ADR-0007 (zero rede), Sentence case PT-BR.
- **Sem auto-update via expo-updates:** distribuição manual de APK
  é deliberada. Configurar `runtimeVersion` para evitar
  auto-update silencioso.
- **Bundle Hermes < 12 MB. APK instalado < 35 MB.** Se passar,
  abrir sub-sprint M19.1 de otimização (tree-shake imports
  pesados, comprimir GIFs em `assets/exercicios/`).
- **Cold start < 3s** no Redmi Note 13 5G Pro.
- **Smoke E2E completo:** todos os 5 flows Maestro passam antes
  do release.
- **Keystore reproducível:** `eas credentials` gerencia; backup
  manual em local seguro do usuário (não git).
- **Distribuição manual via ADB:** `adb install ouroboros-1.0.0.apk`
  em ambos os celulares.
- **Anti-features confirmadas zero:** sem light mode, sem
  multi-idioma, sem analytics, sem Play Store updates.

## 5. Procedimento sugerido

1. **Smoke baseline:** rodar `./scripts/smoke.sh`,
   `npx tsc --noEmit`, `npm test`, `npx expo export`. Tudo verde.
2. **Atualizar `app.json`:** versão, runtime, ícone, splash.
3. **Gerar ícone:** SVG vetorial → 1024x1024 PNG via Inkscape ou
   ferramenta equivalente. Validar que cor de fundo bate
   `--bg-page` exato e símbolo está centralizado.
4. **Atualizar `eas.json` production profile.**
5. **Configurar keystore:** `npx eas-cli credentials` em modo
   interativo. Gerar keystore Android. Backup do `.jks` em local
   seguro (USB criptografado, não git).
6. **Escrever 5 flows Maestro em `tests/e2e/`.** Cada um cronometra
   tempo total tap-inicial → toast final.
7. **Rodar `maestro test tests/e2e/`** no celular físico
   conectado via ADB. Todos passam, com tempo dentro do alvo.
8. **Build production:** `npm run build:prod`. Aguardar EAS
   (~25 min). Baixar `.apk`.
9. **Verificar tamanho:** `du -h ouroboros-*.apk`.
10. **Instalar nos 2 celulares:** `adb install ouroboros-1.0.0.apk`.
11. **Validação ponta-a-ponta manual:**
    - Abrir cold; cronometrar até Tela 01.
    - Onboarding completo.
    - 4 flows críticos.
    - Sync Syncthing real entre os 2 celulares (humor + evento).
    - Cache do desktop lido (Mini Humor, Mini Financeiro).
    - Biometria de abertura (toggle on em Settings).
    - Exportar Vault em ZIP via share sheet.
    - Validar widget homescreen (M20 deve estar entregue).
12. **Documentar `docs/RELEASE.md`** com checklist completo.
13. **Atualizar STATE, ROADMAP, CHANGELOG.**
14. **Tag git:** `git tag v1.0.0 -m "MVP v1 fechado."` + `git push --tags`.
15. **Commit final.**

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m19-export

# E2E
adb -s <celular> shell pm list packages | grep ouroboros  # confirma instalado
maestro test tests/e2e/

# Tamanho
du -h ouroboros-1.0.0.apk

# Versão
adb -s <celular> shell dumpsys package com.ouroboros.mobile | grep versionName
```

Todos exit 0; APK < 35 MB; versionName "1.0.0".

## 7. Commit

```
release: v1.0.0 mvp fechado todas sprints integradas
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Nível A (Chrome web):** smoke visual final — todas as abas e
  rotas modais carregam sem console error.
- **Nível B (emulador):** Maestro E2E completo no emulador.
- **Nível C (celular físico):** APK release instalado nos 2
  celulares; checkpoint manual ponta-a-ponta documentado em
  `docs/sprints/M19-screenshots/`.

## 9. Definição de Pronto

- [ ] Versão `1.0.0` em `app.json` + `runtimeVersion`.
- [ ] Ícone, splash, adaptive icon polidos.
- [ ] EAS production profile configurado com keystore reproducível.
- [ ] 5 flows Maestro escritos e passando no celular.
- [ ] Bundle Hermes < 12 MB; APK instalado < 35 MB.
- [ ] Cold start < 3s no Redmi Note 13 5G Pro.
- [ ] Smoke + tests + tsc + expo export OK.
- [ ] APK instalado nos 2 celulares; ciclo manual validado.
- [ ] `docs/RELEASE.md` escrito.
- [ ] Tag git `v1.0.0` criada e enviada.
- [ ] `STATE.md`, `ROADMAP.md`, `CHANGELOG.md` atualizados.
- [ ] Mockup HTML renomeado para 24 telas.

## 10. Decisões tomadas

- **Distribuição manual via ADB:** sem Play Store. Apps pessoais.
  `runtimeVersion` para travar auto-update.
- **Keystore via EAS:** geração e backup manual fora do git.
- **5 flows E2E críticos:** onboarding + 4 do BRIEFING §5. Maestro
  é mais simples que Detox.
- **Limites de tamanho hard:** 12 MB Hermes / 35 MB APK. Acima =
  M19.1 sub-sprint de otimização.
- **Tag `v1.0.0` ao final** marca MVP fechado. Bumps futuros
  seguem semver.

Sprint pronta para execução sem perguntas pendentes.
