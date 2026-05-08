# Sprint G1 — M-SHARE-INTENT-LAYOUT

```
DEPENDE:    H2 fechada (ADR-0023 layout-por-tipo)
BLOQUEIA:   APK preview (vault layout coerente)
ESTIMATIVA: ~2h + 0.5h decisão dono
STATUS:     [todo]
```

## 1. Objetivo

Decidir e implementar o destino dos arquivos de Share Intent (M08) no
layout-por-tipo (ADR-0023). Atualmente Share Intent grava em
`inbox/<area>/<subtipo>/<data>-<slug>.md` (legado pré-H2). Spec H2 deixou
explícito "sprint dedicada migra share intent para layout-por-tipo".

**Decisão a tomar com o dono:** A) prefixo no slug
(`markdown/inbox-<subtipo>-<data>-<slug>.md`) ou B) pasta exceção
(manter `inbox/<area>/<subtipo>/`)?

## 2. Entregáveis

### Arquivos modificados (depende decisão)

- `src/lib/share/saveShareReceived.ts` (path canônico de escrita).
- `src/lib/boot/migrarVaultLayoutPorTipo.ts` (boot hook idempotente migra
  arquivos legados de `inbox/` para o destino canônico).
- `src/lib/schemas/inbox-arquivo.ts` (campo `path` reflete escolha).

### Arquivos novos

- `docs/ADRs/0024-share-intent-layout.md` — ADR registrando a decisão.
- `tests/lib/share/saveShareReceived-layout.test.ts` — proof do path canônico.

## 3. APIs reutilizáveis

- `src/lib/vault/paths.ts` (`vaultUriJoin` H1).
- `src/lib/boot/migrarVaultLayoutPorTipo.ts` (padrão de migração idempotente).

## 4. Restrições

Padrão. ADR-0024 referencia ADR-0023 ("estende ou exceção parcial"
conforme decisão).

## 5. Validação

**Decisão dono:** A vs B.
**Gauntlet/Mobile:** simular share intent via deep link
`adb shell am start --action android.intent.action.SEND ...` e conferir
que arquivo cai no path canônico decidido.

## 6. Procedimento

1. Apresentar A vs B ao dono com tradeoffs (A = consistência rígida do
   layout-por-tipo; B = manter rastreabilidade do "inbox" como conceito).
2. Implementar a escolha.
3. Migrar arquivos legados via boot hook.
4. ADR-0024.

## 7. Verificação

Smoke + tsc + testes + ADR.

## 8. Commit

```
feat: m-share-intent-layout adr-0024 + migracao
```

## 9. Checkpoint visual

PNGs do fluxo share intent → arquivo no vault.

### Checklist

- [ ] `STATE.md`, `ROADMAP.md`, `CHANGELOG.md`, `FEATURES-CANONICAS.md`
  §2.7 atualizados.

## 10. Dúvidas em aberto

A vs B. Bloqueador antes de execução.
