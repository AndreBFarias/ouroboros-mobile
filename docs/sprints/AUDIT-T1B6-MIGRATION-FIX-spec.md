# AUDIT-T1B6-MIGRATION-FIX — Migration não pode perpetuar sync-conflict

> Sprint anti-débito derivada do achado colateral do executor T1
> (2026-05-15). Severidade: **ALTA** — afeta usuários que migrarem
> de layout legado com conflitos Syncthing pendentes.

## 1. Objetivo

Aplicar filtro `ehSyncConflict()` (introduzido em B6, commit `0d95b9a`)
em **5 lugares adicionais** que iteram filesystem do vault e ficaram
fora do escopo de T1. O caso crítico é o **boot migration**
`src/lib/boot/migrarVaultLayoutPorTipo.ts` — se ele encontrar
`humor-2026-05-06.sync-conflict-XYZ.md` no layout legado `daily/`,
hoje migra esse arquivo para `markdown/humor-2026-05-06.sync-conflict-XYZ.md`
e **perpetua o conflito** no layout-por-tipo.

## 2. Entregáveis

Para cada arquivo abaixo, importar `ehSyncConflict` de
`@/lib/vault/syncConflict` e filtrar os arquivos retornados:

1. **`src/lib/boot/migrarVaultLayoutPorTipo.ts`** (CRÍTICO)
   - Linhas 67 e 76 (`readDirectoryAsync`)
   - Não migrar arquivos com `.sync-conflict-*` no nome
2. **`src/lib/hooks/useFotosAgregadas.ts`**
   - 4 chamadas `listVaultFolder` (`.md`, `.jpg`, `.jpeg`, `.png`)
3. **`src/lib/marcos/marcosAuto.ts:193`**
   - Boot hook de auto-detecção
4. **`src/lib/hooks/useStatusCasal.ts`** (linhas 66, 73)
   - Listagem recursiva por subpastas
5. **`src/lib/conquistas/loader.ts`**
   - Leitor de conquistas

## 3. OFF-LIMITS

Mesma lista de `AUDIT-T1-BUGS-spec.md` (eu cuido de
ROADMAP/CHANGELOG/STATE).

## 4. Procedimento

1. Importar `ehSyncConflict` no topo de cada arquivo.
2. Adicionar `.filter((n) => !ehSyncConflict(n))` após cada listagem.
3. Em `migrarVaultLayoutPorTipo.ts`, antes de tentar mover arquivo,
   pular se nome casa `ehSyncConflict`.
4. Adicionar 1 teste por arquivo cobrindo o filtro.

## 5. Verificação

```bash
./scripts/smoke.sh                 # 202 suítes / >= 1962 testes
```

## 6. Commit

```
fix: t1b6-migration filtro sync-conflict em 5 listadores periferico
```

## 7. Decisões tomadas

- **Migration CRÍTICA**: roda 1× por usuário no upgrade para
  layout-por-tipo. Se perpetua conflito, B6 fica parcialmente entregue.
- **Filtro defensivo, não destrutivo**: arquivos `.sync-conflict-*`
  ficam no vault (Syncthing/Obsidian podem reconciliar manualmente);
  app apenas não os exibe nem migra.
