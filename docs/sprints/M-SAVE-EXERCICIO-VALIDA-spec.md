# Sprint I-EXERCICIO — M-SAVE-EXERCICIO-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~2h (inclui copy GIF)
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Crash empírico no APK ao tocar "Criar exercício" (screenshot 466875db
/ 959bd161): `IOException: Destination '/tree/primary:Protocolo-Ouroboros
/assets/exercicios' directory cannot be created`. Confirmação direta
da causa raiz H1 + path antigo (`assets/exercicios/<slug>.gif`) que
muda para `gif/exercicio-<slug>.gif` em H2.

## §2 Tarefa

- **Writer**: `src/lib/vault/exercicios.ts` — `vaultUriJoin`. Path
  `markdown/exercicio-slug.md`. Schema `exercicio.ts`: `nome`, `nivel`,
  `equipamento`, `instrucao`, `dicas[]`, `gif_path` (opcional).
- **Copy GIF**: se usuário escolheu GIF demonstrativo, copia para
  `gif/exercicio-slug.gif` via `copyAsync` com `vaultUriJoin`.
- **Caller**: `app/exercicios/novo.tsx` — try/catch+timeout. GIF
  picker com max 5MB.
- **Tests**: `tests/lib/vault/exercicios.test.ts` — com/sem GIF,
  dicas múltiplas, slug collision.
- **E2E**: `tests/e2e/playwright/m-save-exercicio.e2e.ts`.
- **Screenshots**: `A-exercicio-com-gif.png`, `A-exercicio-sem-gif.png`.

## §5 Validação adb

Reprodução do screenshot empírico:

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding + Saúde Física → Exercícios → Novo.
# Nivel: Iniciante. Equipamento: Tríceps Rosca. Instrução: Sobe e desce.
# Dica: Costinha Lisa.
# GIF: escolher do filesystem (~325KB).
# Salvar.
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/gif/exercicio-*.gif
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/exercicio-triceps-rosca.md
# Esperado: SEM crash.
```

## §6 Commit

```
feat: i-exercicio save exercicio valida fix screenshot 466875db
```

## §7 Decisões

- **GIF max 5MB**: validação pré-copy evita storage estourar.
- **Repro test obrigatório**: "Tríceps Rosca" + dica "Costinha Lisa"
  (idêntico ao screenshot empírico).
