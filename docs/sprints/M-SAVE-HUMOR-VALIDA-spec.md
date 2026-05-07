# Sprint I-HUMOR — M-SAVE-HUMOR-VALIDA

```
DEPENDE:    H1, H2, H3, I2-AMIGOS (label "Casal"/"Todos")
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Segue padrão `_TEMPLATE-SAVE-FEATURE.md`.

## §1 Achado

Save de humor falha em runtime ("carregando eternamente" no botão
"Salvar humor" em `app/humor-rapido.tsx`). 3 cenários possíveis:
**pra mim** (pessoa_a), **pra outra pessoa** (pessoa_b), **casal/todos**
(`tipoCompanhia: 'casal'` → "Casal", `tipoCompanhia: 'amigos'` → "Todos").

## §2 Tarefa

- **Writer**: `src/lib/humor/saveHumor.ts` — usar `vaultUriJoin`. Path
  novo: `markdown/humor-YYYY-MM-DD.md` (vide H2). Schema `humor.ts`
  inclui campos: `data`, `humor` (numero), `energia`, `ansiedade`,
  `foco`, `autor` ('pessoa_a' | 'pessoa_b' | 'ambos'), `medicacao`,
  `horas_sono`, `tags`.
- **Caller**: `app/humor-rapido.tsx` — aplica try/catch+timeout (vide
  template §2.2). Botão "Salvar humor" desabilitado durante save.
- **Tests**: `tests/lib/humor/saveHumor.test.ts` — 3 cenários `autor`
  (pessoa_a, pessoa_b, ambos) + edge case `vaultRoot` vazio.
- **E2E**: `tests/e2e/playwright/m-save-humor.e2e.ts` — 3 cenários
  via Gauntlet com seed pessoa_a + pessoa_b + casal.
- **Screenshots**:
  - `A-humor-pessoa-a.png`, `A-humor-pessoa-b.png`, `A-humor-casal.png`.

## §3 Restrições

(Padrão template + nada específico.)

## §4 Verificação runtime-real

```bash
npm test --silent -- --testPathPattern="(humor|saveHumor)"
```

## §5 Validação humana adb

```bash
adb shell pm clear com.ouroboros.mobile
# Completar onboarding (Pessoa A: Sam, casal com Pessoa B: Ana).
# Registrar humor pra Sam: humor=4, energia=3, ansiedade=2, foco=4.
# Registrar humor pra Ana: humor=3, energia=2.
# Registrar humor casal: humor=4, todos os campos.
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/markdown/humor-*.md
# Esperado: 3 arquivos (1 por dia/autor — schema permite múltiplas
# entradas no mesmo dia se autor diferente, OU 1 arquivo por dia
# com array de entradas — verificar schema atual).
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/humor-2026-05-06.md
```

## §6 Commit

```
feat: i-humor save humor valida 3 autores vaultUriJoin timeout e2e
```

## §7 Decisões

- **`autor: 'ambos'`** quando `tipoCompanhia==='casal' || 'amigos'`:
  `useNomeDe('ambos')` resolve label dinâmico (vide I2-AMIGOS).
- **1 arquivo por dia/autor OU 1 arquivo agregado**: decisão depende
  de schema atual. Auditar e manter consistente. Default proposto: 1
  arquivo agregado por dia, com array `entradas: [{autor, humor, ...}]`.
