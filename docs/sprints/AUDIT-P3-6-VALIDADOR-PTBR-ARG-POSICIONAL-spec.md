# AUDIT-P3-6-VALIDADOR-PTBR-ARG-POSICIONAL — quarto padrão do validador PT-BR e as 3 strings que escaparam

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: média (3 strings sem acento chegam ao usuário hoje; o buraco de
            detecção é permanente e cresce a cada nova função de UI)
DEPENDE:    nenhuma
ORIGEM:     achado [P3-6] da auditoria de 2026-07-28. A varredura de conformidade
            de UI leu os 3 padrões de `check_strings_ui_ptbr.py`, enumerou as
            formas canônicas de uma string chegar à tela num app React Native e
            achou a que falta. As 3 strings foram localizadas por grep direto e
            o caminho de renderização de cada uma foi seguido até o `<Text>`.
DECISAO:    (dono, 2026-07-29) acentuação em comentário de código segue a
            convenção declarada no cabeçalho do próprio arquivo; onde o arquivo
            não declarar nada, PT-BR acentuado. Vale só para comentário — string
            de UI segue sempre acentuada.
```

## Problema (o validador é exaustivo em 3 formas de 4)

`scripts/check_strings_ui_ptbr.py` roda no `smoke.sh:21` e passa limpo:

```
$ python3 scripts/check_strings_ui_ptbr.py; echo "PTBR_EXIT=$?"
PTBR_EXIT=0
```

Ele reconhece três formas de uma string literal chegar à UI:

```python
# scripts/check_strings_ui_ptbr.py:108   -> atributo JSX: <Comp label="..." />
RE_PROP_STRING = re.compile(...)
# scripts/check_strings_ui_ptbr.py:123   -> texto entre tags: <Text>Texto livre</Text>
RE_JSX_TEXT_NODE = re.compile(
    r">(?P<txt>[^<{}>\n][^<{}>]*?[A-Za-zà-úÀ-Ú][^<{}>]*?)<"
)
# scripts/check_strings_ui_ptbr.py:132   -> literal de objeto: { titulo: '...' }
RE_OBJ_LITERAL_PROP = re.compile(...)
```

Falta a quarta forma canônica: **argumento posicional de função**. Toda
API imperativa de UI — toast, alerta, setter de estado de erro — recebe
o texto como primeiro argumento, sem nome de prop e sem tag JSX ao
redor. Nenhum dos três padrões casa isso.

Quatro strings escapam hoje. As duas primeiras:

```
src/components/hoje/SecaoTodoHoje.tsx:148       mostrarUndo('Tarefa concluida', () => {
src/components/hoje/SecaoAindaDeOntem.tsx:133   mostrarUndo('Tarefa concluida', () => {
```

O texto chega à tela sem intermediário. `src/lib/hooks/useToastUndo.tsx:81-91`:

```tsx
      <Text
        ...
        {atual.mensagem}
```

O primeiro argumento de `mostrarUndo` vira `atual.mensagem` e é
renderizado direto num `<Text>`. Note que nem o `RE_JSX_TEXT_NODE`
salva aqui: o conteúdo da tag é uma expressão `{...}`, não texto
literal — o padrão exclui `{` e `}` por construção.

Cenário concreto: o usuário marca uma tarefa como feita na tela Hoje,
o toast sobe e mostra "Tarefa concluida", sem acento, violando a Regra
de Linguagem do projeto (`docs/CONTEXTO.md` §5) que exige acentuação
completa e obrigatória em mensagens de UI.

As outras duas, em `app/galeria/detalhe/[slug].tsx`:

```
app/galeria/detalhe/[slug].tsx:80    setErro('URI ausente nos parametros.');
app/galeria/detalhe/[slug].tsx:90    setErro('Arquivo nao encontrado.');
```

Prova de que o padrão de chamada é o problema, e não o vocabulário: na
mesma árvore existem 4 outros `setErro(...)` com literal **corretamente
acentuado** —

```
src/components/midia/MidiaSpotifyTab.tsx:109   setErro('Link de Spotify inválido.');
src/components/midia/MidiaYoutubeTab.tsx:105   setErro('Link de YouTube inválido.');
src/lib/boot/biometriaGate.tsx:98              setErro('Falha ao autenticar.');
src/lib/boot/biometriaGate.tsx:101             setErro('Erro inesperado.');
```

O acerto nesses quatro é disciplina humana, não gate. O validador é
igualmente cego para os oito.

### O detalhe que separa os dois grupos de correção

Inspeção de `scripts/dicionario_ptbr_canonico.json` (chave `palavras`,
149 entradas):

```
$ python3 -c "
import json
p=json.load(open('scripts/dicionario_ptbr_canonico.json'))['palavras']
print(len(p))
for k in ['concluida','parametros','parametro']:
    print(repr(k),'->',p.get(k,'AUSENTE'))"
149
'concluida' -> concluída
'parametros' -> AUSENTE
'parametro' -> AUSENTE
```

- `concluida` **está** no dicionário. O validador conhece a palavra e
  ainda assim não vê a string — a falha é 100% de padrão. Com o quarto
  padrão implementado, as duas ocorrências de `mostrarUndo` são
  acusadas imediatamente.
- `parametros` **não está**. Esse caso precisa das **duas** correções:
  o padrão novo para enxergar a string, e a entrada no dicionário para
  saber qual é a forma acentuada. Sem a segunda, o padrão novo passa
  por cima da linha 80 em silêncio.

São dois consertos distintos, e o spec exige ambos.

### Armadilha a tratar na implementação

O validador **não** pula linhas de comentário — não há filtro de `//`
em `varrer_arquivo` (`:230-300`), apenas o marcador de override
`// ptbr-allow:`. Existe um exemplo de uso da API dentro de um
comentário de documentação:

```
src/lib/hooks/useToastUndo.tsx:7   //   mostrarUndo('Tarefa concluida', () => reverter(), 5000);
```

O quarto padrão vai acusar essa linha. Correção preferida: acentuar o
exemplo (documentação melhor, e o exemplo passa a mostrar a forma
certa), não suprimir com `ptbr-allow`.

### Nota de decisão — acentuação em comentários de código (dono, 2026-07-29)

Decisão geral, registrada aqui porque este é o spec de acentuação do
projeto: **comentário de código segue a convenção declarada no cabeçalho
do próprio arquivo.** Onde o arquivo não declarar nada, o default é
PT-BR acentuado.

O que isso significa para quem executa:

- vale **apenas para comentários de código**. Não muda nada em strings
  de UI, que seguem acentuadas em todos os casos, sem exceção, e
  independentemente do arquivo onde nascem — inclusive as 4 corrigidas no
  item 5 do Escopo;
- não é licença para desacentuar comentário que já está acentuado. Onde o
  arquivo declara convenção sem acento (o caso típico é script de shell e
  config de CI), o comentário acompanha o cabeçalho; onde o arquivo é
  silencioso, a prosa vai acentuada;
- o comentário de `src/lib/hooks/useToastUndo.tsx:7` cai no default
  acentuado, e o que ele cita é uma string de UI — logo, acentuar é a
  correção certa, coerente com a preferência já registrada acima;
- `accessibilityLabel` continua **sem acento** por convenção de leitor de
  tela, e o validador já o ignora. Não é comentário nem string visível, e
  não entra nesta decisão.

## Escopo (mínimo)

1. **Quarto padrão no validador.** Adicionar `RE_FUNC_ARG_STRING` a
   `scripts/check_strings_ui_ptbr.py`, casando
   `<identificador>(<aspas>texto<aspas>` — apenas o **primeiro**
   argumento, que é onde a mensagem de UI vive por convenção nessas
   APIs. Ligar ao mesmo pipeline de verificação de token contra o
   dicionário usado pelos três padrões existentes.
2. **Allowlist de funções de UI.** Espelhar o desenho já existente de
   `PROPS_UI` (`:54-75`) com um conjunto `FUNCS_UI`. Sem allowlist, o
   padrão dispara em toda chamada de função com string literal do
   projeto (paths, chaves de store, IDs de rota, nomes de arquivo do
   Vault) e o validador vira ruído. Conjunto inicial, derivado do que
   existe hoje: `mostrarUndo`, `setErro`, `alert`. Documentar no
   cabeçalho do script que o conjunto cresce quando uma API imperativa
   de UI nova é criada.
3. **Filtro de linha de comentário.** Pular linhas cuja forma sem
   espaços à esquerda começa com `//` ou `*`, ou acentuar o exemplo em
   `src/lib/hooks/useToastUndo.tsx:7`. Escolher uma; a segunda é
   preferida por não abrir um buraco novo no validador. Vale aqui a
   §Nota de decisão sobre acentuação em comentários: aquele arquivo não
   declara convenção no cabeçalho, então o default acentuado se aplica, e
   o que o comentário cita é uma string de UI.
4. **Entrada no dicionário.** Adicionar `"parametros": "parâmetros"` e
   `"parametro": "parâmetro"` a `scripts/dicionario_ptbr_canonico.json`
   (chave `palavras`), respeitando a regra do `_meta`: apenas tokens
   únicos, sem espaço nem underscore, e só onde a chave difere do
   valor.
5. **As 3 correções de string:**
   - `src/components/hoje/SecaoTodoHoje.tsx:148` → `'Tarefa concluída'`
   - `src/components/hoje/SecaoAindaDeOntem.tsx:133` → `'Tarefa concluída'`
   - `app/galeria/detalhe/[slug].tsx:80` → `'URI ausente nos parâmetros.'`
   - `app/galeria/detalhe/[slug].tsx:90` → `'Arquivo não encontrado.'`

   (são 4 literais em 3 arquivos)
6. **Caso E2E** em `tests/e2e/playwright/audit-p3-6-toast-undo-acentuado.e2e.ts`,
   copiado de `tests/e2e/playwright/e2e-template.ts` — e **não** de
   `docs/templates/e2e-template.e2e.ts`, caminho citado no arquivo de
   regras da raiz que não existe mais (a correção daquela referência é escopo de
   `AUDIT-P3-9-TEMPLATE-E2E-INEXISTENTE`, não desta sprint), com asserto de
   comportamento: seed de tarefa pendente, tap para marcar feito, o
   toast de undo aparece e o texto renderizado é exatamente
   `Tarefa concluída` — falha se vier sem acento. Não basta presença
   visual do toast.
7. NÃO-objetivo: varrer o resto do projeto atrás de outras APIs
   imperativas ainda não criadas; mexer nos 3 padrões existentes;
   alterar `.ptbr-violations.txt`; tocar `accessibilityLabel` (segue
   sem acento por convenção de leitor de tela, e o script já ignora).

## Trabalho de limpeza que esta sprint destrava

Esta sprint **fecha** o próprio buraco que abre — as 4 strings que o
padrão novo passa a acusar são corrigidas no mesmo commit, então o
smoke continua verde ao final. Não deixa fila aberta, com uma ressalva:
o passo 2 (allowlist) pode revelar violações adicionais se `FUNCS_UI`
for mais generoso que o mínimo. Recomenda-se rodar o validador com o
padrão novo e allowlist ampla **antes** de fixar o conjunto, para
medir; se o resultado passar de uma dezena de violações, reduzir a
allowlist ao mínimo desta sprint e abrir sprint própria para o resto.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
python3 scripts/check_strings_ui_ptbr.py; echo "PTBR_EXIT=$?"   # PTBR_EXIT=0 (falso verde)
grep -rnE "mostrarUndo\('|setErro\('" src app | grep -iE "concluida|parametros|nao encontrado"
#   src/components/hoje/SecaoAindaDeOntem.tsx:133   mostrarUndo('Tarefa concluida', ...
#   app/galeria/detalhe/[slug].tsx:80               setErro('URI ausente nos parametros.');
#   app/galeria/detalhe/[slug].tsx:90               setErro('Arquivo nao encontrado.');
#   src/components/hoje/SecaoTodoHoje.tsx:148       mostrarUndo('Tarefa concluida', ...

# DEPOIS - o padrao novo acusa antes da correcao (prova de que ele funciona)
git stash            # desfaz so' as correcoes de string, mantendo o validador novo
python3 scripts/check_strings_ui_ptbr.py; echo "PTBR_EXIT=$?"   # 4 violacoes, PTBR_EXIT != 0
git stash pop

# DEPOIS - com as correcoes
python3 scripts/check_strings_ui_ptbr.py; echo "PTBR_EXIT=$?"   # PTBR_EXIT=0 (verde real)
grep -rn "Tarefa concluída" src/components/hoje/                # 2 ocorrencias acentuadas
python3 -c "
import json;p=json.load(open('scripts/dicionario_ptbr_canonico.json'))['palavras']
print(len(p), p['parametros'])"                                 # 151 parâmetros

# UI: Gauntlet obrigatorio (a sprint muda texto visivel)
./gauntlet.sh        # navegar /hoje, marcar tarefa feita, conferir o toast acentuado
                     # screenshots em docs/sprints/AUDIT-P3-6-VALIDADOR-PTBR-ARG-POSICIONAL-screenshots-gauntlet/
scripts/e2e-web.sh --grep "audit-p3-6"                          # caso novo PASS

npx tsc --noEmit                                                # exit 0
npm test                                                        # 356 suites, 3351 passed
./scripts/smoke.sh                                              # exit 0
```

## Commit

```
fix: audit-p3-6 quarto padrao do validador ptbr cobre argumento posicional e corrige 4 strings sem acento
```
