# R-FAB-2 — M-FAB-CAMERA-REPENSAR

**Tipo**: refactor
**Prioridade**: P2-medium
**Estimativa**: 1.5-2h
**Tranche**: R-FAB
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-FAB → R-FAB-2.

FAB Câmera → sheet com 2 opções:
- **"Reflexão com foto"** (renomeado de "Registrar Momento"): câmera → captura → navega para `/diario` ou `/reflexao` com foto pré-anexada em-memória.
- **"Escanear documento"**: fluxo Q9/M09 mantido.

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: R0 (lexical Reflexão)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/chrome/MenuCapturaVerde*.tsx`, sheet de escolha, rota `/captura`.

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. E2E: captura foto → navega para Reflexão com foto pré-anexada → salvar persiste foto + companion `.md`.
7. Achados colaterais.
