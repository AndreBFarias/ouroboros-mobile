# Sprint M-VAULT-MD-FIX-diario-audio — Áudio do diário em `media/audios/`

```
DEPENDE:    M-VAULT-MD-AUDIT (relatório identificou)
BLOQUEIA:   M39 (mídia companion oficial assume estrutura correta)
ESTIMATIVA: 1-2h
PRIORIDADE: alta
```

## 1. Achado

Auditoria 2026-05-04 (`docs/auditoria-vault-2026-05-04/RELATORIO.md`)
revelou: áudio gravado pelo Diário Emocional (M06.5) salva em
`assets/<id>.m4a`, mas o canônico é `media/audios/<basename>.m4a`
+ `media/audios/<basename>.md` companion (conforme M34/M39).

`assets/` não está nas 19 subpastas canônicas. Áudios ali ficam
órfãos do Vault Obsidian, sem companion, sem ser localizáveis pelo
script `check_vault_estrutura.sh`.

## 2. Tarefa

Migrar caminho de gravação:
- `src/lib/diario/recordAudio.ts` (e/ou consumidores em
  `app/diario-emocional.tsx`) escreve em `media/audios/`.
- Companion `.md` criado junto via `stringifyCompanionMidia` de
  `src/lib/midia/companion.ts`.
- Backward-compat: arquivos existentes em `assets/` continuam
  legíveis (não removemos), só novos vão pro lugar certo.

## 3. Verificação

- E2E `tests/e2e/playwright/m-vault-md-fix-diario-audio.e2e.ts`:
  grava 1 áudio mock → confirma binário em `media/audios/` +
  companion `.md` 1:1.
- Smoke verde, hook PT-BR + Gauntlet leak.
