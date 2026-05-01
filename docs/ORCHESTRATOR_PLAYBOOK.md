# Orchestrator Playbook — Ouroboros Mobile

```
DOC: ORCHESTRATOR_PLAYBOOK.md
STATUS: Master operational doc | VERSION: 1.0 | LANG: pt-BR
USO: Próxima sessão lê este arquivo PRIMEIRO depois de
     STATE.md para saber como atuar como orquestrador,
     validador e integrador (disparando agentes executores e
     fechando sprints conforme o contrato de integração).
```

---

## 1. Filosofia

O orquestrador principal **não codifica diretamente** durante uma
sprint de implementação. O papel é:

1. **Planejar** — escolher próxima sprint conforme `ROADMAP.md` +
   `STATE.md`.
2. **Orquestrar** — disparar `executor-sprint` agent com prompt
   completo (ver §3) e ler o proof-of-work devolvido.
3. **Validar** — confirmar via Chrome MCP (Camada V cruzada) o
   que o agente entregou.
4. **Integrar** — atualizar `STATE.md` + `ROADMAP.md` + criar
   `MNN-checkpoint-visual.md` + commit + push.
5. **Comunicar** — avisar o usuário ao fechar cada sprint e antes
   de disparar a próxima.

A premissa é que o agente executor faz a engenharia profunda
(decide arquivos, escreve testes, captura screenshots playwright).
O orquestrador faz a engenharia de processo (ordem, dependências,
integração entre sprints, commits limpos).

**O usuário deu autorização durável** para o orquestrador:

- Push automático em `main` ao fechar cada sprint com smoke verde
  (memória `feedback_push_automatico.md`).
- Controle total de Chrome MCP (mouse, teclado, file pickers)
  sem confirmação por etapa (memória
  `feedback_controle_total_chrome.md`).
- Modo de orquestração formal: orquestrador sempre planeja,
  orquestra e valida; agentes só executam (memória
  `feedback_orquestracao.md`).

---

## 2. Ciclo de uma Sprint

### Passo 1 — Ler estado atual

```bash
cat STATE.md           # commit atual + próxima sprint
cat ROADMAP.md         # mapa completo
cat docs/sprints/MNN-spec.md   # spec da próxima
```

`STATE.md` aponta a próxima sprint. `MNN-spec.md` tem 9 seções
(Objetivo, Entregáveis, APIs reutilizáveis, **Integração ao
projeto** §3.5, Restrições, Procedimento, Verificação, Commit,
Checkpoint visual, **Definição de Pronto** §9, **Decisões
tomadas** §10).

### Passo 2 — Validar dependências

Antes de disparar, confirme via `Read` que os arquivos que a
spec assume existirem realmente existem. Os agentes executores
verificam isso na investigação inicial, mas se o orquestrador
detectar gap antes, evita sprint mal-formada.

Padrões comuns que precisam estar prontos:

| Sprint precisa | Existe se |
|---|---|
| `(tabs)/_layout.tsx` | M00.5 fechada |
| `useSettings.featureToggles.<key>` | M00.5 criou shape; M15 implementou UI |
| `app/em-breve.tsx` removido | M13 fechada |
| `BOOT_HOOKS` array | M00.5 fechada |
| Schema X exportado em `schemas/index.ts` | sprint dona fechada |
| Mockup HTML Tela N | M00.6 atualizou |

### Passo 3 — Disparar agente executor

Use `Agent` com `subagent_type: "executor-sprint"`. Template em
§3 deste playbook. **Sempre** inclua:

- Path absoluto do repo + HEAD atual.
- Caminho da spec.
- Decisões já tomadas (copiar de §10 da spec).
- Restrições críticas (Regra −1, Sentence case, limites).
- Comandos exatos de validação smoke.
- Instruções de checkpoint visual (Camada A do agente).
- Lista explícita de **NÃO FAÇA** (não atualize STATE/ROADMAP,
  não commite, não toque em outras sprints).
- Instrução para devolver com `[PRONTO PARA VALIDAÇÃO V]`.

O agente tipicamente trabalha **15-25 min** e devolve proof-of-work
detalhado (diff resumido, smoke literal, sha256 dos screenshots,
decisões implementadas, achados colaterais).

### Passo 4 — Receber proof-of-work

Leia o proof-of-work. Verifique:

- **Smoke runtime exit 0** em todos os 5 contratos (anonimato,
  typecheck, npm test, smoke.sh, expo export).
