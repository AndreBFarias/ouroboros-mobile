# Acessibilidade — Público, Princípios e Estado Medido

```
DOC:    ACESSIBILIDADE.md
STATUS: Canônico para decisão de estímulo, previsibilidade e linguagem
LANG:   pt-BR
ORIGEM: promovido em 2026-09-08 de um documento de sprint não versionado
        (visão do Recap, 2026-07-11), onde a tese vivia desde julho e
        onde quem clonasse o repositório nunca a encontraria.
```

---

## 1. Por Que Este Documento Existe

A tese de acessibilidade do projeto — o público e os cinco princípios
derivados dele — foi escrita em 2026-07-11 e ficou em um arquivo de
trabalho fora do git. O próprio documento pedia a promoção; ela não
aconteceu. Enquanto isso, o material versionado dizia o oposto: que o
projeto não era produto e servia a duas pessoas específicas.

O efeito prático dessa ausência não é retórico. As regras de tom do
projeto existem e são cumpridas, mas a
[ADR-0005](ADRs/0005-sem-gamificacao.md) as justifica por depressão e
ansiedade, e a palavra autismo não aparece nela. Uma regra sem motivo
registrado é reaberta como preferência de gosto na sessão seguinte. Este
documento registra o motivo.

## 2. Quem Usa

Pessoas com transtornos depressivos, TDAH, ansiedade e autismo, entre
outras. O aplicativo nasceu para um casal neurodivergente e hoje é
publicado sem custo sob GPL-3.0; uma associação de pessoas autistas
manifestou interesse em distribuí-lo.

Duas frases que não são a mesma, e a diferença é o documento inteiro:

- **Não se presume necessidade de ninguém.** Ninguém aqui sabe do que uma
  pessoa autista precisa. O aplicativo não decide por ela.
- **O eixo é controle, não conformidade.** A pergunta que decide uma
  feature é *quanto o aplicativo deixa a pessoa decidir sobre estímulo,
  previsibilidade e linguagem*. Onde ele decide sozinho algo que deveria
  ser escolha, isso é o defeito.

Corolário desagradável e importante: **um controle oferecido e obedecido
pela metade é pior que controle nenhum**, porque ensina que o controle não
funciona. Ver o estado medido na Seção 5.

## 3. Os Cinco Princípios Inegociáveis

Valem para o aplicativo inteiro, não só para o Recap onde foram escritos.

1. **Zero comparação negativa.** "Como você evoluiu" só aparece em
   enquadramento positivo ou neutro. Métrica que caiu não vira "X% pior" —
   ou se omite, ou se reenquadra ("você priorizou o descanso"). Comparação é
   gatilho.
2. **Acessibilidade de movimento.** Respeitar `reduce-motion`; animação
   previsível, sem mudança brusca ou estroboscópica. Movimento é
   acabamento, nunca obstáculo. O hook canônico é
   `src/lib/hooks/useReduceMotion.ts`, que combina o sinal do sistema com o
   toggle do aplicativo por OR: o toggle só adiciona redução, nunca desfaz
   o pedido do sistema.
3. **Progresso, não gamificação.** Reconhecer o caminho sem pontos,
   troféus, streaks ou "parabéns". Sóbrio e caloroso.
   ([ADR-0005](ADRs/0005-sem-gamificacao.md))
4. **Controle da pessoa.** Som, movimento, o que aparece, o ritmo — tudo
   ajustável, com defaults gentis. A última escolha é sempre lembrada.
5. **Privacidade.** Fotos e memórias são íntimas: ficam no aparelho.
   Compartilhar é só o que a pessoa escolher tocar.
   ([ADR-0007](ADRs/0007-zero-telemetria.md))

## 4. Guardrails de Copy

Derivados do princípio 1, e válidos para toda string que a pessoa lê:

- Variadas. O mesmo público relê muito; repetição cansa e denuncia.
- Focadas em progresso e permanência, nunca em cobrança ou falta.
- Sem exclamação, sem "parabéns", sem número comparativo negativo.
- Tom de testemunha calma, não de narrador entusiasta.
- Exemplo de virada: "O tempo passou." vira "Você cuidou de X coisas." /
  "Voltou aqui Y vezes." / "Seguiu, mesmo nos dias difíceis."

Limite honesto: emoji e exclamação são verificáveis por script;
**comparativo negativo não é**, e continua dependendo de revisão humana.

## 5. Estado Medido em 2026-09-08

Números apurados em 2026-09-08, com os comandos ao lado para que qualquer
pessoa refaça a conta em vez de confiar nesta linha.

### O Que Já Está Cumprido

- **Contraste.** `src/lib/a11y/contraste.ts` implementa WCAG 2.1 SC 1.4.3
  e `tests/lib/a11y/contraste.test.ts` roda a paleta real contra as
  superfícies, dentro do gate obrigatório do CI.
- **Alvos de toque.** `tests/a11y/area-de-toque-44dp.test.ts` mede
  `hitSlop` mais lado visível contra 44dp, lendo o arquivo do disco.
