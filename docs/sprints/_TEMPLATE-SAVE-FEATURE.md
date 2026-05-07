# TEMPLATE — Sprint de save resilient por feature (Bloco I)

> Este é o template canônico para todas as 15 sprints `M-SAVE-<FEATURE>-VALIDA`
> do Bloco I do plano `tem-muita-coisa-zoada-golden-zebra`. Cada sprint
> instancia este padrão para uma feature específica.

```
DEPENDE:    H1 (vaultUriJoin), H2 (layout por tipo), H3 (pasta escolhida)
            + dependências específicas da feature (ex: I-CICLO depende J1)
BLOQUEIA:   [BUILD APK PREVIEW v1.0.0-beta]
ESTIMATIVA: ~1-2h (variável por feature)
PRIORIDADE: ALTA (cada feature deve persistir corretamente)
STATUS:     [todo]
```

## §1 Achado / motivação

Field test do APK `v1.0.0-alpha` mostrou que a feature `<FEATURE>` não
persiste no Vault em runtime real. Causa raiz parcial é URI corrupta
(coberto por H1) + layout antigo (coberto por H2) + hardcode de pasta
(coberto por H3). Esta sprint faz a **validação isolada** da feature
após Bloco H mergeado e adiciona resiliência específica:

- Try/catch + timeout no caller (impede loader infinito).
- Validação E2E Gauntlet com mock vault.
- Validação humana via adb com APK preview.

## §2 Tarefa concreta

1. **Refatorar writer** `<WRITER_PATH>` para usar `vaultUriJoin(root, rel)`
   em vez de concatenação ad-hoc. Auditar cada uso de `${root}/${rel}` ou
   `${base}${sub}` no arquivo.

2. **Aplicar padrão canônico no caller** `<CALLER_PATH>`:

   ```tsx
   const TIMEOUT_MS = 10_000;

   async function comTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
     return Promise.race([
       p,
       new Promise<T>((_, rej) =>
         setTimeout(() => rej(new Error('timeout salvando')), ms)
       ),
     ]);
   }

   // No handler do botão "Salvar":
   try {
     setLoading(true);
     await comTimeout(salvar<Feature>(input, vaultRoot));
     toast.show('<Feature> salvo.', 'success');
     router.back();
   } catch (e) {
     const msg = e instanceof Error ? e.message : String(e);
     toast.show(`Não foi possível salvar: ${msg}`, 'error');
     // eslint-disable-next-line no-console
     console.error('save <feature> fail', e);
   } finally {
     setLoading(false);
   }
   ```

3. **Adicionar testes Jest** em `<TEST_PATH>` cobrindo:
   - Path final via `vaultUriJoin` é correto (sem trailing space, sem
     %20 ofensivo, sem barras duplas).
   - Save com vaultRoot vazio lança erro claro (não silencioso).
   - Edge cases específicos da feature (listados no spec individual).

4. **Adicionar E2E Gauntlet** em `tests/e2e/playwright/m-save-<feature>.e2e.ts`:
   - Seed via `__gauntlet.seed()` + `__gauntlet.setVaultRoot('web://mock-vault/Test')`.
   - Navegar para rota da feature.
   - Preencher form.
   - Tap "Salvar".
   - Verificar via `__gauntlet.estado()` que arquivo aparece.

5. **PNG screenshot Gauntlet** em `docs/sprints/M-SAVE-<FEATURE>-VALIDA-screenshots/`:
   - `A-<feature>-form.png` (form preenchido)
   - `A-<feature>-salvo.png` (toast sucesso ou tela seguinte)

6. **Validação humana adb** descrita explicitamente no spec individual,
   incluindo path esperado no Vault (`markdown/<feature>-...md` + binário se houver).

## §3 Restrições invioláveis

- Anonimato Regra −1 (sem nomes reais hardcoded).
- PT-BR sentence case + acentuação completa em strings UI (toast etc).
  `accessibilityLabel` sem acento.
- TS strict 0 erros.
- Sem regressão de testes existentes.
- Timeout default 10s. Toast `'Não foi possível salvar: <msg>'` PT-BR.
- Comentários sem acento.

## §4 Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent -- --testPathPattern="<TEST_PATTERN>"
./scripts/smoke.sh
./scripts/check_gauntlet_leak.sh
```

## §5 Validação Gauntlet OU validação humana

**Gauntlet (Nível A)**: descrito em §2.4. PNG `A-<feature>-...png`.

**Validação humana adb (obrigatória)**:

```bash
adb shell pm clear com.ouroboros.mobile  # estado fresh
adb shell am start -W -a android.intent.action.MAIN -n com.ouroboros.mobile/.MainActivity
# Completar onboarding, registrar 1 <feature>, tocar "Salvar".
adb logcat -d -v threadtime | grep -E "ReactNativeJS:|Falha|Error" | tail -20
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/<feature>-*.md | head -30
```

Esperado: arquivo `.md` aparece no path correto, com frontmatter zod
válido. Logcat sem fatais.

## §6 Commit message

```
feat: m-save-<feature>-valida vaultUriJoin + timeout + e2e
```

## §7 Decisões tomadas

- **Timeout 10s default**: SAF write em /sdcard/Documents/ leva <500ms
  em devices saudáveis; 10s cobre OEMs lentos sem frustrar usuário.
- **Toast `'Não foi possível salvar: <msg>'`** em vez de mensagem
  genérica: usuário entende contexto + suporta diagnose.
- **Test E2E + adb separados**: E2E cobre lógica JS isolada, adb
  cobre runtime nativo (SAF, permissões reais).
- **Validação por feature em sprint própria** (em vez de batch único):
  permite testar cada uma isoladamente, identifica edge case específico
  de cada save sem confundir com bugs de outras.
