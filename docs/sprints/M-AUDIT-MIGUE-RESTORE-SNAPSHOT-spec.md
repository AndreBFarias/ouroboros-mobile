# Sprint S3 — M-AUDIT-MIGUE-RESTORE-SNAPSHOT

```
DEPENDE:    HEAD em 9c385b3
BLOQUEIA:   APK preview (saneamento débito A5 M-EXPORT-COMPLETO)
ESTIMATIVA: ~3h
STATUS:     [todo]
```

## 1. Objetivo

Implementar `aplicarSnapshot()` em `src/lib/services/restaurarVault.ts:14`
para que o restore de backup ZIP **também** restaure `useSettings` +
`useOnboarding` + `usePessoa` a partir do `snapshot-settings.json`
incluído pelo export. Fecha o débito declarado em comentário "Por ora
a entrega A5 grava o..." e torna o restore simétrico ao export.

## 2. Entregáveis

### Arquivos modificados

- `src/lib/services/restaurarVault.ts` — implementar `aplicarSnapshot(snap: SnapshotSettings)`:
  popula `useSettings.setState`, `useOnboarding.setState`, `usePessoa.setState`
  com os valores do snapshot. Remove o comentário "(futuro)".
- `src/lib/services/exportarVault.ts` — confirmar que o `snapshot-settings.json`
  serializa todos os campos relevantes (somVibracao, sexoDeclarado, etc.).
- `tests/lib/services/restaurarVault.test.ts` — caso "restore com
  snapshot-settings.json restaura stores".

### Arquivos novos

- `tests/lib/services/snapshot-symmetry.test.ts` — proof: `export` →
  `import` → `useSettings.getState()` casa byte-a-byte.

## 3. APIs reutilizáveis

- `src/lib/stores/settings.ts`, `src/lib/stores/onboarding.ts`,
  `src/lib/stores/pessoa.ts` — `setState` action canônica.
- `src/lib/services/exportarVault.ts` — schema de `snapshot-settings.json`.

## 4. Restrições

Padrão. Restore confirma versão do schema (`EXPORT_SCHEMA_VERSION = 1`)
antes de aplicar. Versão diferente → toast erro, não tenta migrar.

## 5. Validação

**Gauntlet:**
1. `__gauntlet.seed()`, alterar settings (toggle vibração off, mudar nome).
2. Exportar via Settings → "Exportar todos os meus dados".
3. Resetar (`__gauntlet.reset()`).
4. Importar o ZIP — confirmar que toggles e nomes voltam.

PNGs em `docs/sprints/M-AUDIT-MIGUE-RESTORE-SNAPSHOT-screenshots-gauntlet/`.

## 6. Procedimento

1. Ler `restaurarVault.ts` linha 14+ para entender contrato.
2. Implementar `aplicarSnapshot(snap)`.
3. Validar schema versão.
4. Testes simetria.

## 7. Verificação

Smoke + tsc + testes + E2E (se aplicável).

## 8. Commit

```
fix: m-audit-migue-restore-snapshot aplica snapshot-settings no restore
```

## 9. Checkpoint visual

PNGs do fluxo export → reset → import → settings voltam.

### Checklist

- [ ] `STATE.md` atualizado.
- [ ] `CHANGELOG.md` atualizado.
- [ ] Comentário `(futuro)` em `restaurarVault.ts:14` removido.

## 10. Dúvidas em aberto

Confirmar com dono se restore deve **sobrescrever** stores existentes ou
**mesclar** (atual export grava em `restaurado-<DATA>/` arquivo files;
para snapshot, default deve ser sobrescrever — mas deve perguntar ao usuário).
Decisão pendente até execução.
