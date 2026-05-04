# Sprint M-GAUNTLET-AUDITORIA — Auditoria externa do Gauntlet, fix e melhorias

```
DEPENDE:    M-GAUNTLET fechada (interface base)
            + M-REVALIDACAO-M20-M28 fechada (uso real validado)
BLOQUEIA:   M29 ate fechar (Gauntlet precisa estar maduro antes
            de virar pipeline padrao para sprint nova)
ESTIMATIVA: 4-6h
PRIORIDADE: alta - decisao durável de validacao depende da
            confiabilidade do Gauntlet
STATUS:     [todo]
```

## 1. Objetivo

Levar o Gauntlet de "MVP funcional" para "ferramenta auditável e
robusta". Inclui auditoria externa (subagente independente que
NÃO escreveu o Gauntlet original), fix dos achados, e melhorias
operacionais (UX do `gauntlet.sh`, cobertura de cenários, anti-
vazamento reforçado).

## 2. Estrutura em duas fases

### Fase A — Auditoria externa (input puro)

Dispatch de **subagente externo** (não o orquestrador) com prompt
isolado pedindo análise crítica do Gauntlet:

**Prompt para o auditor:**

```
Você é um auditor de qualidade independente. NÃO escreveu este
código. Sua única tarefa: avaliar criticamente o Gauntlet do
Protocolo-Mob-Ouroboros (validador visual em Chrome).

Leia EXCLUSIVAMENTE estes arquivos, sem aceitar sugestões prévias:

- src/lib/dev/gauntlet.ts
- src/lib/dev/seedDeterministico.ts
- app/_dev/_layout.tsx
- app/_dev/gauntlet.tsx
- app/_layout.tsx (RootLayout, SessaoBootGate, FrameMobileGauntlet)
- src/lib/boot/biometriaGate.tsx (prop bypass)
- gauntlet.sh
- docs/GAUNTLET.md
- docs/templates/e2e-template.e2e.ts
- VALIDATOR_BRIEF.md §1.9
- docs/sprints/M-GAUNTLET-spec.md (escopo original)
- docs/validacao-gauntlet-2026-05-03/RELATORIO.md (uso real)

Para CADA item abaixo, responda SIM/NAO/PARCIAL com evidencia
verbatim do codigo (citar linha e arquivo):

A. ANTI-VAZAMENTO
   1. GAUNTLET_ATIVO e build-time fechado em release Android?
   2. Existe algum ponto de import top-level que vaza
      window.__gauntlet em mobile?
   3. expo export --platform android contem string '__gauntlet'?
      (verificar manualmente)
   4. instalarGauntlet() pode ser chamado em mobile real?
   5. Bypass do BiometriaGate vaza em release?

B. DETERMINISMO
   6. seed() coloca todas as stores em estado conhecido (TS
      verificavel)?
   7. reset() limpa TUDO incluindo persistencia volatil?
   8. setUltimaRota(null) realmente faz unset, ou grava string
      vazia?
   9. abrir() / abrirSheet() / abrirMenu() sao idempotentes?
   10. estado() retorna snapshot consistente (sem race)?

C. ROBUSTEZ DE ERRO
   11. Se router ainda nao montou, abrir() falha gracioso ou
       trava?
   12. setRouterRef pode ser chamado antes do useEffect do
       GauntletPathnameSync?
   13. Se a store nao hidratou, seed() faz set direto e contorna?
   14. abrirSheet em web cai em chrome-error -- comportamento
       documentado e explicito ou silencioso?

D. UX OPERACIONAL
   15. ./gauntlet.sh cobre todos os cenarios (sem servidor, com
       servidor antigo, com permissao negada de porta)?
   16. Mensagens de erro sao acionaveis?
   17. O log em /tmp/gauntlet-expo.log eh truncavel ou cresce
       sem limite?
   18. Ctrl-C realmente derruba todos os processos filhos
       (Metro, Watcher, Bundler)?

E. COBERTURA DE CENARIOS
   19. Quantas das 24 telas do mockup tem caso E2E em
       tests/e2e/playwright/?
   20. Casos E2E sao reproducíveis isoladamente (cada um faz
       reset/seed) ou dependem de ordem?
   21. /_dev/showcase existe e renderiza todas as telas em
       scroll?
   22. Existe fixture de seed casal (2 pessoas)?
   23. Existe fixture com humores/diarios/eventos populados
       (nao so estado vazio)?

F. INSTRUMENTACAO
   24. Como o orquestrador detecta que useFonts terminou de
       carregar (alem de esperar 60s)?
   25. Existe assinatura de tempo de boot em ms exposta na
       __gauntlet API?
   26. Existe modo "fast boot" que bypassa fontes
       (pre-cacheadas)?
   27. console.error fica visivel ou eh silenciado?

G. DOCUMENTACAO
   28. docs/GAUNTLET.md cobre cenarios de erro?
   29. CLAUDE.md / VALIDATOR_BRIEF / HOW_TO_RESUME estao
       sincronizados?
   30. Existe troubleshooting para os erros comuns (boot lento,
       chrome-error em sheet, react 19 ref deprecation)?

Para cada NAO/PARCIAL, prescreva fix MINIMO com Edit-pronto
(arquivo:linha + diff em texto). NAO codifique. Devolva em
markdown estruturado: SECAO -> ITEM -> VEREDICTO + EVIDENCIA +
FIX-SUGERIDO.

Importante: voce NAO eh autor do Gauntlet. Use voz critica
neutra. Aceite incompletudes documentadas (M27.3 deferido eh
aceitavel se documentado).
```

