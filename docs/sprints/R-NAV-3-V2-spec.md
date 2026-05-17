# R-NAV-3-V2 — ConfirmarExclusao Modal Dracula (replan de R-NAV-3)

**Tipo**: refactor UX
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Tranche**: R-NAV
**Fase**: 3
**Origem**: replan de `R-NAV-3-REPLAN-spec.md` — decisões a2+b2 aplicadas autonomamente

## Decisões aplicadas

- **a2** (padrão header): Salvar no rodapé fixo + Excluir no fim do scroll (mantém padrão atual canônico de alarmes/contadores). NÃO toca headers.
- **b2** (confirmação): Modal Dracula custom abstraído em `<ConfirmarExclusao>` reutilizável. NÃO usa Alert nativo (viola ADR-010).

## Objetivo

Padronizar **só** a UX de confirmação de exclusão. Criar componente reutilizável `<ConfirmarExclusao>` Modal Dracula. Migrar 5 telas reais que já têm exclusão para usar o novo componente em vez de Modais inline duplicados.

## 5 telas reais aplicáveis (auditadas pelo executor a348cfc5)

- `app/alarmes/novo.tsx` (Salvar no rodapé; Excluir dentro do scroll)
- `app/contadores/[slug].tsx` (Modal Dracula consolidado para exclusão — referência canônica do padrão)
- `app/rotinas/[slug].tsx` (Salvar/Apagar no `FormRotina`)
- `app/exercicios/[slug]/editar.tsx` (Salvar/Cancelar no `ExercicioForm`)
- `app/grupos/[slug].tsx` (Salvar/Apagar no `FormGrupo`)

## Entregáveis

### Componente novo

`src/components/ui/ConfirmarExclusao.tsx`:
- Props: `{ visible: boolean, titulo: string, onConfirmar: () => void, onCancelar: () => void, descricao?: string }`
- Layout: Modal Dracula (`backgroundColor: 'rgba(20, 21, 26, 0.85)'`) + título + descrição opcional + botões "Cancelar" (ghost) + "Excluir" (destructive vermelho)
- accessibilityLabel sem acento ("cancelar", "excluir")
- Sentence case + acentuação PT-BR

### Migração 5 telas

Substituir Modais inline pelas 5 telas pelo `<ConfirmarExclusao>` importado. Cuidado:
- Apenas a confirmação muda — handler `onConfirmar` continua chamando a mesma lógica de delete que cada tela já tem.
- Texto do título: "Excluir <titulo>?" — sentence case PT-BR.

### Testes

`tests/components/ui/ConfirmarExclusao.test.tsx`:
- Render com props básicas
- Tap Cancelar fecha modal
- Tap Excluir dispara `onConfirmar`
- Visibilidade controlada por `visible` prop

E2E `tests/e2e/playwright/r-nav-3-v2.e2e.ts`:
- Testar exclusão em 3 telas distintas (contador + alarme + rotina)

Esperado: +6 a +8 testes.

## OFF-LIMITS

**Pode tocar**:
- Criar `src/components/ui/ConfirmarExclusao.tsx`
- Ajustar 5 telas listadas substituindo Modais inline pelo componente novo

**Não pode tocar**:
- Headers (mantidos como estão — decisão a2)
- Lógica de delete (só substitui o COMPONENTE de confirmação)
- Schemas
- Telas que não têm exclusão hoje (todo, eventos, etc — não-aplicáveis)

## Verificação

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit (OBRIGATÓRIO).
5. Path do worktree + branch.
6. E2E cobrindo exclusão em 3 telas distintas.
7. Achados colaterais.

## Decisão

- a2 (rodapé/scroll) + b2 (Modal Dracula custom) aplicadas autonomamente baseado em recomendação do executor a348cfc5.
- Telas inexistentes (todo, eventos, conquistas, crises, reflexões) NÃO entram nesta sprint. Sprints próprias quando features forem criadas.
