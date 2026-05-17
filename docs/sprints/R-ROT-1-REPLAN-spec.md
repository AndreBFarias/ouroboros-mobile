# R-ROT-1-REPLAN — Replanejamento R-ROT-1 (rejeição formal do spec original)

**Status**: `[replan]` em 2026-05-16 noite — spec original R-ROT-1 rejeitado pelo executor por inconsistência com domínio.

## Rejeição formal

Spec original descrevia modelo "hábito com marcação tipo Habitica" (média/desvio padrão de timestamps de marcação de rotina). **Domínio real do Ouroboros**:

- "Rotina" = template reutilizável de Treino (`src/lib/schemas/rotina.ts`)
- Execução = `TreinoSessao` com `rotina` como **string livre opcional** (não slug)
- Não há vínculo canônico rotina↔execução com timestamp consultável
- 7 de 8 identificadores citados no spec original NÃO existem (`src/lib/rotinas/`, `src/lib/alarmes/criarAlarme.ts`, etc — todos fantasmas)
- OFF-LIMITS do spec bloqueia pré-requisito (mudar schemas pra criar vínculo)

Agent reportou via proof-of-work em `aa8e1766da0b06200`.

## 4 opções de replanejamento (escolha do dono via `/planejar-sprint`)

### Opção A — Inteligência sobre ALARMES (RECOMENDADA, mais aderente)

Aprender que o usuário sempre "snooza" alarme das 07:00 por 15min → sugerir mover alarme pra 07:15 após N snoozes.

**Pré-requisito**: histórico de snooze de alarme. Verificar se `markdown/alarme-*-historico.md` ou similar existe; se não, sprint pequena pra adicionar log de snooze.

**Touches**: novo `src/lib/alarmes/inteligenciaSnooze.ts` + integração em `app/alarmes/[slug].tsx`.

### Opção B — Inteligência sobre TAREFAS (Todo)

Aprender que usuário marca tarefa "Tomar remédio" sempre ~20:00 → sugerir criar alarme automático.

**Pré-requisito ATENDIDO**: `data_marcada` em `TarefaSchema` já existe (timestamp ISO).

**Touches**: novo `src/lib/tarefas/inteligenciaTemporal.ts` + integração em `app/todo.tsx`.

### Opção C — Inteligência sobre EVENTOS/DIÁRIO

Detectar padrão temporal em registros emocionais (ex: crise sempre por volta das 23h) → sugerir prática preventiva no horário precedente.

**Touches**: novo `src/lib/diario/padroes-temporais.ts`. Sensível UX (sugestões sobre emoção).

### Opção D — Inteligência sobre TREINO_SESSAO (mais alinhada com spec original)

Requer adicionar `rotina_slug` em `TreinoSessaoSchema` **ANTES** de implementar inteligência temporal. Sprint dupla:
1. R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG: migration schema + writers + backward-compat
2. R-ROT-1-INTELIGENCIA-TREINO: usa o novo campo

Aprende que usuário sempre treina rotina X às 18:00 → sugere alarme.

## Recomendação técnica do orquestrador

**Opção A + Opção B** em paralelo. Ambas têm pré-requisitos atendidos e modelam casos reais úteis ("snooze recorrente" + "tarefa repetida sem alarme"). Opção D fica pra v1.1 (requer schema migration). Opção C fica em backlog (UX sensível).

## OFF-LIMITS

Esta sprint é só replanejamento (escrita de spec). NÃO toca código. Quando user escolher uma das opções, sprint nova R-ROT-1-A / R-ROT-1-B / etc é criada.

## Decisão

- R-ROT-1 original marcado `[rejeitado-replan]` no ROADMAP/BACKLOG
- 2 sub-sprints recomendadas (A + B) podem entrar na próxima onda paralela
- Opção D fica como spec separada `R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG-spec.md` quando for priorizada
