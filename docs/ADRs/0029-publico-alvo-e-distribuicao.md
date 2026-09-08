# ADR 0029 — Público-alvo e Distribuição: Aplicativo Comunitário, Não Ferramenta Particular

```
Status:     Aceito
Data:       2026-09-08
Sprint:     Decisão de produto P1 (rodada de 2026-09-08)
Relaciona:  ADR-0005 (sem gamificação), ADR-0007 (zero telemetria),
            ADR-0011 e ADR-0015 (identidade genérica e em runtime),
            ADR-0022 (Vault escolhido pelo usuário)
```

## Contexto

O projeto nasceu para duas pessoas: um casal neurodivergente, com o
aplicativo desenhado sob medida para a rotina delas. O material versionado
registrava isso de forma categórica — `docs/CONTEXTO.md` §1 afirmava "o App
**não é produto** para um mercado. É ferramenta pessoal, construída sob
medida para essas duas pessoas específicas", e o `README.md` abria com "App
Android pessoal (...) entre duas pessoas".

Três fatos tornaram essas frases falsas antes de alguém as corrigir:

1. **O repositório é público e a licença é GPL-3.0.** Qualquer pessoa pode
   clonar, compilar, usar, modificar e redistribuir. Isso não é intenção,
   é o que a licença já garante desde o commit de bootstrap.
2. **Uma associação de pessoas autistas manifestou interesse em
   distribuí-lo.** O primeiro contato dessa associação com o projeto é o
   `README.md` e, para qualquer pessoa ou agente que vá trabalhar no
   código, o `docs/CONTEXTO.md`, que o arquivo de regras da raiz manda ler
   antes de qualquer decisão.
3. **A arquitetura já era mais generosa que os documentos.** Usar sozinho é
   o `DEFAULT_STATE` do onboarding; a identidade entra em runtime pelo
   SecureStore (ADR-0015); a pasta do Vault é escolhida pela pessoa
   (ADR-0022); não há nome real, caminho pessoal ou telemetria em `src/` ou
   `app/`. Quem instalasse hoje conseguiria usar — e leria, na fonte da
   verdade do projeto, que aquilo não era para ela.

A distância entre o que o código faz e o que a documentação declara não é
detalhe de redação. Enquanto a §1 disser "não é produto", toda pessoa e
todo agente que abrir o repositório decide contra o produto, com respaldo
documental.

## Decisão

**O Ouroboros Mobile é um aplicativo comunitário, publicado sem custo sob
GPL-3.0, para qualquer pessoa que queira usá-lo.** O casal que o originou
continua entre as pessoas usuárias; deixa de ser o escopo.

Quatro pontos, que são o conteúdo normativo desta ADR:

1. **Quem instala é usuário, não convidado nem beneficiário.** A licença
   dá a essa pessoa as mesmas prerrogativas de quem escreveu o código.
   Documentação, copy e decisão de produto tratam-na assim. Linguagem de
   caridade é proibida, inclusive na prosa dos documentos.
2. **Não se presume a necessidade de ninguém.** O eixo de acessibilidade
   do projeto é **controle** — quanto o aplicativo deixa a pessoa decidir
   sobre estímulo, previsibilidade e linguagem — e não conformidade com uma
   lista. Onde o aplicativo decide sozinho algo que deveria ser escolha,
   isso é o defeito. A tese, os cinco princípios e o estado medido de cada
   controle estão em [`ACESSIBILIDADE.md`](../ACESSIBILIDADE.md).
3. **Decidir "para o casal" e decidir "para quem baixar" deixaram de ser a
   mesma decisão.** Quando divergirem, a divergência é explícita no spec da
   sprint, não resolvida em silêncio. O caso mais frequente já mapeado é a
   superfície de casal aparecendo para quem usa sozinho.
4. **A distribuição hoje é o APK direto pelo GitHub.** Sem loja, sem
   atualização automática, com o aviso do Play Protect. É estado corrente,
   não postura: retomar o registro na loja é decisão separada, posterior à
   fila técnica.

### O Que Esta ADR Não Decide

Registrado para que ninguém a cite como respaldo do que ela não diz:

- **Não promete loja de aplicativos, suporte, SLA ou canal de atendimento.**
- **Não promete tradução.** A interface é PT-BR, e datas são serializadas
  em fuso fixo de São Paulo.
- **Não abre o aplicativo para mais de duas pessoas.** O teto de duas
  continua; o que muda é que o padrão que o assume fica congelado em código
  novo (regra registrada em `docs/CONTEXTO.md` §5).
- **Não altera a licença nem a ausência de telemetria.** GPL-3.0 e ADR-0007
  seguem como estão.

## Consequências

**Imediatas, nesta mesma entrega:**

- `docs/CONTEXTO.md` §1 e o primeiro parágrafo do `README.md` passam a
  declarar o que o projeto é, com uma subseção de limites honestos.
- A tese de acessibilidade, que vivia em documento de sprint não
  versionado, vira `docs/ACESSIBILIDADE.md`.
- A instrução de editar `src/config/pessoas.config.ts` para "adaptar o app
  para outras pessoas" sai do `docs/CONTEXTO.md` §3: era falsa desde a
  ADR-0015 e era a resposta errada para a primeira pergunta de um terceiro.

**Que esta decisão passa a cobrar das sprints seguintes:**

- Um clone limpo precisa compilar. Hoje não compila, por causa de um import
  estático de arquivo gitignored.
- Integração que exige credencial de terceiro nasce desligada, com texto
  honesto na tela, e nunca é pré-requisito do núcleo.
- Nenhuma string de casal pode aparecer para quem declarou usar sozinho.
- Contribuição externa passa a ser possível, e revisão manual de tom deixa
  de escalar: o gate de tom vira trabalho, não cortesia.

**Custo aceito:** o projeto passa a ter obrigações que ferramenta pessoal
não tem. Um caminho de primeiro uso que funcione sem edição de código, uma
linguagem que não presuma quem está do outro lado, e a disciplina de não
prometer o que não existe.

## Alternativas Consideradas

**Manter o enquadramento pessoal e deixar a distribuição acontecer por
conta própria.** Rejeitada: o material versionado é o primeiro contato de
quem chega, e ele instruiria contra o produto. O enquadramento novo já
existia de fato, só que apenas em arquivos fora do git — se a sessão que os
escreveu se perdesse, a tese sumiria junto.

**Declarar produto e assumir compromissos de produto acabado** — loja,
suporte, tradução, roadmap público. Rejeitada por prometer o que o projeto
não faz, o que é a forma mais rápida de decepcionar exatamente o público
que ele diz atender.
