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

O usuário vem de Python, pandas, dashboards. **Não é dev mobile.** Isso
afeta decisões:

- Stack escolhida (Expo + React Native) **prioriza a maturidade e a
  produtividade do ecossistema** sobre performance bruta. Quando voltar
  daqui a 3 meses para adicionar feature, apoia-se em documentação
  abundante — o ecossistema React Native tem ordens de magnitude mais
  material de referência que Kotlin Compose.
- Componentes base já vêm com **boa estética embutida** (gluestack-ui +
  Moti) para reduzir necessidade de polimento manual.
- Documentação do projeto é **deliberadamente verbosa** — repete contexto
  em cada arquivo para quem volta sem memória do que foi feito antes.

---

## 2. O Ecossistema Ouroboros

### protocolo-ouroboros (Existente, no Desktop)

Repositório `github.com/[REDACTED]/protocolo-ouroboros`, GPL-3.0, em
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
autor: pessoa_a              # nunca um nome de pessoa real
---
```

### Validação Automática

`scripts/check_anonimato.sh` detecta violação:

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

## 4. Interface Mobile  Backend

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

**Sync delegado** (ADR-002, `docs/ADRs/0002-sync-delegado.md`). Syncthing ou
Obsidian Sync rodam fora do App. Mobile só observa status para tela 23
(Settings → Sync). Conflitos são resolvidos no desktop via merge manual.

---

## 5. Regras Invioláveis

Essas regras não são guidelines. Não são melhores práticas. São bloqueios
verificáveis por script — `scripts/check_anonimato.sh`,
`scripts/check_test_data.sh` e `scripts/check_strings_ui_ptbr.py`,
agregados em `scripts/smoke.sh` — acionados pelo `hooks/pre-commit` local
e pelo CI.

Onde cada gate bloqueia de fato hoje, e onde ainda **não** bloqueia, está
registrado na subseção "Onde o Bloqueio de Qualidade Acontece de Fato",
no fim desta seção. Leia antes de assumir que uma regra é inescapável.

### Regra -1: Anonimato Absoluto

O projeto é comunitário. Não existe "feito por", não existe crédito de
autoria. Não existe nome de IA em lugar nenhum.

**Proibido em qualquer arquivo de código (`src/`, `app/`, `scripts/`):**

- Qualquer nome de assistente de IA, provedor de modelos de linguagem
  ou nome de modelo (produto, empresa ou versão)
- Marcadores de autoria por IA ("by AI", "AI-generated")
- Marcadores de autoria em geral ("Feito por", "Criado por", "Autor:",
  "Written by", "Made by", "Credit to")
- Nomes reais de pessoas (ver Seção 3)
- E-mails pessoais
- @usernames
- Assinaturas em comentários ou docstrings

**Exceções legítimas (só em `docs/` ou no próprio script de validação):**

- `scripts/check_anonimato.sh` precisa conter os padrões para detectá-los
- `src/config/pessoas.config.ts` é a única exceção para nomes pessoais, e
  hoje traz apenas **defaults genéricos** (`Nome_A` / `Nome_B`). Os nomes
  reais entram em runtime via `src/lib/stores/pessoa.ts` (SecureStore),
  preenchidos no onboarding (tela 24, frame 1) e editáveis em Settings
  (tela 23) — nunca em código versionado

### Regra do Mapa Funcional

[`FEATURES-CANONICAS.md`](FEATURES-CANONICAS.md) é a fonte de verdade
única sobre **o que o app faz**. Toda sprint que introduz, modifica ou
remove feature **deve atualizar esse arquivo no mesmo commit**. Sprint
entregue sem essa atualização é recusada na validação.

Divisão de responsabilidade: este `CONTEXTO.md` governa **como se
trabalha** (regras de processo); o `FEATURES-CANONICAS.md` governa **o que
existe** (mapa funcional). Ver "Onde Cada Documento Vive", no fim desta
seção.

### Regra Zero: GitHub Workflow

Toda tarefa segue:

1. `gh issue list --label "status:ready"` → escolher
2. `gh issue edit N --add-label "status:in-progress" --remove-label "status:ready"`
3. `gh issue develop N --checkout` → cria branch
4. Trabalhar e commitar com mensagens impessoais
5. Validar com `./scripts/smoke.sh` (agrega anonimato, dados de teste,
   acentuação PT-BR, `tsc`, lint e Jest)
6. `gh pr create --body "Closes #N"`
7. `gh pr merge --squash --delete-branch`

### Regra de Commits

```bash
# CORRETO
git commit -m "feat: tela 15 form humor rapido"
git commit -m "fix: race condition no save do diario"
git commit -m "refactor: extrair vault/writer"

