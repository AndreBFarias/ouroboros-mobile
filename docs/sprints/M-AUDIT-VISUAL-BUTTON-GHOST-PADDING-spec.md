# Sprint W1.1 — M-AUDIT-VISUAL-BUTTON-GHOST-PADDING

```
DEPENDE:    W1 fechada
BLOQUEIA:   nada (cosmético; pode rodar antes ou depois APK preview)
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Achado colateral revelado durante W1 (M-AUDIT-VISUAL-WARNS): o
componente `<Button variant="ghost">` em `src/components/ui/Button.tsx`
tem `paddingVertical: 16` mas **zero `paddingHorizontal`**. Texto longo
em ghost button aproxima-se das bordas do pill, criando aspecto
"colado".

W2 corrigiu o sintoma (botão Recap) com **wrapper externo**, e W4
fez o mesmo com "Usar localização atual". Esta sprint corrige a
**raiz** ajustando o variant ghost, e remove os wrappers externos
agora redundantes em W2 e W4.

## 2. Entregáveis

### Arquivos modificados

- `src/components/ui/Button.tsx` (linhas 108-124, variant `ghost`):
  adicionar `paddingHorizontal: spacing.base` (16dp) ao bloco do variant.
  Considerar se `compact` (se existir) precisa de override menor.
- `app/index.tsx` (linha do header Recap): remover o wrapper externo
  `<View style={{ paddingHorizontal: spacing.base }}>` adicionado em W2
  agora que o pill tem padding próprio. Se manter, o botão fica com
  padding duplicado (32dp) e visualmente exagerado.
- `src/components/eventos/LocalizacaoBlock.tsx`: similar — manter
  `flexShrink: 0` (W4 corretivo de comprime), mas remover
  `paddingHorizontal: spacing.sm` do wrapper externo.

### Arquivos novos

- (opcional) caso E2E em `tests/e2e/playwright/m-audit-visual-button-ghost.e2e.ts`
  medindo `paddingLeft` / `paddingRight` dos pills ghost em 2-3 rotas.

## 3. APIs reutilizáveis

- `src/theme/tokens.ts` (`spacing.base = 16`).

## 4. Restrições

Padrão. **Cuidado com regressão**: ghost button é compartilhado por
ao menos 4 instâncias (Recap, Importar backup, Limpar cache local,
Usar localização atual + outras possíveis). Validar visualmente cada
uma após o ajuste.

## 5. Validação Gauntlet

PNGs antes/depois de cada instância em
`docs/sprints/M-AUDIT-VISUAL-BUTTON-GHOST-PADDING-screenshots-gauntlet/`.

## 6. Procedimento

1. Localizar via grep todas as instâncias de `<Button variant="ghost"`
   no código (`grep -rn 'variant="ghost"' src/ app/`).
2. Listar antes do fix.
3. Aplicar `paddingHorizontal: spacing.base` no variant.
4. Remover wrappers redundantes de W2 e W4.
5. Validar visualmente cada instância no Gauntlet.
6. Smoke verde.

## 7. Verificação

```bash
npx tsc --noEmit
npm test
./scripts/smoke.sh
grep -c 'variant="ghost"' src/ app/  # contar instâncias afetadas
```

## 8. Commit

```
fix: m-audit-visual-button-ghost-padding raiz + remove wrappers w2 w4
```

## 9. Checkpoint visual

PNGs antes/depois batch.

### Checklist

- [ ] `STATE.md`, `ROADMAP.md`, `CHANGELOG.md`.

## 10. Decisão resolvida

`paddingHorizontal: spacing.base = 16dp`. Outras instâncias compartilhadas
ganham respiração interna automática. Wrappers W2/W4 ficam com 32dp
duplicado se mantidos — devem ser removidos.
