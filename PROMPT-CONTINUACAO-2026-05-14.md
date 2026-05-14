# Prompt de continuação — Maestro Ouroboros (2026-05-14)

> Sessão de validação live integrada do `v1.0.0-alpha-11`. Se passar
> todo o checklist, **v1.0 está pronta pra release**.

---

## Identidade

Você é o **validador/orquestrador final** do **Protocolo-Mob-Ouroboros**
(app Android React Native/Expo SDK 54, **pré v1.0.0** entrando em
release final). Modo maratona contínuo desde 2026-05-11.

Esta sessão segue de uma maratona ~10h (madrugada 2026-05-13 →
madrugada 2026-05-14) que fechou Q22 inteiro + Q24.a + Q24.b MVP
em 6 alpha-builds consecutivos.

## Diretório raiz e estado atual

- Working dir: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros`
- Branch: `main` (sincronizada com `origin/main`)
- **HEAD: `ea10ce8`** (feat: q24.b modo memorias mvp - toggle 3-modos
  + slideshow wrapped)
- **Alpha publicado mais recente: `v1.0.0-alpha-11`** instalado no
  Xiaomi 2312DRAABG via `pm install -r` (vault preservado, signature
  EAS canônica)
- Métricas baseline: 195 suítes Jest / 1932 testes verde / TS strict 0 /
  drift contract 174 campos auditados

## Acessos

- **ADB livre** no Xiaomi 2312DRAABG HyperOS via USB (serial
  `carsvg7du8kfnrlj`). Tela ligada via
  `adb shell svc power stayon usb`.
- **Sudo** disponível — pede ao dono se precisar (senha sob demanda).
- **gh CLI**: autenticado em 3 contas; **AndreBFarias** é admin do repo
  e foi o ativo durante a sessão anterior. Confirmar via
  `gh auth status` e fazer `gh auth switch -u AndreBFarias` se outra
  conta estiver ativa.
- **Playwright/Chrome MCP**: deferred, carregar via ToolSearch quando
  precisar.
- **GitHub Actions**: workflow `.github/workflows/build-android-apk.yml`
  funcional com keystore EAS via 4 secrets (Q17.e).

## CHECKLIST DE VALIDAÇÃO LIVE — primeira ação ao retomar

Dono volta pra fazer manualmente os 4 testes integrados no alpha-11.
**Você (validador) acompanha via adb + logcat + screencap**, mas as
decisões de Permitir/Aceitar são do dono.

### Test 1: OAuth Google (Q22.B — 4ª camada de fix)

1. Drawer (FAB roxo, canto inferior esquerdo) → **Agenda**
2. Tap em **Conectar conta Google**
3. **Esperado**: Chrome custom tab abre em `accounts.google.com` →
   tela "Escolha uma conta" → **André Batista** → consent screen
   com permissão Calendar → **Permitir** → browser FECHA
   AUTOMATICAMENTE → volta pro app → Agenda mostra próximos 30 dias
4. **Critério de PASS**: browser fechou sozinho + Agenda carrega.
5. **Critério de FAIL**: "Unmatched Route" do expo-router ou erro 400
   do Google. Print + logcat → causa nova → spec novo fix.

### Test 2: Share intent Pix (Q22.G)

1. Abrir Nubank/Itaú/Inter no celular
2. Selecionar um PIX teste (R$ 0,01) ou comprovante recente
3. Compartilhar → escolher **Ouroboros** no sheet do Android
4. **Esperado**: Ouroboros abre direto na tela "Salvar arquivo no
   Vault" com o PDF/imagem pré-carregado em preview.
5. **Critério de PASS**: tela `/share-receive` abre com payload.
6. **Critério de FAIL**: app abre na Home (igual antes do fix).

### Test 3: Recap navegável (Q24.a)

1. Drawer → **Recap** (item Acesso Rápido)
2. Período "Semana" (default) já carregou
3. Scroll até o grid 2×3 **Números**
4. Tap em qualquer card (ex: "Registros 23")
5. **Esperado**: nova tela `/recap-lista` com lista de items
   individuais filtrados por tipo
6. Tap em qualquer item → abre tela de edição da feature original
7. **Critério de PASS**: cards são tappables + edição abre.

### Test 4: Recap Memórias (Q24.b MVP)

1. Drawer → Recap
2. No header, toggle 3-pills: **Lista / Calendário / Memórias**
3. Tap em **Memórias** (3ª pill, nova)
4. **Esperado**: slideshow full-screen abre com fundo gradient
   animado roxo→magenta→cyan, dourado pálido nos números, frases
   sóbrias
5. 5 slides em sequência: "Olhe o que ficou" → números → vitórias
   → triggers → "Continue."
6. Auto-advance 5s/slide; tap direita acelera; tap esquerda volta;
   X canto superior direito fecha
7. **Critério de PASS**: slideshow anima e gestos funcionam.

## Se TUDO passar

**v1.0 está pronta pra release**. Próximos passos do dono:

1. Tag `v1.0.0` final (sem `-alpha-N`)
2. Atualizar README + screenshots
3. Plano de distribuição (uso pessoal, sem Play Store conforme ADR)
4. Backup do keystore EAS em local seguro fora do git
5. Comemorar (mas sóbrio, ADR-0005)

## Se ALGO falhar

Cada fail vira spec Q22.H+ ou Q24.x. Processo:

1. Print + logcat capturado
2. Causa raiz identificada (eu investigo)
3. Spec criada em `docs/sprints/`
4. Fix aplicado em commit cirúrgico
5. Novo alpha (alpha-12) disparado via `gh workflow run`
6. Retest do item específico

## Pendências NÃO bloqueantes pra v1.0

Polimento e features v1.1+ que ficam pra próxima fase:

- **Q24.b.a** ambient audio file `.mp3` + playback expo-av no slideshow
- **Q24.b.b** Ken Burns nas fotos do diário/marco em slides Memórias
- **Q24.b.c** export memória como PNG stories IG via `react-native-view-shot`
- **Q24.a.b** rota `/treinos/[slug]/detalhe` (atualmente só executor)
- **Q24.a.c** rota `/eventos/[slug]` (atualmente edição via galeria)
- Backlog antigo M* (auditoria pendente — vários "fantasmas" no ROADMAP)

## Regras invioláveis

Mesmas do CLAUDE.md (cópia em docs/CONTEXTO.md §5):

- **Anonimato absoluto** (Regra −1): zero "Claude", "AI", "feito por",
  nomes reais em `src/`/`app/`/commits. Marker `// anonimato-allow: <razao>`
  por linha quando termo (Marco, Vitória) é categoria do projeto, não nome.
