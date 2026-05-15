# AUDIT-T1B7-DRAFT-EXPORT-FIX — Achados colaterais de T1B6

> Sprint anti-débito derivada dos achados COLAT-T1B6-A e COLAT-T1B6-B
> reportados pelo executor T1B6 (2026-05-15). Severidade combinada: MÉDIA.

## 1. Objetivo

Cobrir 2 listadores periféricos do vault que ficaram fora do escopo
de T1B6 mas têm a mesma classe de bug (perpetuação de
`.sync-conflict-*`):

### COLAT-T1B6-A — Migration de drafts M11

**Arquivo**: `src/lib/treinos/migrarDraftsParaTreinoSessao.ts:76`

Boot hook único na vida do app (M11) que lista
`treinos/draft/<YYYY-MM-DD>-<slug>.md` via `listVaultFolder` sem
filtro. Em caso de conflito Syncthing num draft, perpetua o conflito
ou gera `TreinoSessao` espelho a partir do conteúdo do `.sync-conflict-*`.

Severidade: BAIXA (caminho de baixíssimo tráfego pós-M13).

### COLAT-T1B6-B — Export ZIP do vault

**Arquivo**: `src/lib/services/exportarVault.ts` (`listarRecursivo()`
linha ~133)

ZIP de export inclui TODOS os filhos do vault, incluindo
`.sync-conflict-*`. Ao ser restaurado num device limpo, perpetua o
conflito.

Severidade: MÉDIA. Decisão de design pendente:

- **Opção A**: filtrar `.sync-conflict-*` do ZIP (consistente com
  migration/listadores de T1B6).
- **Opção B**: preservar (permite reconciliação manual num restore).

**Decisão tomada** (registrada aqui antes da execução): **Opção A**.
Razão: consistência com a doutrina T1B6 (vault entrega "vista limpa"
para a app). Quem precisar dos `.sync-conflict-*` pode acessar pelo
filesystem nativo (Obsidian/explorer), que é o lugar canônico de
reconciliação manual.

## 2. Entregáveis

1. **`src/lib/treinos/migrarDraftsParaTreinoSessao.ts`**: importar
   `ehSyncConflict` + `if (ehSyncConflict(draftUri)) continue;` antes
   do parse na linha 82.
2. **`src/lib/services/exportarVault.ts`** (`listarRecursivo` ~133):
   filtrar `.sync-conflict-*` da listagem antes de adicionar ao ZIP.

## 3. OFF-LIMITS

Mesma lista de T1.

## 4. Testes

- `tests/lib/treinos/migrarDrafts-syncConflict.test.ts`: cobertura
  do skip.
- `tests/lib/services/exportarVault-syncConflict.test.ts`: assert
  que ZIP gerado não contém `.sync-conflict-*`.

## 5. Verificação

```bash
./scripts/smoke.sh                 # ≥1992 testes (2 novos)
```

## 6. Commit (único)

```
fix: t1b7-draft-export filtro sync-conflict em drafts migration e export zip
```

## 7. Decisões tomadas

- **Opção A** em COLAT-B (consistência com doutrina T1B6).
- **Sprint única** para os 2 achados porque o pattern de fix é
  idêntico e o esforço é trivial.