# PROIBIDO
git commit -m "feat: X (com autoria atribuida)"
git commit -m "sugerido por assistente"
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
| Mensagens de UI no App (botões, toasts, labels) | PT-BR | **Sentence case** (revisado em 2026-04-28) | Sim, completa, obrigatória |
| Documentação (`.md`) | PT-BR | Title Case em headings, Sentence case em prosa | Sim, completa |
| Commit messages | PT-BR | lowercase | **Sem acento** |
| Schemas YAML (chaves) | Inglês ou PT-BR sem acento | snake_case | N/A |
| Schemas YAML (valores texto) | PT-BR | Sentence case | Sim, completa |

**Revisão de 2026-04-28 — a UI passou de lowercase para Sentence case.**
O bloco abaixo registra a convenção original e a razão tipográfica dela;
vale como histórico, não como instrução. Em tela nova ou revisada, use
Sentence case com acentuação completa.

**Por que lowercase era intencional na UI (convenção até 2026-04-28):**
A UI usa JetBrains Mono em tudo. Mono font + lowercase passava o tom de
notebook técnico, dossiê pessoal, terminal — exatamente o que o App é.
Caps lock ou Title Case na UI quebrava a identidade. Isso valia para:

- Botões: "salvar no inbox", "registrar", "concluir rotina"
- Labels: "humor", "energia", "ansiedade"
- Toasts: "feito.", "anotado.", "voltou hoje."
- Headings de tela: "rotina a", "memorias", "diario por voz"

