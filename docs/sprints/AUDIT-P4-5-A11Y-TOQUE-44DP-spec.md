# AUDIT-P4-5-A11Y-TOQUE-44DP — aumentar hitSlop de 3 botões-ícone abaixo do mínimo de toque

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: baixa (semântica de acessibilidade já correta — só a área
            física de toque fica abaixo do mínimo WCAG 2.5.5)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-7]/[UI-07] da auditoria de 2026-07-28. Confirmado
            nesta materialização lendo os 3 componentes e medindo
            View + hitSlop diretamente no código.
```

## Problema (área de toque efetiva abaixo de 44dp em 3 botões-ícone)

Três `Pressable` com ícone têm área de toque efetiva abaixo do mínimo
de 44dp (WCAG 2.5.5 Target Size), apesar de todos terem
`hitSlop` aplicado:

```tsx
// src/components/todo/BarraBusca.tsx:72-87 -- botao "limpar busca"
<Pressable onPress={() => onChangeText('')} hitSlop={8} ...>
  <View style={{ width: 22, height: 22, ... }}>
    <X size={16} .../>
  </View>
</Pressable>
```
Área visual 22x22 + hitSlop 8 por lado = **38dp** efetivo (22 + 8*2).

```tsx
// src/components/midia/MidiaPicker.tsx:146-163 -- botao "remover midia"
<Pressable onPress={onRemove} hitSlop={6}
  style={{ width: 22, height: 22, borderRadius: 11, ... }}>
  <X size={14} .../>
</Pressable>
```
Área visual 22x22 + hitSlop 6 por lado = **34dp** efetivo.

```tsx
// src/components/eventos/FotosBlock.tsx:111-127 -- botao "remover foto"
<Pressable onPress={() => remover(idx)} hitSlop={6}
  style={{ width: 22, height: 22, borderRadius: 11, ... }}>
  <X size={14} .../>
