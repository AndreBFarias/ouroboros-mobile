# R-ROT-1-C — Padrões temporais em diário emocional

**Tipo:** feature (UX sensível)
**Prioridade:** P2-medium (replan R-ROT-1)
**Estimativa:** 3-4h
**Fase:** 3 (replan R-ROT-1, decisão C do dono 2026-05-21)
**ADR sugerida:** ADR-0028 sugerida — registrar política de tom para sugestões emocionais

## Contexto

Replan R-ROT-1 opção C: detectar padrão temporal em registros
emocionais (ex: crise sempre por volta das 23h) → **sugerir prática
preventiva** no horário precedente.

**ATENÇÃO UX:** esta sprint toca tom sensível. Filosofia ADR-0005
(zero gamificação, zero julgamento) deve ser preservada. Sugestão NÃO
pode soar como "você sempre quebra às 23h" — deve ser convite suave.

## Hipótese técnica

1. Hook `useInteligenciaTemporalDiario(autor, modo)` lê últimos 30 dias
   de `markdown/diario-*.md` filtrados por `autor` + `modo='gatilho'`.
2. Agrupa por hora-do-dia; identifica picos (cluster ≥ 4 em ±60min).
3. Se cluster detectado:
   - Sugere prática preventiva 30min antes
   - Banner em Tela Hoje (`app/index.tsx` seção Recap ou cabeçalho)
   - Tom suave: "Você costuma ter momentos difíceis por volta das 23h.
     Quer um lembrete suave às 22:30 pra respirar?"
4. Aceitar → cria alarme/notif preventiva.
5. Rejeitar → silencia 30 dias.

## Política de tom (ADR-0005 estendido)

**Linguagem proibida:**
- "Você sempre"
- "Não consegue"
- "Toda noite"
- "Está se sabotando"
- Qualquer comparativo negativo

**Linguagem aceita:**
- "Você costuma ter"
- "Tem havido"
- "Pode ser que ajude"
- Convite, nunca acusação

**Frequência:**
- Banner aparece NO MÁXIMO 1x por dia
- Permanece dismissível
- Silenciamento longo (30d default)

## Escopo

### A. Investigação obrigatória

```bash
ls src/lib/diario/
grep -n "listarDiarios\|gatilho" src/lib/vault/diario.ts
grep -n "modo" src/lib/schemas/diario_emocional.ts
```

### B. Implementação

1. Helper puro `src/lib/diario/padroes-temporais.ts`:
   - `agruparPorHora(registros): Map<hora, count>`
   - `detectarCluster(map): { detectado, hora?, contagem? }`
2. Hook `useInteligenciaTemporalDiario` (data + filtros)
3. Componente `<SugestaoPraticaPreventiva>` com 2 botões + dismissível
4. Integrar em `app/index.tsx` (Tela Hoje) discreto
5. **Curadoria de copy do dono obrigatória ANTES de mergear** — pool de
   variações em `src/lib/copy/sugestoes-diario.ts` (8-12 frases)
6. Testes:
   - `padroes-temporais.test.ts` (puro)
   - `SugestaoPraticaPreventiva.test.tsx` (renderização + dismissal)

### C. Validação

- Smoke + 3 runs sanity
- **REVIEW DE COPY DO DONO obrigatório antes de declarar [ok]**
- Validação live no celular: simular 4 gatilhos às 23h → banner aparece com tom correto

## OFF-LIMITS

**Pode tocar:**
- `src/lib/diario/padroes-temporais.ts` (novo)
- `src/components/diario/SugestaoPraticaPreventiva.tsx` (novo)
- `src/lib/copy/sugestoes-diario.ts` (novo)
- `app/index.tsx` (apenas adicionar componente em local discreto)
- Testes novos

**Não pode tocar:**
- Schema `diario_emocional.ts` (só consumir, não mudar)
- Recap (R-RECAP-*) — não overlap
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npm test --silent 2>&1 | grep "Test Suites:" | tail -1; done
```

## Proof-of-work esperado

1. Diff (~200L esperado)
2. +12-18 testes (cluster detection + UI + copy)
3. Pool de copy curado (8-12 frases preliminares + review do dono)
4. Smoke verde + 3 runs sanity
5. Hash commit no worktree
6. Achados colaterais

## Decisão

P2 mas COM REVIEW DE COPY EXPLÍCITO antes de merge.

## Origem

Replan R-ROT-1 opção C. Dono escolheu A+B+C+D em 2026-05-21. Aviso UX
sensível registrado no spec original.
