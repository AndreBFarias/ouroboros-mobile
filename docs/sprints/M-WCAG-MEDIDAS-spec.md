# Sprint M-WCAG-MEDIDAS — Touch target dos botoes de remover foto

```
DEPENDE:    M-WCAG-COMPLETO
BLOQUEIA:   M41
ESTIMATIVA: 20min
PRIORIDADE: media
```

## 1. Achado / motivacao

Auditoria 2026-05-04 (`docs/auditoria-wcag-2026-05-04/RELATORIO.md`
secao 3 linha 27) detectou:

- `app/medidas/novo.tsx` linha 378 — botao remover foto eh um
  Pressable de 22x22dp com `hitSlop={6}`, totalizando 34dp
  efetivo. WCAG AA exige >= 44x44dp.

## 2. Objetivo

Botoes "remover foto" no formulario de medidas atendem WCAG AA
2.5.5 (Target Size).

## 3. Entregaveis

- Edit em `app/medidas/novo.tsx` (linhas 378-397):
  - Trocar `width: 22, height: 22` para `width: 28, height: 28`
    (tamanho visual aumentado discretamente).
  - Trocar `hitSlop={6}` para `hitSlop={12}` (= 52dp efetivo).
  - Manter posicao `top: 4, right: 4` e cor `colors.red`.
- Verificar se existe padrao similar em outros forms (eventos,
  marcos, exercicios) e replicar se aplicavel.

## 4. Verificacao

- Pressable atinge >= 44dp efetivo (28 + 12*2 = 52).
- Visual permanece discreto (28dp e ~27% maior, ainda nao
  domina a thumbnail).
- Smoke verde, tsc 0.

## 5. Decisoes tomadas

- Aumentar visual de 22 -> 28 (margem de seguranca para garantir
  toque preciso em dedos grandes, sem agredir o layout).
- Manter cor `red` (sobre thumbnail mas com contraste suficiente
  por icone branco strokeWidth 2.4).
