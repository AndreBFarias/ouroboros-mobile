# Contexto: Onde Estamos e Por Quê

```
DOC: CONTEXTO.md
STATUS: Master context | VERSION: 3.0 | LANG: pt-BR
USO: Leia este arquivo PRIMEIRO antes de tocar em qualquer código do
     ouroboros-mobile. Ele explica o ecossistema, as restrições
     invioláveis, e como o Mobile se encaixa em algo que já existe.
```

---

## 1. Quem Usa Isso

Duas pessoas. Casadas. Ambas neurodivergentes (TEA + TDAH + episódios de
depressão), ambas medicadas, ambas saindo de um período difícil que
envolveu burnout, débito acumulado e perda significativa em 2025.

O App **não é produto** para um mercado. É ferramenta pessoal, construída
sob medida para essas duas pessoas específicas. Todo trade-off é tomado
com a pergunta "isso ajuda ou atrapalha quem já se cobra demais?". Não é
opcional, é o critério dominante.

Isso significa:

- **Fricção zero é existencial**, não decorativo. Quem já desistiu de
  versões manuais (Markdown hardcoded com GIFs) por excesso de burocracia
  vai desistir de novo se o App pedir mais que 2 taps.
- **Estética é essencial**, não adorno. Um App bonito e fluido reduz a
  resistência de abrir. Um App feio e lento é descartado mesmo que
  funcione.
- **Tom sóbrio.** Sem motivação falsa, sem "você consegue!", sem streaks
  punitivos.
- **Dados pessoais sensíveis** (humor, diário emocional, conflitos, exames
  médicos) não saem do device. Zero rede.
- **Vault compartilhado:** as duas pessoas compartilham acesso a tudo. Não
  há privacidade entre elas, há entre elas e o resto do mundo.

### Perfil do Dev

O usuário é cientista de dados, dev de IA. Vem de Python, pandas,
dashboards. **Não é dev mobile.** Isso afeta decisões:

- Stack escolhida (Expo + React Native) **prioriza ecossistema com muita
  ajuda de LLM** sobre performance bruta. Quando voltar daqui a 3 meses
  para adicionar feature, vai colar código num agente de IA e pedir
  ajuda — o ecossistema React Native tem ordens de magnitude mais
  material de treino que Kotlin Compose.
- Componentes base já vêm com **boa estética embutida** (gluestack-ui +
  Moti) para reduzir necessidade de polimento manual.
- Documentação do projeto é **deliberadamente verbosa** — repete contexto
  em cada arquivo para quem volta sem memória do que foi feito antes.

---

## 2. O Ecossistema Ouroboros

### protocolo-ouroboros (Existente, no Desktop)

Repositório `github.com/AndreBFarias/protocolo-ouroboros`, GPL-3.0, em
produção, v1.0.1. Instalado em `~/Desenvolvimento/protocolo-ouroboros`
no Pop!_OS 22.04.

**O que é:** pipeline ETL financeiro pessoal escrito em Python 3.11+.
Consolida dados bancários de 21 extratores (Nubank, C6, Itaú, Santander,
Caixa, OFX, energia OCR, NFCe, DANFE, XML NFe, boletos, cupom, receita
médica, garantia, DAS, DIRPF, contracheque) em XLSX unificado de 8 abas,
gera relatórios mensais em Markdown e tem dashboard Streamlit de 13
páginas com tema Dracula.

**Stack desktop:**
- Python + pandas, pdfplumber, openpyxl, xlrd, msoffcrypto-tool
- Tesseract OCR
- Streamlit + Plotly
- ruff, pytest (1.261 testes passando)
- PyYAML
- SQLite para grafo de conhecimento (7480 nodes)

**Vault:**
- Pasta local sincronizada via Syncthing entre os 3 aparelhos (desktop +
  2 celulares Redmi Note 13 5G Pro)
- Nome interno: `Controle de Bordo`
- Estrutura já existente em `inbox/` que o pipeline lê

