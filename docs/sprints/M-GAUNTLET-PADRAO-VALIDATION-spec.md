# Sprint O1 — M-GAUNTLET-PADRAO-VALIDATION

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW] (pré-condição transversal)
ESTIMATIVA: ~1h docs
STATUS:     [todo]
```

## §1 Achado

Várias sprints recentes (A26, A27, A28) geraram APK sem validação
Gauntlet completa — bugs vazaram para field test que poderiam ter
sido pegos no Gauntlet (ex: crash de SVG transform string só
descoberto após APK 156MB rodar no celular). Causa: spec workflow
não exigia explicitamente Gauntlet OU validação humana antes de
APK.

## §2 Tarefa

1. **Atualizar `VALIDATOR_BRIEF.md` §1.9**:

   Adicionar regra:

   > **REGRA OBRIGATÓRIA — Gauntlet ANTES de APK.**
   >
   > Toda sprint nova entrega evidência Gauntlet (PNGs em
   > `docs/sprints/<id>-screenshots/`) ANTES de gerar APK preview/release.
   > Se a feature exige runtime nativo (modal nativo, OAuth real,
   > microfone, scanner ML Kit, push notif), a sprint **DEVE** declarar
   > explicitamente:
   >
   > 1. **"Validação Gauntlet impossível para X, Y, Z"** — listar
   >    funcionalidades que exigem nativo.
   > 2. **"Validação humana adb obrigatória"** — listar passos exatos:
   >    `adb shell pm clear <pkg>`, `adb shell am start <deeplink>`,
   >    `adb logcat -d -v threadtime | grep <pattern>`,
   >    `adb exec-out screencap -p > <path>`,
   >    `adb shell run-as <pkg> cat <vault-path>`.
   >
   > APK preview NÃO é gerado se a sprint não cumpre essa regra.

2. **`docs/sprints/TEMPLATE-spec.md`** ganha §5 obrigatória "Validação
   Gauntlet OU motivo da impossibilidade + passos validação humana".
   Se template não existe, criar baseado em
   `_TEMPLATE-SAVE-FEATURE.md`.

3. **Audit retroativo** (escopo desta sprint):
   - Listar todas as sprints abertas (Bloco H, I, I2, J, K, L, N).
   - Confirmar que cada spec tem §5 cumprida.
   - Se alguma falta, adicionar antes de fechar O1.

## §3 Restrições

- Sprint puramente documental.
- PT-BR sentence case + acentuação completa em VALIDATOR_BRIEF.
- VALIDATOR_BRIEF.md está gitignored (decisão durável dono 2026-05-05) —
  alteração permanece local. Documentar no commit que regra foi
  registrada localmente para sessão atual.

## §4 Verificação

```bash
grep -c "REGRA OBRIGATORIA" VALIDATOR_BRIEF.md   # esperado >= 1
grep -c "Gauntlet ANTES de APK" VALIDATOR_BRIEF.md # esperado >= 1
ls docs/sprints/TEMPLATE-spec.md
```

## §5 Validação

Sprint documental — sem validação Gauntlet/adb.

## §6 Commit

```
docs: o1 gauntlet padrao validation pre-apk regra obrigatoria
```

## §7 Decisões

- **Regra como invariante do projeto** (não opcional): historicamente
  cada bypass dessa regra gerou bug que vazou. Tratar como invariante
  evita repetição.
- **Auditoria retroativa nesta sprint**: garante que blocos H–N estão
  conformes antes de O1 desbloquear o build APK.
