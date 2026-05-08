# Sprint W1 — M-AUDIT-VISUAL-WARNS

```
DEPENDE:    HEAD em 9c385b3 (RELATORIO 2026-05-08)
BLOQUEIA:   APK preview (qualidade UX)
ESTIMATIVA: ~3-4h
STATUS:     [todo]
```

## 1. Objetivo

Sprint consolidada que aplica os 7 patches WARN identificados na
auditoria visual 2026-05-08. Cada patch toca componente diferente; um
único commit batch fecha todos.

## 2. Entregáveis

### Arquivos modificados

| W# | Arquivo | Mudança |
|---|---|---|
| W1 | Frame 1 do `app/onboarding.tsx` | Chips "Sozinho/Com mais alguém" ganham `borderWidth: 1` + `borderColor: bg-elev` outline + selected gets `bg: purple30`. Padroniza com chips do Frame 0. |
| W2 | Botão "Recap" em `app/index.tsx` (header) | Aplicar `paddingHorizontal: spacing.md` ao wrapper do `<Button compact>` para garantir respiração interna ≥ 16dp. |
| W3 | Tab "Evolução Corporal" em `app/saude-fisica.tsx` | Reduzir font-size do tab label OU encurtar para "Evolução" só, OU permitir que o tab cresça em altura mantendo 1 linha. Decisão: encurtar para "Evolução". |
| W4 | Botão "Usar localização atual" em `app/eventos.tsx` | Adicionar `flexShrink: 0` + `paddingHorizontal: spacing.sm` para o texto não vazar do pill. |
| W5 | Loader Ouroboros em `app/scanner.tsx` | Confirmar se é intencional ou regressão M25.2. Se ornamental, manter; se bug, remover. |
| W6 | Subtítulo toggle "Vibrar em botões e gestos" em `app/settings/index.tsx` | "Humor, fab, registros rápidos." → "Humor, FAB, registros rápidos." (FAB acrônimo em CAPS). |
| W7 | `paddingBottom` em `app/settings/index.tsx` | Adicionar `contentContainerStyle.paddingBottom = useSafeBottomMargin + spacing.xl` para FAB hambúrguer não cobrir últimas seções. |

## 3. APIs reutilizáveis

- `src/theme/tokens.ts` (`spacing`).
- `src/components/chrome/safeBottom.ts` (`useSafeBottomMargin`).

## 4. Restrições

Padrão. Cada patch pequeno e focado. Sem refatoração além do necessário.

## 5. Validação Gauntlet

PNGs antes/depois para cada W em
`docs/sprints/M-AUDIT-VISUAL-WARNS-screenshots-gauntlet/W{1..7}-{antes,depois}.png`.

## 6. Procedimento

Aplicar os 7 patches em ordem, validar cada um via Gauntlet, smoke verde
após batch.

## 7. Verificação

Smoke + tsc + testes.

## 8. Commit

```
fix: m-audit-visual-warns 7 patches w1-w7
```

## 9. Checkpoint visual

PNGs antes/depois batch.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`, `FEATURES-CANONICAS.md`.

## 10. Dúvidas em aberto

W3: encurtar "Evolução Corporal" para "Evolução" só, OU manter texto
completo mas com font menor? Confirmar com dono na execução.
W5: loader é intencional? Confirmar antes de remover.