### ouroboros-mobile (Novo, em Pasta Separada)

**Onde:** `~/Desenvolvimento/ouroboros-mobile/` (sibling de
protocolo-ouroboros, **não subdiretório**)

**O que será:** APK Android que escreve no mesmo Vault que o protocolo
desktop lê. Mobile é a ponta de captura ativa, desktop é a ponta de
processamento.

**Relação:**

```
[celular A] ─────┐
                 ├── Vault sincronizado ──┐
[celular B] ─────┘                         │
                                           ↓
                                      [desktop pop!_OS]
                                           │
                                           ↓
                                  [protocolo-ouroboros]
                                  - extrai do inbox/
                                  - categoriza
                                  - gera XLSX + relatórios
                                  - dashboard streamlit
```

Mobile **nunca** processa, **nunca** categoriza, **nunca** gera relatório.
Mobile só escreve `.md` no Vault. O pipeline desktop pega no próximo run.

---

## 3. Identidade de Pessoas no Código

### Princípio: Zero Hardcoded

Os nomes reais das duas pessoas **não aparecem em nenhum arquivo de
código**. Ponto. Nem em `src/`, nem em `app/`, nem em testes, nem em
schemas, nem em commits. Isso é a regra mais importante para manutenção
futura — se quiser dar o App para terceiros, ou se um dia outro casal
quiser adaptar, ninguém precisa fazer find-and-replace dos nomes.

### Convenção: PESSOA_A e PESSOA_B

No código, usa-se duas variáveis:

- `PESSOA_A`: cor `--purple` (`#bd93f9`), avatar "A"
- `PESSOA_B`: cor `--pink` (`#ff79c6`), avatar "B"

Aparece como:

```ts
type PessoaId = 'pessoa_a' | 'pessoa_b' | 'ambos';

interface Pessoa {
  id: PessoaId;
  cor: string;
  inicial: string;
}
```

### Único Arquivo com Nomes Reais

`src/config/pessoas.config.ts`:

```ts
import type { PessoaId } from '@/lib/schemas/pessoa';

// Único arquivo onde nomes reais aparecem.
// Editar aqui se trocar de usuário ou adaptar o app para outras pessoas.
export const PESSOAS_CONFIG: Record<PessoaId, { nome: string; inicial: string }> = {
  pessoa_a: { nome: 'Nome_A', inicial: 'A' },
  pessoa_b: { nome: 'Nome_B', inicial: 'B' },
  ambos:    { nome: 'Ambos', inicial: 'AB' },
};
```

Esse arquivo pode entrar no `.gitignore` se preferir, com um
`pessoas.config.example.ts` versionado servindo de template.

### Frontmatter dos `.md` no Vault

```yaml
---
tipo: humor
data: 2026-04-28
autor: pessoa_a              # nunca "andre", "Andre" ou nome real
---
```

### Validação Automática

`scripts/check_anonimato.sh` (detalhes em `PLANO_TECNICO_APK.md`) detecta
violação:

```bash
NOMES_REAIS='Andr[eé]|Vit[oó]ria|Maria|Jo[aã]o'
grep -rE "$NOMES_REAIS" src/ app/ tests/ \
  --include="*.ts" --include="*.tsx" --include="*.md"
# Deve retornar VAZIO. Se aparecer, refatorar para PESSOA_A/PESSOA_B.
```

A única exceção autorizada é `src/config/pessoas.config.ts`, que o script
ignora explicitamente.

### No Backend Desktop (protocolo-ouroboros)

O backend precisa fazer o mesmo lookup. Quando ler frontmatter
`autor: pessoa_a`, deve resolver via config compartilhado para mostrar o
nome real no dashboard Streamlit. Sprint dedicada no roadmap do backend
vai cobrir isso.

---

## 4. Interface Mobile ↔ Backend

O "contrato" entre Mobile e desktop é o **Vault**. Não há API HTTP, não
há banco compartilhado, não há mensageria. Há uma pasta sincronizada e
schemas YAML.