- **Identidade**: `pessoa_a` / `pessoa_b` / `ambos` em código. Cores
  fixas (`pessoa_a` → `--purple #bd93f9`, `pessoa_b` → `--pink #ff79c6`).
  Nomes reais só em SecureStore runtime (onboarding).
- **Linguagem**:
  - Código (variáveis/funções): inglês camelCase
  - Comentários: PT-BR **sem acento** (convenção shell/CI)
  - UI: PT-BR **com acento completo** sentence case
  - Commit messages: PT-BR lowercase **sem acento**
  - Docs `.md`: PT-BR com acento
- **Workflow git**:
  - `feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `style:` /
    `perf:` / `test:` / `ci:`
  - Push automático autorizado pra `main` ao final de cada sprint
    validada (smoke verde)
  - Nunca `--amend` em commit já pushed
  - Nunca `--no-verify` sem permissão explícita
- **Tom**: zero emojis, zero exclamação em feedback, zero gamificação,
  zero comparativos negativos.
- **Validação visual**: Gauntlet (Nível A+) via playwright MCP em
  `/_dev/gauntlet` é OBRIGATÓRIO para sprints novas que tocam UI
  (decisão durável 2026-05-04, VALIDATOR_BRIEF.md §1.9). Live no
  celular real (Nível C) é OBRIGATÓRIO pré-release.

## Comandos canônicos

```bash
./scripts/smoke.sh                          # smoke completo
npx tsc --noEmit                            # typecheck
npx jest --silent                           # 1932 testes
npx eslint app/ src/                        # lint
python3 scripts/check_strings_ui_ptbr.py    # acentuação UI
./scripts/check_anonimato.sh                # regra anonimato
./scripts/test_contract_drift.sh            # drift Mobile <-> Backend
gh workflow run build-android-apk.yml       # build APK no CI
gh run list --workflow=build-android-apk.yml --limit 3
adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png /tmp/
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/
adb logcat -d --pid=$(adb shell pidof com.ouroboros.mobile) | grep -iE "fatal|exception"
```

## Protocolo runtime HyperOS

Já documentado em `PROMPT-CONTINUACAO-2026-05-13-TARDE.md`. Tldr:

```bash
adb devices                          # carsvg7du8kfnrlj
adb reverse tcp:8081 tcp:8081
adb shell svc power stayon usb
adb shell am force-stop com.ouroboros.mobile
adb shell am start -n com.ouroboros.mobile/.MainActivity
```

## Memória persistente

`~/.claude/projects/-home-andrefarias-Desenvolvimento-Protocolo-Mob-Ouroboros/memory/MEMORY.md`
tem índice. Arquivos relevantes:

- `feedback_orquestracao.md` — eu planejo/orquestro/valido; agentes só
  executam. Atualizar docs (CHANGELOG, ROADMAP, STATE) a cada sprint.
- `feedback_push_automatico.md` — push automático ao final de sprint
  validada, sem confirmar.
- `feedback_controle_total_chrome.md` — autorizado a usar mouse/teclado
  livremente em browser pra validar.
- `feedback_validacao_celular_real.md` — bugs OEM (HyperOS) e New Arch
  só aparecem em runtime; sempre dev-client antes de APK preview.
- `feedback_persistencia_solucoes.md` — quando dono conectou ferramenta
  (ADB, OAuth, sudo), não propor pausa; janela aberta.

## Resumo da sessão anterior (referência)

Maratona ~10h fechou Q22 inteiro + Q24.a + Q24.b MVP. 6 alphas:

| alpha | commit | conteúdo |
|---|---|---|
| 6 | `3aef8e7` | baseline keystore EAS via Q17.e |
| 7 | `358c957` | Q22.C (crash treino) + Q22.D (FAB) + Q22.E (drawer) + Q22.F (HC empty) |
| 8 | `fabab93` | Q22.B client tipo iOS (`tl2edd...`) |
| 9 | `d8e594a` | Q22.B redirect reverso-DNS |
| 10 | `c2495b4` | Q22.B `maybeCompleteAuthSession` |
| **11** | **`ea10ce8`** | **consolidado Q22.B + Q22.G + Q24.a + Q24.b MVP** |

OAuth foi 4 causas raiz em camadas (SHA-1 typo → client tipo Android →
redirect URI formato → maybeCompleteAuthSession). Cada fail produziu
fix cirúrgico e novo alpha. Última versão alpha-11 chegou até "Escolha
uma conta" no consent Google via adb retest; faltou apenas confirmar
o fechamento do browser pós-Permitir (precisa interação real).

Boa retomada.
