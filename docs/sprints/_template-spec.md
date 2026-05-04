# Template de Spec de Sprint

Este arquivo é a **forma canônica** de toda spec de sprint do
Ouroboros Mobile. Quando criar `docs/sprints/MNN-spec.md`, copie este
template e preencha todas as 9 seções. Mantenha a ordem das seções e
o cabeçalho do bloco de código.

A regra de fundo: qualquer Opus em sessão fresh deve conseguir
**executar a sprint sem precisar do histórico da conversa**, lendo
apenas a spec + os arquivos referenciados.

---

```markdown
# Sprint MNN — <título em Title Case com acentuação completa>

\`\`\`
DEPENDE:    <commits e sprints anteriores; ex: HEAD em ce80b12, M03 fechada>
BLOQUEIA:   <sprints futuras que dependem desta; ex: M11.5 (calendário)>
ESTIMATIVA: <horas; ex: 3-4h>
\`\`\`

## 1. Objetivo

<2 a 4 linhas em prosa: o que essa sprint entrega ponta-a-ponta.
Foque em comportamento observável pelo usuário, não em implementação.>

## 2. Entregáveis

### Arquivos novos

- `<path absoluto>` — <breve descrição do conteúdo>
- ...

### Arquivos modificados

- `<path absoluto>` — <descrição da mudança e por quê>
- ...

## 3. APIs reutilizáveis

Componentes, stores, hooks e schemas existentes que devem ser usados.
Cite paths exatos para evitar reimplementação:

- `<path>` — <o que reaproveitar>
- ...

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013 revogou a regra original de "lowercase intencional").
- `accessibilityLabel` sem acento (convenção screen reader).
- Comentários em código `.ts`/`.tsx` sem acento (convenção shell/CI).
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
- Imports via alias `@/*` configurado em `tsconfig.json`.
- Não tocar em arquivos fechados de sprints anteriores sem permissão
  explícita do planejador.

## 5. Procedimento sugerido

1. <passo numerado, com decisão concreta>
2. ...

## 6. Verificação runtime-real

\`\`\`bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m<NN>-export && rm -rf /tmp/m<NN>-export
\`\`\`

Todos exit 0. Se algum quebrar, parar e reportar.

## 7. Commit

\`\`\`
<tipo>: m<NN> <mensagem PT-BR sem acento, imperativo>
\`\`\`

Tipos válidos: `feat` | `fix` | `refactor` | `docs` | `perf` | `test`
| `style` | `chore` | `ci`.

## 8. Checkpoint visual (apenas se a sprint toca UI)

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` + claude-in-chrome
  MCP. Cobre fluxos JS, navegação, render, transições. Sem conflito
  com celular do usuário.
- **APIs nativas — Nível B (emulador Android):**
  `./scripts/start-emulator.sh`. Cobre haptic, SAF, SecureStore,
  expo-image-picker, expo-camera. Sob demanda.
- **Final — Nível C (celular físico):** **só com permissão explícita
  do usuário**. Validação ao vivo de Syncthing real, share intent,
  fotos da galeria.

Capturar screenshots em `docs/sprints/MNN-screenshots/` quando
aplicável. Comparar lado a lado com mockup
`docs/Ouroboros_22_telas-standalone.html` quando a sprint
implementar uma das 22 telas core.

### Checklist obrigatório de manutenção

- [ ] `docs/FEATURES-CANONICAS.md` atualizado (sprint que
  introduz/modifica/remove feature). Validador-sprint recusa
  sprint que toca UI ou schema sem este check.
- [ ] `STATE.md` atualizado.
- [ ] `ROADMAP.md` atualizado.
- [ ] `CHANGELOG.md` atualizado em `[Unreleased]`.
- [ ] `VALIDATOR_BRIEF.md` §1.9 atualizado (se sprint mudou
  política de validação).

## 9. Dúvidas em aberto

<perguntas pendentes que precisam ser resolvidas com o humano antes
 de executar. Se não houver, escrever "Nenhuma.">
```

---

## Convenções comuns a todas as specs

### Numeração

- `MNN` — sprints inteiras (M04, M05, ...).
- `MNN.x` — sub-sprints de fix da sprint mãe (M03.1, M03.2, ...).
- `MNN.5` — sprint intermediária introduzida no roadmap (M06.5, M11.5,
  M14.5).
- `MNN.x` (com `.x` literal) — feature transversal que afeta múltiplas
  sprints (M07.x).

### Sumário de testes

Cada sprint deve manter ou aumentar o total de testes. Não reduzir.
Se um teste virar inválido por mudança de API, atualizar — não
deletar — e justificar no commit.

### Política de validação visual

Toda sprint que toca UI termina com **pedido explícito ao usuário**
para checkpoint visual. Antes de declarar concluída, o Claude
principal:

1. Roda Nível A no Chrome web e captura screenshots automaticamente.
2. Valida estrutura (DOM via `claude-in-chrome` MCP).
3. Pede ao usuário para abrir Expo Go no celular e validar Nível C.
4. Aguarda aprovação humana.
5. Salva screenshots aprovadas em `docs/sprints/MNN-screenshots/`.
6. Atualiza `STATE.md` com novo HEAD e commit final.

### Sprints sem UI

Sprints de docs (como M00.docs), refactor de stores ou backend não
precisam de seção 8. Substituir por nota explicando.