> **AVISO — Vault físico mudou.** A partir de 2026-04-29, o Vault
> Mobile vive em **`~/Protocolo-Ouroboros/`** (separado do Vault
> humano de Obsidian em `~/Controle de Bordo/`). Sincronizado via
> Syncthing entre desktop e Android. Decisão formalizada em
> ADR-0014. As subpastas abaixo continuam canônicas; só o caminho
> raiz mudou.

### O que o Mobile Escreve

Mobile escreve em pastas determinadas do Vault:

```
vault/
├─ daily/                     ← humor diário
├─ eventos/                   ← eventos com lugar
├─ inbox/
│  ├─ financeiro/
│  │  └─ pix/                 ← PIX recebidos via share intent
│  └─ mente/
│     ├─ humor/               ← (alternativo a daily/)
│     └─ diario/              ← diário emocional
├─ treinos/                   ← sessões de treino
├─ medidas/                   ← medidas corporais
└─ assets/                    ← fotos, áudio, GIFs
```

### O que o Mobile Lê

Mobile **só lê para exibir**, nunca processa. Dois caminhos:

1. **Arquivos crus que ele mesmo ou o outro celular escreveu** — humor
   diário, eventos, treinos, etc. Listagem direta do filesystem.

2. **Caches gerados pelo desktop** em `vault/.ouroboros/cache/`:
   - `financas-cache.json` — saldo da semana, top categorias, últimas
     transações (alimenta tela 22 — Mini Financeiro)
   - `humor-heatmap.json` — dados pré-agregados para tela 21

Quando o cache não existe, a tela exibe estado vazio específico:
"rode o pipeline no desktop para carregar dados."

### Sincronização

**Sync delegado** (ADR-002 em `PLANO_TECNICO_APK.md`). Syncthing ou
Obsidian Sync rodam fora do App. Mobile só observa status para tela 23
(Settings → Sync). Conflitos são resolvidos no desktop via merge manual.

---

## 5. Regras Invioláveis

Essas regras não são guidelines. Não são melhores práticas. São bloqueios
hard-coded em `scripts/check_anonimato.sh`, `hooks/pre-commit` e CI. Quem
violar não consegue commitar.

### Regra -1: Anonimato Absoluto

O projeto é comunitário. Não existe "feito por", não existe crédito de
autoria. Não existe nome de IA em lugar nenhum.

**Proibido em qualquer arquivo de código (`src/`, `app/`, `scripts/`):**

- "Claude" / "claude" / "CLAUDE"
- "GPT" / "ChatGPT" / "gpt-4"
- "Anthropic" / "OpenAI"
- "Gemini" (exceto em config de API se houver)
- "by Claude" / "by AI" / "AI-generated"
- "Feito por" / "Criado por" / "Autor:"
- "Written by" / "Made by" / "Credit to"
- Nomes reais de pessoas (ver Seção 3)
- E-mails pessoais
- @usernames
- Assinaturas em comentários ou docstrings

**Exceções legítimas (só em `docs/` ou no próprio script de validação):**

- `docs/CONTEXTO.md` mencionando "Claude Code" como ferramenta de uso
- `scripts/check_anonimato.sh` precisa ter as palavras para detectá-las
- `CLAUDE.md` no root é o nome canônico do arquivo de regras
- `src/config/pessoas.config.ts` é a única exceção para nomes pessoais

### Regra Zero: GitHub Workflow

Toda tarefa segue:

1. `gh issue list --label "status:ready"` → escolher
2. `gh issue edit N --add-label "status:in-progress" --remove-label "status:ready"`
3. `gh issue develop N --checkout` → cria branch
4. Trabalhar e commitar com mensagens impessoais
5. Validar (`scripts/check_anonimato.sh`, `npm run lint`, `npm test`)
6. `gh pr create --body "Closes #N"`
7. `gh pr merge --squash --delete-branch`

### Regra de Commits

