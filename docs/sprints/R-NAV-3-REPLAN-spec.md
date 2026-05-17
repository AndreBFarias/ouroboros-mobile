# R-NAV-3-REPLAN — Replanejamento R-NAV-3 (rejeição formal)

**Status**: `[replan]` em 2026-05-17 — spec original rejeitado pelo executor (`a348cfc5`).

## Rejeição formal

Spec original R-NAV-3 propôs `HeaderEdicao` + 10+ telas com Alert nativo. Auditoria empírica:

- **5 de 10 telas-alvo NÃO existem**:
  - `app/todo/[slug].tsx` — `app/todo.tsx` é lista, não tem slug edit
  - `app/eventos/[slug].tsx` — `app/eventos.tsx` é registro via BottomSheet
  - `app/conquistas/[slug].tsx` — feature inexistente
  - `app/crises/[slug].tsx` — feature inexistente
  - `app/reflexoes/[slug].tsx` — feature inexistente
- **Conflitos arquitetônicos** com padrões consolidados:
  - `Header` canônico usa `{ title, onBack, right }` — `HeaderEdicao` duplicaria
  - Alert nativo viola ADR-010 (estética Dracula). Convenção atual: Modal Dracula custom em contador/exercício
  - Right slot já ocupado em rotinas/grupos (pill "Iniciar")
  - Excluir intencionalmente no rodapé (não header) — evita tap acidental perto do back chevron

## 5 telas reais aplicáveis

- `app/alarmes/novo.tsx` (Salvar no rodapé; Excluir dentro do scroll)
- `app/contadores/[slug].tsx` (Modal Dracula consolidado para exclusão)
- `app/rotinas/[slug].tsx` (right-slot tem pill "Iniciar"; Salvar/Apagar no `FormRotina`)
- `app/exercicios/[slug]/editar.tsx` (edit dedicado; Salvar/Cancelar no `ExercicioForm`)
- `app/grupos/[slug].tsx` (right-slot tem pill "Iniciar"; Salvar/Apagar no `FormGrupo`)

## 2 decisões arquitetônicas pendentes do dono

### a) Padrão canônico de header de edição

- **a1)** Salvar/Excluir no header right slot (proposta original — CONFLITA com pills "Iniciar" em rotinas/grupos)
- **a2)** Salvar no rodapé fixo + Excluir no fim do scroll (padrão atual de alarmes/contadores — evita destructive perto do back chevron) — **RECOMENDADO**
- **a3)** Manter heterogeneidade atual e padronizar apenas a UX de confirmação (Modal vs Alert)

### b) Confirmação de exclusão

- **b1)** Alert nativo (proposta original — viola ADR-010 Dracula)
- **b2)** Modal Dracula custom abstraído em `<ConfirmarExclusao>` reutilizável — **RECOMENDADO**

## Recomendação técnica

**a2 + b2**: criar componente `<ConfirmarExclusao>` Modal Dracula em `src/components/ui/ConfirmarExclusao.tsx`. Migrar 5 telas reais (alarmes/contadores/rotinas/exercicios-editar/grupos) pra usar esse componente em vez de Modais inline duplicados. Não tocar headers — padrão "Salvar rodapé / Excluir fim do scroll" já é canônico e proposital.

Estimativa revisada: ~1h (componente + migrar 5 telas). Telas inexistentes (todo, eventos, conquistas, crises, reflexões) viram sprints próprias quando essas features forem criadas.

## OFF-LIMITS

Esta sprint é só replanejamento (escrita de spec). NÃO toca código. Após dono escolher a2+b2 (ou outra combinação), sprint nova `R-NAV-3-V2` é criada com TDD detalhado.

## Decisão

- R-NAV-3 original marcado `[rejeitado-replan]` no ROADMAP/_BACKLOG
- Aguarda decisão do dono entre {a1, a2, a3} × {b1, b2}
- Recomendação técnica: a2 + b2 (~1h)
