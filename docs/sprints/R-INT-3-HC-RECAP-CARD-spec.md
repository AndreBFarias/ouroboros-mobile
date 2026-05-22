# R-INT-3-HC-RECAP-CARD — Card "Saude essa semana" no Recap

**Tipo:** feature (consumer UI agregador)
**Prioridade:** P1
**Estimativa:** 0.5d
**Fase:** 3 (Onda 3Q.B1 — cadeia de valor HC)
**Depende de:** R-INT-3-HC-AUTOPULL-SCHEDULER + R-INT-3-HC-AUTOPULL-PASSOS/EXERCICIO/MEDIDAS/SLEEP

## Contexto

HC hoje so aparece em `EvolucaoCorporalTab.tsx` via `CardHCResumo` (Q17.d). Falta presenca no Recap — o usuario nao ve consolidado semanal de passos/treinos/sono/medidas vindo do HC.

R-RECAP-1 (`25d4849`) entregou helper `destinos.ts` clicavel + pattern `RecapSecao*.tsx`. Esta sprint adiciona nova secao.

## Objetivo

Criar `src/components/recap/RecapSecaoSaude.tsx`:

```tsx
<RecapSecaoSaude periodo={periodo}>
  {/* Renderiza so se ao menos 1 dado HC existir no periodo */}
  Saude essa semana
  ┌─────────────────────────────┐
  │ 57.300 passos (8.186/dia)   │ <- destinos.ts -> /passos
  │ 3 treinos (2.5h total)      │ <- /treinos
  │ 7.2h sono medio             │ <- /sono
  │ 72.5 kg (-0.4 kg)           │ <- /medidas
  └─────────────────────────────┘
</RecapSecaoSaude>
```

Helper agregador `src/lib/recap/saude.ts` (novo):
```ts
export interface SaudeRecap {
  passos: { total: number; mediaDia: number } | null;
  treinos: { total: number; duracaoMin: number } | null;
  sono: { mediaHoras: number; noites: number } | null;
  medidaUltima: { peso?: number; deltaPeso?: number; gordura?: number } | null;
}

export async function calcularSaudeRecap(
  vaultRoot: string,
  periodo: PeriodoChave,
  ate: Date
): Promise<SaudeRecap>;
```

Reaproveita readers `listarPassos`, `listarTreinos`, `listarSono`, `listarMedidas` (todos materializados pelo autopull).

## Escopo

### A. Investigacao obrigatoria

```bash
grep -n "RecapSecao" src/components/recap/  # confirma pattern
grep -n "destinos" src/lib/recap/destinos.ts  # helper clicavel
ls src/lib/vault/{passos,treinos,sono,medidas}.ts  # confirma autopull writers
```

### B. Implementacao

1. `src/lib/recap/saude.ts` (novo) — `calcularSaudeRecap`.
2. `src/components/recap/RecapSecaoSaude.tsx` (novo) — card visual.
3. `src/components/screens/RecapScreen.tsx` (modificar) — adicionar `<RecapSecaoSaude>` apos as secoes existentes (Conquistas, Numeros, etc).
4. `src/lib/recap/destinos.ts` (modificar) — adicionar destinos `passos`, `sono`, `medidas` no map.

### C. Testes

- `tests/lib/recap/saude.test.ts` — agregacao com mock readers.
- `tests/components/recap/RecapSecaoSaude.test.tsx` — render condicional (sem dados HC, secao oculta).

## OFF-LIMITS

**Pode tocar:** `src/lib/recap/saude.ts`, `src/components/recap/RecapSecaoSaude.tsx`, `src/components/screens/RecapScreen.tsx` (so adicionar secao), destinos.ts (entries), tests.

**Nao pode tocar:** Recap secoes existentes (Conquistas/Numeros/Memorias), helpers autopull (so consumir), CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
# Live: com passos/treinos importados via autopull, abrir Recap, ver secao Saude.
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde.
3. Hash commit + screenshot Gauntlet do Recap com secao Saude.

## Referencias

- Pattern Recap secao: `RecapSecaoConquistas.tsx`, `RecapSecaoNumeros.tsx`
- Helper destinos: R-RECAP-1 (`25d4849`)
- Q17.d Evolucao card: `CardHCResumo` (so referencia visual, nao reuso direto)
