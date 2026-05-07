# Sprint I-TAREFA — M-SAVE-TAREFA-VALIDA

```
DEPENDE:    H1, H2, H3, I-ALARME (companion alarme se vinculado)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Crash empírico no APK ao tocar "Salvar" em "Nova tarefa" (screenshot
6461cd48 / 68ba13d2): `Invalid URI`. Confirmação direta da causa raiz
H1.

## §2 Tarefa

- **Writer**: `src/lib/vault/tarefas.ts` — `vaultUriJoin`. Path
  `markdown/tarefa-slug.md`. Schema `tarefa.ts` v2 (M31): `titulo`,
  `categoria`, `pessoa_destino`, `alarme` (slug companion opcional),
  `concluida` (default false), `data_concluida`.
- **Caller**: `app/tarefas/novo.tsx` ou `SheetNovaTarefa.tsx` — try/catch+timeout.
- **Tests**: `tests/lib/vault/tarefas.test.ts` — com/sem alarme companion,
  com pessoa_destino casal.
- **E2E**: `tests/e2e/playwright/m-save-tarefa.e2e.ts`.
- **Screenshots**: `A-tarefa-salva.png`.

## §5 Validação adb

Reprodução do screenshot empírico:

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding + tarefas → Nova → título "Limpar gatos" + categoria Saúde.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/tarefa-limpar-gatos.md
# Esperado: arquivo válido, frontmatter com `categoria: saude`,
# `pessoa_destino: ...`. SEM crash.
```

## §6 Commit

```
feat: i-tarefa save tarefa valida fix screenshot 6461cd48
```

## §7 Decisões

- **Repro test obrigatório**: "Limpar gatos" + categoria Saúde
  (idêntico ao screenshot empírico). Garante que o bug específico
  reportado está fixado.
