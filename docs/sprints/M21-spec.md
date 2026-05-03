# Sprint M21 — Despublicar release v1.0.0 do GitHub e marcar como rc1

```
DEPENDE:    Tag git v1.0.0 cravada (HEAD ~7c514b3); GitHub Release v1.0.0 publicado
BLOQUEIA:   M22 (refundação inicia após release retirado)
ESTIMATIVA: 0,3h
```

## 1. Objetivo

Retirar do GitHub Releases o APK público v1.0.0 (lançado em 2026-05-02
e identificado com bugs críticos em uso real), preservando histórico
local. Atualizar `STATE.md`, `CHANGELOG.md` e `README.md` para
refletir que a v1.0.0 vira rascunho `[1.0.0-rc1]` enquanto a
refundação (M22-M41) está em curso.

## 2. Entregáveis

### Comandos a executar

- `gh release delete v1.0.0 --repo AndreBFarias/ouroboros-mobile --yes`
  — apaga release público; APK fica preservado em `builds/` localmente.
- (opcional) `cp builds/ouroboros-1.0.0.apk builds/ouroboros-1.0.0-rc1.apk`
  — backup explícito com nome novo.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/CHANGELOG.md`
  — bloco `[1.0.0]` vira `[1.0.0-rc1] — não lançado`. Bloco `[Unreleased]`
  ganha bullet inicial: "Refundação v1.0 em curso (M21-M41) — release
  v1.0.0-rc1 retirado do GitHub Releases por bugs críticos".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/STATE.md`
  — header substitui "MVP v1.0.0 fechado" por "Refundação v1.0 em
  curso (M21-M41). Release v1.0.0-rc1 retirado." Próximo passo
  aponta para M22.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/README.md`
  — seção "Status v1.0" no lugar da seção "Download v1.0.0 (MVP
  fechado)" antiga (já feito durante materialização do plano).

### Arquivos NÃO modificados

- `app.json` — permanece `version: 1.0.0`, `versionCode: 2`
  (próxima sprint M22 começa o trabalho).
- Tag git `v1.0.0` permanece em `main` (preservada por histórico).

## 3. APIs reutilizáveis

Nenhuma. Sprint puramente operacional.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint **não
toca em código** nem em pontos canônicos. Apenas:

- Retira artefato externo (GitHub Release).
- Atualiza docs vivos (`STATE.md`, `CHANGELOG.md`, `README.md`).

## 4. Restrições

- **Regra −1** (Anonimato): nenhuma menção a IA ou nomes reais nos
  textos atualizados.
- Mensagens em PT-BR Sentence case com acentuação completa nos `.md`.
- Mensagens de commit sem acento.
- Não mexer no APK local em `builds/` (preservar todos os 4
  artefatos).
- **Não force-push tag git** — manter `v1.0.0` em `main` por
  histórico.

## 5. Procedimento sugerido

1. Confirmar APK presente em `builds/`:
   ```bash
   ls /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/builds/
   # espera ver ouroboros-1.0.0.apk
   ```
2. Despublicar release:
   ```bash
   gh release delete v1.0.0 \
     --repo AndreBFarias/ouroboros-mobile --yes
   ```
3. Confirmar que release sumiu:
   ```bash
   gh release list --repo AndreBFarias/ouroboros-mobile
   # espera lista vazia
   ```
4. Editar `CHANGELOG.md`: renomear bloco `[1.0.0]` para `[1.0.0-rc1]`
   + adicionar bullet em `[Unreleased]` "Refundação v1.0 em curso".
5. Editar `STATE.md`: atualizar header e próximo passo (linkar M22).
6. Confirmar `README.md` (já atualizado durante plano).
7. Commit: `chore: m21 despublica release v1.0.0 e marca como rc1`.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh

# Verificações específicas desta sprint
gh release list --repo AndreBFarias/ouroboros-mobile | grep v1.0.0 || echo "OK release retirado"
git tag -l v1.0.0  # espera output: v1.0.0 (tag preservada)
ls builds/ouroboros-1.0.0.apk  # espera APK preservado
grep "1.0.0-rc1" CHANGELOG.md   # espera linha encontrada
```

Todos exit 0.

## 7. Commit

```
chore: m21 despublica release v1.0.0 e marca como rc1
```

## 8. Checkpoint visual

Sprint sem UI. Não aplica.

## 9. Decisões tomadas

- **Manter tag git `v1.0.0`**: preservar histórico de bundle. Não
  fazer force-push para sobrescrever — risco de perda de informação.
  M41 cravará nova tag (ex: `v1.0.0-final` ou `v1.0.0` recriada após
  validação E2E completa).
- **APK fica em `builds/` localmente**: não comitado (gitignore
  cobre). Backup manual via `cp` recomendado mas opcional.
- **Não comunicar publicamente sobre o retiro**: usuário decide se
  quer abrir issue/PR informando. Sprint apenas executa a remoção
  técnica.

Sprint pronta para execução sem perguntas pendentes.
