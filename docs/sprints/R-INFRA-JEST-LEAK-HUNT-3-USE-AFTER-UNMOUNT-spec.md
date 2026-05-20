# R-INFRA-JEST-LEAK-HUNT-3 — Fix use-after-unmount em SecaoBackupAutomatico

**Tipo**: bug fix
**Prioridade**: P2-medium
**Estimativa**: 30-45min
**Fase**: 3 (continuação de R-INFRA-JEST-LEAK-HUNT fase 2)
**Origem**: achado colateral de R-INFRA-JEST-LEAK-HUNT (executor reportou em 2026-05-20). Fase 2 do hunt fechou 2 leaks (Toast + escreverEstado) mas 10/10 não atingido — 1 suite timeout aleatória persiste.

## Problema

`src/components/settings/SecaoBackupAutomatico.tsx:71-88`:

```tsx
const recarregar = useCallback(async () => {
  const [ms, lista] = await Promise.all([
    lerUltimoBackupMs(),
    listarBackupsArquivados(),
  ]);
  setUltimoMs(ms);        // ← unconditionally set state, even após unmount
  setBackups(lista);      // ← idem
}, []);

useEffect(() => {
  let cancelado = false;
  void recarregar().then(() => {
    if (cancelado) return;  // ← check is useless: state já foi setado dentro de recarregar
  });
  return () => { cancelado = true; };
}, [ativo, recarregar]);
```

A flag `cancelado` é checada no `.then()` AFTER `recarregar` já fez `setState`. Bug clássico de use-after-unmount. Em runtime visível, raro (settings tab fica viva). Em testes Jest com mount/unmount rápido, dispara warning + handle leak.

Sintoma:
```
An update to SecaoBackupAutomatico inside a test was not wrapped in act(...)
```

## Solução

Usar `mountedRef` (`useRef(true)`) e checar dentro de `recarregar` antes de cada `setState`. Preserva semântica de `recarregar` ser awaitável (usado em `fazerBackupAgora:102`).

```tsx
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

const recarregar = useCallback(async () => {
  const [ms, lista] = await Promise.all([
    lerUltimoBackupMs(),
    listarBackupsArquivados(),
  ]);
  if (!mountedRef.current) return;
  setUltimoMs(ms);
  setBackups(lista);
}, []);

useEffect(() => {
  void recarregar();
}, [ativo, recarregar]);
```

Note: o `useEffect` que rastreia mount fica separado e roda 1x. O `useEffect` que dispara `recarregar` simplifica (sem cancelado flag dummy).

## Auditoria colateral (mesma pattern em outros arquivos)

Antes de fechar, rodar:

```bash
rg -n "let cancelado = false;" --type tsx --type ts -A 8 src/
```

Se houver outros `useEffect` com flag `cancelado` que check só no `.then()`, listar e:
- Fix se ≤2 ocorrências (escopo dessa sprint)
- Dispatch nova sprint se >2 (anti-débito)

## OFF-LIMITS

**Pode tocar**: `src/components/settings/SecaoBackupAutomatico.tsx`. Se auditoria colateral revelar outros casos ≤2, pode tocar esses arquivos também.

**Não pode tocar**: stores, schemas, vault lib, hooks de domínio, qualquer arquivo fora do pattern use-after-unmount.

## Verificação canônica

```bash
./scripts/smoke.sh
# Critério: 1 suite timeout aleatória deixa de aparecer (ou cai pra <50% dos runs)
for i in {1..5}; do
  npm test --silent 2>&1 | grep -E "Test Suites:" | tail -1
done
```

## Proof-of-work

1. Diff de `SecaoBackupAutomatico.tsx`.
2. Lista de outros arquivos auditados (mesmo pattern), com fix ou justificativa para abrir nova sprint.
3. Resultado dos 5 runs do smoke (ideal: 5/5 verde; aceitável: 1/5 ou menos com flake).
4. Hash commit.
5. Path do worktree.

## Contexto adicional (importante)

**Orquestrador tem 7 commits queued aguardando push.** Pre-push smoke
falha por flake JEST. Esta sprint é o gating crítico pra destravar.
Se 5/5 verde, orquestrador empacota tudo no push. Se 0/5 ainda
falha, orquestrador documenta e abre sprint follow-up.
