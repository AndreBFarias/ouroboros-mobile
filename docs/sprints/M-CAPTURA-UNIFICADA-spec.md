# Sprint M-CAPTURA-UNIFICADA — Câmera é decisão entre momento e documento

```
DEPENDE:    M34 fechada (MenuCapturaVerde dentro de Memórias)
            + M09 fechada OU empty state honesto pré-M09
BLOQUEIA:   M41 (release final — promessa de "Câmera" no MenuLateral
            precisa estar coerente; hoje é caminho quebrado)
ESTIMATIVA: 2-3h
PRIORIDADE: alta (UX crítica antes do release)
STATUS:     [todo]
```

## 1. Achado / motivação

Após M34 fechar, o app tem **3 pontos de entrada** semanticamente
sobrepostos para "câmera":

| Ponto | Onde | O que faz hoje | Estado |
|---|---|---|---|
| MenuLateral → "Câmera" | `src/components/chrome/MenuLateral.tsx:101` | `rotaCaptura('camera')` (FABRadial legado) | quebrado / promessa vazia |
| MenuCapturaVerde | Memórias FAB verde (M34) | Foto/Música/Vídeo/Frase — momentos | OK |
| ScannerPreview | M09 (pendente, dev-client) | OCR ML Kit + parsing → `financas/notas/` | pendente |

Resultado em release v1.0.0: usuário toca "Câmera" no menu lateral
e cai em rota inconsistente ou em FABRadial legado que mostra
opções desconectadas das que aparecem em Memórias.

**Decisão de produto (2026-05-04):** "Câmera" no menu lateral
deve ser **ponto de decisão entre 2 ramos semânticos**: registrar
momento OU escanear documento. Sem misturar na mesma sheet
(densidades de uso muito diferentes — momento é leve/rápido,
documento é OCR/parsing/multipágina).

## 2. Objetivo

Tornar o item "Câmera" do MenuLateral o **único entry-point
canônico** que ramifica para os 2 fluxos existentes (`MenuCapturaVerde`
em Memórias e `ScannerPreview` em Finanças quando M09 fechar).

## 3. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/captura.tsx`
  — rota raiz `transparentModal` (mesmo padrão M26 das 4 sheets).
  Renderiza `<SheetEscolhaCaptura>` com 2 itens:
  - **"Registrar momento"** — ícone `ImagePlus` verde
    (`colors.green`). Subtítulo: "Foto, música, vídeo ou frase."
    onPress: dismiss + navega para `/memoria` com query `?abrirCaptura=1`
    (MemoriasScreen lê o param e abre o `MenuCapturaVerde` na
    primeira render quando `?abrirCaptura=1`).
  - **"Escanear documento"** — ícone `ScanLine` cyan
    (`colors.cyan`). Subtítulo: "Nota fiscal, comprovante."
    onPress: dismiss + navega para `/scanner` (ScannerPreview da
    M09).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SheetEscolhaCaptura.tsx`
  — sheet 50% com 2 cards verticais grandes (área de toque
  generosa), tom sóbrio, sem cor de festa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/screens/SheetEscolhaCaptura.test.tsx`
  — 4 cases (render, callback de cada item, accessibility labels,
  dismiss).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/e2e/playwright/m-captura-unificada.e2e.ts`
  — E2E navega `/captura`, valida 2 cards, clica "Registrar
  momento" → confirma navegação para `/memoria` com query, valida
  abertura automática do `MenuCapturaVerde`.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuLateral.tsx`
  — item "Câmera" passa a apontar para `rotaCaptura = '/captura'`
  (rota nova) em vez de `rotaCaptura('camera')` legado.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasScreen.tsx`
  — `useLocalSearchParams<{ abrirCaptura?: string }>()`. Em mount,
  se `abrirCaptura === '1'`, agenda abertura do
  `<MenuCapturaVerde>` via ref (1 frame após mount, evita race com
  hidratação).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/rotasSemFAB.ts`
  — adiciona `/captura` (FAB principal não deve renderizar sobre
  modal de escolha).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — registra `<Stack.Screen name="captura" options={{ presentation:
  'transparentModal', animation: 'fade_from_bottom', contentStyle:
  { backgroundColor: '#14151a' } }} />` (padrão M26).

### Arquivos NÃO modificados

- `app/scanner.tsx` / `<ScannerPreview>` (M09) — quando fechar,
  funciona automaticamente porque `/captura` já encaminha para
  `/scanner`.
- `MenuCapturaVerde` continua dentro de Memórias como caminho
  rápido contextual (não é deprecado — usuário em Memórias usa
  ele direto).

