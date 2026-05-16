# R-ROT-1 — M-ROTINAS-INTELIGENCIA-TEMPORAL

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-ROT
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-ROT → R-ROT-1.

App aprende horário em que cada rotina é marcada (média + desvio padrão). Após N marcações (default 3 em janela de 1h), sugere lembrete personalizado via toast/banner — **não cria automaticamente**.

Aceitar → cria alarme correspondente.
Rejeitar → silencia futuras sugestões por 30 dias.

## Dependências

- **Bloqueia**: R-SF-3 (marcação rápida usa o mesmo histórico)
- **Bloqueado por**: R0

## OFF-LIMITS

Padrão T1. **Pode tocar**: novo `src/lib/rotinas/inteligenciaTemporal.ts`, `src/lib/alarmes/criarAlarme.ts` (apenas integração).

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
6. E2E: 3 marcações simuladas em janela de 1h → sugestão aparece. Rejeitar → silencia 30d.
7. Achados colaterais.