- **Aritmética de testes:** total final igual ou maior que
  baseline. Δ esperado vem na spec (geralmente +20 a +80).
- **Achados colaterais:** se algum bug pré-existente detectado,
  registrar em `ROADMAP.md` como sprint sucessora `MNN.x` ou
  `MNN-fix-<slug>` (não corrigir inline — anti-débito).
- **Aprovação visual da Camada A:** screenshots do agente em
  `docs/sprints/MNN-screenshots/A-*.png`.

### Passo 5 — Validar via Chrome MCP (Camada V cruzada)

Subir Metro web em background:

```bash
nohup npx expo start --web > /tmp/m<NN>-web.log 2>&1 & disown $!
for i in $(seq 1 30); do
  curl -s -o /dev/null --max-time 1 http://localhost:8081/ 2>/dev/null && break
  sleep 1
done
```

Carregar tools do `claude-in-chrome` MCP via `ToolSearch`:

```
ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,
              mcp__claude-in-chrome__navigate,
              mcp__claude-in-chrome__computer,
              mcp__claude-in-chrome__javascript_tool,
              mcp__claude-in-chrome__browser_batch
```

Padrão de validação (ver §4 deste playbook para detalhes).

**Use `browser_batch`** quando puder agrupar 3+ ações
(navigate + wait + screenshot + click + screenshot). É 10x mais
rápido que chamadas individuais.

**Aceite a Camada A do agente como suficiente** quando:

- Ele já capturou em viewport mobile correto (412×900 ou similar).
- Estados são claros (empty, com dados, modal).
- A V cruzada validaria o mesmo (rota carrega, paleta correta).

**Faça V cruzada profunda** quando:

- Sprint integradora tipo M00.5 (estrutural).
- Achado colateral pendente.
- Usuário pediu validação extra.

### Passo 6 — Criar checkpoint visual

Padrão `docs/sprints/MNN-checkpoint-visual.md`:

````markdown
# Sprint MNN — Checkpoint Visual

```
DATA: YYYY-MM-DD
EXECUTOR: agente executor-sprint (<agentId>)
ORQUESTRADOR: principal
DECISÃO: APROVADO  |  APROVADO COM RESSALVA  |  REPROVADO
```

## Camada A — Agente executor

<lista de screenshots A-* com sha256 e descrição>

## Camada V — Validação cruzada via claude-in-chrome MCP

<o que o orquestrador validou ao vivo>

## Smoke runtime

<bloco com anonimato/typecheck/testes/smoke/expo export>

## Integração ao projeto (CONTRACT §2)

- [ok] <itens checklists>

## Decisões implementadas (spec §10|11)

- [ok] <itens>

## Achados colaterais

<lista ou "Nenhum">

## Decisão final

**APROVADO.** <justificativa curta>

**Próxima sprint executável:** [<MNN+1>](MNN+1-spec.md).
````

