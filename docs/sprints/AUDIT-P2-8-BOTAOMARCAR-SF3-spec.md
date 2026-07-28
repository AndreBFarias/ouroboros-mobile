# AUDIT-P2-8-BOTAOMARCAR-SF3 — renderizar o botão de marcação rápida de rotina, entregue e nunca montado

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (o caso de uso primário declarado da sprint R-SF-3 não existe na UI, e
            toda a camada de persistência e de aderência ficou órfã junto)
DEPENDE:    nenhuma
ORIGEM:     achados [P2-8] / [NI-12] / [NI-16] da auditoria de 2026-07-28. Encontrado por
            varredura de componentes sem consumidor em `src/components/**`. Reverificado
            nesta materialização em `main @ b5bf2db`: `BotaoMarcar` tem 0 ocorrências em
            `src/` e `app/` fora do próprio arquivo, contra 10 na sua suíte Jest.
```

## Problema (componente com 7 casos de teste e zero renders)

`src/components/rotinas/BotaoMarcar.tsx` tem 84 linhas.
`tests/components/rotinas/BotaoMarcar.test.tsx` tem 129 linhas e 7 casos, todos verdes.
O componente nunca é montado em produção:

```
$ grep -rn "BotaoMarcar" --include="*.ts" --include="*.tsx" src app tests
src/components/rotinas/BotaoMarcar.tsx:30,43,48      (a propria definicao)
tests/components/rotinas/BotaoMarcar.test.tsx        (10 hits, suite completa)
```

Zero hits em `src/` ou `app/` fora do próprio arquivo. Não existe
`src/components/rotinas/index.ts`, então também não há re-export por barril.

O caso de uso está escrito no cabeçalho do próprio componente
(`src/components/rotinas/BotaoMarcar.tsx:1-3`):

```ts
// Botao "marcar" rapido em item de Rotina recorrente (R-SF-3).
//
// Caso primario: dono toca para registrar "tomei Venvanse" em 1 tap.
```

### O que o spec original prometia

`docs/sprints/R-SF-3-MARCACAO-RAPIDA-MED-spec.md` (tipo feature, P2-medium, tranche R-SF,
fase 3) descreve, na íntegra:

> Botão "marcar" (32dp, hitSlop 16) em cada item de Rotina recorrente. Tap registra
> `{ rotina_id, marcado_em: <ISO-timestamp> }` em `rotinas/<id>/historico-<data>.md`.
> Histórico visível como timeline + % aderência semanal. Lembrete silenciado se marcado
> antes.
>
> Caso de uso primário do dono: marcar "Venvanse" em 1 tap.

E o proof-of-work exigido pela própria sprint, item 6:

> E2E com 3 marcações + histórico visível + lembrete silenciado.

**Nada disso existe na UI.** `app/rotinas/index.tsx` (165 linhas) renderiza cada rotina
como um `<Pressable>` que só navega (`:89-93`, `handleAbrir` em `:60`); não há botão de
marcação. Não há timeline, não há percentual de aderência, e o silenciamento de lembrete
não é acionado por nenhuma tela.

Cenário de falha concreto: `pessoa_a` cadastra a rotina "Venvanse", abre `/rotinas`, e a
única ação disponível é abrir o detalhe. Para registrar que tomou o remédio, não há
caminho nenhum — nenhuma interação de usuário chega a criar o arquivo
`rotinas/<slug>/historico-<data>.md`.

### O que fica órfão junto

A camada inteira abaixo do botão não tem consumidor de UI:

| Símbolo | Arquivo:linha | Evidência |
|---|---|---|
| `registrarMarcacao` | `src/lib/vault/rotina_marcacao.ts:76` | só testes |
| `lerMarcacaoDia` | `src/lib/vault/rotina_marcacao.ts:58` | só testes e uso interno (`:88`, `:135`, `:162`) |
| `listarMarcacoesUltimosDias` | `src/lib/vault/rotina_marcacao.ts:119` | só testes |
| `silenciarLembreteHoje` | `src/lib/vault/rotina_marcacao.ts:154` | só testes |
| `listarTodasMarcacoes` | `src/lib/vault/rotina_marcacao.ts:183` | 0 consumidores; o comentário admite: *"Por enquanto não usado por nenhuma tela; mantido privado-de-fato (export para tests)"* |
| `calcularTimeline` | `src/lib/rotinas/marcacao.ts:92` | só testes |
| `calcularAderenciaSemanal` | `src/lib/rotinas/marcacao.ts:143` | só testes |
| `calcularSilenciarLembreteAte` / `estaLembreteSilenciado` | `src/lib/rotinas/marcacao.ts:185,198` | só testes |

Todas verdes, nenhuma alcançável. É o padrão que a auditoria nomeou: os testes provam que
a função funciona, nunca que ela é chamada.

## Ligar ou remover

**Recomendação: LIGAR.**

Justificativa:

1. É o caso de uso primário declarado do dono no spec original, em texto explícito. Não é
   feature especulativa nem sobra de refatoração.
2. A pilha está inteira e testada: componente, escrita no Vault com append idempotente,
   cálculo de timeline e cálculo de aderência semanal. Falta exclusivamente montar o
   componente na lista e ligar dois callbacks.
3. Remover custaria apagar 84 + 213 + ~200 linhas de código e teste corretos, e reabriria
   R-SF-3 do zero quando o caso de uso voltasse — que é a única razão pela qual a sprint
   existiu.
4. O componente é auto-contido (sem dependência de store, `BotaoMarcar.tsx:30-41`: recebe
   `marcado`, `onPress`, `accessibilityLabel`), então o wiring não arrasta refatoração.

## Escopo (mínimo)

1. Renderizar `<BotaoMarcar>` em cada item de `app/rotinas/index.tsx`, dentro do
   `<Pressable>` de `:89-157`, no lado direito do card. Cuidado obrigatório: o botão tem
   `hitSlop` 16 e vive **dentro** de um `Pressable` que navega — o tap no botão não pode
   propagar para a navegação. Tratar a hierarquia de toque explicitamente.
2. Calcular `marcado` por item via `lerMarcacaoDia(vaultRoot, rotina.slug, hoje)` no
   mesmo `useFocusEffect` que já carrega a lista (`app/rotinas/index.tsx`), para não
   disparar uma leitura por item em render.
3. Ligar `onPress` a `registrarMarcacao`, com atualização otimista do estado visual e
   reconciliação no retorno. O componente permite re-marcação no mesmo dia por design
   (`BotaoMarcar.tsx:10-13`, caso "medicação 2x ao dia") — a UI não deve bloquear.
4. Chamar `silenciarLembreteHoje` no sucesso da marcação, cumprindo a parte "lembrete
   silenciado se marcado antes" do spec original.
5. Exibir o histórico prometido: timeline das últimas 7 ocorrências (`calcularTimeline`) e
   percentual de aderência semanal (`calcularAderenciaSemanal`) em
   `app/rotinas/[slug].tsx`. Sem gamificação, sem comparativo negativo, sem exclamação —
   regra de tom do projeto.
6. Atualizar `docs/FEATURES-CANONICAS.md` §4.5 (Rotinas): registrar marcação em 1 toque,
   histórico como timeline, aderência semanal e silenciamento de lembrete.
7. Caso E2E em `tests/e2e/playwright/audit-p2-8-botaomarcar-sf3.e2e.ts`, copiado de
   `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento, cobrindo o que o
   proof-of-work de R-SF-3 exigia e nunca foi entregue: com uma rotina semeada, três
   toques no botão de marcar produzem três marcações no arquivo do dia (verificável no
   vault mock via `__gauntlet`), o estado visual vira "marcado", e o detalhe da rotina
   mostra timeline e percentual. Presença do botão não basta.
