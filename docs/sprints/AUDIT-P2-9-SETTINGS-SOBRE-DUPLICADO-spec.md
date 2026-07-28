# AUDIT-P2-9-SETTINGS-SOBRE-DUPLICADO — consolidar o bloco "Sobre" numa fonte só e dar entrada à rota

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (a rota só é alcançável por bypass de desenvolvimento; a cópia local
            omite Build e hash do commit, que são justamente o que um relato de bug pede)
DEPENDE:    nenhuma
ORIGEM:     achados [P2-9] / [NI-06] da auditoria de 2026-07-28. Encontrado por varredura
            de rotas sem ponto de entrada em `app/`. Reverificado nesta materialização em
            `main @ b5bf2db`: a única navegação existente para `/settings/sobre` está num
            teste E2E, via a API de desenvolvimento do Gauntlet.
```

## Problema (rota inalcançável e componente compartilhado ignorado por quem deveria usá-lo)

### 1. A rota não tem entrada de usuário

```
$ grep -rn "settings/sobre\|SobreTela" --include="*.ts" --include="*.tsx" src app tests
src/components/settings/SecaoSobre.tsx:3          comentario
app/settings/sobre.tsx:16                         a propria definicao
tests/e2e/playwright/m-sobre-release-notes.e2e.ts:56,61
```

O único caminho é o E2E, e ele navega por bypass —
`tests/e2e/playwright/m-sobre-release-notes.e2e.ts:61`:

```ts
await w.__gauntlet?.abrir('/settings/sobre');
```

`__gauntlet` só existe em `__DEV__` na web. Em release Android, é dead-code.

Os destinos reais de `app/settings/index.tsx` (`grep -n "router.push"`) são nove:
`editar-pessoa` (`:192`), `vault` (`:199`), `dispositivos` (`:206`), `contas-google`
(`:213`), `integracoes` (`:221`), `adicionar-segunda-pessoa` (`:232`), `permissoes`
(`:609`) e `/_components` (`:683`, sob `__DEV__`). **`sobre` não está na lista.**

### 2. Settings renderiza uma cópia local inferior em vez do componente compartilhado

`app/settings/index.tsx:79` renderiza `<SecaoSobre />`. O import não existe: `grep -n
"SecaoSobre" app/settings/index.tsx` devolve apenas duas linhas —

```
79:        <SecaoSobre />
632:function SecaoSobre() {
```

É uma **função local**, definida em `app/settings/index.tsx:632`, homônima do componente
compartilhado `src/components/settings/SecaoSobre.tsx` (144 linhas). O componente
compartilhado só é consumido por `app/settings/sobre.tsx:33` — a rota inalcançável — e
pelos testes.

A cópia local renderiza três linhas: Versão, GitHub e Licença
(`app/settings/index.tsx:636-670`). A versão compartilhada renderiza cinco: Versão,
**Build**, **Commit**, GitHub e Licença (`src/components/settings/SecaoSobre.tsx:56-58`),
com `lerBuild()` a partir de `Constants.expoConfig.android.versionCode` e
`lerHashCommit()` a partir de `Constants.expoConfig.extra.commitHash`, preenchido pelo
pipeline de build via `EXPO_PUBLIC_GIT_HASH`.

Cenário de falha concreto: `pessoa_b` encontra um comportamento estranho e vai a
Configurações para reportar. Vê "Versão 1.0.0" e nada mais. O `versionCode` e o hash do
commit — os dois dados que identificam exatamente qual binário está rodando — existem no
app, estão implementados, e ela não tem como vê-los.

### 3. O mini-changelog nunca é exibido

```
$ grep -rn "RELEASE_NOTES" --include="*.ts" --include="*.tsx" src app
src/lib/release/changelog.ts:8,21     definicao
app/settings/sobre.tsx:3,11,44        unico consumidor (rota inalcancavel)
```

`RELEASE_NOTES` alimenta a seção "O que mudou" (`app/settings/sobre.tsx:41-47`). Como a
rota não tem entrada, o changelog amigável mantido em TypeScript estruturado nunca chega
ao usuário.

Perda colateral: `app/settings/sobre.tsx` também contém a seção de Créditos, que inclui a
atribuição obrigatória da licença CC BY 4.0 das trilhas do Recap
(`app/settings/sobre.tsx:159-165`, marcada como R-RECAP-9, *"a CC BY exige credito
visivel; esta seção satisfaz a obrigacao no próprio app"*). Como a rota é inalcançável, a
obrigação de licença **não está sendo satisfeita no app** — só no
`assets/sounds/recap-musicas/CREDITS.md`, que o usuário não abre.

## Ligar ou remover

**Recomendação: LIGAR** (consolidar e dar entrada).

Justificativa:

1. Remover a rota apagaria junto o mini-changelog e a atribuição CC BY 4.0, que é
   obrigação de licença de conteúdo de terceiro embutido no app. Não é uma escolha
   disponível sem substituir a atribuição por outro lugar visível.
2. A duplicação já existe e é a fonte do defeito. Consolidar num componente só é
   estritamente menor do que manter duas implementações divergentes do mesmo bloco.
3. O custo é um `LinkSubTela` e a troca de uma função local por um import.

## Escopo (mínimo)

1. Deletar a `function SecaoSobre()` local de `app/settings/index.tsx:632-670` e importar
   `SecaoSobre` de `@/components/settings/SecaoSobre`. Remover junto a `function
   LinhaInfo` local (`app/settings/index.tsx:690-695`): seus dois únicos usos são as
   linhas `:637` e `:663`, ambas dentro da `SecaoSobre` local que sai. O componente
   compartilhado tem a sua própria `LinhaInfo`.
2. Decidir a forma da entrada. Recomendação: substituir o bloco "Sobre" inline do rodapé
   de Configurações por um `LinkSubTela` "Sobre" apontando para `/settings/sobre`, no
   mesmo padrão dos outros oito destinos (`app/settings/index.tsx:192-232`). Motivo:
   evita a terceira variação do mesmo conteúdo — a rota dedicada já mostra tudo o que o
   bloco inline mostrava, mais o changelog e os créditos.
   Alternativa aceitável, se o dono preferir manter a informação a um toque: manter
   `<SecaoSobre />` (agora o compartilhado, com Build e Commit) no rodapé **e** adicionar
   o `LinkSubTela` para a tela completa. Registrar a escolha no commit.
3. Manter `SecaoSobre` recebendo `semTituloDeSecao` conforme o caller
   (`src/components/settings/SecaoSobre.tsx:42-47`), para não duplicar título de seção
   dentro da tela dedicada.
4. Atualizar `tests/e2e/playwright/m-sobre-release-notes.e2e.ts` para navegar pelo
   caminho de usuário real (Configurações → Sobre) em vez de `__gauntlet.abrir`. O
   bypass deixa de ser necessário assim que a rota tem entrada, e manter o bypass num E2E
   é exatamente o que escondeu o achado.
5. Atualizar `docs/FEATURES-CANONICAS.md`: registrar a tela Sobre alcançável, com versão,
   build, hash do commit, mini-changelog e créditos — incluindo a atribuição CC BY 4.0
   das trilhas do Recap.
6. Caso E2E em `tests/e2e/playwright/audit-p2-9-settings-sobre-duplicado.e2e.ts`, copiado
   de `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: partindo de
   Configurações sem nenhum bypass, é possível chegar à tela Sobre por toque, e a tela
   exibe as linhas Build e Commit (que a cópia local omitia) mais ao menos uma entrada de
   `RELEASE_NOTES`.
7. NÃO-objetivo: alterar o conteúdo de `src/lib/release/changelog.ts` ou acrescentar
   releases.
8. NÃO-objetivo: reintroduzir crédito de autoria de qualquer espécie na seção Créditos. A
   regra de anonimato do projeto permanece; a seção existente já está correta.

## Proof-of-work

```bash
# 1. Antes: rota so' alcancavel por bypass; funcao local homonima
grep -rn "settings/sobre" --include="*.ts" --include="*.tsx" src app tests
grep -n "SecaoSobre" app/settings/index.tsx            # 2 hits: uso :79 e funcao local :632

# 2. Depois: a funcao local sumiu e virou import
grep -n "^function SecaoSobre" app/settings/index.tsx  # 0 hits
grep -n "from '@/components/settings/SecaoSobre'" app/settings/index.tsx  # 1 hit

# 3. Depois: existe navegacao de usuario para a rota
grep -n "router.push('/settings/sobre')" app/settings/index.tsx           # 1 hit

# 4. O E2E antigo deixou de depender do bypass
grep -n "__gauntlet?.abrir('/settings/sobre')" tests/e2e/playwright/m-sobre-release-notes.e2e.ts
# 0 hits

# 5. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test -- SecaoSobre                               # verde
./scripts/smoke.sh                                   # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Configuracoes -> Sobre (por toque, sem __gauntlet.abrir)
# esperado: linhas Versao, Build, Commit, GitHub, Licenca + "O que mudou" + Creditos
# screenshots em docs/sprints/AUDIT-P2-9-SETTINGS-SOBRE-DUPLICADO-screenshots-gauntlet/
```

## Commit

```
fix: audit-p2-9 consolida secao sobre no componente compartilhado e da entrada a rota
```
