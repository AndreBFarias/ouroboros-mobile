# R-A11Y-TALKBACK — Auditoria de navegação por screen reader (TalkBack)

**Tipo**: audit + feature (correções localizadas)
**Prioridade**: P2-medium
**Estimativa**: 3-5h
**Tranche**: R-A11Y (nova, derivada do achado #7 + Decisão D8=Agora)
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §Achados → #7.

**Decisão**: D8 = AGORA (não v1.1, dono autorizou em 2026-05-15).

## Objetivo

Auditar e corrigir navegação por screen reader TalkBack (Android).
WCAG visual já está coberto (contraste M01.5/M01.6 + tokens
Dracula). Esta sprint cobre o eixo **navegação assistiva**:
focus order, accessibilityLabel, accessibilityRole, traversal,
gestures.

## Entregáveis

### Auditoria (parte 1: descobrir)

Rodar TalkBack no Xiaomi 2312DRAABG em modo real + percorrer as
10 rotas mais usadas:
- `/` (Tela Hoje)
- `/humor-rapido`
- `/diario-emocional` (Reflexão pós R0)
- `/eventos`
- `/recap` (lista + memórias)
- `/galeria`
- `/saude-fisica`
- `/rotinas`
- `/settings`
- `/agenda`

Gerar relatório `docs/auditoria-a11y-2026-MM-DD/RELATORIO.md` com:
- Itens sem `accessibilityLabel` (lista cada um)
- Itens com label vazia ou genérica (ex: "Button")
- Focus order quebrado (TalkBack pula elementos importantes)
- `accessibilityRole` ausente em botões/links/headers
- BottomSheet inacessível (focus trap)
- FAB sem hint contextual
- Imagens decorativas com label (deveria ser `accessibilityRole="none"`)

### Correções (parte 2: implementar)

Para cada finding crítico/alto, adicionar:
```tsx
<Pressable accessibilityRole="button" accessibilityLabel="Fechar">
  <X />
</Pressable>
```

Audit transversal de strings em `accessibilityLabel`:
- **Sem acento** (convenção projeto — confirmada via CLAUDE.md)
- Verbo-objeto direto ("Fechar", "Abrir menu", "Salvar humor")
- Sem prefixo "Botão" (TalkBack já anuncia role)

### Testes

- Novo `tests/a11y/talkback-labels.test.tsx` — varre rotas mockadas
  via Testing Library, assert que cada interactive element tem
  label não-vazia.
- Atualizar `scripts/check_strings_ui_ptbr.py` se necessário —
  `accessibilityLabel` mantém sem acento, demais labels com acento
  completo.

### Integração no smoke (opcional)

Adicionar warning não-bloqueante:
```bash
echo ">> a11y labels coverage"
npx jest tests/a11y --silent 2>&1 | tail -3
```

## Dependências

- **Bloqueia**: nada (feature paralela)
- **Bloqueado por**: R0 (lexical — labels novas precisam usar
  "Crise/Conquista/Reflexão" pós-renomeação)

## OFF-LIMITS

Padrão T1. **Pode tocar**: qualquer componente em
`src/components/` para adicionar/corrigir `accessibilityLabel`.
**Não tocar**: lógica de comportamento, só semântica a11y.

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test: TalkBack ativado no Xiaomi, percorrer 10 rotas
adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
# Validar manualmente
```

## Proof-of-work

1. Relatório `docs/auditoria-a11y-2026-MM-DD/RELATORIO.md` com lista
   numerada de findings (crítico/alto/médio/baixo).
2. Lista de arquivos modificados (correções).
3. Saída `npx jest --silent | tail -5` — esperado +N testes a11y.
4. Saída `./scripts/smoke.sh`.
5. **Hash do commit (OBRIGATÓRIO)**.
6. Path do worktree + branch.
7. Vídeo/screencast (opcional) do TalkBack percorrendo Tela Hoje +
   Recap sem perder elementos.
8. Achados colaterais.

## Decisões tomadas

- **TalkBack obrigatório** (não outros screen readers — Android
  cobertura suficiente pra v1.0).
- **AccessibilityLabel sem acento** (convenção projeto preservada).
- **Foco em interactive elements** (botões, links, sliders);
  textos puros já são lidos pelo TalkBack automaticamente.
- **WCAG visual já coberto** anteriormente (C2/C2.x) — esta sprint
  é só navegação assistiva.
