# Sprint G2 — I-DIARIO-REFLEXAO

```
DEPENDE:    HEAD em 9c385b3 + I-DIARIO fechada (72e2cf6)
BLOQUEIA:   APK preview (modo Reflexão é feature canônica)
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

## 1. Objetivo

Adicionar o **modo "Reflexão"** ao Diário Emocional. Atualmente
`/diario-emocional` mostra apenas 2 modos (Trigger / Vitória). Spec
FEATURES-CANONICAS §2.2 manda 3 (Trigger / Vitória / Reflexão).
Auditoria visual 2026-05-08 confirmou ausência.

## 2. Entregáveis

### Arquivos modificados

- `src/lib/schemas/diario-emocional.ts` — `DiarioEmocionalModoSchema`
  ganha literal `'reflexao'` no union.
- `app/diario-emocional.tsx` — chip "Reflexão" no `<ChipGroup>` de modos.
- `src/lib/diario/saveDiario.ts` — branch para modo `reflexao` (mesma
  estrutura, sem polaridade trigger/vitoria; campos contexto opcional).
- `src/components/diario/SheetDiarioEmocional.tsx` (ou similar) —
  exibir tags emoções apropriadas para modo Reflexão (ex: pensativo,
  curioso, gratidão, surpresa, contemplação).

### Arquivos novos

- `tests/lib/schemas/diario-emocional-reflexao.test.ts`.
- `tests/e2e/playwright/m-save-diario-reflexao.e2e.ts`.

## 3. APIs reutilizáveis

- `src/lib/diario/saveDiario.ts` (timeout + try/catch padrão Bloco I).
- `src/lib/vault/paths.ts` (`vaultUriJoin`).

## 4. Restrições

Padrão. Modo "Reflexão" não tem polaridade (não é trigger, não é
vitória) — não conta para crises nem conquistas no Recap.

## 5. Validação

**Gauntlet:**
1. Abrir `/diario-emocional`.
2. Conferir 3 chips (Trigger / Vitória / Reflexão).
3. Selecionar Reflexão, preencher, salvar.
4. PNG em `docs/sprints/I-DIARIO-REFLEXAO-screenshots-gauntlet/`.
5. Conferir no mock vault: arquivo `markdown/diario-YYYY-MM-DD-HHmm-<slug>.md`
   com `modo: reflexao`.

## 6. Procedimento

1. Estender schema zod.
2. Atualizar UI.
3. Atualizar `saveDiario` se modo afeta path/serialização.
4. Testes + E2E.

## 7. Verificação

Smoke + tsc + testes + E2E.

## 8. Commit

```
feat: i-diario-reflexao terceiro modo + chips emocoes contemplativas
```

## 9. Checkpoint visual

PNGs Gauntlet do fluxo Reflexão.

### Checklist

- [ ] `STATE.md`, `ROADMAP.md`, `CHANGELOG.md`, `FEATURES-CANONICAS.md` §2.2.

## 10. Dúvidas em aberto

Set de tags emoções para Reflexão — confirmar com dono. Proposta:
`pensativo / curioso / gratidão / surpresa / contemplação / aceitação`.