```bash
# CORRETO
git commit -m "feat: tela 15 form humor rapido"
git commit -m "fix: race condition no save do diario"
git commit -m "refactor: extrair vault/writer"

# PROIBIDO
git commit -m "feat: X by claude"
git commit -m "claude: adicionar Y"
git commit -m "AI sugeriu isso"
```

Tipos: `feat` | `fix` | `refactor` | `docs` | `perf` | `test` | `style` | `ci`

**Importante:** mensagens de commit ficam **sem acentos** (convenção de
shells e CIs). Mas docstrings, comentários e textos de UI **com
acentuação completa em PT-BR**.

### Regra de Linguagem

| Contexto | Idioma | Capitalização | Acentuação |
|----------|--------|---------------|------------|
| Código (variáveis, funções, classes) | Inglês | camelCase / PascalCase | N/A |
| Comentários no código | PT-BR | Sentence case | Sim, completa |
| Mensagens de UI no App (botões, toasts, labels) | PT-BR | **lowercase intencional** | Sim, completa |
| Documentação (`.md`) | PT-BR | Title Case em headings, Sentence case em prosa | Sim, completa |
| Commit messages | PT-BR | lowercase | **Sem acento** |
| Schemas YAML (chaves) | Inglês ou PT-BR sem acento | snake_case | N/A |
| Schemas YAML (valores texto) | PT-BR | Sentence case | Sim, completa |

**Por que lowercase intencional na UI:**
A UI usa JetBrains Mono em tudo. Mono font + lowercase passa o tom de
notebook técnico, dossiê pessoal, terminal — exatamente o que o App é.
Caps lock ou Title Case na UI quebra a identidade. Isso vale para:

- Botões: "salvar no inbox", "registrar", "concluir rotina"
- Labels: "humor", "energia", "ansiedade"
- Toasts: "feito.", "anotado.", "voltou hoje."
- Headings de tela: "rotina a", "memorias", "diario por voz"

