# SCHEMA-VAULT-ESTADO

Inventário canônico dos arquivos em `vault/_estado/`. Cada um é um
snapshot serializado em YAML frontmatter que espelha um pedaço do
estado do app (lado-A) ou um cálculo derivado (lado-B). O sibling
Python ETL consome esses `.md` direto.

Versão deste contrato: **v1** (`version: 1` em cada frontmatter,
alinhado a `_schema_version: 1` da convenção Q12).

## Sumário

1. [Contexto](#contexto)
2. [Convenções](#convenções)
3. [Arquivos de estado (R-VAULT-A)](#arquivos-de-estado-r-vault-a)
   - [`settings-<deviceId>.md`](#settings-deviceidmd)
   - [`sessao-<deviceId>.md`](#sessao-deviceidmd)
   - [`onboarding-<deviceId>.md`](#onboarding-deviceidmd)
   - [`pessoa-<deviceId>.md`](#pessoa-deviceidmd)
   - [`navegacao-<deviceId>.md`](#navegacao-deviceidmd)
4. [Arquivos de stats agregadas (R-VAULT-B)](#arquivos-de-stats-agregadas-r-vault-b)
   - [`stats-7d-<deviceId>.md`](#stats-7d-deviceidmd)
   - [`stats-30d-<deviceId>.md`](#stats-30d-deviceidmd)
   - [`stats-90d-<deviceId>.md`](#stats-90d-deviceidmd)
   - [`stats-all-<deviceId>.md`](#stats-all-deviceidmd)
5. [Para o sibling Python ETL](#para-o-sibling-python-etl)

---

## Contexto

Em R-VAULT-A (commit `81d4bad`), 5 stores zustand passaram a ter
subscribers que escrevem o estado canônico do app em
`vault/_estado/<key>-<deviceId>.md`. SecureStore continua sendo
cache rápido + fallback offline; o Vault é a fonte canônica para o
sibling Python consumir consolidado.

Em R-VAULT-B (esta sprint), o conjunto ganhou 4 arquivos de stats
agregadas (read-model derivado) que economizam reler o Vault
inteiro para gerar séries históricas: `stats-7d`, `stats-30d`,
`stats-90d`, `stats-all`.

Total atual: 9 `.md` por device.

## Convenções

- **Path canônico**: `vault/_estado/<key>-<deviceId>.md`.
- **Sufixo de deviceId**: `-ouro-<6 chars alfanuméricos>` aplicado
  via `forceDeviceIdSuffix` (T2-LOCK-VAULT). Cada device tem seu
  próprio conjunto de `_estado/*.md`; sibling Python pode dedupar
  por deviceId quando vários estão sincronizados via Syncthing.
- **Encoding**: UTF-8 sem BOM, newlines LF.
- **Frontmatter YAML** delimitado por `---`. Body sempre vazio
  (todo o estado vive no frontmatter; corpo livre reservado para
  futuras anotações).
- **`_schema_version: 1`** estampado pelo writer canônico
  (Q12). Reader Mobile ignora; sibling Python deve respeitar.
- **`version: 1`** dentro do frontmatter por arquivo (campo do
  schema Zod). Bump apenas em mudança incompatível do shape.
- **`atualizadoEm`**: ISO 8601 com offset (`-03:00` ou `Z`),
  carimbado a cada escrita pelo writer.
- **Schemas Zod**: `src/lib/schemas/vault_estado.ts`.

## Arquivos de estado (R-VAULT-A)

### `settings-<deviceId>.md`

- **Schema**: `EstadoSettingsSchema` (`src/lib/schemas/vault_estado.ts:47`).
- **Frequência**: a cada toggle em Settings (debounced 500ms).
- **Campos principais**:
  - `version: 1`
  - `somVibracao`: 4 booleans (geral, despertar, conquista, botões).
  - `pessoa`: ativa (`pessoa_a`/`pessoa_b`) + vaultCompartilhado + tipoCompanhia.
  - `featureToggles`: 11 booleans cobrindo features opcionais
    (cicloMenstrual, alarmePessoal, todoLeve, contadorDiasSem,
    calendarioConquistas, widgetHomescreen, widgetMostraNome,
    mostrarFinancasEmDesenvolvimento, backupAutomaticoSemanal,
    healthConnectSync, recapAmbientAudio).
  - `privacidade`: biometriaAbrir, ocultarTranscricoes.
  - `midia`: capPorRegistro (int >=1), permitirAudio.
  - `atualizadoEm`: ISO 8601.

Exemplo:

```markdown
---
_schema_version: 1
version: 1
somVibracao:
  geral: true
  despertar: true
  conquista: false
  botoes: true
pessoa:
  ativa: pessoa_a
  vaultCompartilhado: true
  tipoCompanhia: duo
featureToggles:
  cicloMenstrual: false
  alarmePessoal: true
  todoLeve: true
  contadorDiasSem: true
  calendarioConquistas: true
  widgetHomescreen: true
  widgetMostraNome: false
  mostrarFinancasEmDesenvolvimento: false
  backupAutomaticoSemanal: false
  healthConnectSync: false
  recapAmbientAudio: false
privacidade:
  biometriaAbrir: false
  ocultarTranscricoes: false
midia:
  capPorRegistro: 4
  permitirAudio: true
atualizadoEm: 2026-05-16T10:00:00-03:00
---
```

### `sessao-<deviceId>.md`

- **Schema**: `EstadoSessaoSchema` (`vault_estado.ts:92`).
- **Frequência**: a cada salvamento de rascunho ou marcação de flag de
  boot (debounced 500ms).
- **Campos**:
  - `ultimaRota`: string nullable.
  - `rascunhos`: 7 keys (`humorRapido`, `diarioEmocional`, `eventos`,
    `cicloRegistrar`, `alarmesNovo`, `contadoresNovo`, `tarefasNova`)
    cada uma `record<string, unknown>` ou `null`.
  - `permissoesPedidas`: 4 booleans (storage, notif, camera, mic).
  - `flags`: 5 booleans de migração (canalV1Deletado,
    cacheAgendaMigrado, vaultLayoutMigrado, t2DeviceIdSuffixMigrado,
    estadoMigradoParaVault).

### `onboarding-<deviceId>.md`

- **Schema**: `EstadoOnboardingSchema` (`vault_estado.ts:122`).
- **Frequência**: 1x ao concluir onboarding (depois disso, raro).
- **Campos**:
  - `done`: boolean.
  - `tipoCompanhia`: `sozinho` | `casal` | `amigos`.
  - `sexoDeclarado`: `{ pessoa_a: enum|null, pessoa_b: enum|null }`
    (enum: `masculino`/`feminino`/`nao-binario`/`prefiro-nao-dizer`).
  - `permissoes`: 5 booleans (storage, camera, microfone,
    notificacoes, localizacao).

### `pessoa-<deviceId>.md`

- **Schema**: `EstadoPessoaSchema` (`vault_estado.ts:150`).
- **Frequência**: ao trocar pessoa ativa ou editar nomes/fotos.
- **Campos**:
  - `pessoaAtiva`: `pessoa_a` | `pessoa_b`.
  - `filtroPessoa`: `pessoa_a` | `pessoa_b` | `ambos`.
  - `nomes`: `{ pessoa_a: string, pessoa_b: string }` (nomes reais; o
    sibling Python pode usar para exibição humana se quiser).
  - `fotos`: `{ pessoa_a: string|null, pessoa_b: string|null }`
    (URIs locais; sibling Python ignora ou reescreve referência).

### `navegacao-<deviceId>.md`

- **Schema**: `EstadoNavegacaoSchema` (`vault_estado.ts:174`).
- **Frequência**: alta (cada abertura de menu/sheet). Debounced 500ms.
- **Campos**:
  - `menuAberto`: boolean.
  - `sheetCapturaAberto`: boolean.
  - `scrollMenuLateralPosition`: number.

Utilidade primária é debug; produção pode ignorar.

## Arquivos de stats agregadas (R-VAULT-B)

Todos os 4 compartilham `EstadoStatsAgregadasSchema`
(`vault_estado.ts:213`). Diferem apenas no campo `periodo`.

### `stats-7d-<deviceId>.md`

- **Período**: 7 dias completos terminando agora.
- **Frequência**: recalculado em qualquer mutação relevante,
  debounced 30s.

### `stats-30d-<deviceId>.md`

- **Período**: 30 dias.

### `stats-90d-<deviceId>.md`

- **Período**: 90 dias.

### `stats-all-<deviceId>.md`

- **Período**: histórico completo no Vault.

**Campos comuns dos 4**:

- `version: 1`
- `periodo`: `7d` | `30d` | `90d` | `all`.
- `humorMedio7d` | `humorMedio30d` | `humorMedio90d` | `humorMedioAll`:
  number 0..5 com 2 casas ou `null` (sem registro no horizonte).
- `countPorTipo`: record com 9 chaves canônicas:
  - `humor`
  - `diario_gatilho`
  - `diario_conquista`
  - `diario_reflexao`
  - `marco`
  - `evento_positivo`
  - `evento_negativo`
  - `contador`
  - `tarefa_concluida`
- `streaksAtuais`: record `slug -> dias` (apenas contadores com dias >= 1).
  Sort por slug ASC determinístico.
- `topGatilhosUltimos90d`: array (max 5) `{ chave, n }` ordenado por
  `n` desc; empate por chave ASC. Chaves são emoções
  (`emocoes[]` de `diario.modo='gatilho'`).
- `topConquistas`: array (max 5) `{ chave, n }` mesmo critério de
  ordenação. Chaves canônicas:
  - `diario_vitoria` (modo=`conquista` do diario emocional)
  - `evento_positivo`
  - `marco`
  - `tarefa_concluida`
- `ultimaAtualizacao`: ISO 8601 (alias de `atualizadoEm`, mantido
  por compatibilidade com sibling).
- `atualizadoEm`: ISO 8601.

Exemplo de `stats-7d`:

```markdown
---
_schema_version: 1
version: 1
periodo: 7d
humorMedio7d: 4.20
humorMedio30d: 3.85
humorMedio90d: 3.65
humorMedioAll: 3.50
countPorTipo:
  humor: 5
  diario_gatilho: 2
  diario_conquista: 1
  diario_reflexao: 0
  marco: 1
  evento_positivo: 1
  evento_negativo: 0
  contador: 3
  tarefa_concluida: 4
streaksAtuais:
  sem-acucar: 14
  sem-fumar: 120
topGatilhosUltimos90d:
  - chave: ansiedade
    n: 6
  - chave: raiva
    n: 4
  - chave: medo
    n: 3
topConquistas:
  - chave: tarefa_concluida
    n: 4
  - chave: marco
    n: 1
ultimaAtualizacao: 2026-05-16T10:00:00-03:00
atualizadoEm: 2026-05-16T10:00:00-03:00
---
```

## Para o sibling Python ETL

Recomendações de parsing e consumo:

1. **Parser**: `python-frontmatter` + `pyyaml`. Cada `.md` tem
   frontmatter delimitado por `---`; body em geral vazio.
2. **Dedup por deviceId**: leia todos os `<key>-<deviceId>.md` da
   pasta `_estado/`, agrupe por `<key>`, e escolha o de
   `atualizadoEm` mais recente (ou faça merge se a chave aceita —
   ver casos abaixo).
3. **Detecção de staleness**: `atualizadoEm` mais antigo que
   janela X minutos pode indicar device offline. Logar; não falhar.
4. **API recomendada** (para sprint Python sibling):
   - `lerEstado(key: Literal['settings','sessao','onboarding','pessoa','navegacao']) -> Estado`
     - Dedup automático pelo deviceId mais recente.
   - `lerStatsAgregadas(periodo: Literal['7d','30d','90d','all']) -> StatsAgregadas`
     - Idem.
5. **Versão**: respeite `_schema_version` e `version` interno.
   Atualmente ambos são `1`. Em N>1, falhe defensivamente ou
   tenha branch dedicado.

Os schemas Zod ficam em `src/lib/schemas/vault_estado.ts`. Quando o
sibling Python definir Pydantic mirrors, devem espelhar os mesmos
campos sem renomear (chaves em `snake_case` quando o YAML usa
`snake_case`, em `camelCase` quando o YAML usa `camelCase` — copiar
exato).

Esta sprint só abre a issue rastreadora no sibling; nenhum código
Python é mexido a partir deste repo Mobile.
