# R-CROSS-FLOW-FIX-3 — Scanner gera 2 entradas na galeria

**Tipo**: bug UX
**Prioridade**: P2-medium
**Estimativa**: 1h
**Tranche**: R-CROSS-FLOW (derivada de R-CROSS-FLOW-AUDIT)
**Fase**: 2

## Fonte canônica

Auditoria `docs/auditoria-cross-flow-2026-05-16/RELATORIO.md`
cenário 4. `saveNota` (sprint I-SCANNER) cria 3 arquivos por
escaneamento:

1. `<ext>/scanner-<slug>.<ext>` — binário (jpg/pdf)
2. `markdown/scanner-<slug>.md` — companion midia (tipo
   `midia_foto` ou `midia_pdf`)
3. `markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md` — md semântico
   (FinanceiroNotaSchema)

`listarItensGaleria` em `src/lib/vault/galeria.ts` lê ambos `nota-`
e `scanner-` como tipos canônicos distintos:

```ts
const PREFIX_POR_TIPO: Record<TipoGaleria, string> = {
  // ...
  nota: 'nota-',     // FinanceiroNotaSchema
  scanner: 'scanner-', // MidiaCompanionSchema
};
```

Resultado: **cada nota fiscal escaneada aparece 2 vezes na galeria**
— uma como "Nota" (subtítulo "categoria"), outra como "Documento"
(legenda "Nota fiscal — ..."). Usuário vê duplicidade confusa.

## Solução

**Opção A (preferida)**: filtrar entradas `scanner-` quando existe
um `nota-` com mesmo slug no mesmo dia. Em `listarItensGaleria`,
construir um Set de slugs `nota-<YYYY-MM-DD>-<slug>` e pular
`scanner-` que case com a tupla `(data, slug)` de uma nota.

**Opção B**: não escrever `markdown/scanner-<slug>.md` em
`saveNota` quando a captura vem do fluxo de scanner (companion já
não é usado em lugar nenhum para esse caso — wikilink + md
semântico bastam). Mais invasivo (toca writer).

## Aceitação

- 1 escaneamento → 1 entrada na galeria com tipo='nota'.
- Galeria filtrada por 'documentos' (aba "Texto") mostra a nota
  semântica.
- Galeria filtrada por 'foto' não mostra a nota (não é foto solta).
- Teste novo: cria nota via saveNota, lista galeria, asserta length=1.

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/lib/vault/galeria.ts` (filtro),
opcionalmente `src/lib/scanner/saveNota.ts` (opção B).

## Verificação canônica

```bash
./scripts/smoke.sh
npx jest tests/lib/vault/galeria.test.ts
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Teste novo cobrindo deduplicação nota↔scanner.
3. Saída `npx jest --silent | tail -5`.
4. Saída `./scripts/smoke.sh`.
5. **Hash do commit (OBRIGATÓRIO)**.
6. Path do worktree + branch.
7. Achados colaterais.