- **Rótulos de leitor de tela.** `tests/a11y/talkback-labels.test.tsx`
  varre o repositório inteiro: todo `Pressable` com `onPress` precisa de
  `accessibilityLabel` e `accessibilityRole`.
- **Reduce-motion onde a animação é contínua.** O auto-advance do
  slideshow e o Ken Burns fazem early-return quando a preferência está
  ligada. A priorização foi correta: o movimento mais intenso é o coberto.

### Onde o Aplicativo Ainda Decide Sozinho

```bash
# Arquivos que animam em src/ e app/: 58. Que consultam a preferencia: 22.
git grep -lE "from 'moti'|react-native-reanimated|Animated\." -- src app | wc -l
comm -12 \
  <(git grep -lE "from 'moti'|react-native-reanimated|Animated\." -- src app | sort) \
  <(git grep -l "useReduceMotion" -- src app | sort) | wc -l

# Vibracao: 209 chamadas genericas (que ignoram o toggle) em 98 arquivos,
# contra 17 contextuais (que o consultam).
git grep -nE "haptics\.(light|medium|selection|success|error)\(" -- src app | wc -l
git grep -nE "haptics\.(humor|vitoria|trigger|fab|alarme)\(" -- src app | wc -l

# Som: dos 13 arquivos com API de audio, nenhum consulta o toggle. A unica
# intersecao e' app/diario-emocional.tsx, e la' `somVibracao` aparece so em
# comentario sobre vibracao contextual.
comm -12 \
  <(git grep -lE "expo-av|Audio\.Sound|useAudioPlayer" -- src app | sort) \
  <(git grep -l "somVibracao" -- src app | sort)
```

- **Movimento: 36 dos 58 arquivos que animam não consultam a preferência.**
  Entre eles a primeira tela que alguém vê (`app/onboarding.tsx`) e a
  navegação principal. É o caso exemplar do corolário da Seção 2.
- **O mestre de vibração não é mestre.** `src/lib/haptics.ts` tem duas
  camadas por desenho, e a genérica dispara sempre. O subtítulo do toggle
  em `app/settings/index.tsx` diz "Mestre. Ao desligar, silencia tudo." e
  silencia 17 de 226 chamadas. O texto é factualmente incorreto; não é
  limitação técnica.
- **Não há mestre de som.** A seção "Som e vibração" governa apenas
  vibração. Nenhum caminho de áudio consulta `somVibracao`. Não existe um
  gesto único para silenciar o aplicativo.
- **Notificação é tudo ou nada.** `app/settings/permissoes.tsx` lê o status
  e abre as configurações do sistema. Desligar lá derruba junto o alarme de
  medicação, que é justamente o caso em que a notificação é desejada.
  Falta o meio-termo por categoria, que o aplicativo já pratica na vibração.
- **Tamanho de texto e tema não são escolha.** Paleta escura fixa
  ([ADR-0008](ADRs/0008-tema-custom-tokens.md),
  [ADR-0010](ADRs/0010-estetica-fundacao.md)) e zero ocorrência de
  `allowsFontScaling` ou `maxFontSizeMultiplier` no repositório.
- **O texto do Recap não tem controle.** As transições são deliberadamente
  poéticas e de uma a três palavras. É intencional e está documentado no
  cabeçalho de `src/lib/copy/recap-transicoes.ts`; os controles do Recap
  cobrem intervalo, música e áudio, e nenhum cobre o texto. Registrado como
  ausência de escolha, não como julgamento sobre a necessidade de ninguém.
- **O Vault é reorganizado no boot, em silêncio.** As migrações de
  `src/lib/boot/` movem e renomeiam arquivos que são da pessoa e ficam
  legíveis fora do aplicativo, sem canal que conte o que mudou.

Nenhum desses itens é bug pendente de conserto imediato nesta seção: é o
registro do que ainda não é escolha, para que a próxima sprint saiba onde
mira.

## 6. Como Isso Vira Decisão de Sprint

Antes de fechar tela, animação ou copy, responda por escrito:

1. Alguma coisa aqui se move sem consultar `useReduceMotion`?
2. Alguma coisa aqui faz som ou vibra sem consultar a preferência?
3. O texto compara com um período anterior? Em que enquadramento?
4. O que esta tela decidiu pela pessoa que ela poderia ter decidido?

As respostas 1 e 2 são verificáveis por `grep` no diff. A 3 e a 4 não são,
e por isso entram no corpo do commit.

## 7. Direção de Produto Herdada da Mesma Visão

Registrada aqui porque nasceu no mesmo documento e sustenta os princípios
acima: **o modelo do Recap é como toda feature deve se integrar**, e não
uma tela isolada. Cada feature é uma fonte que alimenta o mesmo tecido —
humor, tarefas, treinos, saúde, ciclo, calendário, mídia e música
contribuem com registros, constância, evolução e momentos.

A consequência de desenho é que feature nova nasce respondendo "como isto
vira progresso visível e memória", com o mesmo DNA: personalização,
progresso, gentileza e acessibilidade. Direção de produto, não regra
verificável — a regra verificável está na Seção 3.
