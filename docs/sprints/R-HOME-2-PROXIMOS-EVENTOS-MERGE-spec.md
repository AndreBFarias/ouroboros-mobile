# R-HOME-2 — M-HOJE-PROXIMOS-EVENTOS-MERGE

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-HOME
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-HOME → R-HOME-2.

Seção "Próximos" da Tela Hoje mescla agenda Google + alarmes locais em timeline única ordenada cronologicamente. Cada item com micro-ícone de origem (calendar/alarme via lucide-react-native).

Devices sem OAuth conectado: graceful fallback apenas alarmes.

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: R-HOME-1 (estrutura Home), R-CRIT-1 (OAuth)

## OFF-LIMITS

Padrão T1. **Pode tocar**: secao `SecaoProximos*` em
`src/components/screens/`, hook `useProximos`, merge logic.

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
6. E2E com fixture 2 eventos + 1 alarme — ordem temporal correta.
7. Graceful fallback (sem OAuth) testado.
8. Achados colaterais.
