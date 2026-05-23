# Sprint R-INT-3-HC-LIVE-CHECKPOINT — Checkpoint live da bridge nativa solitária no Xiaomi HyperOS

```
DEPENDE:    R-INT-3-HC-BRIDGE-NATIVA-D fechada (sync.ts migrado, react-native-health-connect removido do package.json), commit pos sub-sprint D em main
BLOQUEIA:   R-INT-3-HC-AUTOPULL-* (autopull depende da bridge nativa autossuficiente comprovada)
ESTIMATIVA: 30min (apos build alpha-32 disponivel)
```

## 1. Objetivo

Validar empiricamente, no Xiaomi 2312DRAABG HyperOS, que a bridge nativa local `modules/health-connect/` escreve corretamente em 3 record types do Health Connect **sem o pacote upstream `react-native-health-connect` em `package.json`**. Validador da sub-sprint D aceitou aprovação por equivalência semântica (API idêntica + smoke verde + alpha-31 já validado live com mesma bridge), mas o teste live com bridge nativa **sozinha** (sem o pacote upstream em deps) ainda não foi feito empiricamente. Este checkpoint fecha essa ressalva e desbloqueia o ramo de autopull com lastro runtime.

## 2. Entregáveis

### Arquivos novos

- `docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/` — diretório com 4 screenshots:
  - `01-treino-write-confirmacao.png` — toast/feedback do app após salvar TreinoSessao com `featureToggles.healthConnectSync=true`.
  - `02-peso-write-confirmacao.png` — toast/feedback após salvar Medida com `peso=80.5`.
  - `03-menstruacao-write-confirmacao.png` — toast/feedback após salvar RegistroCiclo (`fase=menstrual`, `intensidade='medium'`).
  - `04-hc-dashboard-ouroboros-entries.png` — Health Connect Settings → "Conexão Saúde" → "Dados do app" → "Ouroboros" mostrando as 3 entradas (ExerciseSession + Weight + MenstruationFlow) registradas nos últimos 5 minutos.
- `docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/logcat-3-writes.txt` — output filtrado de `adb logcat` confirmando as 3 chamadas `insertRecords` na bridge Kotlin.

### Arquivos modificados

Nenhum arquivo de código. Esta sprint é **checkpoint de validação humana**, zero código JS/TS/Kotlin.

Pós-validação, atualizar apenas:
- `STATE.md` — registrar checkpoint `[ok-live]` da bridge nativa autossuficiente.
- `CHANGELOG.md` — entrada em `[Unreleased]` confirmando.
- `Checkpoint.md` (gitignored, raiz) — marcar pendência fechada.

## 3. APIs reutilizáveis

Nenhuma alteração de API. Esta sprint apenas exercita as APIs já entregues:

- `escreverTreinoEmHC` em `src/lib/health/sync.ts` (já consome bridge local via path relativo apos sub-sprint D).
- `escreverPesoEmHC` em `src/lib/health/sync.ts`.
- `escreverMenstruacaoEmHC` em `src/lib/health/sync.ts`.
- Bridge nativa Kotlin: `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt` AsyncFunction `insertRecords`.

## 4. Restrições

- **Regra de Anonimato:** screenshots não podem expor nomes reais do onboarding. Se Pessoa A / Pessoa B aparecerem com nomes próprios, borrar antes de commitar.
- **Sem código:** zero edição em `src/`, `app/`, `modules/`, `tests/`. Apenas `adb` + screenshots + commits documentais em `docs/sprints/`.
- **Sem refazer build:** o APK alpha-32 já é o artefato congelado da sub-sprint D pós-cleanup. Esta sprint só consome.
- **Sem nova permissão HC:** state de permissões é preservado do alpha-31 já validado (11/11 health.* granted=true conforme `R-INT-3-HC-EMPIRICAL-FINDINGS-spec.md`). Se permissões foram revogadas por reset/uninstall, **abortar** e abrir sub-sprint nova de re-grant antes de executar este checkpoint.
- **Não tocar em arquivos de outras sprints.**

## 5. Validação Gauntlet OU validação humana adb

**Validação Gauntlet impossível para insertRecords reais no Health Connect nativo** — esta sprint é 100% checkpoint humano via adb. Health Connect só existe em runtime Android nativo; bridge devolve `{ records: [] }` em web (`Platform.OS !== 'android'`).

### Pré-requisitos

