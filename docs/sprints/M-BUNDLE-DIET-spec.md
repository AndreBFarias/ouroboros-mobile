# Sprint M-BUNDLE-DIET — Auditoria + redução do bundle Hermes

```
DEPENDE:    nada
BLOQUEIA:   features futuras (8.85 MB no teto exato hoje)
ESTIMATIVA: 2-3h
PRIORIDADE: alta (margem zero para próxima feature)
```

## 1. Achado / motivação

Bundle Hermes Android atualmente em **8.85 MB**, exato limite
estabelecido em ADR/contrato. Próxima feature mediana estoura sem
margem.

Suspeitos de gordura (lista para auditar):
- `framer-motion` (transitiva via `moti`) — pesa muito; talvez moti
  alternativo ou Reanimated puro.
- `gluestack-ui` themed legacy (M01) — quanto ainda é usado?
- `@react-native-community/slider` — agora só usado em native
  (M-SLIDER-WEB-LOOP), pode haver paths web mortos.
- Múltiplos `lucide-react-native` icons importados (tree-shake?).
- `expo-document-picker` + `expo-image-picker` + `expo-file-system`
  — todos full?
- Polyfills web não-nativos vazando para Android.

## 2. Objetivo

Reduzir bundle em **300-500 KB** sem perder funcionalidade.
Liberar margem para Bloco B (M40, M36) e Bloco E (microfone, OCR,
calendário) que vêm depois.

## 3. Entregáveis

- Relatório `docs/auditoria-bundle-2026-05-04/RELATORIO.md` com
  top 30 deps por tamanho via `npx expo export --analyze`.
- PR com remoções/substituições documentadas.
- Bundle Hermes pós-fix ≤ 8.55 MB (300 KB folga mínima).

## 4. Verificação

- `npx expo export --platform android --output-dir /tmp/post`
  retorna `< 8.55 MB`.
- Smoke verde mantido.
- `__DEV__` flag em `src/lib/dev/*` continua tree-shake correto.

## 5. Decisões tomadas

- **Não substituir Reanimated** — base do projeto.
- **Não remover Moti** ainda — animações dependem.
- **Investigar `framer-motion`** primeiro — maior chance de
  remoção com replacement Reanimated direto.
