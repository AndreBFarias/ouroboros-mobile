# AUDIT-P4-7-TESTES-FRACOS — fortalecer 7 testes com asserção fraca ou ausente e mapear gap de E2E

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (falso senso de cobertura — os testes passam sempre,
            independente do comportamento real do código sob teste)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-9]/[P3-4] da auditoria de 2026-07-28. Confirmado
            nesta materialização lendo os 7 arquivos de teste, o
            jest.setup.cjs/jest.afterEach.cjs (para confirmar ausência
            de transformação de console.warn/error em falha), e
            checando a existência e conteúdo das 12 pastas de
            screenshot-gauntlet sem E2E correspondente.
```

## Problema (dois grupos: 1 teste sem asserção real, 6 com asserção comprovadamente fraca)

### Sem nenhum `expect` real

`tests/components/midia/MidiaPreviewSpotifyYoutube.test.tsx:179-194`,
teste `"nao atualiza estado apos unmount (cancelado)"`:

```tsx
it('nao atualiza estado apos unmount (cancelado)', async () => {
  let resolve!: (v: unknown) => void;
  mockObterOembed.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
  const { unmount } = render(<MidiaPreviewSpotifyYoutube url={URL_YT} />);
  unmount();
  await act(async () => {
    resolve(DADO_YT);
    await Promise.resolve();
  });
  // Sem assert explicito; o teste passa se nao houver warning de
  // "state update on unmounted component".
});
```

O comentário do próprio autor admite a ausência de assert. Confirmado
por leitura de `jest.setup.cjs`/`jest.afterEach.cjs`: **nenhuma**
configuração transforma `console.error`/`console.warn` em falha de
teste neste projeto. Logo este teste **passa incondicionalmente**,
esteja o bug de atualização pos-unmount presente ou não — zero proteção
real de regressão, apesar da aparência de teste de cleanup.

### Asserção comprovadamente fraca (6 casos)

`tests/components/ui/Chip.test.tsx:117-123`, teste
`"seleciona e desseleciona"` — o mais grave da lista:

```tsx
it('seleciona e desseleciona', () => {
  const { getByLabelText } = render(<HarnessSingle />);
  const chipA = getByLabelText('chip a');
  fireEvent.press(chipA);
  fireEvent.press(chipA);
  expect(chipA).toBeTruthy();
});
```

`chipA` e obtido **antes** dos dois toques e a única asserção
(`toBeTruthy()`) é sobre essa referência de nó — verdadeira
independentemente de qualquer clique ter acontecido. O teste não
verifica `accessibilityState.selected`, cor, nem o callback `onChange`
em nenhum momento. O nome promete verificar o toggle de seleção; a
asserção não verifica nada relacionado a isso.

Os outros 5:

| Arquivo:linha | Teste | Fraqueza |
|---|---|---|
| `tests/lib/vault/tarefas.test.ts:189-193` | "retorna meta quando existe" | `expect(out).not.toBeNull()` — não confere que `out` contem os dados mockados (`meta`/`body`), só que não é nulo |
| `tests/lib/cache/oembedCache.test.ts:98-106` | "aceita entrada com 6 dias (dentro do TTL)" | `expect(r).not.toBeNull()` — não confere que `r` seja igual a `DADO_VALIDO`, só que não é nulo |
| `tests/lib/exercicios/grupos.test.ts:13-17` | "cobre todos os slugs no mapa de labels" | `expect(GRUPOS_MUSCULARES_LABELS[slug]).toBeTruthy()` para 8 slugs — confere presença, não correção do texto |
| `tests/lib/navigation/captureRoutes.test.ts:83-88` | "CAPTURE_ROUTES expoe entrada para cada FABRadialKey" | `toBeDefined()`/`toBeTruthy()` por chave — confere presença de `pathname`, não o valor esperado da rota |
| `tests/components/todo/SheetNovaTarefa.test.tsx:192-196` | "cobre todas as 8 categorias canônicas no mapping de accents" | `expect(CATEGORIA_ACCENTS[cat]).toBeDefined()` — confere presença, não a cor semântica correta |

Em `grupos.test.ts` e `SheetNovaTarefa.test.tsx` há mitigação parcial:
um teste adjacente confere valores exatos para um subconjunto (3 de 8
labels; unicidade via `Set`, não os 8 valores exatos) — a fraqueza é
real mas não total.

### Sprints com evidência de Gauntlet mas sem E2E correspondente

Usando "tem pasta `*-screenshots-gauntlet`" como prova de que a sprint
tocou UI e passou pelo pipeline obrigatório (regra do arquivo de regras
da raiz, datada 2026-05-04), 12 sprints ficam sem nenhum E2E localizável (nem
por nome de arquivo, nem por menção no corpo de qualquer `.e2e.ts`) —
confirmado nesta materialização com `grep -ril` de cada ID sobre
`tests/e2e/playwright/`:

| Sprint | Arquivos na pasta de screenshot | Situação |
|---|---:|---|
| `R-RECAP-3` | 0 (só `.gitkeep`) | **Justificada.** `.gitkeep` documenta colisao de porta com executor paralelo; evidência substituta = `RecapScreen-empty.test.tsx` + `recap-empty-states.test.ts` |
| `R-RECAP-6` | 1 (`NOTAS.md`, sem imagem) | **Justificada.** `NOTAS.md` documenta bloqueio por `react-native-view-shot` ausente no worktree do executor e pede validação humana pos-merge; evidência substituta = 18 testes em 2 arquivos |
| `I-DIARIO-REFLEXAO-RECAP` | 2 | Sem justificativa encontrada |
| `M-FAB-MENU-SAFE-BOTTOM` | 1 | Sem justificativa encontrada |
| `M-VAULT-LAYOUT-POR-TIPO` | 1 | Sem justificativa encontrada |
| `M-VAULT-PASTA-NAO-HARDCODED` | 3 | Sem justificativa encontrada |
| `M-VAULT-URI-HELPER` | 1 | Sem justificativa encontrada |
| `R-CRIT-4` | 3 | Sem justificativa encontrada |
| `R-MEDIA-1` | 1 | Sem justificativa encontrada |
| `R-MEDIA-2` | 6 | Sem justificativa encontrada |
| `R-RECAP-FIX-LOOP` | 5 (+ 3 logs de console) | Sem nota textual, mas tem evidência substituta forte: 3 `console-log-*.txt` (pre-fix/pos-fix) anexados na própria pasta |
| `R-WIDG-1` | 1 | Sem justificativa encontrada |

Ou seja: 2 das 12 têm justificativa documentada de forma explícita
(`R-RECAP-3`, `R-RECAP-6`); as outras 10 não têm nota nem substituto
formal registrado no diretório (`R-RECAP-FIX-LOOP` tem evidência
substituta informal — logs de console — mas sem nota explicando por
que o E2E não foi escrito).

## Escopo (mínimo)

1. `MidiaPreviewSpotifyYoutube.test.tsx:179` — adicionar assert real:
   capturar `console.error`/`console.warn` via spy e afirmar
   `expect(spy).not.toHaveBeenCalled()`, ou reestruturar o teste para
   afirmar que o estado não mudou (ex.: expor um callback de render-count
   e verificar que não incrementou após o unmount).
2. `Chip.test.tsx:117` — reobter `chipA` **depois** de cada
   `fireEvent.press` e afirmar `accessibilityState.selected` (ou o
   valor recebido pelo `onChange`) em cada etapa: selecionado após o
   1o toque, desselecionado após o 2o.
3. `tarefas.test.ts:189` — trocar `not.toBeNull()` por
   `toEqual(expect.objectContaining({ meta: ..., body: '' }))` com os
   valores mockados reais.
4. `oembedCache.test.ts:98` — trocar `not.toBeNull()` por
   `toEqual(DADO_VALIDO)`.
5. `grupos.test.ts:13` — trocar o loop de `toBeTruthy()` por valores
   exatos esperados para os 8 slugs (ou ao menos estender a lista já
   verificada exatamente de 3 para 8).
6. `captureRoutes.test.ts:83` — afirmar o `pathname` exato esperado por
   `FABRadialKey`, não só presença.
7. `SheetNovaTarefa.test.tsx:192` — afirmar a cor semântica exata
   esperada por categoria, não só presença no mapa.
8. Para os 10 gaps de E2E sem justificativa (excluindo `R-RECAP-3` e
   `R-RECAP-6`, já documentados): adicionar uma nota `NOTAS.md` no
   diretório de screenshot de cada um, registrando a decisão (E2E
   pendente, com motivo, ou aceitar formalmente a mitigação por Jest
   quando houver) — não escrever os 10 E2E novos nesta sprint (esforco
   maior, escopo de sprint de continuação por feature).
9. NÃO-objetivo: não reescrever os 111 testes E2E existentes; não
   tratar aqui o achado relacionado de `r-int-4-youtube-picker.e2e.ts`
   (retorna `INCONCLUSIVO` em vez de falhar) — é um achado de
   comportamento de teste específico de integração, não de asserção
   fraca genérica, fora do escopo desta sprint de higiene.

## Proof-of-work

```bash
npx tsc --noEmit                                                     # exit 0
npm test -- MidiaPreviewSpotifyYoutube Chip tarefas oembedCache grupos captureRoutes SheetNovaTarefa
# 7 suites verdes, com as novas asserções realmente testando o comportamento
npm test --silent                                                    # 356 suites, nenhuma quebrada
ls docs/sprints/{I-DIARIO-REFLEXAO-RECAP,M-FAB-MENU-SAFE-BOTTOM,M-VAULT-LAYOUT-POR-TIPO,M-VAULT-PASTA-NAO-HARDCODED,M-VAULT-URI-HELPER,R-CRIT-4,R-MEDIA-1,R-MEDIA-2,R-RECAP-FIX-LOOP,R-WIDG-1}-screenshots-gauntlet/NOTAS.md
# 10 arquivos NOTAS.md novos, um por diretorio
./scripts/smoke.sh                                                    # verde
```

Sprint de teste, sem alteração de UI — dispensa caso E2E novo próprio
(o item 8 do Escopo documenta o gap de E2E de outras sprints, não
adiciona feature nova).

## Commit

```
test: audit-p4-7-testes-fracos fortalece 7 assercoes fracas e documenta gap de e2e em 10 sprints
```

---

## Fechamento (execução de 2026-09-05)

### Correções de escopo em relação ao Escopo mínimo acima

Dois dos sete itens estavam baseados em leitura incompleta do
repositório. Registrado aqui para não virar retrabalho na validação.

- **Item 6 (`captureRoutes.test.ts:83`)** pedia afirmar o `pathname`
  exato por `FABRadialKey`. Isso **já existia** em
  `tests/lib/navigation/captureRoutes.test.ts:26-59`, um teste por
  chave, com `params` inclusive. Escrever de novo seria duplicação. O
  que de fato faltava era a **totalidade** do mapa, e é isso que a
  asserção nova guarda: `Object.keys(CAPTURE_ROUTES)` contra a lista de
  chaves. Mutação de prova: uma entrada órfã adicionada a
  `CAPTURE_ROUTES` reprova só o teste novo (1 falha, 7 passes) — a
  asserção antiga passava.
- **Item 7 (`SheetNovaTarefa.test.tsx:192`)** pedia afirmar a cor
  semântica exata por categoria. Isso **já existia** em
  `tests/components/todo/SheetNovaTarefa.test.tsx:211-219`
  (`expect(CATEGORIA_ACCENTS).toEqual({…})`, as 8 cores literais). A
  asserção fraca foi trocada por paridade de chaves entre
  `CATEGORIA_ACCENTS` e `TAREFA_CATEGORIAS`, que é a única direção que
  nenhum dos dois testes cobria (accent órfão após remover categoria).

### Limitação declarada no item 1 (`MidiaPreviewSpotifyYoutube`)

O gap **não foi fechado** e não deve ser lido como fechado. O React 19
não emite mais o aviso de state update em componente desmontado, e o
estado de um componente já desmontado não é alcançável pelo teste. Logo
o guard `cancelado` do `useEffect` não é observável por asserção neste
setup.

Prova de que a limitação é real: removendo
`if (cancelado) return;` de
`src/components/midia/MidiaPreviewSpotifyYoutube.tsx`, a suite continua
`13 passed, 13 total`.

O que o teste passou a guardar, e que antes não guardava nada: que o
efeito disparou com a URL certa antes do unmount, e que resolver a
promise depois do unmount não estoura erro nem aviso no console. A
limitação está escrita no corpo do próprio teste, não só aqui.

### Item 8 — as 10 NOTAS.md

Escritas, uma por pasta. Duas observações que mudam o resultado em
relação ao que o spec assumia:

- `M-VAULT-URI-HELPER` **não era gap**: o §5 do spec dela já dizia
  "Validação Gauntlet: não aplicável (helper puro JS, sem UI)". A
  justificativa existia, só não estava no diretório.
- `R-WIDG-1` **não era gap**: o E2E existe com outro nome, escrito
  depois — `tests/e2e/playwright/audit-p1-1a-widget-todo-dreno.e2e.ts`,
  da sprint AUDIT-P1-1A. A busca da auditoria procurou pelo
  identificador `R-WIDG-1` e por isso não achou.

Dos 10, ficam classificados como dívida de teste: `I-DIARIO-REFLEXAO-RECAP`
(o spec nomeia `m-recap-reflexoes.e2e.ts`, que não existe),
`M-VAULT-PASTA-NAO-HARDCODED`, `R-CRIT-4` e `R-MEDIA-1`.

### Aviso de commit

As 10 pastas `*-screenshots-gauntlet/` são **untracked** e contêm PNGs.
Um `git add` de diretório estagia screenshots em repositório público.
Cada `NOTAS.md` precisa entrar por caminho explícito.