</Pressable>
```
Área visual 22x22 + hitSlop 6 por lado = **34dp** efetivo.

Os três têm `accessibilityRole` e `accessibilityLabel` corretos — o
problema é exclusivamente a área física de toque, não a semântica de
acessibilidade. Cenário concreto: em `MidiaPicker`/`FotosBlock`, uma
pessoa com destreza motora reduzida tentando remover uma mídia ou foto
erra o toque com mais frequência do que num alvo de 44dp, especialmente
porque o botão fica sobreposto ao canto de uma miniatura (risco
adicional de tocar a própria miniatura em vez do X).

Nota de precisão: o projeto **já resolveu** este mesmo tipo de achado
em outro componente — `app/medidas/novo.tsx` (botão "remover foto" do
formulário de Medidas, sprint M-WCAG-MEDIDAS) tem hitSlop calibrado
para exatamente 44dp efetivo, com E2E próprio
(`tests/e2e/playwright/m-wcag-medidas.e2e.ts`). E um botão homônimo mas
em arquivo diferente do `FotosBlock.tsx` desta sprint — não há
conflito, só reforça que o padrão de correção já existe no projeto e
só precisa ser replicado nestes 3 pontos.

**NÃO-objetivo, tensão reconhecida:** o grid do heatmap
(`src/components/data/HeatmapBase.tsx:80,119-120,146` e
`src/components/data/HumorHeatmap.tsx:125,170-171,197`) tem
`cellSize = 14` (default, sem override em nenhum call site) +
`hitSlop={4}` = 22dp efetivo por célula — bem abaixo de 44dp. Não é
tratado como bug desta sprint: o grid representa 91 dias (13x7
células); elevar cada célula para 44dp tornaria o heatmap mais largo
que a própria tela (13 * 44 = 572dp). E a mesma tensão que calendários
de contribuição (estilo GitHub) enfrentam em mobile — densidade de
informação versus área de toque, decisão de design que não cabe
resolver como correção pontual.

## Escopo (mínimo)

1. `src/components/todo/BarraBusca.tsx:74` — aumentar `hitSlop={8}`
   para `hitSlop={11}` (22 + 11*2 = 44dp).
2. `src/components/midia/MidiaPicker.tsx:150` — aumentar `hitSlop={6}`
   para `hitSlop={11}` (22 + 11*2 = 44dp).
3. `src/components/eventos/FotosBlock.tsx:115` — aumentar `hitSlop={6}`
   para `hitSlop={11}` (22 + 11*2 = 44dp).
4. Caso E2E seguindo o padrão já estabelecido pelo próprio projeto para
   este problema exato — `tests/e2e/playwright/m-wcag-medidas.e2e.ts`
   documenta que "o React Native Web NÃO emite hitSlop como CSS", então
   o asserto precisa ler o source TSX (via `fetch` do dev server) e
   extrair `hitSlop=\{(\d+)\}` + o `width`/`height` do `View` interno,
   calculando `efetivo = visual + hitSlop*2`, em vez de medir
   `getBoundingClientRect()` (que só capturaria o elemento visual,
   não a expansão do hitSlop). Criar
   `tests/e2e/playwright/audit-p4-5-a11y-toque-44dp.e2e.ts` cobrindo os
   3 arquivos, com asserto `efetivo >= 44` para cada um.
5. NÃO-objetivo: não alterar o heatmap (`HeatmapBase.tsx`/
   `HumorHeatmap.tsx`) — tensão de design documentada acima, decisão
   fora do escopo desta correção pontual; não auditar os ~40 demais
   usos de `hitSlop` do projeto (fora do escopo; a auditoria de origem
   amostrou ~12 e não encontrou outro caso abaixo do mínimo, mas não é
   varredura exaustiva).

## Proof-of-work

```bash
grep -n "hitSlop={8}" src/components/todo/BarraBusca.tsx        # vira hitSlop={11}
grep -n "hitSlop={6}" src/components/midia/MidiaPicker.tsx       # vira hitSlop={11}
grep -n "hitSlop={6}" src/components/eventos/FotosBlock.tsx      # vira hitSlop={11}
npx tsc --noEmit                                                  # exit 0
npm test -- BarraBusca MidiaPicker FotosBlock                     # suites verdes
./gauntlet.sh
# rodar audit-p4-5-a11y-toque-44dp.e2e.ts via automacao de browser
# resultado esperado: PASS, efetivo=44 nos 3 componentes
./scripts/smoke.sh                                                # verde
```

Screenshots em
`docs/sprints/AUDIT-P4-5-A11Y-TOQUE-44DP-screenshots-gauntlet/`
confirmando paridade visual (o aumento de hitSlop não muda a aparência,
só a área de toque).

## Commit

```
fix: audit-p4-5-a11y-toque-44dp aumenta hitslop de barrabusca midiapicker e fotosblock para 44dp efetivo
```

---

## Execução (2026-09-05) — correção da conta do próprio spec

O escopo acima (itens 1–3) manda `hitSlop={11}` nos três botões, com a
conta `22 + 11*2 = 44`. **Essa conta está errada em dois dos três
casos** e foi corrigida na execução.

No React Native, "the touch area never extends past the parent view
bounds"
(`node_modules/react-native/Libraries/Components/View/ViewPropTypes.d.ts`),
e o hit-test do Android devolve `null` antes de descer para os filhos
quando o ponto cai fora de um pai com `overflow: 'hidden'`
(`TouchTargetHelper.kt`, `findTouchTargetView`). Em `MidiaPicker` e
`FotosBlock` o botão é `position: 'absolute'` em `top: 4, right: 4`
dentro de um tile 80x80 **com `overflow: 'hidden'`** — a folga real
para cima e para a direita é de 4dp. Um `hitSlop={11}` simétrico daria
`4 + 22 + 11 = 37dp`, não 44: a sprint teria fechado verde certificando
uma conformidade inexistente.

A conta correta satura cada lado na folga que existe de fato:

```
efetivo = min(slop, folga) + lado + min(slop, folga_oposta)
```

Valores entregues, todos com o visual **inalterado** (posição, tamanho
e ícone idênticos — o não-objetivo foi respeitado):

| Arquivo | hitSlop | Área efetiva |
|---|---|---|
| `BarraBusca.tsx` | `{ top: 11, bottom: 11, left: 9, right: 13 }` | 44 x 44 |
| `MidiaPicker.tsx` | `{ top: 4, right: 4, bottom: 18, left: 18 }` | 44 x 44 |
| `FotosBlock.tsx` | `{ top: 4, right: 4, bottom: 18, left: 18 }` | 44 x 44 |

Nos dois tiles a expansão que não cabe para fora vai para dentro do
tile, que não é tocável (nenhum `onPress` na miniatura) — não há toque
roubado nem invasão do thumbnail vizinho. Na `BarraBusca` a folga à
direita é 13dp (`paddingHorizontal` 12 + `borderWidth` 1) e os 9dp
restantes vão para a esquerda, invadindo 1dp do campo de texto (o gap é
`spacing.sm` = 8 e o `Pressable` é irmão posterior, então vence o
hit-test nesse 1dp). Com o `hitSlop={11}` simétrico do plano original
essa invasão seria de 3dp.

### Guarda de regressão

`expect(props.hitSlop).toBe(11)` seria tautologia — repetiria o literal
que a sprint acabou de escrever e passaria igual no cenário recortado
de 37dp. As guardas entregues compõem hitSlop + geometria do botão +
folga real até a borda do pai (lida da árvore renderizada) e só então
cobram os 44dp: `tests/helpers/areaToque.ts`, usado por
`tests/components/todo/BarraBusca.test.tsx`,
`tests/components/midia/MidiaPicker.test.tsx` e
`tests/components/eventos/FotosBlock-a11y.test.tsx` (arquivo próprio
porque o `FotosBlock-permission.test.tsx` liga fake timers no
`beforeEach`).

Prova negativa executada: revertendo para `hitSlop={8}` na `BarraBusca`
e `hitSlop={11}` nos dois tiles, as três guardas reprovam com
`Expected: >= 44 / Received: 38`, `37` e `37`.

### Pendências desta execução

1. **Gauntlet e screenshots não rodaram.** O caso
   `tests/e2e/playwright/audit-p4-5-a11y-toque-44dp.e2e.ts` foi escrito
   (com a conta saturada, e documentando que a conta de
   `m-wcag-medidas.e2e.ts` está errada), mas subir o dev server em
   paralelo com outras sprints daria falso vermelho. O diretório
   `AUDIT-P4-5-A11Y-TOQUE-44DP-screenshots-gauntlet/` continua vazio.
   Vale lembrar que `hitSlop` não renderiza: a paridade visual é
   consequência de nenhum estilo ter mudado.
2. **O precedente citado neste spec está fora de conformidade.**
   `app/medidas/novo.tsx:368-384` (sprint M-WCAG-MEDIDAS) tem
   `hitSlop={12}` num botão 22x22 em `top: 4, right: 4` dentro de um
   slot 100x100 com `overflow: 'hidden'`: `4 + 22 + 12 = 38dp`, não os
   46 que a sprint declarou. Continua não-objetivo aqui (arquivo de
   outra sprint), mas agora é um defeito conhecido, não um padrão a
   replicar.