**Atenção:** hook anti-emoji bloqueia o emoji de check (codepoint
U+2705) e similares. Use `[ok]` em vez. Hook detecta unicode
emoji em qualquer doc do projeto (regra CLAUDE.md #3).

### Passo 7 — Atualizar invariantes

```bash
# ROADMAP.md: mudar status sprint atual de [todo] para [ok]
# + adicionar sprints sucessoras se achados colaterais geraram
# Read antes de Edit; Edit cirúrgico.

# STATE.md: cabeçalho com novo HEAD (a commitar) + próxima sprint
# Read antes de Edit.
```

### Passo 8 — Commit + push

`git add -A` ou seletivo (arquivos da sprint), depois:

```bash
git commit -m "$(cat <<'EOF'
feat: m<NN> <descricao curta sem acento>

<corpo detalhado sem acento, lista de entregáveis>

Smoke: <total> testes passing <suites> suites (+<delta> vs
baseline <baseline>), typecheck 0 erros, anonimato OK,
bundle Hermes <X> MB.

<Camada A descrição curta>

Achados colaterais: <Nenhum | M00.x.y registrado>.

<assinatura padrao do co-autor preserva-se via convencao git>
EOF
)"

git push origin main
```

**Mensagem do commit em PT-BR sem acento** (convenção shell/CI).
Corpo pode ter quebras de linha. A linha de assinatura padrão
do co-autor (formato `Co-Authored-By: <nome> <email>`) é
adicionada pela convenção do CLI; não escrever literalmente em
arquivos sob versão (anonimato §1.1 do BRIEF).

`pre-push` hook roda smoke.sh; se falhar, push é rejeitado.

### Passo 9 — Avisar usuário

Mensagem curta com:
- Sprint fechada (MNN + descrição).
- Métricas (testes, commit hash).
- Achados colaterais (se houver).
- Próxima sprint a disparar (ou pergunta se redirecionamento
  desejado).

Tabela cumulativa após várias sprints é boa prática
(facilita visualização do progresso da sessão).

### Passo 10 — Disparar próxima sprint

Se usuário não pediu pausa, dispare a próxima imediatamente
(autorização durável de "modo orquestração"). Volta ao Passo 1.

---

## 3. Template de prompt do executor-sprint

```text
EXECUTAR Sprint MNN — <Título>.

Repo: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros`.
HEAD em `<sha>` (<sprint anterior> fechada — <o que foi
entregue>).

**Spec:** `docs/sprints/MNN-spec.md`. Leia integral. §3.5
Integração + § Definição de Pronto + § Decisões tomadas
resolvidas.

**Documentos de apoio obrigatórios:**
- `VALIDATOR_BRIEF.md` — invariantes (Regra −1, paleta
  Dracula, Sentence case PT-BR).
- `docs/sprints/INTEGRATION-CONTRACT.md` — pontos canônicos.
- <específicos da sprint>

**Decisões tomadas (não perguntar):**

1. **<tópico>:** <decisão>.
2. ...

**Escopo cirúrgico:**

- <lista de arquivos a criar/modificar>.

**Restrições críticas:**

- Regra −1, Sentence case PT-BR, ADR-0005 sem gamificação.
- TS strict, alias `@/*`.
- <específicas da sprint>.

**Validação obrigatória:**

`./scripts/check_anonimato.sh`
`npx tsc --noEmit`
`npm test --silent`  # esperar +<X> a +<Y> testes
`./scripts/smoke.sh`
`npx expo export --platform android --output-dir /tmp/m<NN>-export`

**Checkpoint visual (Camada A — sua):**

- Subir `nohup npx expo start --web > /tmp/m<NN>-web.log 2>&1 &`.
- Aguardar Metro pronto.
- Capturar via playwright headless ou claude-in-chrome MCP em
  `docs/sprints/M<NN>-screenshots/`:
  - `A-01-<estado>.png` — <descrição>.
  - <demais>

**NÃO FAÇA:**
- Não atualize STATE/ROADMAP/CHANGELOG (orquestrador faz).
- Não commite, não pushe.
- Não toque em outras sprints fechadas.
- Não dispatche skill validacao-visual pesada.

**Devolva:** proof-of-work resumido + flag `[PRONTO PARA
VALIDAÇÃO V]`.

PODE COMEÇAR.
```

**Variações importantes:**

- Sprint reescrita já tem decisões em §10 da spec; copie
  textualmente para evitar dúvida.
- Sprint que estende boot hooks: lembre o agente que `BOOT_HOOKS`
  vive em `src/lib/boot/reagendamento.ts`.
- Sprint com schema novo: lembrar exportar via barrel
  `src/lib/schemas/index.ts`.
- Sprint que substitui redirect-stub: explicar que tab atual em
  `(tabs)/_layout.tsx` da M00.5 era stub e agora ganha tela real.

---

## 4. Como validar via Chrome MCP

### Setup inicial da sessão

Tools necessários (carregar via `ToolSearch`):

```
mcp__claude-in-chrome__tabs_context_mcp        # createIfEmpty true
mcp__claude-in-chrome__tabs_create_mcp
mcp__claude-in-chrome__navigate
mcp__claude-in-chrome__read_page               # arvore de a11y
mcp__claude-in-chrome__computer                # mouse/teclado/screenshot/zoom
mcp__claude-in-chrome__javascript_tool         # injection
mcp__claude-in-chrome__browser_batch           # batching obrigatório
```

`browser_batch` é crítico: o sistema avisa "use batch" se você
chamar 1 tool por vez. Agrupe sempre.

### Workflow padrão

1. `tabs_context_mcp createIfEmpty:true` — pega/cria tab.
2. `navigate http://localhost:8081/` — Expo web bundle.
3. Aguardar 4-5s (`wait`) — primeira carga é pesada.
4. `javascript_tool` — pre-popular localStorage para simular
   onboarding done + vault concedido + pessoa.
5. Recarregar (`navigate` mesma URL ou `window.location.reload`).
6. `screenshot save_to_disk:true` — captura inicial.
7. `left_click [x,y]` ou `javascript_tool` para interagir.
8. Mais screenshots conforme estados.

### Pre-priming localStorage

Os 3 stores essenciais para chegar na Tela 01:

```javascript
localStorage.setItem('ouroboros.onboarding.v1', JSON.stringify({
  state: { done: true, tipoCompanhia: 'casal', syncMethod: 'syncthing' },
  version: 0
}));
localStorage.setItem('ouroboros.vault.v1', JSON.stringify({
  state: { vaultRoot: 'web://mock-vault/Protocolo-Ouroboros' },
  version: 0
}));
localStorage.setItem('ouroboros.pessoa.v1', JSON.stringify({
  state: {
    pessoaAtiva: 'pessoa_a',
    filtroPessoa: 'pessoa_a',
    nomes: { pessoa_a: 'A', pessoa_b: 'B' },
    fotos: { pessoa_a: null, pessoa_b: null }
  },
  version: 0
}));
```

Para opt-ins, ative os toggles em `useSettings`:

```javascript
const k = 'ouroboros.settings.v1';
const c = JSON.parse(localStorage.getItem(k) || '{"state":{}}');
c.state.featureToggles = c.state.featureToggles || {};
c.state.featureToggles.cicloMenstrual = true;       // M14.5
c.state.featureToggles.alarmePessoal = true;        // M16
c.state.featureToggles.todoLeve = true;             // M17
c.state.featureToggles.contadorDiasSem = true;      // M18
c.state.featureToggles.calendarioConquistas = true; // M11.5
c.state.featureToggles.widgetHomescreen = true;     // M20
localStorage.setItem(k, JSON.stringify(c));
```

### Limitações conhecidas do Web

Web Mock é **stub**. Não tem:

- SAF real → `listVaultFolder` retorna `[]`.
- File system real → `expo-file-system/legacy` lê/escreve em mock.
- Notifications nativas → `expo-notifications` simula.
- Camera/microfone → não disponíveis.
- Haptic → `expo-haptics` simula.
- BottomSheet do `@gorhom/bottom-sheet` v5 + Reanimated 4 não
  anima `expand()` em web (Armadilha A17). Workaround: forçar
  transform via DevTools.

Estados que **só aparecem em Nível B/C** (emulador ou celular):

- Galeria com cards reais persistidos.
- Modal de exclusão a partir do botão real.
- Sparkline tooltip ao tap em ponto.
- Navegação após save real (sai da rota antes de capturar).
- Notificações disparando.

Para esses, **aceite os screenshots playwright do agente** (que
mockou via fixtures localStorage ou DOM injection) ou registre
no checkpoint que validação Nível C fica para M19 (release).

### Quando o renderer trava

Se `screenshot` retornar timeout, `navigate` para outra URL e
recomece. Página complexa pode ficar não-responsiva após muitos
clicks.

---

## 5. Padrões aprendidos (11 sprints da meta-sessão 2026-05-01)

### 5.1 Armadilhas que reincidiram

| Armadilha | Quando | Workaround |
|---|---|---|
| A1 — Reanimated babel last | sempre | `nativewind/babel` antes; `react-native-reanimated/plugin` último |
| A4 — `expo-image-picker` MediaTypeOptions | M03.2, M07, M13 | usar `mediaTypes: ['images']` em vez |
| A5 — Conflito Syncthing 2 celulares | M05 | sufixo `-pessoa_<x>.md` |
| A13 — `react-test-renderer` 19.2.5 | M11, M16, M17 | `npm install -D react-test-renderer@19.1.0 --legacy-peer-deps` |
| A17 — BottomSheet web não anima | M05, M11, M17 | forçar transform via DevTools OU `Platform.OS !== 'web'` em autoFocus |

`react-test-renderer` é o reincidente mais comum. Sempre que o
agente roda `npm install --no-save playwright`, o pin quebra.
Solução é a mesma 3 vezes seguidas. Spec do executor-sprint
deveria mencionar isso.

### 5.2 Integrações cruzadas que aconteceram

- **M11 + M12:** `useFotosAgregadas` (M11) cresceu para ler
  `medidas/` quando M12 entregou o schema. Sem mudança no
  consumer da galeria.
- **M13 + M11:** `treinos/draft/` (M13 placeholder) migrado
  para `treino_sessao` formal pela M11 via boot hook
  `migrarDraftsParaTreinoSessao`. Idempotente.
- **M14.5 + M15:** Toggle `cicloMenstrual` criado em M00.5
  ganhou UI em M15; M14.5 só consome.
- **M00.6 + M11.5/M20:** Mockup Tela 25 e 26 atualizado em
  M00.6 (arquivo separado por limitação de bundler);
  M11.5 e M20 dependem.
- **M07 + M09:** `getBairroAtual` da M07 reaproveitado pela
  M09 para auto-bairro do scanner.

Padrão: **integração cruzada é o sinal de que o
INTEGRATION-CONTRACT está funcionando**. Toda sprint que
pluga em ponto canônico (boot hook, schema barrel, store
shape) habilita sprints futuras a consumirem sem refactor.

### 5.3 Achados colaterais documentados

| ID | Origem | Status |
|---|---|---|
| M00.5.x | M00.5: Rules of Hooks em `(tabs)/index.tsx:81` | `[todo]` |
| M19.x | M00.6: bundle HTML toolchain regenerar | `[todo]` |

Ambos preservados em `ROADMAP.md` como sprints sucessoras.
Nunca foram corrigidos inline (protocolo anti-débito).

### 5.4 Quando aceitar Camada A vs forçar V cruzada

**Aceite Camada A (agente):**
- Sprint cujo agente capturou em viewport mobile correto
  (390×844 ou 412×900 via playwright headless).
- Smoke verde + testes cobrindo lógica.
- Estados claros nos screenshots A-*.

**Force V cruzada:**
- Sprint estrutural (M00.5).
- Sprint que mexe em rotas/tabs.
- Achado colateral pendente.
- Usuário pediu validação extra.

Em sprints de schema/lógica pura (sem UI nova), aceite testes
unitários como evidência. V cruzada vira opcional.

### 5.5 Quando o stream do agente cair (timeout)

Como aconteceu na M18:

- Agente ficou vivo (`agentId` retornado).
- Posso usar `SendMessage` para retomar OU validar o trabalho
  manualmente (smoke completo + V cruzada manual).
- Se arquivos foram criados (verificar `git status`), só falta
  capturar screenshots — orquestrador faz via Chrome MCP +
  documenta no checkpoint que stream caiu mas trabalho ficou
  íntegro.

---

## 6. Tratamento de achados colaterais

### Princípio anti-débito

**Nunca** corrija bug pré-existente inline durante uma sprint
de feature. **Sempre** registre como sprint sucessora.

### Padrão de registro

1. Agente menciona em "Achados colaterais" do proof-of-work.
2. Orquestrador adiciona linha em `ROADMAP.md`:

```markdown
| `[todo]` | M<NN>.x | <Descrição curta do bug> (achado colateral M<MM>) | <telas afetadas> | — | <X>h | — |
```

3. Mencionar no `MNN-checkpoint-visual.md` em "Achados colaterais".
4. Mencionar no commit message: `Achado <ID> registrado.`

### Quando dispatchar `/planejar-sprint`

Se o achado é grande (vai precisar mais de 4h ou afeta
arquitetura), dispatchar `planejador-sprint` para gerar spec
completa. Caso contrário, registro simples no ROADMAP basta;
spec completa pode aguardar.

---

## 7. Workflow de commit

### O que stagear

Geralmente `git add -A` é seguro porque:

- M00.5 criou `.gitignore` com tudo necessário ignorado.
- Sprints novas tocam só arquivos do escopo.
- `node_modules/` ignorado.

### Mensagem de commit

**PT-BR sem acento**. Estrutura:

```
feat: m<NN> <descricao em uma linha sem acento>

M<NN> entrega <o que mudou>:

- Lista de entregáveis principais
- Sem usar acento em comentários/commits

Decisoes implementadas:
- Item 1
- Item 2

Smoke: <X> testes passing <Y> suites (+<delta> vs baseline <Z>),
typecheck 0 erros, anonimato OK, bundle Hermes <N> MB.

<Camada A: descricao curta>

Achados colaterais: <Nenhum | M<NN>.x registrado>.
```

A linha `Co-Authored-By: <...>` é adicionada via convenção do
CLI (se o ambiente injetar) ou manualmente no momento do
`git commit -m`. Nunca incorporar a string literal "Claude" /
"Anthropic" / "GPT" em arquivos de docs/código sob versão
(Regra −1, BRIEF §1.1).

Sempre via heredoc para preservar formatação:

```bash
git commit -m "$(cat <<'EOF'
feat: m<NN> ...

EOF
)"
```

### Push automático

Autorização durável: `git push origin main` ao final de cada
sprint validada com smoke verde, sem pedir confirmação
(memória `feedback_push_automatico.md`).

`pre-push` hook roda smoke.sh; falha = rejeição. Se cair,
**nunca usar `--no-verify`** sem ordem explícita do usuário.

---

## 8. Comunicação com usuário

### Padrão de mensagem ao fechar sprint

```markdown
M<NN> commit `<sha>` pushed. **<X> sprints fechadas em sequência.**

| Sprint | Testes | Δ | Commit |
|---|---|---|---|
| <antiga> | ... | ... | ... |
| **M<NN>** | **<total>** | **+<delta>** | **`<sha>`** |

**+<total Δ>** desde baseline <baseline>. <ressalvas se houver>.

Disparando **M<NN+1>**: <breve descrição>:
```

A tabela cumulativa cresce com a sessão. Limite a 11-12 linhas
ou recorte as mais antigas.

### Quando pausar e perguntar

- Sprint que exige `npm run build:dev` (M06.5, M09).
- Sprint backend Python (MOB-bridge-1/2/3) — repo separado.
- Sprint que envolve risco (release final M19).
- Após cada bloco do ROADMAP fechado.
- Stream timeout do agente.
- Hook bloqueando algo inesperado.

### Quando seguir sem perguntar

- Sprint padrão dentro de bloco já em andamento.
- Achado colateral menor.
- Sprint de validação trivial.
- Smoke verde + Camada A clara.

---

## 9. Erros e recuperação

### Stream idle timeout do agente

```
API Error: Stream idle timeout - partial response received
agentId: a<...>
```

Agente continua vivo. Opções:

1. `SendMessage to: '<agentId>'` continuando o trabalho.
2. Verificar `git status` — se arquivos foram criados, só falta
   o final (screenshots, smoke). Orquestrador completa
   manualmente.
3. Dispatchar agente novo se o estado está confuso.

### Hook anti-emoji bloqueando

```
PreToolUse:Write hook blocking error: Emoji detectado (...)
```

O hook `guardian.py` em `~/.claude/hooks/` valida CLAUDE.md
regra #3 (zero emojis em código, commits, docs, respostas).

Substituir por `[ok]` (lista) ou `OK` (texto). Reescrever
arquivo inteiro via `Write` ou `Edit` cirúrgico. Hook pega
qualquer codepoint emoji unicode incluindo check, X, foguete,
etc. — escreva sempre marcadores ASCII puros.

### Hook anti-anonimato bloqueando

```
PreToolUse:Write hook blocking error: Atribuicao a IA detectada
('<token>') (regra CLAUDE.md #2)
```

O guardian também detecta menções a IA (Claude, GPT, Anthropic,
OpenAI, Gemini, by AI, ai-generated, etc.) em qualquer doc/código
sob versão. Substituir por placeholders genéricos
(`<assinatura padrao do co-autor>`, `<orquestrador principal>`,
etc.). Commit messages digitadas direto via Bash não passam pelo
guardian — apenas escrita via Write/Edit em arquivos.

### Metro morto durante validação

Background task pode morrer por SIGPIPE quando o stdout é
cortado por `| head` ou similar. Subir via `nohup` com
redirect explícito:

```bash
nohup npx expo start --web > /tmp/m<NN>-web.log 2>&1 & disown $!
```

### Smoke falhando após pre-push

`react-test-renderer` versão errada (Armadilha A13):

```bash
npm install -D react-test-renderer@19.1.0 --legacy-peer-deps
```

Outras causas: typecheck falha por import errado, teste novo
quebrando. Investigar com `npm test -- <testfile>`.

### Chrome MCP não responde

```javascript
// 1. tabs_context_mcp pra ver tabs disponíveis
// 2. tabs_create_mcp se precisar nova
// 3. navigate fresh URL
// 4. Se persistir: tabs_close_mcp e tabs_create_mcp
```

### Repo backend Python (MOB-bridge-1/2/3)

Repo separado em `~/Desenvolvimento/protocolo-ouroboros/`.

Opções:
1. Sessão dedicada nesse workdir (recomendado pelo usuário).
2. Usar `cd` + Bash do Mobile (funciona mas requer cuidado).
3. Dispatchar `general-purpose` agent com path explícito
   (sem garantia de smoke local Python).

Em geral pular para sprints Mobile que destravem sem backend
e fechar backend numa sessão dedicada futura.

---

## 10. Mapa de blocos do ROADMAP

```
Bloco 1 — Infraestrutura
   M00.5  → M00.6
                 |
Bloco 2 — Captura ativa sem dev-client
   M08 → M13 → M11 → M12
                 |
Bloco 3 — Backend Python (sessão separada)
   MOB-bridge-1 → MOB-bridge-2 → MOB-bridge-3
                 |
Bloco 4 — Cache readers (depende Bloco 3)
   M10 → M14
                 |
Bloco 5 — Settings + opt-ins
   M15 → M14.5 → M16 → M17 → M18
                 |
Bloco 6 — Dev-client features
   M06.5 → M07.x → M11.5
   M09 (paralelo)
                 |
Bloco 7 — Release final
   M20 → M19 (tag v1.0.0)
```

Status na sessão 2026-05-01:
- Bloco 1: completo (M00.5 + M00.6).
- Bloco 2: completo (M08 + M13 + M11 + M12).
- Bloco 3: pendente (sessão Python separada).
- Bloco 4: pendente (depende Bloco 3).
- Bloco 5: completo (M15 + M14.5 + M16 + M17 + M18).
- Bloco 6: pendente (depende dev-client EAS build).
- Bloco 7: pendente.

### Caminho mais curto até v1.0.0

1. **Sessão Python** (1-2h): MOB-bridge-1/2/3.
2. **Voltar Mobile** (2h): M10 + M14.
3. **dev-client setup** (~25min): `npm run build:dev` + APK
   instalado em celular.
4. **Sprints dev-client** (15-20h): M06.5 + M07.x + M11.5 + M09.
5. **M20** (6-7h): widget homescreen.
6. **M19** (6-8h): APK release v1.0.0 + tag.

Total estimado restante: ~30-40h em ritmo similar ao da
meta-sessão 2026-05-01.

---

## 11. Quick reference

### Comandos essenciais

```bash
# Estado
cat STATE.md
git log --oneline -10

# Smoke completo
./scripts/smoke.sh

# Subir Metro web (background)
nohup npx expo start --web > /tmp/web.log 2>&1 & disown $!

# Subir Metro LAN (QR para celular)
./run.sh

# Dispatch agente executor (template)
# Ver §3 deste playbook

# Validação Chrome MCP
# Ver §4 deste playbook

# Push final
git push origin main
```

### Arquivos invariantes a atualizar por sprint

- `STATE.md` — cabeçalho com novo HEAD + próxima sprint.
- `ROADMAP.md` — status sprint vira `[ok]` + sucessoras.
- `CHANGELOG.md` — entrada `[Unreleased]` (opcional, agregar
  quando fizer release).
- `docs/sprints/MNN-checkpoint-visual.md` — novo arquivo.

### IDs de agentes da sessão 2026-05-01 (referência)

```
a51344a3ed3774522 — investigação M00.5
ad807ce6672fbfb8b — execução M00.5
adbc67dd62feeca8e — execução M00.6
aca0d7549172ed630 — execução M08
a4dc9ecb95b0dea01 — execução M13
a87ff396644d66983 — execução M11
ad210c106302e0df0 — execução M12
a78f2b5620bcf9535 — execução M15
a2208430e42bca371 — execução M14.5
ac296b200ecaa5c81 — execução M16
ac1ec79a3ecb3a08e — execução M17
aced266ff8bccb394 — execução M18 (stream timeout)
```

Mantidos vivos por backend; pode usar `SendMessage` para
retomar se necessário.

---

## 12. Quando este playbook fica desatualizado

Atualize **este arquivo** (não outro) quando:

- Novo padrão emergir de 3+ sprints (ex: nova armadilha
  reincidente, novo helper canônico).
- Mudança de versão do CONTRACT (`docs/sprints/INTEGRATION-CONTRACT.md`).
- Pivô de orquestração (ex: novo pipeline de validação).
- Mudança no STATE.md format.

Bump `VERSION` no header. Histórico em git basta — sem
changelog interno.
