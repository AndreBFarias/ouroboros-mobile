# R-MICROFONE-USE-AFTER-UNMOUNT — Use-after-unmount em MicrofoneButton

**Tipo:** fix (use-after-unmount React)
**Prioridade:** P2-medium
**Estimativa:** 1-2h
**Fase:** 3 (Onda 3K, achado colateral de R-INFRA-JEST-LEAK-HUNT-5)
**ADR sugerida:** nenhuma (mesma classe de R-INFRA-JEST-LEAK-HUNT-3 já documentada)

## Contexto

Durante a auditoria do hunt-5, o executor identificou em
`src/components/diario/MicrofoneButton.tsx:122-126` um padrão de
use-after-unmount equivalente ao corrigido em hunt-3
(`SecaoBackupAutomatico`):

```ts
stopAndUnloadAsync().then(() => discardRecording(uri))
```

A `then()` chain executa após `stopAndUnloadAsync()` resolver, mas
não há check se o componente ainda está montado. Se o usuário
fechar o sheet ou navegar enquanto o `stopAndUnloadAsync` está
pending, o callback de `discardRecording` tenta acionar
`setState` num componente já desmontado, gerando warning
"Can't perform a React state update on an unmounted component" ou
pior, mantém referência morta no event loop e contamina o worker
Jest no próximo teste.

## Hipotese técnica

O padrão canônico anti-leak adotado em hunt-3 foi `mountedRef`:

```ts
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

// No callback:
stopAndUnloadAsync().then(() => {
  if (!mountedRef.current) return;
  discardRecording(uri);
});
```

Aplicar mesma técnica em `MicrofoneButton.tsx`.

## Escopo

### A. Investigação obrigatória (grep pré-fix)

```bash
# Confirmar local exato do bug
grep -n "stopAndUnloadAsync\|discardRecording" src/components/diario/MicrofoneButton.tsx
# Confirmar que mountedRef ainda nao existe nesse arquivo
grep -n "mountedRef\|useRef(true)" src/components/diario/MicrofoneButton.tsx
```

Documentar findings.

### B. Fix canônico

1. Adicionar `mountedRef = useRef(true)` no topo do componente.
2. `useEffect(() => { return () => { mountedRef.current = false }; }, [])` para flip no unmount.
3. Em todo `.then()` ou `await` que dispara setState ou efeito após work async, adicionar early-return `if (!mountedRef.current) return;`.
4. Cobrir cenários: `stopAndUnloadAsync().then(discardRecording)`, qualquer promise pendente que toque ref de Audio, qualquer setState assíncrono.

### C. Testes

Adicionar `tests/components/diario/MicrofoneButton-unmount.test.tsx`:

- Cenário 1: usuario inicia gravacao, depois desmonta componente antes de stop → não lança warning "state update on unmounted".
- Cenário 2: stop chamado em componente ainda montado → comportamento normal.
- Cenário 3: stop seguido de unmount imediato → cleanup limpo.

## OFF-LIMITS

**Pode tocar:**
- `src/components/diario/MicrofoneButton.tsx` (apenas adicionar mountedRef + guards)
- `tests/components/diario/MicrofoneButton-unmount.test.tsx` (novo)

**Não pode tocar:**
- Schemas de áudio (`src/lib/schemas/midia-companion.ts` etc)
- Hook de gravação (`expo-av` wrapping)
- Comportamento de UI (botões, ícones, animações)
- Storage de transcrição
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md` (orquestrador atualiza)

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh

# Sanity: 3 runs verde
for i in 1 2 3; do
  npm test --silent 2>&1 | grep "Test Suites:" | tail -1
done
```

## Proof-of-work esperado

1. Diff do `MicrofoneButton.tsx` mostrando `mountedRef` + guards.
2. Novo teste `MicrofoneButton-unmount.test.tsx` com 3 cenários.
3. Smoke verde + 3 runs sanity verde.
4. Hash commit no worktree.

## Decisão

P2 porque é use-after-unmount latente — pode causar flake jest
intermitente, warnings em produção sob race condition (sheet
fechado durante gravação). Mesmo padrão já corrigido em hunt-3 —
fix mecânico, low-risk.

## Origem

Achado colateral do agente `a49390704fe24f1d3` ao executar
`R-INFRA-JEST-LEAK-HUNT-5`. Citado textualmente no proof-of-work:
"src/components/diario/MicrofoneButton.tsx:122-126 tem
stopAndUnloadAsync().then(() => discardRecording(uri)) sem check
de unmount. Mesma classe de bug do hunt-3."
