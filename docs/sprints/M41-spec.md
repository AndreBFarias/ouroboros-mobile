# Sprint M41 — APK Release v1.0.0 final + GitHub Release público

```
DEPENDE:    M21-M40 (todas as 20 sprints da refundação)
BLOQUEIA:   nenhuma (último entregável da refundação)
ESTIMATIVA: 3-4h
```

## 1. Objetivo

Buildar APK v1.0.0 final consolidando as 20 sprints anteriores (M21
a M40), rodar smoke E2E completo via Maestro (8 flows críticos) e
publicar no GitHub Releases substituindo a release v1.0.0 retirada
em M21.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — bump:
  - `version: "1.0.0"` (mantém — é a v1.0 final).
  - `runtimeVersion: "1.0.0"`.
  - `android.versionCode: 3` (incrementa de 2).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/CHANGELOG.md`
  — bloco `[Unreleased]` consolidado vira `[1.0.0] — 2026-MM-DD`
  (data real do release). Bloco `[1.0.0-rc1]` permanece como
  histórico.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/README.md`
  — atualiza seção "Status v1.0" para incluir link novo do release
  + baixar APK.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/STATE.md`
  — header "v1.0.0 fechado" + métricas finais.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/ROADMAP.md`
  — marca M21-M41 como `[ok]`.

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/docs/release-notes-v1.0.md`
  — release notes públicas estruturadas (Adicionado / Corrigido /
  Mudado, sem mencionar IA ou Claude).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow5-recap.yaml`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow6-menu-lateral.yaml`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow7-tarefa-categoria-alarme.yaml`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/flow8-resume-state.yaml`

### Comandos a executar

```bash
# 1. Smoke completo
./scripts/smoke.sh
npm test --silent
npx tsc --noEmit
npx expo export --platform android --output-dir /tmp/m41-export

# 2. E2E Maestro (8 flows incluindo 4 novos)
maestro test tests/e2e/

# 3. Build APK production
EXPO_TOKEN=<token> ./scripts/release-apk.sh
# OU
EXPO_TOKEN=<token> eas build --platform android --profile production --non-interactive

# 4. Recriar tag v1.0.0 (force)
git tag -d v1.0.0
git tag v1.0.0
git push origin :refs/tags/v1.0.0
git push origin v1.0.0

# 5. Publicar release
gh release create v1.0.0 \
  --repo AndreBFarias/ouroboros-mobile \
  --title "v1.0.0 — Ouroboros Mobile MVP" \
  --notes-file docs/release-notes-v1.0.md \
  builds/ouroboros-1.0.0.apk
```

### Arquivos NÃO modificados

- `eas.json` — pipeline production já configurado em M19.
- `scripts/release-apk.sh` — script existente.

## 3. APIs reutilizáveis

- `eas-cli` — build production existente.
- `gh` CLI — release.
- `maestro` — E2E.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- Fechamento. Sprint puramente operacional + release.

## 4. Restrições

- **Regra −1**: release notes em PT-BR sem menção a IA ou Claude.
- Sentence case + acentuação em release notes.
- Mensagem de commit final: `release: v1.0.0 refundacao completa
  m21 a m41`.
- Tag git `v1.0.0` força sobre a tag antiga (que vive como
  histórico em rc1).
- Não fechar release sem APK validado em emulador + celular real.

## 5. Procedimento sugerido

1. Bump `app.json` versionCode → 3.
2. Escrever `CHANGELOG.md` consolidado (mover Unreleased para 1.0.0).
3. Escrever `docs/release-notes-v1.0.md` estruturado:
   ```markdown
   # v1.0.0 — Ouroboros Mobile MVP

   App Android pessoal para captura ativa em Vault Markdown
   compartilhado entre duas pessoas. Refundação completa em 21 sprints.

   ## Adicionado
   - Vault auto-criado em /sdcard/Documents/Ouroboros/ (M22)
   - Onboarding em 3 frames sem fricção (M23)
   - Resume state e auto-save de rascunhos (M24)
   - Logo Ouroboros animado em SVG nativo (M25)
   - Menu lateral substitui bottom tabs (M27)
   - Recap por período: Conquistas/Crises/Evoluções/Números (M36)
   - Integração Google Calendar leitura+escrita (M37)
   - Captura unificada Foto/Música/Vídeo/Frase (M34)
   - Mensagens de apoio sóbrias em contadores (M32)
   - Anotação para o casal em diário/evento/contador/marco (M33)
   - Mídia preservada em formato original com .md companion (M39)
   - Conflict resolution para 4 nós Syncthing (M38)

   ## Corrigido
   - Captura "tela infinita preta" ao abrir humor/diário/eventos/scanner (M26)
   - Alarmes mudos: vibração + som + permissão notif (M30)
   - "Pessoa A/B/Sobreposto" hardcoded → nomes reais runtime (M28)

   ## Mudado
   - Settings: 3 toggles vibração + 1 mestre, features default ON,
     sync removido como seleção, scanner sempre máxima (M29)
   - Tarefa: categoria + pessoa_destino + alarme vinculado (M31)
   - Finanças: empty state honesto "Em desenvolvimento" (M35)
   - Home: status do casal + Próximos + botão Recap (M40)

   ## Download
   APK assinado v2/v3+ abaixo. Instalação manual via ADB ou
   diretamente no celular Android (habilitar "Fontes desconhecidas").
   ```
4. Criar 4 fluxos Maestro novos.
5. Rodar smoke E2E completo.
6. Build APK + recrate tag + release.
7. Atualizar STATE/ROADMAP/README.
8. Commit final.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m41-export
maestro test tests/e2e/

# Pós-release:
gh release view v1.0.0 --repo AndreBFarias/ouroboros-mobile
# espera ver release publicado com APK como asset
```

## 7. Commit

```
release: v1.0.0 refundacao completa m21 a m41
```

## 8. Checkpoint visual

Validação final em **celular físico real** (Nível C — pedir
permissão ao usuário antes):

1. Instalar APK do release público
2. Onboarding completo
3. Cada uma das 12 features chave funciona ponta-a-ponta:
   - humor rápido → daily/<data>.md criado
   - diário emocional → inbox/mente/diario/<data-slug>.md
   - eventos → eventos/<data-slug>.md
   - tarefa com alarme → tarefas + alarmes vinculados
   - alarme dispara: vibra, toca, notifica
   - contador novo → mensagem de apoio aparece
   - menu lateral abre/fecha suave
   - menu verde captura foto + companion
   - Recap mostra agregação real
   - Calendar: OAuth + criar evento
   - Resume state: reabrir app volta na rota anterior
   - Syncthing: arquivo aparece no desktop ~/Protocolo-Ouroboros/

12 screenshots Nível C em `docs/sprints/M41-screenshots/` cobrindo
cada feature.

## 9. Decisões tomadas

- **Tag `v1.0.0` sobrescrita via `-f`**: a tag de M21 (rc1) fica
  apenas como label histórica no CHANGELOG. A tag git `v1.0.0`
  aponta para o commit final da refundação.
- **versionCode 3**: 1 = original M19; 2 = build M19 fix; 3 =
  refundação final.
- **APK direto no GitHub Release**: distribuição manual continua;
  sem Play Store.
- **8 flows Maestro**: cobre fluxos críticos descritos no BRIEFING
  §5 + 4 novos para refundação.
- **Validação Nível C obrigatória**: M41 só fecha com aprovação
  visual no celular real do usuário.
- **Release notes sem mencionar IA**: Regra −1 reforçada em
  comunicação pública.

Sprint pronta para execução sem perguntas pendentes.
