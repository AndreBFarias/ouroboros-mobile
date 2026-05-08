# Sprint G2.1 — I-DIARIO-REFLEXAO-RECAP

```
DEPENDE:    G2 fechada (modo reflexao no schema + UI)
BLOQUEIA:   nada (UX completar pós-G2)
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

## 1. Objetivo

Achados colaterais revelados durante G2 (I-DIARIO-REFLEXAO):

- `src/components/screens/SecaoDiariosEventosAgrupado.tsx` pinta
  `modo === 'trigger' ? red : green` (binário). Com modo `reflexao`
  ativo agora, registros reflexivos são pintados de **verde**
  (cor de vitória) — semanticamente errado.
- `src/lib/hooks/useRecap.ts` ignora reflexao silenciosamente em
  `conquistas` e `crises` (correto pela spec G2 §10), mas a "seção
  Reflexões" prevista não existe ainda.

Esta sprint completa a integração de modo Reflexão com o Recap.

## 2. Entregáveis

### Modificar

- `src/components/screens/SecaoDiariosEventosAgrupado.tsx`: 3 cores na
  borda do card por modo (red trigger / green vitoria / cyan reflexao).
- `src/lib/hooks/useRecap.ts`: nova lista `reflexoes` paralela a
  `conquistas` e `crises`. Filtra `d.modo === 'reflexao'` no período.
- `src/components/screens/RecapScreen.tsx`: nova `SecaoReflexoes` no
  modo Lista, posicionada entre Conquistas/Crises e Evoluções.
- `src/lib/conquistas/loader.ts` ou similar: garantir que reflexões
  **NÃO** entram em `useConquistas` (já está, mas validar via teste).

### Novos

- `src/components/screens/RecapSecaoReflexoes.tsx`: componente novo
  espelhando o padrão de `RecapSecaoConquistas.tsx`.
- `tests/lib/hooks/useRecap-reflexao.test.ts`: cenário com 2 vitória,
  1 trigger, 3 reflexão no período. Assert: `conquistas.length === 2`,
  `crises.length === 1`, `reflexoes.length === 3`.

## 3. APIs reutilizáveis

- Padrões dos `RecapSecao*.tsx` existentes.
- `useRecap.ts` (estende com nova chave).
- Tokens de cor (`colors.cyan` para reflexão).

## 4. Restrições

Padrão. Tom respeitoso conforme ADR-0005 (sem motivacional, sem
gamificação). Frases sugeridas para empty state da seção Reflexões:
"Nenhuma reflexão neste período." (sem julgamento).

## 5. Validação Gauntlet

PNGs em `docs/sprints/I-DIARIO-REFLEXAO-RECAP-screenshots-gauntlet/`:
- `01-recap-com-reflexoes.png` (3 seções visíveis: Conquistas, Crises,
  Reflexões).
- `02-secao-diarios-card-reflexao-cyan.png` (card de reflexão com borda
  cyan).

E2E novo `tests/e2e/playwright/m-recap-reflexoes.e2e.ts` (caso golden:
seed 3 reflexões + abrir /recap + assert texto "Reflexões" visível).

## 6. Procedimento

1. Estender `useRecap.ts` com chave `reflexoes` (cópia do padrão de
   conquistas).
2. Criar `RecapSecaoReflexoes.tsx`.
3. Pluga em `RecapScreen.tsx` modo Lista.
4. Atualizar `SecaoDiariosEventosAgrupado.tsx` para 3 cores.
5. Testes unitários + E2E.
6. Captura PNG.

## 7. Verificação

```bash
npx tsc --noEmit
npm test -- recap diario
./scripts/smoke.sh
```

## 8. Commit

```
feat: g2.1 i-diario-reflexao-recap secao reflexoes + cor cyan card
```

## 9. Checkpoint visual

PNGs Gauntlet conforme §5.

### Checklist

- [ ] `STATE.md`, `ROADMAP.md`, `CHANGELOG.md`, `FEATURES-CANONICAS.md`
  §7 (Recap).

## 10. Decisões resolvidas

- Cor da reflexão: `colors.cyan` (#8be9fd) — coerente com chips de
  emoção `accent: 'cyan'` introduzidos em G2.
- Posição da seção: entre "Crises" e "Evoluções" no Recap modo Lista.
- Empty state: "Nenhuma reflexão neste período." (tom respeitoso).
