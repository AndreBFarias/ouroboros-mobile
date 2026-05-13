# CONTRACT-MOBILE-BACKEND

Inventário canônico do contrato de dados entre o app Mobile (este
repositório) e o backend Python sibling
(`~/Desenvolvimento/protocolo-ouroboros`, ETL e geração de caches).

Versão deste contrato: **v1** (carimbo `_schema_version: 1` aplicado
em todo arquivo persistido a partir da sprint Q12, 2026-05-12).

## Sumário

1. [Contexto e fluxo](#contexto-e-fluxo)
2. [Convenções globais](#convenções-globais)
3. [Layout de pastas do Vault](#layout-de-pastas-do-vault)
4. [Carimbo _schema_version](#carimbo-_schema_version)
5. [Inventário de schemas](#inventário-de-schemas)
   - [5.1 humor](#51-humor)
   - [5.2 diario_emocional](#52-diario_emocional)
   - [5.3 evento](#53-evento)
   - [5.4 marco](#54-marco)
   - [5.5 medidas](#55-medidas)
   - [5.6 exercicio](#56-exercicio)
   - [5.7 ciclo_menstrual](#57-ciclo_menstrual)
   - [5.8 alarme](#58-alarme)
   - [5.9 tarefa](#59-tarefa)
   - [5.10 contador](#510-contador)
   - [5.11 financeiro_nota](#511-financeiro_nota)
   - [5.12 midia (foto / audio / video)](#512-midia-foto--audio--video)
   - [5.13 midia-companion](#513-midia-companion)
   - [5.14 inbox_arquivo](#514-inbox_arquivo)
   - [5.15 para (campo compartilhado)](#515-para-campo-compartilhado)
   - [5.16 pessoa (identidade)](#516-pessoa-identidade)
   - [5.17 treino_sessao](#517-treino_sessao)
   - [5.18 frase (midia_frase)](#518-frase-midia_frase)
   - [5.19 agenda (Google Calendar)](#519-agenda-google-calendar)
   - [5.20 devices_index](#520-devices_index)
   - [5.21 rotina_treino](#521-rotina_treino)
   - [5.22 grupo_treino](#522-grupo_treino)
6. [Caches que NÃO são contrato](#caches-que-não-são-contrato)
7. [Migração defensiva](#migração-defensiva)
8. [Próximos passos backend Python](#próximos-passos-backend-python)

---

## Contexto e fluxo

- **Mobile escreve**, **backend Python lê**. Mobile não consome
  endpoints HTTP do backend; backend não escreve no Vault em
  runtime (apenas gera caches readonly em `.ouroboros/cache/`).
- O Vault vive em uma pasta escolhida pelo usuário no onboarding
  (ADR-0022 `0022-vault-pasta-escolhida-pelo-usuario.md`). Toda
  persistência canônica passa por `src/lib/vault/writer.ts`
  (`writeVaultFile`) que serializa frontmatter + body via
  `src/lib/vault/frontmatter.ts`.
- O backend Python descobre arquivos novos via:
  1. **Watch** em `markdown/<prefixo>-*.md` quando Vault está
     conectado por Syncthing (modo recomendado).
  2. **Batch** rodando varredura periódica + diff por mtime
     quando apenas pull manual está disponível.
- Schemas Zod em `src/lib/schemas/` são a fonte de verdade Mobile.
  Backend Python espelha esses shapes em
  `pydantic`/`dataclasses` e referencia ESTE documento; quando
  divergência for inevitável, abre-se sprint de versão (v1 → v2).

Documento fonte de verdade: este arquivo. Schemas Zod individuais
fazem referência cruzada apenas para detalhes de regex/refine que
não cabem no inventário compacto.

---

## Convenções globais

- **Formato dos arquivos**: Markdown com YAML frontmatter
  delimitado por `---` no topo, corpo livre opcional após o
  segundo `---`. Round-trip determinístico via `parseFrontmatter`
  / `stringifyFrontmatter`.
- **Datas**: serializadas no fuso de São Paulo (UTC-3 fixo, sem
  DST a partir de 2019). Dois padrões aceitos:
  - `YYYY-MM-DD` para snapshots diários (humor, medidas, ciclo).
  - ISO 8601 com hora e offset (`YYYY-MM-DDTHH:mm[:ss][offset|Z]`)
    para eventos timestampados.
- **Autor**: sempre `pessoa_a` ou `pessoa_b` (raras exceções
  aceitam `ambos` em campos de relação, mas autor de
  registro NUNCA é `ambos`).
- **Carimbo `_schema_version`**: número inteiro positivo. Hoje
  vale `1`. Ver Seção 4.
- **Encoding**: UTF-8 sem BOM. Newlines LF.
- **Anonimato**: nomes reais NUNCA aparecem em frontmatter; só
  `pessoa_a` / `pessoa_b` / `ambos`. Nomes de exibição vivem em
  runtime (SecureStore) preenchidos no onboarding.

---

## Layout de pastas do Vault

Layout-por-tipo (ADR-0023, `0023-vault-layout-por-tipo.md`).
Referência canônica em código: `src/lib/vault/paths.ts:97-104`.

```
<vault-root>/
  markdown/           # todos os .md de feature
  png/                # binários png
  jpg/                # binários jpg
  m4a/                # binários m4a (áudio)
  mp4/                # binários mp4 (vídeo)
  pdf/                # binários pdf (scanner / notas)
  gif/                # binários gif (exercícios)
  .ouroboros/cache/   # caches gerados pelo backend (readonly Mobile)
  inbox/<area>/       # exceção: share intent (ADR-0024)
```

Exceções:

- **`inbox/<area>/<subtipo>/`** (share intent receiver, M08). A
  pasta `inbox/` permanece em layout-por-feature porque arquivos
  recebidos via share intent são triagem temporária antes do
  usuário arquivar (ADR-0024 `0024-share-intent-layout-pasta-excecao.md`).
- Pastas legadas (`daily/`, `eventos/`, `marcos/`, `medidas/`,
  `tarefas/`, `treinos/`, `contadores/`, `alarmes/`,
  `exercicios/`, `media/`, `agenda/`) continuam suportadas para
  leitura de Vaults pré-H2. Backend deve aceitar ambos os
  layouts no inventário inicial; preferir o novo para arquivos
  escritos pelo Mobile pós-H2.

---

## Carimbo _schema_version

A partir de Q12 (2026-05-12), todo arquivo escrito pelo Vault
ganha `_schema_version: 1` como primeira linha do bloco YAML.

Regras:

| Cenário | Comportamento |
|---|---|
| Mobile escreve arquivo novo | Sempre carimba `_schema_version: 1`. |
| Mobile lê arquivo SEM `_schema_version` | Aceita (compat v0). Zod 4 não falha em campo ausente quando schema não exige. |
| Mobile lê arquivo COM `_schema_version: 1` | Aceita. Zod 4 strips a chave por default. |
| Mobile lê arquivo COM `_schema_version: N` (N≠1) | Aceita. Emite `console.warn` uma vez. Caller decide ignorar; ETL Python deve aplicar regra de rotação. |
| Backend Python lê arquivo SEM `_schema_version` | Pode aceitar como v0 (legado pré-Q12) OU rejeitar com mensagem clara, conforme política definida na sprint dedicada do backend. |
| Backend Python lê arquivo COM `_schema_version: 2` (futuro) | Aplicar parser v2 ou rejeitar até atualização. |

Referência em código:

- Constante exportada: `VAULT_SCHEMA_VERSION` em
  `src/lib/vault/frontmatter.ts`.
- Serialização: `stringifyFrontmatter` faz prepend antes de
  `YAML.stringify`.
- Companion midia: `stringifyCompanionMidia` em
  `src/lib/midia/companion.ts` também carimba (formato manual
  linha-a-linha por compatibilidade com 1335+ testes M34).

---

## Inventário de schemas

### 5.1 humor

- **Tipo canônico**: `humor`
- **Path canônico**: `markdown/humor-YYYY-MM-DD.md` (helper
  `humorPath(date)`)
- **Path legado**: `daily/YYYY-MM-DD.md` (helper `dailyPath`)
- **Schema**: `src/lib/schemas/humor.ts` (`HumorSchema`)
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | Q12; valor `1`. |
| `tipo` | literal `'humor'` | sim | Discriminador. |
| `data` | `YYYY-MM-DD` | sim | UTC-3. |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `humor` | inteiro 1..5 | sim | Slider. |
| `energia` | inteiro 1..5 | sim | Slider. |
| `ansiedade` | inteiro 1..5 | sim | Slider. |
| `foco` | inteiro 1..5 | sim | Slider. |
| `medicacao` | string | não | Texto livre. |
| `horas_sono` | número 0..24 | não | |
| `tags` | string[] | não | Default `[]`. Lista fechada em `src/lib/humor/tagsRapidas.ts`. |
| `frase` | string | não | Texto livre. |

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: humor
data: 2026-05-12
autor: pessoa_a
humor: 4
energia: 3
ansiedade: 2
foco: 4
tags:
  - dormido
  - exercicio
frase: dia leve, foco voltou depois do almoco
---
```

### 5.2 diario_emocional

- **Tipo canônico**: `diario_emocional`
- **Path canônico**: `markdown/diario-YYYY-MM-DD-HHmm-<slug>.md`
  (helper `diarioPath(date, slug)`)
- **Path legado**: `inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md`
- **Schema**: `src/lib/schemas/diario_emocional.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'diario_emocional'` | sim | |
| `data` | ISO 8601 com hora | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `modo` | `trigger` \| `vitoria` \| `reflexao` | sim | |
| `emocoes` | string[] | não | Default `[]`. |
| `intensidade` | inteiro 1..5 | sim | |
| `com` | (`pessoa_a` \| `pessoa_b` \| `ambos`)[] | não | Default `[]`. |
| `contexto_social` | (`amigos` \| `sozinho`)[] | não | Default `[]`. |
| `texto` | string | sim | Pode ser vazio. |
| `estrategia` | string | não | Apenas em modo `trigger`. |
| `funcionou` | boolean | não | Apenas em modo `trigger`. |
| `audio` | string \| null | não | Path relativo do .m4a. |
| `midia` | `Midia[]` | não | Default `[]`. Veja seção 5.12. Em `vitoria` exige >=1. |
| `para` | `Para` | sim | Default `{ tipo: 'mim' }`. Veja seção 5.15. |

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: diario_emocional
data: 2026-05-12T18:30:00-03:00
autor: pessoa_a
modo: trigger
emocoes:
  - ansiedade
intensidade: 4
com: []
contexto_social: [sozinho]
texto: respirei e a coisa passou
estrategia: respiracao 4-7-8
funcionou: true
midia: []
para:
  tipo: mim
---
```

### 5.3 evento

- **Tipo canônico**: `evento`
- **Path canônico**: `markdown/evento-YYYY-MM-DD-<slug>.md`
  (helper `eventoPath(date, slug)`)
- **Path legado**: `eventos/YYYY-MM-DD-<slug>.md`
- **Schema**: `src/lib/schemas/evento.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'evento'` | sim | |
| `data` | ISO 8601 com hora | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `modo` | `positivo` \| `negativo` | sim | |
| `lugar` | string | não | |
| `bairro` | string | não | |
| `com` | (`pessoa_a` \| `pessoa_b` \| `ambos`)[] | não | Default `[]`. |
| `categoria` | string | não | |
| `intensidade` | inteiro 1..5 | sim | |
| `fotos` | string[] | não | Default `[]`. Paths relativos. |
| `midia` | `Midia[]` | não | Default `[]`. Em `positivo` exige >=1. |
| `para` | `Para` | sim | Default `{ tipo: 'mim' }`. |

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: evento
data: 2026-05-12T20:00:00-03:00
autor: pessoa_b
modo: positivo
lugar: padaria do bairro
bairro: vila-isolina
com: [pessoa_a]
intensidade: 4
fotos:
  - jpg/evento-2026-05-12-padaria-1.jpg
midia:
  - tipo: foto
    path: jpg/evento-2026-05-12-padaria-1.jpg
para:
  tipo: casal
---
```

### 5.4 marco

- **Tipo canônico**: `marco`
- **Path canônico**: `markdown/marco-YYYY-MM-DD-<slug>.md`
  (helper `marcoPath(date, slug)`)
- **Path legado**: `marcos/YYYY-MM-DD-<slug>.md`
- **Schema**: `src/lib/schemas/marco.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'marco'` | sim | |
| `data` | ISO 8601 com hora | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `descricao` | string >=1 | sim | |
| `tags` | string[] | não | Default `[]`. |
| `auto` | boolean | não | Default `false`. |
| `origem` | `backend` \| `client` | não | Só preenchido se `auto=true`. |
| `hash` | string len=12 | não | SHA-256 truncado para idempotência client/backend. |
| `para` | `Para` | sim | Default `{ tipo: 'mim' }`. |
| `medidaRef` | `YYYY-MM-DD` | não | Reverse-link para medidas/. |

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: marco
data: 2026-05-12T09:00:00-03:00
autor: pessoa_a
descricao: primeira corrida de 5km sem parar
tags:
  - exercicio
auto: false
para:
  tipo: mim
medidaRef: 2026-05-12
---
```

### 5.5 medidas

- **Tipo canônico**: `medidas`
- **Path canônico**: `markdown/medidas-YYYY-MM-DD.md` (helper
  `medidasPath(date)`)
- **Schema**: `src/lib/schemas/medidas.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'medidas'` | sim | |
| `data` | `YYYY-MM-DD` | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | Nunca `ambos`. |
| `peso` / `cintura` / `peito` / `braco_esq` / `braco_dir` / `coxa_esq` / `coxa_dir` / `barriga` / `quadril` | número >0..500 | não | kg para peso, cm para o resto. |
| `gordura` | número 0..100 | não | Percentual de gordura corporal (Q17.c.d). Espelhado em HC `BodyFatRecord`. |
| `fotos` | string[] | não | Default `[]`. Paths relativos. |
| `reflexao` | string | não | Texto livre. |

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: medidas
data: 2026-05-12
autor: pessoa_a
peso: 70.5
cintura: 84
peito: 96
fotos:
  - jpg/medidas-2026-05-12-frente.jpg
  - jpg/medidas-2026-05-12-costas.jpg
reflexao: animado com a constancia
---
```

### 5.6 exercicio

- **Tipo canônico**: `exercicio`
- **Path canônico**: `markdown/exercicio-<slug>.md` (helper
  `exercicioPath(slug)`)
- **Path legado**: `exercicios/<slug>.md`
- **Binário companion**: `gif/exercicio-<slug>.gif` (helper
  `exercicioGifPath`)
- **Schema**: `src/lib/schemas/exercicio.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'exercicio'` | sim | |
| `slug` | kebab-case ASCII | sim | |
| `nome` | string >=1 | sim | |
| `grupo_muscular` | string[] >=1 | sim | Lista aberta. |
| `nivel` | `iniciante` \| `intermediario` \| `avancado` | sim | |
| `equipamento` | string >=1 | sim | |
| `instrucao` | string >=1 | sim | Prosa. |
| `dicas` | string[] | não | Default `[]`. |
| `gif` | string | não | Default `''`. Path relativo do gif. |
| `historico` | `HistoricoExecucao[]` | não | Default `[]`. |

`HistoricoExecucao = { data: ISO8601, carga: number>=0, series: int>=1, reps: int>=1 }`.

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: exercicio
slug: agachamento-livre
nome: Agachamento livre
grupo_muscular: [pernas, gluteos]
nivel: intermediario
equipamento: barra olimpica
instrucao: pe na largura dos ombros, desce ate paralelo
dicas:
  - manter joelho alinhado com pe
gif: gif/exercicio-agachamento-livre.gif
historico:
  - data: 2026-05-12T07:30:00-03:00
    carga: 60
    series: 4
    reps: 8
---
```

### 5.7 ciclo_menstrual

- **Tipo canônico**: `ciclo_menstrual`
- **Path canônico**: `markdown/ciclo-YYYY-MM-DD.md` (helper
  `cicloPath(date)`)
- **Path legado**: `inbox/saude/ciclo/YYYY-MM-DD.md`
- **Schema**: `src/lib/schemas/ciclo_menstrual.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'ciclo_menstrual'` | sim | |
| `data` | `YYYY-MM-DD` | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `data_inicio` | `YYYY-MM-DD` \| null | sim | Null antes do primeiro registro. |
| `fase` | `folicular` \| `ovulatoria` \| `lutea` \| `menstrual` | sim | |
| `sintomas` | enum[] | não | Default `[]`. Lista canônica de 8 itens. |
| `intensidade` | inteiro 1..5 \| null | sim | |
| `humor_associado` | inteiro 1..5 \| null | sim | |
| `texto` | string \| null | sim | Pode ser null. |

Sintomas canônicos: `colica`, `dor_de_cabeca`, `sensibilidade`,
`fadiga`, `irritabilidade`, `inchaco`, `libido_alta`, `libido_baixa`.

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: ciclo_menstrual
data: 2026-05-12
autor: pessoa_a
data_inicio: 2026-05-10
fase: menstrual
sintomas: [colica, fadiga]
intensidade: 3
humor_associado: 2
texto: dia mais pesado
---
```

### 5.8 alarme

- **Tipo canônico**: `alarme`
- **Path canônico**: `markdown/alarme-<slug>.md` (helper
  `alarmePath(slug)`)
- **Path legado**: `alarmes/<slug>.md`
- **Schema**: `src/lib/schemas/alarme.ts`
- **Versão**: 1 (compatível com v1/v2 da recorrência interna)
- **Frontmatter** (campos canônicos; ver schema para a lista completa
  de campos v2 da recorrência):

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'alarme'` | sim | |
| `slug` | kebab-case ASCII | sim | |
| `titulo` | string 1..80 | sim | Acentuação PT-BR aceita. |
| `horario` | `HH:MM` 24h | sim | |
| `dias_semana` | int[] (0..6) | sim | 0..7 itens; semanal exige >=1. |
| `recorrencia` | `unica` \| `diaria` \| `semanal` \| `mensal` | não | Default `semanal`. |
| `data_unica` | ISO datetime | não | Apenas para `recorrencia=unica`. |
| `dia_mes` | int 1..31 | não | Apenas para `recorrencia=mensal`. |
| `tag` | `medicacao` \| `treino` \| `outro` | sim | |
| `som` | `gentle` \| `normal` \| `forte` | sim | |
| `ativo` | boolean | sim | |
| `snooze_minutos` | int 1..60 | sim | Default 5. |
| `criado_em` | ISO datetime | sim | |
| `ultimo_disparo` | ISO datetime \| null | sim | |
| `notification_ids` | string[] | sim | IDs do scheduler nativo. |
| `snooze_id` | string \| null | sim | |

Backend Python: trate como "configuração local do device", não
como evento. Útil para inferir hábitos (medicação, treino) ao
correlacionar com humor/eventos.

### 5.9 tarefa

- **Tipo canônico**: `tarefa`
- **Path canônico**: `markdown/tarefa-<slug>.md` (helper
  `tarefaPath(slug)`)
- **Path legado**: `tarefas/YYYY-MM-DD-<slug>.md`
- **Schema**: `src/lib/schemas/tarefa.ts`
- **Versão**: 1 (cobre v1 e v2 do schema interno; v2 adiciona
  campos com defaults para compat)
- **Frontmatter** (resumo):

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'tarefa'` | sim | |
| `data` | `YYYY-MM-DD` | sim | Criação. |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `titulo` | string 1..200 | sim | |
| `feito` | boolean | sim | |
| `feito_em` | ISO datetime \| null | sim | |
| `categoria` | enum (8 valores) | não | Default `outro`. |
| `pessoa_destino` | discriminatedUnion | não | Default `{ tipo: 'mim' }`. |
| `alarme` | objeto \| null | não | Default `null`. |

Categorias: `trabalho`, `casa`, `rotina`, `financas`,
`desenvolvimento_pessoal`, `obrigacoes`, `saude`, `outro`.

**Exemplo**:

```yaml
---
_schema_version: 1
tipo: tarefa
data: 2026-05-12
autor: pessoa_a
titulo: comprar pao integral
feito: false
feito_em: null
categoria: casa
pessoa_destino:
  tipo: mim
alarme: null
---
```

### 5.10 contador

- **Tipo canônico**: `contador`
- **Path canônico**: `markdown/contador-<slug>.md` (helper
  `contadorPath(slug)`)
- **Path legado**: `contadores/<slug>.md`
- **Schema**: `src/lib/schemas/contador.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'contador'` | sim | |
| `slug` | kebab-case ASCII | sim | |
| `titulo` | string 1..80 | sim | |
| `inicio` | `YYYY-MM-DD` | sim | Data atual do start; atualiza em reset. |
| `recorde` | int >=0 | não | Default 0. |
| `resets` | ISO datetime[] | não | Default `[]`. |
| `criado_em` | ISO datetime | sim | |
| `para` | `Para` | sim | Default `{ tipo: 'mim' }`. |

### 5.11 financeiro_nota

- **Tipo canônico**: `financeiro` (com `subtipo: nota`)
- **Path canônico**: `markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md`
  (helper `notaPath(date, slug)`)
- **Binário companion**: `<ext>/nota-YYYY-MM-DD-HHmmss-<slug>.<ext>`
  onde `<ext> ∈ {jpg, png, pdf}` (helper `notaArquivoPath`)
- **Path legado**: `inbox/financeiro/nota/YYYY-MM-DD-HHmmss-<slug>.md`
- **Schema**: `src/lib/schemas/financeiro_nota.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'financeiro'` | sim | |
| `subtipo` | literal `'nota'` | sim | |
| `data` | ISO 8601 com hora | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `valor` | número >=0 | sim | Em reais. |
| `descricao` | string >=1 | sim | |
| `categoria` | `mercado` \| `farmacia` \| `transporte` \| `alimentacao` \| `outro` | sim | |
| `imagem` | string >=1 | sim | Path relativo ao Vault. |
| `bairro` | string | não | |
| `ocr_confianca` | número 0..1 | sim | |
| `revisar` | boolean | não | Default `false`. |

### 5.12 midia (foto / audio / video)

- **Tipo canônico**: campo `midia[].tipo` é `spotify` \|
  `youtube` \| `foto` \| `audio`
- Não é arquivo .md standalone — é shape EMBUTIDO em `diario_emocional.midia`,
  `evento.midia`, etc.
- **Schema**: `src/lib/schemas/midia.ts` (`MidiaSchema`,
  `discriminatedUnion` por `tipo`)

| Variante | Campos |
|---|---|
| `spotify` | `tipo`, `track_id`, `titulo?`, `artista?`, `url_oembed?` |
| `youtube` | `tipo`, `video_id`, `titulo?`, `thumbnail_url?` |
| `foto` | `tipo`, `path` (binário no Vault) |
| `audio` | `tipo`, `path`, `duracao_seg?` |

Backend Python: rastreie `path` para resolver binário no Vault e
agregue contagens por tipo no Recap (M36).

### 5.13 midia-companion

- **Tipo canônico**: `midia_foto` \| `midia_audio` \| `midia_video`
  \| `midia_frase` \| `midia_pdf`
- **Path canônico**: `markdown/<basename>.md` (mesmo basename do
  binário, sem ext)
- **Binário**: `<ext>/<basename>.<ext>` (pasta determinada pelo
  ADR-0023)
- **Schema**: `src/lib/schemas/midia-companion.ts`
- **Serializador**: `src/lib/midia/companion.ts`
  (`stringifyCompanionMidia`, manual linha-a-linha por compat
  de testes M34)
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | Q12 estendeu para companion. |
| `tipo` | `midia_foto` \| `midia_audio` \| `midia_video` \| `midia_frase` \| `midia_pdf` | sim | |
| `arquivo` | string >=1 | sim | Basename do binário (com ext). |
| `data` | ISO datetime | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `duracao_seg` | int >=0 | não | Para áudio/vídeo. |
| `transcricao` | string | não | STT (áudio). |
| `legenda` | string | não | Texto livre. |
| `para` | `Para` (formato canônico string `mim`/`casal`/`outra:pessoa_X` no companion manual; objeto discriminado no schema Zod) | sim | Default `mim`. |
| `origem` | string | não | Schema-mãe (`diario_emocional`, etc.). |
| `origem_ref` | string | não | Path relativo do .md mãe. |
| `medida_ref` | string | não | Reverse-link para medidas/. |

**Exemplo (companion .md de foto)**:

```yaml
---
_schema_version: 1
tipo: midia_foto
arquivo: foto-2026-05-12-abcd.jpg
data: 2026-05-12T18:30:00-03:00
autor: pessoa_a
para: mim
legenda: "luz boa na cozinha"
---
```

### 5.14 inbox_arquivo

- **Tipo canônico**: `inbox_arquivo`
- **Path canônico**: `inbox/<area>/<subtipo>/YYYY-MM-DD-HHmmss-<slug>.md`
  (ADR-0024 — pasta `inbox/` é exceção ao layout-por-tipo)
- **Binário companion**: `inbox/<area>/<subtipo>/YYYY-MM-DD-HHmmss-<slug>.<ext>`
- **Schema**: `src/lib/schemas/inbox_arquivo.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'inbox_arquivo'` | sim | |
| `subtipo` | `pix` \| `extrato` \| `nota` \| `exame` \| `receita` \| `garantia` \| `contrato` \| `outro` | sim | |
| `data` | ISO 8601 com hora | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `arquivo` | string >=1 | sim | Path relativo do binário. |
| `mime_type` | string >=1 | sim | |
| `tamanho_bytes` | int >=0 | sim | |
| `origem` | string \| null | sim | App de origem do share intent. |
| `revisar` | boolean | não | Default `true`. |

### 5.15 para (campo compartilhado)

- **Schema**: `src/lib/schemas/para.ts` (`ParaSchema`)
- **Versão**: 1
- **Forma canônica** (objeto discriminado em frontmatter YAML):

```yaml
para:
  tipo: mim
# ou
para:
  tipo: casal
# ou
para:
  tipo: outra
  pessoa: pessoa_b
```

- **Forma legacy companion** (linha única em `stringifyCompanionMidia`):
  `para: mim`, `para: casal`, `para: outra:pessoa_a`.

Conversor canônico em `lerCompanion` (`src/lib/vault/midiaCompanion.ts`)
faz desserialização tolerante.

### 5.16 pessoa (identidade)

- **Schema**: `src/lib/schemas/pessoa.ts`
- `PessoaAutorSchema = enum('pessoa_a', 'pessoa_b')` — autor de
  registro.
- `PessoaIdSchema = enum('pessoa_a', 'pessoa_b', 'ambos')` — uso
  em filtros e relacionamentos.

Nomes reais NUNCA aparecem em Vault. Mapeamento `pessoa_a →
<nome real>` vive em runtime no SecureStore Mobile.

### 5.17 treino_sessao

- **Tipo canônico**: `treino_sessao`
- **Path canônico**: `markdown/treino-YYYY-MM-DD-<slug>.md`
- **Path legado**: `treinos/YYYY-MM-DD-<slug>.md` e
  `treinos/draft/YYYY-MM-DD-<slug>.md`
- **Schema**: `src/lib/schemas/treino_sessao.ts`
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'treino_sessao'` | sim | |
| `data` | ISO 8601 com hora | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |
| `rotina` | string | não | Ex: "rotina A". |
| `duracao_min` | int 1..240 | sim | |
| `exercicios` | `ExercicioSessao[]` >=1 | sim | |
| `observacoes` | string | não | |

`ExercicioSessao = { nome: string, series: int 1..20, reps: int 1..100, carga_kg?: number>=0, observacao?: string }`.

### 5.18 frase (midia_frase)

- Schema é uma variante de **midia-companion** (`tipo: 'midia_frase'`).
- Path canônico: `markdown/frase-YYYY-MM-DD-<slug>.md` (helper
  `frasePath(date, slug)`).
- Path legado: `media/frases/YYYY-MM-DD-<slug>.md`.
- Sem binário (frase é texto puro; o body do .md contém o texto
  da frase, frontmatter armazena metadata).

### 5.19 agenda (Google Calendar)

- **Tipo canônico**: `agenda_evento` (via `src/lib/vault/agenda.ts`)
- **Path canônico**: `markdown/agenda-<pessoa>-YYYY-MM-DD-<eventId>.md`
  (helper `agendaEventoPath(pessoa, iso, eventId)`)
- **Path legado**: `agenda/<pessoa>/<...>.md`
- Frontmatter inclui `_schema_version`, `tipo`, `pessoa`,
  `eventId`, `inicio`, `fim`, `titulo`, etc. Detalhes em
  `src/lib/vault/agenda.ts`. Conteúdo é espelho local read-only
  da Google Calendar API.

### 5.20 devices_index

- **Tipo canônico**: `devices_index` (interno; usado para detectar
  conflitos M38)
- **Path canônico**: `markdown/_devices.md` (helper
  `devicesIndexPath()`)
- **Schema**: definido em `src/lib/vault/devicesIndex.ts`.
- Backend Python pode usar para detectar split-brain entre
  dispositivos Syncthing.

### 5.21 rotina_treino

- **Tipo canônico**: `rotina_treino`
- **Path canônico**: `markdown/rotina-<slug>.md` (helper `rotinaPath`)
- **Schema**: `src/lib/schemas/rotina.ts` (`RotinaSchema`)
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'rotina_treino'` | sim | |
| `slug` | string regex `[a-z0-9-]+` | sim | Chave; salvar duas vezes sobrescreve. |
| `nome` | string | sim | |
| `descricao` | string \| null | sim | |
| `exercicios` | `ExercicioRotina[]` 1..20 | sim | Cap UX. |
| `data_criacao` | YYYY-MM-DD | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |

`ExercicioRotina = { nome: string, carga_kg: number\|null, series: int>=1, reps: string, descanso_seg: int>=1 (default 90), observacao: string\|null, gif?: string (Q18.b path relativo) }`.

`reps` é string livre (`"12"`, `"8-10"`, `"amrap"`, `"ate falha"`); `sessaoFromRotina` converte para number ao criar TreinoSessao.

### 5.22 grupo_treino

- **Tipo canônico**: `grupo_treino`
- **Path canônico**: `markdown/grupo-<slug>.md` (helper `grupoPath`)
- **Schema**: `src/lib/schemas/grupo_treino.ts` (`GrupoTreinoSchema`)
- **Versão**: 1
- **Frontmatter**:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `_schema_version` | inteiro | sim (escrita) | |
| `tipo` | literal `'grupo_treino'` | sim | |
| `slug` | string regex `[a-z0-9-]+` | sim | |
| `nome` | string 1..80 | sim | |
| `descricao` | string \| null | sim | |
| `rotina_slugs` | string[] 1..10 | sim | Referência por slug; não duplica dados. |
| `data_criacao` | YYYY-MM-DD | sim | |
| `autor` | `pessoa_a` \| `pessoa_b` | sim | |

Container que agrupa até 10 rotinas existentes para o ciclo de treino do usuário ("Treino do Quaresma" → Treino A/B/C). Backend Python pode resolver `rotina_slugs` em paralelo via `markdown/rotina-<slug>.md` para gerar visões agregadas (Q19.b).

---

## Caches que NÃO são contrato

Estes arquivos vivem em `.ouroboros/cache/`, são gerados pelo
backend Python, são readonly do ponto de vista do Mobile e
regeneráveis a qualquer momento. Não são parte do contrato de
escrita Mobile → backend; são parte do contrato inverso (backend
→ Mobile, ADR-0012).

| Arquivo | Schema Zod | Geração |
|---|---|---|
| `.ouroboros/cache/humor-heatmap.json` | `HumorHeatmapCacheSchema` | Backend MOB-bridge-2 |
| `.ouroboros/cache/financas-cache.json` | `FinancasCacheSchema` | Backend MOB-bridge-2 |
| `markdown/_devices.md` | `DevicesIndex` | Mobile (índice local, não cache) |

Estes JSON têm `schema_version: 1` como campo próprio (não
`_schema_version` — convenção anterior, sem underscore prefixo).
Mobile rejeita versões diferentes com EmptyState.

---

## Migração defensiva

Regras de leitura definidas para mitigar a transição Vault sem
carimbo → Vault com carimbo:

1. **Arquivo sem `_schema_version`**: tratado como v0. Aceito
   silenciosamente. Backend Python pode tratá-lo como pré-Q12.
2. **Arquivo com `_schema_version: 1`**: forma canônica atual.
   Zod 4 strips a chave durante validação (default behavior).
3. **Arquivo com `_schema_version: N` (N > 1)**: forward-compat.
   Mobile emite `console.warn` no reader e continua parsing
   (`schema.safeParse` strips a chave). Backend Python deve ter
   parser específico antes de aceitar.

Rotação prevista de versão acontecerá quando:

- Qualquer campo enum ganhar valor novo que mudou semântica.
- Qualquer campo for renomeado ou removido.
- Mudança de tipo (string → número, etc.).

Adicionar campo opcional novo (sem alterar campos existentes)
**não exige** rotação; backend Python lê com schema atual e
ignora o campo novo via strip.

---

## Próximos passos backend Python

Sprint dedicada (separada da Q12 Mobile):

1. **Watcher em `markdown/`**: dispatcher por prefixo de feature
   (`humor-`, `diario-`, `evento-`, `marco-`, `medidas-`,
   `exercicio-`, `ciclo-`, `alarme-`, `tarefa-`, `contador-`,
   `nota-`, `foto-`, `audio-`, `video-`, `frase-`, `scanner-`,
   `treino-`, `agenda-`, `_devices`).
2. **Parser por prefixo**: cada handler espera o shape descrito
   nas seções 5.x acima. Implementação Pydantic mirror do schema
   Zod.
3. **Rejeitar arquivos sem `_schema_version` quando política
   exigir** (ou aceitar como v0 durante janela de transição).
4. **Versionamento futuro v2**: quando o Mobile bumpar
   `VAULT_SCHEMA_VERSION` para 2, o backend abre sprint
   sincronizada que aceita v1 (legacy) E v2 (canônico) durante
   janela de transição mínima de 30 dias.
5. **Caches `.ouroboros/cache/*.json`**: continuam responsabilidade
   do backend (escrita). Mobile só lê.

NÃO está no escopo desta sprint Q12 fazer modificações no repo
Python sibling. Esta seção serve como prompt-ready para a sprint
backend.
