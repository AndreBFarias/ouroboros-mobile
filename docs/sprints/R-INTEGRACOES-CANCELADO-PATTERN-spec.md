# R-INTEGRACOES-CANCELADO-PATTERN — Refator pattern `let cancelado` para AbortController/mountedRef

**Tipo:** refactor (consistência de pattern, sem mudança de comportamento)
**Prioridade:** P3-low (não bugado, só inconsistente com hunt-3)
**Estimativa:** 30min-1h
**Fase:** 3 (Onda 3K, achado colateral de R-INFRA-JEST-LEAK-HUNT-5)
**ADR sugerida:** nenhuma

## Contexto

Auditoria do hunt-5 (agent `a49390704fe24f1d3`) auditou 8
ocorrências do pattern `let cancelado = false` na codebase
buscando bugs análogos ao hunt-3 (`SecaoBackupAutomatico`
use-after-unmount). Resultado: apenas SecaoBackupAutomatico
estava bugado.

Mas o agente notou que `src/components/screens/IntegracoesScreen.tsx:245-264`
usa `let cancelado` (não bugado nesse caso — pattern aplicado
corretamente), sendo o último resquício antes da padronização
para `AbortController` ou `mountedRef` adotado em hunt-3.

Refator para consistência: trocar `let cancelado` por
`mountedRef = useRef(true)` mantendo comportamento idêntico.
Reduz superfície de revisão futura (auditor vê 0 ocorrências
de `let cancelado` no código → confiança que classe inteira
não tem o bug do hunt-3).

## Hipotese técnica

Pattern atual em `IntegracoesScreen.tsx`:

```ts
useEffect(() => {
  let cancelado = false;
  async function carregar() {
    const dados = await fetchAlgo();
    if (cancelado) return;
    setEstado(dados);
  }
  carregar();
  return () => { cancelado = true; };
}, []);
```

Refator para `mountedRef` (consistente com hunt-3):

```ts
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

useEffect(() => {
  async function carregar() {
    const dados = await fetchAlgo();
    if (!mountedRef.current) return;
    setEstado(dados);
  }
  carregar();
}, []);
```

Comportamento idêntico — flag de "ainda montado" muda de local-scope
para ref-scope. Vantagem: mountedRef cobre TODOS os efeitos
async do componente automaticamente, não apenas o do useEffect
específico.

## Escopo

### A. Investigação obrigatória

```bash
# Localizar exatamente o trecho
grep -n "let cancelado" src/components/screens/IntegracoesScreen.tsx
# Confirmar: existe? linhas 245-264?
```

### B. Fix mecânico

1. Adicionar `mountedRef = useRef(true)` no topo do componente.
2. Adicionar `useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false }; }, [])`.
3. Substituir `let cancelado = false; ... if (cancelado) return; ... return () => { cancelado = true }` pelo guard `if (!mountedRef.current) return;`.
4. Garantir que testes existentes ainda passam (cobertura de `IntegracoesScreen.test.tsx`).

### C. Verificação

Testes existentes devem continuar verde sem mudança. Se houver,
adicionar 1 teste novo cobrindo `desmontar componente antes do
async resolver` para validar que `mountedRef` realmente protege.

## OFF-LIMITS

**Pode tocar:**
- `src/components/screens/IntegracoesScreen.tsx`
- `tests/components/screens/IntegracoesScreen.test.tsx` (opcional, teste novo)

**Não pode tocar:**
- Lógica de OAuth, fluxos de Spotify/YouTube/HC (R-INT-1, R-INT-3, R-INT-4)
- Stores `useGoogleAuth`, `useSettings`
- Outros componentes (mesmo se também usam `let cancelado` — escopo desta sprint é apenas IntegracoesScreen)
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh

# 3 runs sanity
for i in 1 2 3; do
  npm test --silent 2>&1 | grep "Test Suites:" | tail -1
done

# Confirmar pattern eliminado
grep -n "let cancelado" src/components/screens/IntegracoesScreen.tsx
# esperado: vazio
```

## Proof-of-work esperado

1. Diff de `IntegracoesScreen.tsx` (~10 linhas mudadas).
2. Smoke verde + 3 runs sanity verde.
3. `grep` confirmando que `let cancelado` foi eliminado do arquivo.
4. Hash commit no worktree.

## Decisão

P3 porque não há bug ativo — pattern atual funciona. Mas
inconsistência aumenta superficie de revisão (auditor precisa
distinguir entre uso correto e bugado de `let cancelado`).
Refator para `mountedRef` zera essa dúvida — padrão único em
todo o código.

## Origem

Achado colateral do agente `a49390704fe24f1d3` ao executar
`R-INFRA-JEST-LEAK-HUNT-5`. Citado textualmente:
"src/components/screens/IntegracoesScreen.tsx:245-264 usa
let cancelado (não bugado, mas refator pra AbortController ou
mountedRef pra consistência com hunt-3)."