**Documentação é diferente:** este arquivo, BRIEFING.md, PLANO_TECNICO_APK.md
e ADRs usam **Title Case em headings** ("Sistema Visual", "Componentes
Base", "Fundação Estética") e **Sentence case em prosa** com acentuação
completa em PT-BR.

### Regra de Tom

- Zero emojis
- Zero exclamação em feedback
- Zero gamificação
- Zero "você conseguiu!", "parabéns!", "incrível!"
- Zero comparativos negativos ("X% pior que ontem")

Detalhado em `BRIEFING.md`. Enforced via revisão manual e checklist de PR.

### Regra de Dados de Teste

**Proibido em testes:**
- Nomes reais (ver Seção 3)
- Paths pessoais (`/home/usuario/`)
- E-mails pessoais

**Usar:**
- `test_user`, `user_1`, `pessoa_a`, `pessoa_b` (genéricos)
- `tempfile.mkdtemp()`, `/tmp/test_dir`
- `test@example.com`

Validação: `scripts/check_test_data.sh`.

### Regra de Estética

Cinco princípios da Seção 2 do `BRIEFING.md` são **inegociáveis**:

1. **Física acima de tempo** — springs, não durations lineares
2. **Silêncio visual e respiração** — espaço generoso, line-height 1.5+
3. **Hierarquia por contraste, não por borda** — fundos sobrepostos
4. **Micro-interações em momentos específicos** — haptics pontuais
5. **Transições com física natural** — slides com curva, não corte seco

PR que viole essas regras volta para refação, não merge.

### Execução de Agentes — Worktree Boundary

**Sprint `r-dx-executor-worktree-enforce` (2026-05-16):** Agentes
executores (Claude Code, subagents) trabalham em **worktrees
dedicados** em `.claude/worktrees/agent-<id>/`. Toda sessão de
execução clona um worktree isolado da branch `worktree-agent-<id>`
para não poluir a árvore principal.

**Padrão observado em 4 ocasiões:** o agente bypassou o worktree
e commitou direto na raiz do repo. Instrução textual no prompt é
insuficiente. A partir desta sprint, `hooks/agent-worktree-check.sh`
é o detective runtime que bloqueia o commit:

- **Cenário 1.** Branch `worktree-agent-<id>` em path diferente de
  `.claude/worktrees/agent-<id>/` → `exit 1` com mensagem clara.
- **Cenário 2.** Branch `main` com variável `CLAUDE_AGENT_ID`
  setada no ambiente → `exit 1`. Indica que o agente esqueceu de
  trocar para o worktree dedicado.

**Instalação:** `./scripts/install-hooks.sh` seta
`core.hooksPath = hooks/` localmente. Idempotente. Rodar uma vez
por clone fresh do repo.

**Bypass legítimo:** `git commit --no-verify` pelo orquestrador
humano em casos manuais documentados. Agente nunca usa
`--no-verify`. Veja Regra Zero acima sobre workflow GitHub.

**Coexistência:** o detective roda antes de `check_anonimato.sh`,
`check_test_data.sh` e `check_strings_ui_ptbr.py`. Não substitui
nenhum dos checks existentes. Hook Universal global em
`.git/hooks/` (identity check do shell pessoal) é desativado ao
ativar `core.hooksPath = hooks/`; esse trade-off é aceito porque
os checks do projeto são autossuficientes para identidade
(via `check_anonimato.sh`).

### Bootstrap automático de worktree (r-infra-worktree-bootstrap, 2026-05-17)

Worktree fresh em `.claude/worktrees/agent-<id>/` precisa de
symlinks `node_modules`, `env.json` e `.env` (opcional) apontando
pro main repo. Sem eles: jest falha em resolver `yaml`, typecheck
falha em `env.json` e `./scripts/smoke.sh` quebra. Achado
recorrente em 10+ sprints (R-CRIT-4, T1B3, T1B6, etc) consumindo
~5 min por sprint quando o agente esquecia o bootstrap manual.

**Script standalone:** `./scripts/bootstrap-worktree.sh`. Detecta
se está em worktree (toplevel contém `.claude/worktrees/`),
calcula main repo (3 níveis acima) e cria os symlinks faltantes.
Idempotente; exit 0 sempre; no-op silencioso fora de worktree.

**Hook automático:** `hooks/post-checkout` chama o script após
cada branch checkout (`git checkout <branch>` ou
`git worktree add ...`). Não roda em checkout de arquivos isolados
(`git checkout -- <arquivo>`).

**Symlinks criados:**

- `node_modules` → `<main>/node_modules`
- `env.json` → `<main>/env.json`
- `.env` → `<main>/.env` (apenas se existir no main, gitignored)

Mensagens `OK: <alvo> symlink criado` por symlink novo; silencioso
se já existir. Alerta `AVISO:` se symlink ficar broken por
mudança no main.

**Pré-requisito:** `./scripts/install-hooks.sh` rodado uma vez
(seta `core.hooksPath = hooks/`). Sem isso, o `post-checkout` em
`hooks/` não é registrado e o bootstrap não dispara automaticamente
— neste caso, rodar o script manualmente.

### Config jest com diagnóstico defensivo (r-infra-jest-flaky-timeout, 2026-05-17 — fase 1 parcial)

`package.json#jest` ganhou `"testTimeout": 15000` (de 5000ms
default). Função: dar margem ao cleanup do
`@testing-library/react-native` (`afterEach` em
`node_modules/@testing-library/react-native/src/index.ts:15`) sob
picos de CPU em runs paralelos. Mensagem de erro muda de
"Exceeded 5000ms" para "Exceeded 15000ms" — diagnóstico mais
preciso quando ocorrer.

**Importante:** este ajuste NÃO cura a flakiness; a sprint
original `R-INFRA-JEST-FLAKY-TIMEOUT` (fase 1) descobriu que o
problema real é **handle leak no worker pool do Jest**, não
timeout. Jest sinaliza `A worker process has failed to exit
gracefully... Active timers can also cause this`. Suítes que
passam isoladas em <2s travam em paralelo por causa de
`setTimeout`/Promise pendente em código de produção (Toast,
Sheets, Reanimated lifecycle) que vaza para o worker seguinte.

**Combinações testadas e descartadas na sprint:**

- `maxWorkers: 50%` ou `2` — piora (mais suítes empilhadas por
  worker = mais leak acumulado).
- `testTimeout: 30000` — só atrasa o erro, smoke demora mais sem
  estabilizar.
- `forceExit: true` — atinge fim da run, não o `afterEach` que
  falha durante.
- `setupFilesAfterEnv` com `afterEach { clearAllTimers }` — handle
  vazado não é setTimeout JS visível.
- `jest.retryTimes(2)` global — multiplica latência sem aumentar
  taxa de sucesso (leak persiste entre retries no mesmo worker).
- `--runInBand` — 179 falhas em 950s (mocks globais saturam).

**Fix verdadeiro segue débito** em sprint nova (`R-INFRA-JEST-LEAK-HUNT`
a planejar): rodar `--detectOpenHandles` em suítes específicas
para identificar a origem do leak, e corrigir cleanup em
componentes (Toast, Sheets, ciclo de vida React) — escopo que
exige tocar código de produção, fora do escopo desta sprint.

Para investigar flakiness no futuro: rodar isolado o teste
suspeito (`npm test -- <arquivo>`) leva ~1-2s consistentemente; a
falha só aparece sob carga em paralelo competindo por CPU.
Histórico empírico no spec
`docs/sprints/R-INFRA-JEST-FLAKY-TIMEOUT-spec.md` Anexo A.

### Geração automática de spec a partir de issue (r-dx-3, 2026-05-17)

Quando feature/bug nova chega via GitHub Issues em vez de já entrar
direto no `docs/sprints/_BACKLOG.md`, o script
`./scripts/issue-to-spec.sh <numero-da-issue>` faz a ponte: lê título,
body e labels da issue via `gh issue view --json` e gera spec skeleton
em `docs/sprints/ISSUE-<N>-<SLUG>-spec.md` aplicando o template canônico
de `docs/sprints/_template-spec.md`.

**Uso:**

```bash
./scripts/issue-to-spec.sh 42
```

**Comportamento:**

1. Lê `gh issue view N --json title,body,labels` (precisa `gh` CLI
   autenticado no repo).
2. Extrai bloco markdown canônico de `docs/sprints/_template-spec.md`
   (entre as fences ` ```markdown ` e ` ``` ` no documento) e desescapa
   as fences internas (`\``` ` ` → ` ``` `).
3. Substitui no skeleton:
   - cabeçalho `# Sprint MNN — <título...>` → `# Sprint ISSUE-<N> — <título da issue>`
   - bloco de metadata logo após o cabeçalho com link da issue e `**Tags**`
   - seção `## 1. Objetivo` recebe o body como prosa; placeholder
     original fica em comentário HTML como guia
4. Cria arquivo `docs/sprints/ISSUE-<N>-<SLUG>-spec.md` (SLUG: título
   da issue normalizado — uppercase, sem acentos via `unicodedata.NFKD`,
   pontuação/espaços viram hífens, máx 60 chars).
5. Insere entry no `docs/sprints/_BACKLOG.md` logo após o marker
   `<!-- entries auto-geradas vao aqui -->` na seção "Sprints derivadas
   de issues (auto-geradas)" (criada pelo R-DX-3).

**Exit codes:**

| Code | Significado |
|---|---|
| 0 | sucesso |
| 1 | uso inválido (sem argumento ou não-numérico) |
| 2 | `gh` CLI falhou (issue inexistente, sem acesso, sem auth) |
| 3 | template ausente ou bloco markdown não encontrado |
| 4 | spec já existe (evita sobrescrever sem confirmação) |

**Pré-requisitos:** `gh` CLI autenticado (`gh auth status`), `python3`
para slugify e renderização do template (lida com unicode/acentos sem
fragilidade de `sed`).

**Próximo passo após gerar:** revisar o spec, preencher seções 2-10
(entregáveis, APIs reutilizáveis, restrições, validação, procedimento,
verificação runtime-real, commit, checkpoint visual, dúvidas), e
promover a entry do `_BACKLOG.md` para a tabela da Fase/Onda apropriada
(mover a linha para a seção Fase 1/2/3/4 com `Ordem`, `P` e
`Estimativa` preenchidos).

---

## 6. Princípios Fundamentais Que Guiam Decisões

Quando bater dúvida durante a implementação, voltar para essas perguntas
nessa ordem:

### 1. Isso Ajuda Quem Já Se Cobra Demais ou Adiciona Obrigação?

Se adiciona obrigação (notificação agressiva, badge faltando, lembrete
culpando), corta.

### 2. Preciso Disso no Mobile ou É Melhor no Desktop?

Se dá para fazer no desktop com mais qualidade, faz no desktop. Mobile só
captura o que precisa ser capturado **agora**, no momento que acontece.

### 3. Isso É Dado Pessoal Sensível?

Se sim: nunca rede, sempre device-only. Zero exceção.

### 4. Um Humano Olhando Esse Código Vai Conseguir Saber Quem Escreveu?

Se sim: refatorar para impessoalidade. Sem assinatura, sem "this section
by", sem nome em comentário.

### 5. Isso Vira Streak, Ranking, Badge ou Push Motivacional Disfarçado?

Se sim: corta. É muito fácil cair nessa armadilha sem perceber.

### 6. Essa Transição Usa Duration Linear ou Spring Físico?

Se linear: trocar para spring. Exceto fade-outs simples e toasts saindo.

### 7. Esse Touch Tem Feedback Visual <16ms?

Se não: adicionar `pressed` state com scale 0.97. Usuário precisa saber
que App registrou o toque na primeira frame.

### 8. Existe Nome Real Hardcoded?

Se sim: refatorar para `PESSOA_A`/`PESSOA_B` + lookup no config.

---

## 7. O HTML Standalone Como Fonte de Verdade Visual

Já existe um arquivo HTML standalone (`Ouroboros 22 telas.html`, ~1.4MB)
com **render real** das 22 telas em viewport 412x915 dp. É um design canvas
zoomável com:

- 4 user flows como diagramas
- 22 artboards das telas (estados preenchido + vazio)
- 5 seções (spec, flows, A, B, C, D, E)
- Componentes inline com paleta Dracula completa
- Font JetBrains Mono embutida

**Ao implementar uma tela:**

1. Abrir `Ouroboros 22 telas.html` no Chromium do Pop!_OS
2. Dar zoom no artboard correspondente (ex: tela 15)
3. Inspecionar markup + classes CSS
4. Replicar fielmente em React Native + NativeWind
5. Comparar lado a lado: emulador/celular versus HTML standalone

A paleta CSS variables já está no `<style>` do HTML — converter para
`src/theme/tokens.ts` no começo do projeto.

### 7.1 Mockups Visuais — Estado Formalizado em M19.x

Em 2026-05-01 a Sprint M19.x formalizou o sistema de mockups visuais
após constatar, durante a Sprint M00.6, que regenerar o bundle de 22
telas exige reverse-engineering da ferramenta externa que o exportou
(identificação preservada em `docs/design-canvas-export/README.md`).
Estado canônico:

- `docs/Ouroboros_24_telas-standalone.html` (1,4 MB) — bundle frozen
  de Telas 01 a 28 (namespace JSX). Não modificar. Regeneração
  pendente — Sprint M19 final.
- `docs/Ouroboros_telas_25_26-standalone.html` (23 KB) — bundle
  editável criado em M00.6 para hospedar Tela 25 (Calendário de
  conquistas) e Tela 26 (Widget homescreen) no namespace M00.6.
  HTML/CSS escrito à mão; edição manual permitida.
- `docs/design-canvas-export/project/secao-{a..e}.jsx` +
  `primitives.jsx` + `theme.css` — JSX-fonte que originou o bundle
  frozen. Mantidos como referência; **não reprocessáveis localmente**.
- `scripts/build-mockups.mjs` — stub Node.js que documenta os três
  caminhos candidatos para construir a toolchain de regeneração.
  Roda apenas como mensagem informativa até a M19 final substituir.

**Conflito de numeração Tela 25/26:** existem dois namespaces.
Namespace JSX (bundle frozen) usa Tela 25 = Microfone e Tela 26 =
Alarme. Namespace M00.6 (bundle de 2 telas) usa Tela 25 = Calendário
de conquistas e Tela 26 = Widget homescreen. Os bundles não
compartilham saída, então em runtime visual nunca colidem. Sprints
novas que referenciem essas Telas devem citar o namespace
explicitamente. Renomeação coordenada fica como item da M19 final.

**Fonte canônica do estado real do app:** screenshots por sprint em
`docs/sprints/MNN-screenshots/`. Os bundles HTML representam design
intent; os screenshots representam o que de fato existe rodando.
Divergências aceitas são documentadas em
`docs/sprints/MNN-checkpoint-visual.md`.

Inventário detalhado, mapa Tela → arquivo, e histórico das decisões
ficam em [`MOCKUPS-INVENTARIO.md`](MOCKUPS-INVENTARIO.md) (raiz de
`docs/`).

---

## 8. Ordem de Leitura Recomendada

Quando o Claude Code abrir esse projeto pela primeira vez:

1. **CONTEXTO.md** (este arquivo) — entender o ecossistema
2. **BRIEFING.md** — entender o que construir (design system + princípios
   estéticos + telas + schemas)
3. **PLANO_TECNICO_APK.md** — entender como construir (setup Expo Go, ADRs,
   scripts, fluxo de validação, fluxo de sprint)
4. **Ouroboros 22 telas.html** — fonte de verdade visual

Só depois disso, começar pela primeira sprint (Sprint M01 — Fundação
Estética).

---

## 9. Estado Atual da Informação

| Recurso | Status | Onde |
|---------|--------|------|
| protocolo-ouroboros backend | produção v1.0.1 | github.com/AndreBFarias/protocolo-ouroboros |
| Vault sincronizado | rodando via Syncthing | desktop + 2 celulares |
| HTML standalone das 22 telas | finalizado | `Ouroboros 22 telas.html` |
| Design system (paleta + tipografia + spacing) | fechado | embutido no HTML + duplicado em BRIEFING.md |
| Princípios estéticos | documentados em BRIEFING.md seção 2 | inegociáveis |
| 4 user flows | documentados com tempo-alvo | BRIEFING.md seção 5 |
| Schemas YAML dos `.md` | fechados | BRIEFING.md seção 7 |
| ADRs | descritas em PLANO_TECNICO_APK.md | a criar fisicamente em `docs/ADRs/` durante M01 |
| ouroboros-mobile repo | a criar | M01 |
| Stack escolhida | Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui | ADR-006 |
| Convenção PESSOA_A / PESSOA_B | definida nesta versão | a aplicar em toda implementação |

---

## 10. Duas Perguntas Que Você Vai Querer Responder Antes de Começar

### As Funções Adicionais (Seção E) Entram no v1?

F-14 (microfone), F-15 (alarme), F-16 (to-do), F-17 (contador). Estão no
HTML mas não na lista oficial das 18 telas core. **Default: v2**, mas se
quiser puxar uma para v1 (microfone provavelmente vale a pena), avise.
Schema YAML delas já está documentado em BRIEFING.md.

### Sync Default É Syncthing ou Obsidian Sync?

Ambos suportados. Settings (tela 23) deixa escolher. Mas o **default no
onboarding (frame 3)** precisa ser um. Recomendação: **Syncthing**, porque
já está rodando entre desktop e celulares e é gratuito. Se quiser trocar
para Obsidian Sync, avise.

---

*"Contexto é o que evita refazer trabalho dos outros achando que é novo."*
