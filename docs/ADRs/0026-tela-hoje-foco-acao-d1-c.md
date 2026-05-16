# ADR 0026 — Tela Hoje foco em ação (Decisão D1 = Opção C)

```
Status:     Aceito
Data:       2026-05-15
Sprint:     R-HOME-1 (M-HOJE-PRIORIDADE-RECORRENCIA, Onda R Fase 2)
Depende:    ADR-0005 (Ausência de gamificação e julgamento)
            ADR-0010 (Estética: física acima de tempo, silêncio visual)
            ADR-0021 (Recap como abstração canônica de período)
            ADR-0025 (Lexical canônico: gatilho/conquista/reflexão)
```

## Contexto

A Tela Hoje (M40) acumulou sete seções ao longo das ondas M0 a Q:

1. Cabeçalho (avatares + botão Recap)
2. Banner de erro (quando vault falha)
3. Status do Casal (humor + última atividade de cada pessoa)
4. Próximos (alarmes 4h + tarefas com alarme hoje)
5. Humor do dia (sliders + frase + chips)
6. Esta jornada (timeline cronológica de diários + eventos)
7. Botão de storybook em `__DEV__`

O risco identificado pelo dono em 2026-05-15 é que a tela está se
convertendo em **painel de leitura** quando o propósito declarado em
ROADMAP/§ Onda R é **foco em ação** (próximos + tarefas a fazer).
Painel pesado contradiz ADR-0010 (silêncio visual) e amplifica o gesto
de "abrir o app e só olhar", em vez de "abrir o app e fazer um
registro".

Três opções foram consideradas para resolver o problema:

- **Opção A** — manter ambos (Status do Casal e Humor+Última) mas
  comprimi-los em um único card alto (sparkline tipo "pulse" da semana).
- **Opção B** — manter apenas um dos dois (Humor+Última) e remover
  Status do Casal por ser duo-only.
- **Opção C** — remover ambos. Tela fica enxuta: cabeçalho +
  Próximos + To-do hoje + Recap + FAB.

## Decisão

Adotada **Opção C** (2026-05-15, dono).

### Layout final da Tela Hoje pós-R-HOME-1

1. **Cabeçalho** — duas linhas:
   - Linha 1: data por extenso ("Quarta, 16 de maio") em muted +
     atalho **Reflexão** à direita (cyan, ícone Sparkles, abre
     `/diario-emocional?modo=reflexao`).
   - Linha 2: saudação personalizada ("Boa noite, &lt;nome&gt;") em
     foreground forte. Bom dia / Boa tarde / Boa noite resolvidos
     por hora local BRT. Nome via `useNomeDe(pessoaAtiva)`.
2. **Próximos** — `SecaoProximos` existente (alarmes 4h + tarefas com
   alarme hoje, até 3 itens visíveis). Inalterado.
3. **To-do hoje** — nova seção. Até 5 tarefas com `meta.data === hoje`
   ou primeiras 5 pendentes (se houver menos de 5 do dia, completa
   com as mais recentes pendentes). Checkboxes inline com `marcarFeito`
   otimista (atualização local imediata + persist em paralelo). Long-
   press abre detalhe (navega para `/todo`). Empty state breve quando
   não há tarefas.
4. **Botão Recap** — pill purple inline no fim do scroll, navega para
   `/recap`. Preservado da M40.
5. **FAB roxo + verde** — global, vive em `_layout.tsx`. Inalterado.

### Seções removidas

- **Status do Casal**: `SecaoStatusCasal` + hook `useStatusCasal` são
  removidos do código. Não havia funcionalidade crítica nesse cartão
  além de leitura; informações equivalentes existem no Recap (modo
  comparativo entre pessoas) e na Tela de Diário Emocional (timeline
  por autor).
- **Humor+Última**: a sub-seção `SecaoHumor` inline em `app/index.tsx`
  (sliders disabled de humor/energia/ansiedade/foco) é removida. O
  Humor do dia continua acessível via:
  - **Recap diário** (`/recap` com período "Hoje" — atualmente o
    Recap renderiza periodicamente, e o atalho da Tela Hoje vai
    direto para `/recap` para visualização agregada).
  - **Tela de Humor Rápido** (`/humor-rapido`) — registro novo.
- **Esta jornada** (`SecaoDiariosEventosAgrupado` + timeline de
  diários + eventos): também removida. O conteúdo cronológico ficou
  redundante com o Recap diário, e a Tela Hoje deve priorizar ação
  (próximos/tarefas), não leitura.

## Consequências

### Positivas

- **Tela mais leve**. Menos componentes montados no boot do app,
  menos chamadas a `useHoje`/`useStatusCasal`/`useProximos`
  simultâneas. Reduz tempo de primeira renderização útil.
- **Foco preservado**. O usuário ao abrir o app vê o que tem para
  fazer (próximos + to-do), não o que aconteceu. Leitura fica
  reservada ao Recap.
- **Manutenção simplificada**. Três componentes a menos no
  `src/components/screens/`: `SecaoStatusCasal`,
  `SecaoDiariosEventosAgrupado`, e a função inline `SecaoHumor` em
  `app/index.tsx`. Mais um hook a menos (`useStatusCasal`).
- **Alinhamento com ADR-0005** (sem gamificação/julgamento). O
  Status do Casal, mesmo sem badge ou ranking explícito, podia ser
  lido como "quem fez mais hoje" se o usuário olhasse os cartões
  comparativamente. Removê-lo reduz esse risco.

### Negativas

- **Visualização agregada perdida na home**. O usuário que abria o
  app para conferir rapidamente o humor do dia ou o último registro
  do parceiro agora precisa de um tap extra (atalho Recap ou
  navegação manual). Mitigação: o botão Recap fica visível na
  primeira fold.
- **Hook `useStatusCasal` deletado**. Eventual sprint futura que
  queira ressuscitar status do casal (em widget, em Recap, etc)
  precisa reimplementar a leitura agregada. Decisão: o custo de
  rescrever 50 linhas de hook quando/se necessário é menor que o
  custo de manter código morto carregado.

### Migração

- `app/index.tsx` reescrito para o novo layout. Removidos imports
  de `SecaoStatusCasal`, `SecaoDiariosEventosAgrupado` e função
  inline `SecaoHumor`.
- Componentes deletados: `src/components/screens/SecaoStatusCasal.tsx`,
  `src/components/screens/SecaoDiariosEventosAgrupado.tsx`.
- Hook deletado: `src/lib/hooks/useStatusCasal.ts`.
- Testes deletados: `tests/components/screens/SecaoStatusCasal.test.tsx`,
  `tests/lib/hooks/useStatusCasal-syncConflict.test.tsx`.
- `tests/app/index.test.tsx` reescrito para validar o novo layout
  (cabeçalho com saudação, atalho Reflexão, Próximos, To-do hoje,
  ausência de Status do Casal e Humor+Última).

## Validação

- Smoke verde (`./scripts/smoke.sh`).
- E2E `tests/e2e/playwright/r-home-1.e2e.ts`: abre Tela Hoje, marca
  tarefa como concluída via checkbox inline, recarrega rota, valida
  que a tarefa permanece concluída.
- Screenshot Gauntlet 412dp da primeira fold em
  `docs/sprints/R-HOME-1-screenshots-gauntlet/`.