Retorno esperado: relatório estruturado com 30 veredictos
(SIM/NÃO/PARCIAL) + fixes Edit-prontos.

### Fase B — Aplicação dos fixes

Orquestrador lê o relatório do auditor e:

1. Para cada item NÃO/PARCIAL com fix Edit-pronto trivial
   (≤5 linhas), aplica diretamente.
2. Para itens que exigem refatoração maior (>20 linhas), abre
   sub-sprint `M-GAUNTLET-AUDITORIA.x` em `[todo]`.
3. Documenta em `docs/auditoria-gauntlet-2026-05-04/RELATORIO.md`
   o que foi aceito, o que foi deferido, e por quê.

### Fase C — Melhorias operacionais

Independente da auditoria externa, melhorias já mapeadas:

- **`gauntlet.sh` v2:**
  - Flag `--clear` que limpa cache do Metro (`rm -rf .expo
    node_modules/.cache`) antes de subir.
  - Flag `--quiet` que não mostra log em foreground (background
    only, retorna PID).
  - Trap `EXIT` que mata `expo` orfão se `gauntlet.sh` cair.
  - Healthcheck que valida `__gauntlet` exposto após boot, não
    só `localhost:8081` respondendo.

- **API `__gauntlet`:**
  - `aguardarBoot(timeoutMs?: number): Promise<boolean>` — espera
    fontes carregarem e stores hidratarem; resolve `true` quando
    pronto.
  - `tempoDeBoot(): number` — retorna ms entre primeiro mount e
    estado pronto.
  - `consoleErros(): Array<{ts, msg}>` — coleta `console.error`
    da sessão atual.
  - `seedComDados(fixture: 'humores-30d' | 'diarios-3' | 'eventos-7')`
    — popula stores com fixtures realistas.

- **`/_dev/showcase`:** confirmar que existe (declarado em
  M-GAUNTLET-spec §3 mas não verificado no relatório M-REVAL).
  Se ausente, criar com 24 telas em scroll.

- **Documentação:**
  - Seção "Troubleshooting" em `docs/GAUNTLET.md`:
    - "Boot lento (>60s)" → reload página, abre sessão fresh.
    - "chrome-error em sheet" → usar Nível B; documentar quais
      sheets falham.
    - "Loop infinito após edit" → kill metro, `./gauntlet.sh`
      novamente.
    - "Animação parou" → confirmar `data-anim-id` no DOM.

## 3. Entregáveis

- `docs/auditoria-gauntlet-2026-05-04/RELATORIO.md` (relatório
  do auditor + decisões do orquestrador).
- `gauntlet.sh` v2 com flags `--clear` e `--quiet`.
- `src/lib/dev/gauntlet.ts` com 4 APIs novas (`aguardarBoot`,
  `tempoDeBoot`, `consoleErros`, `seedComDados`).
- `app/_dev/showcase.tsx` (se ausente).
- `docs/GAUNTLET.md` com seção Troubleshooting.
- Sub-sprints `M-GAUNTLET-AUDITORIA.x` para refatorações grandes.

## 4. Restrições

- Auditor é subagente isolado — NÃO recebe contexto do orquestrador
  além do prompt da §2 fase A.
- Orquestrador NÃO interfere durante a auditoria. Lê o relatório
  inteiro antes de aceitar/recusar fixes.
- Mantém anonimato absoluto (Regra −1) em qualquer documento gerado.
- Fix que altera comportamento público da `__gauntlet` API exige
  atualização sincronizada de `docs/GAUNTLET.md` + interface TS
  + 1 teste unitário.

## 5. Aritmética esperada

- Baseline Jest mantida (eventual +5-15 testes do `aguardarBoot`,
  `consoleErros`, etc.).
- Smoke verde, tsc 0 erros, anonimato OK.
- Bundle Hermes Android: ≤ 8.85 MB.
- Console gauntlet: 0 erros (mesmo no boot inicial após fontes).
- Tempo de boot médio (3 medições) reportado em ms.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh

# Subir Gauntlet v2 e validar APIs novas
./gauntlet.sh --clear
# Em browser: window.__gauntlet.aguardarBoot() resolve true
# window.__gauntlet.tempoDeBoot() retorna numero
# window.__gauntlet.consoleErros() retorna array vazio em uso normal
# window.__gauntlet.seedComDados('humores-30d') popula store
```

## 7. Decisões já tomadas

- Auditor é externo e cego (não recebe contexto além do prompt).
  Garante voz crítica.
- `__DEV__` continua sendo o gate (não voltar pra
  `EXPO_PUBLIC_GAUNTLET`).
- `gauntlet.sh` continua sendo atalho único — não quebrar
  compatibilidade com chamadas existentes.
- `/_dev/showcase` é parte da auditoria — se ausente, criar.

Sprint pronta para execução. Bugs descobertos durante a auditoria
viram `M-GAUNTLET-AUDITORIA.x`.