1. **Build alpha-32 do branch `main` pós sub-sprint D commit.** Caminhos possíveis (escolher um):
   - GitHub Actions workflow `build-android-apk.yml` (push de tag `v1.0.0-alpha-32` ou trigger manual via `gh workflow run build-android-apk.yml`).
   - `eas build --platform android --profile preview` (somente após reset de quota EAS em 01/Jun/2026 — ver `reference_eas_quota_esgotada.md`).
   - Build local via `cd android && ./gradlew assembleRelease` se ambiente Android SDK 36 + Java 17 configurado.
2. **Xiaomi 2312DRAABG conectado via ADB + USB debugging ON** (Security settings).
3. **Permissões HC já concedidas pro Ouroboros** (state preservado de alpha-31). Verificar:
   ```bash
   adb shell dumpsys package com.ouroboros.mobile | grep -E "health.*granted=true" | wc -l
   # Esperado: 11
   ```
   Se < 11, **abortar** e abrir sub-sprint de re-grant.

### Passos de validação

```bash
# 1. Confirmar APK alpha-32 instalado
adb shell pm list packages | grep com.ouroboros.mobile
adb shell dumpsys package com.ouroboros.mobile | grep versionName
# Esperado: versionName=1.0.0-alpha-32 (ou superior)

# 2. Confirmar bridge nativa sem upstream em deps (lastro pos sub-sprint D)
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
git log --oneline -5
grep -c "react-native-health-connect" package.json
# Esperado: 0

# 3. Lancar app e abrir tracker de logs em janela paralela
adb shell am start -n com.ouroboros.mobile/.MainActivity
adb logcat -c
adb logcat --pid=$(adb shell pidof com.ouroboros.mobile) 2>&1 | grep -iE "HealthConnect|insertRecords|HCBridge" | tee /tmp/hc-live-checkpoint.log &

# 4. Write #1 - TreinoSessao
# Navegar manualmente no app ate criar e salvar TreinoSessao com 1+ exercicio.
# Capturar screenshot apos save bem-sucedido.
adb exec-out screencap -p > docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/01-treino-write-confirmacao.png

# 5. Write #2 - Medida com peso=80.5
# Navegar para tela de Medidas, criar snapshot com peso 80.5kg, salvar.
adb exec-out screencap -p > docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/02-peso-write-confirmacao.png

# 6. Write #3 - RegistroCiclo fase menstrual intensidade media
# Navegar para Ciclo, registrar dia com fase=menstrual, intensidade=medium, salvar.
adb exec-out screencap -p > docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/03-menstruacao-write-confirmacao.png

# 7. Confirmar 3 chamadas insertRecords na bridge Kotlin
grep -c "insertRecords" /tmp/hc-live-checkpoint.log
# Esperado: >= 3 (1 por write)
cp /tmp/hc-live-checkpoint.log docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/logcat-3-writes.txt

# 8. Abrir HC nativo e confirmar entradas
adb shell am start -n com.google.android.apps.healthdata/.SettingsActivity
# Navegar manualmente: Conexao Saude -> Dados do app -> Ouroboros
# Confirmar 3 entries dos ultimos 5min:
#   - 1x Exercicio (Treino Ouroboros)
#   - 1x Peso (80,5 kg)
#   - 1x Fluxo menstrual (Medio)
adb exec-out screencap -p > docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/04-hc-dashboard-ouroboros-entries.png

# 9. Kill background logcat
pkill -f "adb logcat --pid"
```

## 6. Procedimento sugerido

1. **Confirmar pré-requisitos:** alpha-32 buildado, instalado no Xiaomi, conectado via ADB, permissões 11/11 granted.
2. **Smoke audit pre-checkpoint:** `grep -c "react-native-health-connect" package.json` retorna 0; `rg "react-native-health-connect" src/ app/ tests/` retorna 0 ou apenas comentário interno tolerado (linha de `extraProguardRules` em `app.json` se sub-sprint D preservou).
3. **Subir logcat filtrado em janela paralela** com `adb logcat --pid=$(adb shell pidof com.ouroboros.mobile) | grep -iE "HealthConnect|insertRecords|HCBridge" | tee /tmp/hc-live-checkpoint.log`.
4. **Executar os 3 writes na ordem** (treino → peso → menstruação). Capturar screenshot após cada save bem-sucedido.
5. **Confirmar runtime via logcat:** `grep -c "insertRecords" /tmp/hc-live-checkpoint.log` ≥ 3.
6. **Abrir HC nativo** via `adb shell am start -n com.google.android.apps.healthdata/.SettingsActivity` → Conexão Saúde → Dados do app → Ouroboros. Confirmar 3 entries dos últimos 5 min. Capturar screenshot.
7. **Copiar logcat para docs/sprints** e commitar diretório `docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/` com 4 PNGs + 1 TXT.
8. **Atualizar STATE.md + CHANGELOG.md + Checkpoint.md** registrando `[ok-live]`.
9. **Sprint fecha quando dono ou agente humano marca o checkpoint físico no celular.**

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# Audit pre-checkpoint (lastro de que sub-sprint D fechou de verdade):
grep -c "react-native-health-connect" package.json   # 0
rg "react-native-health-connect" src/ app/ tests/ | grep -v extraProguardRules | wc -l   # 0
./scripts/check_anonimato.sh   # exit 0
python3 scripts/check_strings_ui_ptbr.py   # exit 0