8. NÃO-objetivo: expor `listarTodasMarcacoes` (`rotina_marcacao.ts:183`) em alguma tela.
   Continua sendo export-para-teste; se após esta sprint seguir sem consumidor, remover o
   `export` numa limpeza posterior.
9. NÃO-objetivo: alterar o schema de `rotinas/<slug>/historico-<data>.md` ou o formato de
   append. Estão prontos e testados.
10. NÃO-objetivo: integrar marcação com notificações agendadas além do silenciamento já
    implementado em `silenciarLembreteHoje`.

## Proof-of-work

```bash
# 1. Antes: componente sem render de producao
grep -rn "BotaoMarcar" --include="*.ts" --include="*.tsx" src app \
  | grep -v "src/components/rotinas/BotaoMarcar.tsx"           # 0 hits

# 2. Depois: montado na lista de rotinas
grep -rn "<BotaoMarcar" --include="*.tsx" app src               # >= 1 hit

# 3. A camada de persistencia ganha caller de UI
grep -rn "registrarMarcacao\|silenciarLembreteHoje" --include="*.tsx" app src \
  | grep -v "src/lib/"                                          # >= 1 hit cada

# 4. Timeline e aderencia ganham consumidor
grep -rn "calcularTimeline\|calcularAderenciaSemanal" --include="*.tsx" app src \
  | grep -v "src/lib/"                                          # >= 1 hit cada

# 5. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test -- marcacao                                 # verde
npm test -- BotaoMarcar                              # 7 casos verdes
./scripts/smoke.sh                                   # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: menu -> Rotinas -> tocar o botao de marcar 3x numa rotina semeada
# no console: inspecionar o arquivo do dia no vault mock -> 3 marcacoes
# abrir o detalhe da rotina -> timeline com as ocorrencias + percentual semanal
# screenshots em docs/sprints/AUDIT-P2-8-BOTAOMARCAR-SF3-screenshots-gauntlet/
```

Checkpoint Nível C recomendado no fecho: o botão dispara `haptics.light()`
(`BotaoMarcar.tsx:50-53`), que é API nativa e não é observável no Gauntlet web.

## Commit

```
feat: audit-p2-8 liga botao de marcacao rapida de rotina com timeline e aderencia semanal
```
