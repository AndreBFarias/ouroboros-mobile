# Sprint M-WCAG-COMPLETO — Acessibilidade WCAG AA em todas as telas

```
DEPENDE:    M01.7 (Button accessibilityLabel), M34.2 (contraste fix)
BLOQUEIA:   M41 (release final — produto acessível é requisito)
ESTIMATIVA: 4-6h
PRIORIDADE: alta (qualidade de produto v1.0)
```

## 1. Achado / motivação

App é **ferramenta de uso diário** para 2 pessoas neurodivergentes.
Acessibilidade não é opcional — afeta a própria usabilidade
diária. Fixes pontuais (M01.7, M34.2) cobriram casos isolados;
falta auditoria sistemática.

WCAG AA mínimo:
- Contraste texto/fundo ≥ 4.5:1 (texto normal), ≥ 3:1 (large).
- Touch target ≥ 44×44 dp.
- Screen reader labels coerentes em todas interações.
- Focus order lógico (TalkBack para Android).
- Sem informação só por cor (ex: chips de categoria também
  precisam ícone/texto distintivo).

## 2. Objetivo

Auditar TODAS as telas do app + corrigir todas violações.

## 3. Entregáveis

### Auditoria

- `docs/auditoria-wcag-2026-05-04/RELATORIO.md` com tabela
  por tela: contraste / touch target / a11y label / focus order /
  cor-não-única.

### Helper

- `src/lib/a11y/contraste.ts` — função `ratioContraste(fg, bg):
  number` para uso interno.
- `tests/lib/a11y/contraste.test.ts` — casos canônicos das cores
  Dracula contra `bg`/`bgAlt`/`bgElev`.

### Fixes em telas

Para cada violação, fix in-place. Se >5 fixes em uma tela, sub-sprint
nova `M-WCAG-<TELA>` separada.

### E2E

- `tests/e2e/playwright/m-wcag-audit.e2e.ts` mede contraste em todas
  rotas via Gauntlet, falha se ratio < 4.5.
- Manual: validação com **TalkBack ativo no emulador Android** (Nível B).

## 4. Verificação

- E2E retorna zero violações de contraste em 24 telas.
- Manual TalkBack: navegação completa em /memoria → /humor →
  /eventos sem getting lost.
- Smoke verde.

## 5. Decisões tomadas

- **Cores Dracula são intocáveis** — paleta canônica. Fixes só em
  uso (qual cor onde), nunca na paleta.
- **TalkBack Nível B** sob demanda — usuário aprova quando vai testar.
- **Sem aria-live para mudança de tela** — mobile nativo já tem.
