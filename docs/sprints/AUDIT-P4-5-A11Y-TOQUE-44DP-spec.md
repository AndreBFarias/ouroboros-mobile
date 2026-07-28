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
