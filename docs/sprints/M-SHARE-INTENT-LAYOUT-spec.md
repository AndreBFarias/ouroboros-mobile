# Sprint G1 — M-SHARE-INTENT-LAYOUT

```
DEPENDE:    H2 fechada (ADR-0023 layout-por-tipo)
BLOQUEIA:   APK preview (vault layout coerente)
ESTIMATIVA: ~2h + 0.5h decisão dono
STATUS:     [todo]
```

## 1. Objetivo

Migrar destino dos arquivos de Share Intent (M08) para o layout-por-tipo
(ADR-0023). Atualmente Share Intent grava em
`inbox/<area>/<subtipo>/<data>-<slug>.md` (legado pré-H2). Spec H2 deixou
explícito "sprint dedicada migra share intent para layout-por-tipo".

**Decisão tomada (2026-05-08): opção B — pasta exceção `inbox/`.**
Justificativa: o conceito "inbox" é triagem temporária (não permanente
como humor/diário/evento); manter pasta dedicada preserva semântica e
evita poluir `markdown/` com arquivos pendentes de classificação. Após
triagem (salvar como evento/diário/conquista), o arquivo é movido para
o destino canônico e removido do `inbox/`. ADR-0024 documenta como
**exceção parcial** ao ADR-0023.

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

1. Criar `docs/ADRs/0024-share-intent-layout-pasta-excecao.md` com o
   contexto, decisão B, alternativa rejeitada A, consequências.
2. Confirmar `src/lib/share/saveShareReceived.ts` continua escrevendo
   em `inbox/<area>/<subtipo>/<data>-<slug>.md` (sem mudança de path).
3. Boot hook em `src/lib/boot/migrarVaultLayoutPorTipo.ts`: garantir que
   `inbox/` é **whitelisted** e NÃO migrado para `markdown/`. Adicionar
   teste de regressão.
4. Adicionar comentário em `src/lib/schemas/inbox-arquivo.ts` referenciando
   ADR-0024.
5. Atualizar `docs/FEATURES-CANONICAS.md` §2.7 ("Share Intent Receiver")
   removendo a nota "(legado pré-H2; sprint dedicada migra share intent
   para layout-por-tipo)" e substituindo por referência a ADR-0024.

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

## 10. Decisão resolvida

**B (pasta exceção `inbox/`).** Conceito "inbox" preserva semântica de
triagem temporária; arquivos saem do `inbox/` quando classificados.
ADR-0024 documenta como exceção parcial ao ADR-0023 layout-por-tipo.
