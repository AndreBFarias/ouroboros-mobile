# Sprint M-WCAG-MUTED-DECOR-TEXTO-V2 — 10 ocorrências fora da lista canônica

```
DEPENDE:    C2.x.3 fechada
BLOQUEIA:   nada
ESTIMATIVA: 1-2h
PRIORIDADE: baixa (cosmético; complementa C2.x.3)
```

## 1. Achado / motivação

C2.x.3 corrigiu 22 ocorrências de `colors.mutedDecor` em `<Text>`
listadas no RELATÓRIO §5 da auditoria C2. Após a execução, 10
ocorrências adicionais foram detectadas que não estavam na lista
canônica original (provavelmente adicionadas por sprints
subsequentes ao audit ou esquecidas no levantamento inicial).

## 2. Lista (10 ocorrências)

- `app/exercicios/[slug].tsx:222`
- `app/exercicios/[slug].tsx:302`
- `app/eventos.tsx:436`
- `app/todo.tsx:483`
- `app/diario-emocional.tsx:568`
- `app/contadores/[slug].tsx:294`
- `app/medidas/novo.tsx:421` (vizinho da C2.x.2 — não tocado por
  segurança)
- `app/settings/sobre.tsx:82`
- `app/settings/sobre.tsx:102`
- `src/lib/dev/gauntletDashboard.tsx:285` (rota dev — pode ficar
  como decor sempre)

## 3. Tarefa

Mesma heurística da C2.x.3 case-by-case:
- INFORMATIVO → trocar para `colors.muted`.
- DECORATIVO → marcar via `textPropsDecor()` helper de
  `src/lib/a11y/textPropsDecor.ts` (já existe).

## 4. Verificação

- `grep -rn "colors.mutedDecor" src/ app/ | grep -E "color:" | wc -l`
  esperado: 0 (excluindo dashboard dev opcional).
- E2E `m-wcag-audit.e2e.ts` (criado por C2) sem warnings WCAG.

## 5. Decisões pendentes

- `gauntletDashboard.tsx` é dev-only (DCE em release). Pode ficar
  decor sempre — sem impacto no produto final.
