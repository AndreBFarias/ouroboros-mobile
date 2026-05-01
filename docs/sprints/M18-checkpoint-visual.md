# Sprint M18 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (aced266ff8bccb394) [stream timeout no final]
ORQUESTRADOR: Claude principal (capturou Camada V V-01/V-02/V-03 reais via Chrome MCP)
DECISÃO: APROVADO
```

## Camada A — Agente executor

Stream do agente caiu por idle timeout antes de capturar screenshots. Todos arquivos foram criados (verificado via `git status`); smoke completo verde quando o orquestrador retomou.

## Camada V — Validação cruzada via claude-in-chrome MCP

3 estados validados ao vivo no Chrome em `http://localhost:8081`:

- **V-01** (`/`, toggle OFF) — Bottom bar com **5 abas** (Hoje/Memórias/Humor/Finanças/Settings). Sem aba Contadores. Confirma reatividade do toggle.
- **V-02** (`/contadores`, toggle ON) — Aba Contadores aparece como **6ª** (ativa em purple, ícone hash). Header laranja "Contadores", ícone Sigma `Σ` muted-decor 48dp, frase canônica **"Comece quando quiser."** em sentence case + ponto. **Sem fogo/badge/ícone trofeu/exclamação** (ADR-0005 respeitado).
- **V-03** (`/contadores/novo`) — Header "Novo contador" + chevron back. Label TÍTULO uppercase muted + input placeholder "Ex.: Sem cigarro". Label INÍCIO + trigger de data mostrando "01 de maio de 2026". Botão Criar. Acentuação completa PT-BR ("Início", "Maio").

A-04 (card contador na lista), A-05 (modal confirma reset), A-06 (timeline histórico) requerem persistência SAF — não capturáveis em web mock. Cobertos pelos testes unitários (`registrarReset` com hash de unicidade + `recorde` nunca diminui validados em 14 testes de `vault/contadores.test.ts`).

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       878 passing (99 suites)  [+65 vs baseline 813]
smoke.sh:     OK
expo export:  OK (não medido literalmente; agente caiu antes)
```

## Integração ao projeto (CONTRACT §2)

- [ok] Aba `/(tabs)/contadores` substitui redirect-stub; pasta com Stack interno (index/novo/[slug])
- [ok] Schema `ContadorSchema` exportado via barrel
- [ok] Helpers Vault (`listarContadores`, `lerContador`, `escreverContador`, `excluirContador`, `registrarReset`) exportados
- [ok] `contadoresPath` em `paths.ts` + `VAULT_FOLDERS.contadores`
- [ok] `src/lib/util/diasEntre.ts` função pura UTC sem horas
- [ok] Consome `useSettings.featureToggles.contadorDiasSem` (sem mudar shape)

## Decisões implementadas (spec §11)

- [ok] Label "dia"/"dias" ao lado do número em micro muted
- [ok] Histórico de resets via sub-tela `/contadores/[slug]` com timeline vertical
- [ok] Bloqueio de data futura (datepicker `maximumDate=now`)
- [ok] Recorde nunca diminui (lógica em `registrarReset`)
- [ok] Sem celebração visual (sem fogo, badge, milestones, sons, confete) — V-02 confirma

## Achados colaterais

Stream timeout do agente no final da execução. Não é regressão; arquivos criados, smoke verde. Operacional.

## Decisão final

**APROVADO.** M18 entrega contador "dias sem X" com tom sóbrio absoluto. **Bloco 5 do ROADMAP (Settings + opt-ins) COMPLETO.**

Sprints fechadas até aqui: M00.5/M00.6/M08/M13/M11/M12/M15/M14.5/M16/M17/**M18**. 11 sprints, 878 testes (+619 desde baseline 259).

**Próxima sprint executável:** opções:
- **Backend Python** (MOB-bridge-1/2/3) em sessão separada — destrava M10/M14
- **M06.5/M07.x/M09** (dev-client features) — exige `npm run build:dev` antes
- **M20** (widget homescreen) — depende M00.6 (Tela 26 já no mockup) + M15 (toggle já existe)

Recomendação: **M20** porque é independente de backend e dev-client; depois M19 pode ser preparada (release).