## 4. Comportamento pré-M09

Enquanto M09 (ScannerPreview com OCR) ainda não fechou, "Escanear
documento" navega para `/scanner` que mostra **empty state
honesto** (mesma estética de M35):

```tsx
<EmptyState
  Icon={ScanLine}
  frase="Em desenvolvimento. Disponível em versão futura."
  subtexto="O scanner exige câmera nativa em build dev-client."
/>
```

`app/scanner.tsx` já existe (M08 criou); ajustar para mostrar
empty state condicional via flag `EXPO_PUBLIC_SCANNER_HABILITADO`
ou simplesmente verificar se ML Kit está disponível em runtime.

## 5. APIs reutilizáveis

- `<BottomSheet>`, `<Screen padded={false}>`, `<OuroborosLoader
  compacto />` (padrão M26).
- `useRouter`, `useLocalSearchParams` (expo-router).
- `<EmptyState>` para o caminho pré-M09.

## 5.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:
- **Rota raiz nova** `/captura` registrada em `_layout.tsx` com
  `transparentModal` (padrão M26 §7.10 z-index).
- **MenuLateral** repurposa item existente, sem nova entrada.
- **`rotasSemFAB.ts`** atualizado.
- **Sem schema novo, sem store novo.**

## 6. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR completa
  ("Registrar momento", "Escanear documento", "Nota fiscal,
  comprovante.").
- Comentários sem acento.
- TS strict.
- ADR-0010 estética: 2 cards grandes, área de toque ≥ 64dp,
  espaçamento generoso, sem cor de festa, sem badge "novo".
- Sheet abre com `index={0}` direto (evita Armadilha A17/A18).

## 7. Aritmética esperada

- 1260 → 1268-1275 testes (+8-15: SheetEscolhaCaptura unit + E2E
  + ajuste em testes existentes do MenuLateral).
- 139 → 140 suítes (+1).
- Bundle Hermes ≤ 8.85 MB (mudança puramente JS, sem deps novas).
- 1 E2E novo em `tests/e2e/playwright/m-captura-unificada.e2e.ts`.

## 8. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh

# Validacao Gauntlet (orquestrador):
./gauntlet.sh
# 1. Abre /_dev/gauntlet
# 2. seed({ nomeA: 'Alex', nomeB: 'Sam' })
# 3. abrir('/captura') -- valida 2 cards renderizam.
# 4. Click "Registrar momento" -- confirma navegacao para
#    /memoria com MenuCapturaVerde aberto.
# 5. abrir('/captura') de novo, click "Escanear documento" --
#    confirma navegacao para /scanner com empty state pre-M09
#    OU ScannerPreview se M09 ja fechou.
```

## 9. Checkpoint visual

3 screenshots Nível A+ (Gauntlet) em
`docs/sprints/M-CAPTURA-UNIFICADA-screenshots-gauntlet/`:
- `A-sheet-2-opcoes.png` — sheet aberto com 2 cards.
- `B-momento-abrindo-memorias.png` — pós-click "Registrar
  momento", MenuCapturaVerde visível em Memórias.
- `C-documento-empty-state.png` — pós-click "Escanear documento"
  em pré-M09 (ou ScannerPreview real se já fechou).

## 10. Decisões tomadas

- **`/captura` como rota modal raiz** (não como sheet inline em
  Memórias): permite acesso a partir do MenuLateral em qualquer
  contexto, sem forçar entrada via Memórias.
- **2 ramos, não 1 sheet com 5 itens**: densidade de uso e
  semântica são incompatíveis (momento = leve/instantâneo;
  documento = OCR/parsing/multipágina). Forçar na mesma sheet
  reduz clareza.
- **`MenuCapturaVerde` em Memórias preservado**: caminho rápido
  contextualizado quando o usuário já está em Memórias. Não
  duplica funcionalidade — é atalho.
- **Query `?abrirCaptura=1`**: permite que `/captura` →
  "Registrar momento" abra o MenuCapturaVerde automaticamente sem
  precisar do usuário tocar de novo. Padrão expo-router já usado
  em outras rotas.
- **Empty state pré-M09 honesto**: M35 já estabeleceu o padrão
  ("Em desenvolvimento. Disponível em versão futura."). Reusar.
- **Bloqueia M41 (release)**: "Câmera" no MenuLateral hoje é
  promessa vazia; release v1.0.0 com botão quebrado é débito que
  vira issue do usuário no GitHub.

Sprint pronta para execução sem perguntas pendentes.