**Documentação é diferente:** este arquivo, BRIEFING.md e ADRs usam
**Title Case em headings** ("Sistema Visual", "Componentes
Base", "Fundação Estética") e **Sentence case em prosa** com acentuação
completa em PT-BR.

#### Auditoria Automática de Acentuação (M-PT-BR-AUDIT, 2026-05-04)

`python3 scripts/check_strings_ui_ptbr.py` varre `src/` e `app/` por
strings de UI literais e checa cada token contra
`scripts/dicionario_ptbr_canonico.json` (149 pares curados). O script está
integrado em `scripts/smoke.sh` e em `hooks/pre-commit`.

Válvulas de escape, nessa ordem de preferência:

- Override por linha: comentário `// ptbr-allow: <razao>` na mesma linha
- Exclusão em batch: `.ptbr-violations.txt` na raiz, uma path por linha,
  para casos de retrofit ainda pendente

Exemplos de violação típica e correção:

| Errado (sem acento) | Correto (com acento) |
|---|---|
| `"Nao"` | `"Não"` |
| `"Voce"` | `"Você"` |
| `"Musica"` | `"Música"` |
| `"Video"` | `"Vídeo"` |
| `"Acoes"` | `"Ações"` |
| `"Tambem"` | `"Também"` |
| `"Configuracoes"` | `"Configurações"` |
| `"Notificacao"` | `"Notificação"` |
| `"Atencao"` | `"Atenção"` |
| `"Ultima atualizacao"` | `"Última atualização"` |

`accessibilityLabel` continua **sem acento** (convenção de leitor de
tela). O script detecta esse caso e ignora automaticamente.

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

### Regra de Estética (ADR-010)

Cinco princípios da Seção 2 do `BRIEFING.md` são **inegociáveis**
(formalizados em `docs/ADRs/0010-estetica-fundacao.md`):

1. **Física acima de tempo** — springs, não durations lineares
2. **Silêncio visual e respiração** — espaço generoso, line-height 1.5+
3. **Hierarquia por contraste, não por borda** — fundos sobrepostos
4. **Micro-interações em momentos específicos** — haptics pontuais
5. **Transições com física natural** — slides com curva, não corte seco

PR que viole essas regras volta para refação, não merge.

### Regra de Validação Visual — Gauntlet Obrigatório

**Decisão durável de 2026-05-04:** o **Gauntlet (Nível A+) é a única forma
aceita de validação visual web** para qualquer sprint que toque UI. Abrir
o navegador direto, sem o Gauntlet, está **proibido** desde a descoberta
de 6 problemas estruturais em 2026-05-03 — o gate de biometria
redirecionando, o carregamento de fontes oscilando no SDK 54, refs
voláteis, evento de mouse sintético, seed do persist do store, e o bottom
sheet de terceiros quebrando em web. Todos produziam validação
falso-positiva ou falso-negativa.

Os quatro níveis:

- **Nível A+ — Gauntlet (obrigatório).** Atalho único:

  ```bash
  ./gauntlet.sh
  ```

  O script mata Metro órfão, sobe `./run.sh --web`, aguarda
  `localhost:8081`, abre o navegador em `/_dev/gauntlet` e mostra o log em
  foreground; `Ctrl-C` derruba tudo limpo. Em modo dev (`__DEV__`) o
  `window.__gauntlet` é instalado automaticamente com um conjunto de APIs
  JS determinísticas (entre elas `seed`, `reset`, `setNomes`,
  `setVaultRoot`, `setOnboardingDone`, `setUltimaRota`,
  `setTipoCompanhia`, `abrir`, `abrirMenu`, `fecharMenu`, `abrirSheet`,
  `estado`, `seedComDados`, `adicionarFotoMock`) e com bypass dos gates de
  biometria, vault e onboarding. Frame mobile 412×892dp centralizado em
  **todas** as rotas em modo dev. Em release Android é dead-code
  (verificado: o bundle exportado não contém `__gauntlet`).
- **Nível A (legado) — proibido em sprint nova.** Mantido apenas em
  documentação histórica.
- **Nível B — emulador Android** (sob demanda, sem pedir permissão).
  `emulator -avd ouroboros-test -no-window`. Cobre APIs nativas (haptic,
  SAF, SecureStore) e não interfere com o celular físico.
- **Nível C — celular físico** (**exige permissão explícita**). Só para
  Syncthing real, share intent de outros apps, fotos reais da galeria e
  checkpoint visual de fim de sprint. O motivo é declarado por escrito, o
  dono do repositório aprova, e a sessão é curta (menos de 2 minutos).

#### Protocolo Canônico de Teste no Device (decisão durável de 2026-05-25)

**Método padrão e sempre preferido para validar no celular: dev-client +
Metro via USB.** Não se usa o APK de release do git para iteração.

1. **Pré-requisito:** um **dev-client APK que contenha os módulos nativos
   atuais** instalado no device. Mudança em código nativo (por exemplo as
   bridges `modules/health-connect/` e `modules/widget-homescreen/`)
   **inválida** dev-clients antigos — é preciso rebuildar o dev-client.
   Mudança só de JS (telas, stores, lógica) **não** exige rebuild: o Metro
   entrega o JS novo ao vivo.
2. **Fluxo** (ver `scripts/adb-install-bypass.sh` e
   `scripts/adb-vault-pull.sh`):

   ```bash
   ./scripts/adb-vault-pull.sh   # BACKUP do Vault ANTES de qualquer troca de app
   adb push builds/dev-client-<hash>.apk /data/local/tmp/app.apk
   adb shell pm install -r -t /data/local/tmp/app.apk   # bypass de OEM restritivo
   adb reverse tcp:8081 tcp:8081
   npx expo start --dev-client
   ```

   Navegação cega no device via `uiautomator dump`; `screencap` para
   evidência.
3. **Cuidado com troca de assinatura:** instalar um dev-client (keystore de
   debug) por cima de um APK de release exige **desinstalar** primeiro, o
   que **apaga os dados do app no device** (SecureStore e Vault interno, se
   estiver em `documentDirectory`). Rodar `adb-vault-pull.sh` antes é
   obrigatório. O ideal é dev-client e release compartilharem a **mesma
   keystore**, permitindo update in-place sem wipe.
4. **APK do git (release ou preview) só no final**, depois de concluir o
   trabalho em aberto. É artefato de distribuição, não ferramenta de
   iteração. O build de serviço gerenciado esgota cota mensal — usar
   `.github/workflows/build-android-apk.yml` (push de tag `v*-alpha-*`).

> Regra de ouro: **se a feature é só JS, dev-client + Metro mostra ao vivo
> sem build.** Se toca código nativo novo, rebuildar o dev-client primeiro.
> Nunca queimar build do git para testar trabalho ainda em aberto.

#### Entrega Obrigatória de Toda Sprint Que Toca UI

1. Código + suíte Jest verde (a suíte inteira, sem baseline degradado).
2. **1 caso E2E** em `tests/e2e/playwright/<id-da-sprint>.e2e.ts`, copiado
   do template `tests/e2e/playwright/e2e-template.ts`, com asserts sobre
   **comportamento** — não só presença visual.
3. Screenshots em `docs/sprints/<ID-DA-SPRINT>-screenshots-gauntlet/`
   (capturados no Nível A+).
4. Validação rodada via automação de browser sobre o Gauntlet, com a
   sprint navegada e clicada como app real, antes de declarar `[ok]`.
5. Checkpoint Nível C apenas se a sprint envolve API nativa (haptic, SAF,
   share intent) ou se é marco crítico (release final).

Sprint nova sem o caso E2E correspondente é recusada na validação.

### Onde o Bloqueio de Qualidade Acontece de Fato

Registro do estado real, apurado na auditoria de 2026-07-28. Vale mais que
a intenção declarada em qualquer outro lugar deste documento.

**Hooks locais — ativos quando o setup canônico roda.** O `hooks/pre-commit`
só bloqueia **se** `core.hooksPath` apontar para `hooks` neste clone. Quem
segue o "Setup rápido" do `README.md` já recebe isso: o `./install.sh` roda
`git config core.hooksPath hooks`. Em clone onde esse setup não rodou — ou
onde um `core.hooksPath` global tomou a frente — os hooks do projeto ficam
dormentes e o commit local não é barrado; `./scripts/install-hooks.sh`
resolve. Rode `./scripts/doctor_hooks.sh` para ver o estado do clone: desde
`AUDIT-P3-8` (2026-09-05) o veredito também é reemitido como última linha do
`./scripts/smoke.sh`, logo antes do `OK`, para não se perder no meio da
saída. O veredito continua advisory — o gate que obriga é server-side.

**Drift entre integrações e o documento canônico — aviso automático.**
`docs/FEATURES-CANONICAS.md` se declara fonte de verdade única sobre o que
o app faz, e a regra manda atualizá-lo no mesmo commit de toda sprint que
muda feature. Isso era convenção pura até 2026-09-05, e a auditoria de
2026-07-28 mostrou a convenção falhando três vezes seguidas nas
integrações. Agora `scripts/check_drift_features.py` roda no smoke e avisa
quando o diff toca `src/lib/integracoes/`, `modules/health-connect/` ou
`src/lib/health/` sem tocar o documento. É **advisory**: nunca reprova.
Refatoração interna que não muda comportamento visível é caso legítimo —
escreva `features-canonicas-allow: <motivo>` no corpo do commit. Promovê-lo
a bloqueante depende de `AUDIT-P3-1`, e é decisão separada.

**CI — obrigatório desde 2026-09-05 (`AUDIT-P3-1`).** O
`.github/workflows/ci.yml` executa `quality-gate` (`./scripts/smoke.sh`:
anonimato, dados de teste, acentuação PT-BR, `tsc`, lint e Jest) e
`coverage-floor` em todo PR e em todo push para `main`. Os dois, mais o
`scan-commits` de `anonymity-check.yml`, são **required status checks** na
proteção da `main`, com `strict: true` (a branch precisa estar atualizada
antes do merge). Um PR com o `quality-gate` vermelho **não mergeia mais**.

`enforce_admins` segue `false`, de propósito: push direto do dono continua
funcionando, e é assim que este repo trabalha hoje.

**`e2e-web` ficou de fora, por ora.** Roda em `pull_request`, mas nasceu em
2026-09-05, ainda não foi exercitado num PR real e leva cerca de 20 minutos
dependendo de Metro e Playwright. Promovê-lo antes de medir estabilidade
repetiria o erro que `scripts/setup-branch-protection.sh` cometia: ele
listava `Build APK Android` como required, e aquele workflow **nunca**
dispara em `pull_request` — só em `workflow_dispatch` e em tag. Required
check que não roda no PR fica pendente para sempre e o merge nunca libera.
O script foi corrigido na mesma sprint e hoje reflete o estado aplicado.

### Onde Cada Documento Vive

Hierarquia de fontes, para resolver de saída a dúvida de qual documento
manda:

| Documento | Governa | Status |
|---|---|---|
| `docs/CONTEXTO.md` (este arquivo) | Regras de processo e restrições invioláveis | **Canônico.** Em divergência com qualquer outra cópia de regras, este vence |
| `docs/FEATURES-CANONICAS.md` | O que o app faz (mapa funcional) | **Canônico.** Atualização obrigatória no mesmo commit da sprint |
| `docs/BRIEFING.md` | Design system, princípios estéticos, telas, schemas | Canônico para decisão visual (ver Seção 7) |
| `docs/ADRs/` | Decisões arquiteturais, uma por arquivo | Canônico para o "por quê" de cada escolha; índice em `docs/ADRs/INDEX.md` |
| `docs/sprints/` | Planos de sprint e specs de auditoria | Histórico de execução. **Só um subconjunto é versionado**, por decisão de compliance — a maioria dos specs existe apenas no disco de trabalho |
| Arquivo de regras da raiz | Cópia de conveniência das regras desta seção | **Não versionado.** Espelho para leitura automática por ferramenta que abra o repositório; nunca fonte |

Existem também **arquivos de trabalho local não versionados** na raiz
(estado corrente, roteiro de retomada, brief de validação, checkpoint
operacional), deliberadamente fora do git. Eles são úteis para quem está
com o clone na mão e **não podem ser citados como fonte** em documento
público nem em PR: quem clona o repositório não os recebe. Regra prática:
se a informação precisa sobreviver ao clone, ela pertence a `docs/`.

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

## 7. Fonte de Verdade Visual

O design system canônico (paleta Dracula, tipografia, spacing,
princípios estéticos) vive em [`BRIEFING.md`](BRIEFING.md). O mapa
funcional do que o app faz é
[`FEATURES-CANONICAS.md`](FEATURES-CANONICAS.md).

A paleta CSS variables foi materializada em `src/theme/tokens.ts`, que é
a referência de tokens em runtime.

**Ao implementar ou revisar uma tela:**

1. Conferir o design system e os princípios estéticos em `BRIEFING.md`
2. Replicar fielmente em React Native + NativeWind, usando os tokens de
   `src/theme/tokens.ts`
3. Validar em runtime no device a cada sprint

**Fonte canônica do estado real do app:** o que de fato existe rodando é
verificado em runtime no device a cada sprint. Divergências aceitas são
documentadas nas notas da sprint correspondente.

---

## 8. Ordem de Leitura Recomendada

Quando a ferramenta de automação abrir esse projeto pela primeira vez:

1. **CONTEXTO.md** (este arquivo) — entender o ecossistema
2. **BRIEFING.md** — entender o que construir (design system + princípios
   estéticos + telas + schemas)
3. **FEATURES-CANONICAS.md** — mapa funcional de features

Só depois disso, começar pela primeira sprint (Sprint M01 — Fundação
Estética).

---

## 9. Estado Atual da Informação

| Recurso | Status | Onde |
|---------|--------|------|
| protocolo-ouroboros backend | produção v1.0.1 | github.com/[REDACTED]/protocolo-ouroboros |
| Vault sincronizado | rodando via Syncthing | desktop + 2 celulares |
| Design system (paleta + tipografia + spacing) | fechado | BRIEFING.md + `src/theme/tokens.ts` |
| Princípios estéticos | documentados em BRIEFING.md seção 2 | inegociáveis |
| 4 user flows | documentados com tempo-alvo | BRIEFING.md seção 5 |
| Schemas YAML dos `.md` | fechados | BRIEFING.md seção 7 |
| ADRs | formalizadas | `docs/ADRs/` |
| ouroboros-mobile repo | a criar | M01 |
| Stack escolhida | Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui | ADR-006 |
| Convenção PESSOA_A / PESSOA_B | definida nesta versão | a aplicar em toda implementação |

---

## 10. Duas Perguntas Que Você Vai Querer Responder Antes de Começar

### As Funções Adicionais (Seção E) Entram no v1?

F-14 (microfone), F-15 (alarme), F-16 (to-do), F-17 (contador). Estão
previstas no design system mas não na lista oficial das 18 telas core. **Default: v2**, mas se
quiser puxar uma para v1 (microfone provavelmente vale a pena), avise.
Schema YAML delas já está documentado em BRIEFING.md.

### Sync Default É Syncthing ou Obsidian Sync?

Ambos suportados. Settings (tela 23) deixa escolher. Mas o **default no
onboarding (frame 3)** precisa ser um. Recomendação: **Syncthing**, porque
já está rodando entre desktop e celulares e é gratuito. Se quiser trocar
para Obsidian Sync, avise.

---

*"Contexto é o que evita refazer trabalho dos outros achando que é novo."*
