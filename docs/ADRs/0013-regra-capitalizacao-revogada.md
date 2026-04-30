# ADR 0013 — Capitalização da UI: Sentence Case com Acentuação PT-BR

```
Status:     Aceito
Data:       2026-04-28
Sprint:     M01.5 (decidido durante checkpoint visual)
Supersedes: BRIEFING.md §1 e §2.4 (regra "lowercase intencional")
```

## Contexto

O `BRIEFING.md` original prescrevia, em §1 e §2.4:

> **Mensagens da UI** ficam em **lowercase intencional** (parte da
> identidade visual mono-font), terminadas em ponto, sem exclamação,
> sem emoji. Exemplos: "feito.", "anotado.", "voltou hoje.", "salvo."
>
> CAPS LOCK nunca em mensagens da UI. Tudo lowercase mesmo títulos.
> Lowercase em mono passa ar de notebook técnico, dossiê pessoal —
> exatamente o que o App é.

Durante o checkpoint visual da Sprint M01.5 (28 de abril de 2026), com
o app rodando no Redmi Note 13 5G Pro via Expo Go, o dono do projeto
revogou explicitamente essa regra ao ver os 15 componentes UI premium
em ação. Constatação direta: lowercase puro com acentuação faltando
("trabalho_pesado", "boa_conversa", "anotacao") quebrou a leitura
natural sem agregar caráter visual proporcional.

Screenshots originais que motivaram a decisão estão em
`docs/sprints/M01.5-screenshots/`.

## Decisão

Strings de UI passam a usar **Sentence case com acentuação completa
em PT-BR**:

- Botões: `"Salvar"`, `"Registrar"`, `"Voltar"`, `"Concluir treino"`
- Toasts: `"Feito."`, `"Anotado."`, `"Voltou hoje."`
- Labels: `"Humor"`, `"Energia"`, `"Ansiedade"`, `"Notificações"`
- Títulos de seção: `"Botões"`, `"Cards"`, `"Avatares"`
- Cabeçalhos de tela: `"Hoje"`, `"Diário emocional"`, `"Eventos"`,
  `"Memórias"`

**Acentuação obrigatória** em toda string visível na UI.

## Exceções mantidas

As convenções abaixo permanecem como estavam (não foram revogadas):

- **`accessibilityLabel`**: continua em PT-BR **sem acento**
  (convenção de screen reader que evita pronúncia ambígua).
- **Comentários em código `.ts`/`.tsx`**: continuam **sem acento**
  (convenção shell/CI espelhando mensagens de commit).
- **Mensagens de commit**: continuam **sem acento**.
- **Schemas YAML (chaves)**: continuam em snake_case sem acento.
- **Slugs de tag** em frontmatter: continuam snake_case sem acento
  (`trabalho_pesado`, `boa_conversa`). Exibição na UI deve formatar
  via helper `formatTag()` que vira "Trabalho pesado", "Boa conversa".

## Política de Validação

Toda spec de sprint deve registrar essa regra na seção 4 (Restrições).
Toda PR que adiciona string de UI sem acento ou em lowercase puro
volta para refação. Zero tolerância.

## Tipografia

A tipografia mono (JetBrains Mono) e o tom sóbrio do app
**continuam** sendo identidade. Sentence case + acentuação completa
mantém o tom técnico (mono + line-height generoso + cores semânticas)
e ganha leiturabilidade.

## Consequências

### Positivas

- Leitura natural em PT-BR.
- Acentuação correta evita "feio funcional" (ex: "vitoria", "camera").
- Alinhamento com a regra de prosa da documentação (já era Sentence
  case + acentos).

### Negativas

- Refactor de strings em arquivos da família M01 (Sprint M01.6 cobriu
  isso). Já feito.
- Necessidade de helper `formatTag()` para chips legados em
  snake_case. Implementado em `app/index.tsx` na M02.1.

## Referências

- `VALIDATOR_BRIEF.md` §1.4 — atualizado com a nova regra.
- `CLAUDE.md` — regra de linguagem atualizada.
- Sprint M01.6 — primeiro lote de strings refeitas.
- ADR-0010 — Estética como fundação (princípio que justifica revisão).