# Audit pos-checkpoint:
ls -la docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/   # 5 arquivos
file docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/*.png   # todos PNG validos
grep -c "insertRecords" docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/logcat-3-writes.txt   # >= 3
```

Exit 0 em todos os checks. Se algum quebrar, parar e reportar.

## 8. Commit

```
docs: r-int-3-hc-live-checkpoint bridge nativa solitaria validada xiaomi hyperos
```

Único commit, incluindo:
- Diretório `docs/sprints/R-INT-3-HC-LIVE-CHECKPOINT-screenshots-live/` com 4 PNGs + logcat.
- `STATE.md` atualizado.
- `CHANGELOG.md` com entrada em `[Unreleased]`.

## 9. Checkpoint visual

Esta sprint **é** o checkpoint visual. Os 4 PNGs + logcat compõem o proof-of-work integral.

### Checklist obrigatório de manutenção

- [ ] `docs/FEATURES-CANONICAS.md` — não aplicável, sprint não introduz/modifica feature (apenas valida funcionamento já documentado).
- [ ] `STATE.md` atualizado com `[ok-live]` da bridge nativa solitária.
- [ ] `ROADMAP.md` — não aplicável (sprint não estava no roadmap formal; é anti-débito derivado da ressalva da sub-sprint D).
- [ ] `CHANGELOG.md` atualizado em `[Unreleased]`.
- [ ] `VALIDATOR_BRIEF.md` — não aplicável (sprint não muda política de validação).
- [ ] `Checkpoint.md` (gitignored) atualizado.

## 10. Riscos e não-objetivos

### Riscos

- **Risco 1 (alto):** quota EAS esgotada até 01/Jun/2026. Mitigação: usar GitHub Actions `build-android-apk.yml` ou build local via gradlew.
- **Risco 2 (médio):** permissões HC revogadas entre alpha-31 e alpha-32 (ex: uninstall + reinstall, factory reset, user manual revoke). Mitigação: pre-check com `dumpsys package | grep granted=true | wc -l` ≥ 11; se falhar, abrir sub-sprint de re-grant antes deste checkpoint.
- **Risco 3 (baixo):** HC nativo demora alguns segundos para indexar novas entries. Mitigação: aguardar 30s após cada write antes de abrir HC Dashboard.
- **Risco 4 (baixo):** Xiaomi HyperOS pode bloquear `am start` para HC Settings com Activity-not-exported. Mitigação fallback: abrir HC manualmente via launcher (ícone "Conexão Saúde").

### Não-objetivos

- **Não-objetivo:** validar readRecords (sub-sprint B já validou em alpha-31; este checkpoint foca writes).
- **Não-objetivo:** validar autopull scheduler (sprints R-INT-3-HC-AUTOPULL-SCHEDULER e amigas tratam).
- **Não-objetivo:** validar dedup via `clientRecordId` (sprint futura R-INT-3-HC-DEDUP).
- **Não-objetivo:** medir delta de bundle (sub-sprint D já registrou na pos-build).
- **Não-objetivo:** validar revoke/re-grant fluxo (sprint separada).

## 11. Dúvidas em aberto

Nenhuma. Checkpoint é determinístico: 3 writes → 3 entries no HC Dashboard.

## 12. Referências

- Sub-sprint mãe: `docs/sprints/R-INT-3-HC-BRIDGE-NATIVA-D-CLEANUP-MIGRATION-spec.md`.
- Empirical findings (validação live alpha-30): `docs/sprints/R-INT-3-HC-EMPIRICAL-FINDINGS-spec.md`.
- Bridge nativa arquitetura: memória `reference_hc_bridge_arquitetura.md`.
- Decompile canônico HC: memória `reference_hc_decompile_canonico.md`.
- Validação celular real: memória `feedback_validacao_celular_real.md`.
- EAS quota status: memória `reference_eas_quota_esgotada.md` (reset 01/Jun/2026).
- Workflow build alternativo: `.github/workflows/build-android-apk.yml`.
