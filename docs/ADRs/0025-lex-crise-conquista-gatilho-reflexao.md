# ADR 0025 — Renomeação lexical canônica: Crise / Conquista / Gatilho / Reflexão

```
Status:     Aceito
Data:       2026-05-15
Sprint:     R0 (M-LEX-CRISE-CONQUISTA-GATILHO-REFLEXAO, Onda R Fase 1)
Depende:    ADR-0019 (Persistência canônica em .md individual)
            ADR-0023 (Vault organizado por tipo de arquivo)
```

## Contexto

O vocabulário historicamente usado em código e UI misturava conceitos
psicológicos (`trigger`) com termos carregados de gamificação
(`vitória`). O substantivo "vitória" soa como achievement de jogo, o que
contradiz ADR-0010 (sem gamificação, sem celebração artificial). O termo
inglês "trigger" também destoa do projeto PT-BR e tem conotação técnica
de programação (event trigger, database trigger, schedulable trigger das
notificações). Confunde quem lê o código pela primeira vez.

O dono fixou em 2026-05-15 quatro termos que passam a ser canônicos:

| Antes (legado) | Depois (canônico) | Contexto de uso |
|---|---|---|
| `vitoria`       | `conquista` | Modo do diário emocional, label de UI, tag de marcos |
| `trigger`       | `gatilho`   | Modo do diário emocional (momento difícil), label de UI |
| `Vitória/Trigger` (par) | `Crise/Conquista` (par) | Par antagônico exibido junto na UI |
| `Humor Rápido` (atalho) | `Reflexão` (atalho) | Entry de acesso rápido no MenuLateral |

"Reflexão" no atalho corresponde ao **modo `reflexao` do diário
emocional** (terceiro modo neutro, introduzido em sprint G2). O botão
"Registrar Humor" permanece intacto em outros pontos (Tela Hoje, FAB
verde, Settings).

## Decisão

1. Adotar vocabulário canônico **gatilho / conquista / reflexão** em
   todo código TypeScript novo, schemas Zod, fixtures, UI strings,
   labels e accessibility labels.
2. Preservar **compat de leitura** para `.md` antigos do Vault que
   gravaram modo legado `trigger`/`vitoria`. Implementar via
   `z.preprocess` no `DiarioEmocionalModoSchema`: o parser aceita
   ambos os vocabulários e normaliza para canônico em runtime.
3. **NÃO reescrever** arquivos `.md` antigos. A normalização acontece
   apenas em memória; o arquivo no disco permanece com a chave
   original. Custo de migração in-place > benefício (zero pressão de
   storage, leitura é idempotente).
4. **Writers** (`saveDiario` etc.) sempre emitem o valor canônico
   (`modo: gatilho` ou `modo: conquista` no frontmatter novo).
5. **Aliases @deprecated** em funções vault (`lerDiarioVitorias`
   alias de `lerDiarioConquistas`) e em haptics (`haptics.vitoria` e
   `haptics.trigger` permanecem; novos métodos `haptics.conquista` e
   `haptics.gatilho` foram adicionados como aliases canônicos).
6. **Sibling Python** (`AndreBFarias/protocolo-ouroboros`) precisa
   absorver o mesmo mapeamento bi-direcional para garantir leitura
   cruzada do Vault. Issue `etl-contract` aberta junto desta sprint.
7. **Centralizar** o mapa em `src/lib/migration/lexicon.ts` para
   reuso futuro (testes, helpers de UI, scripts de auditoria).

## Consequências

### Positivas

- Vocabulário sóbrio e coerente com ADR-0010 (sem gamificação).
- PT-BR consistente: dois termos ingleses (`trigger`, `vitoria` ASCII)
  saem do código de domínio.
- Backward compat 100%: usuário não sente diferença ao reabrir `.md`
  antigos do Vault.
- Pipeline ETL desktop pode validar contra o mesmo mapa
  (`lexicon.ts` portável).

### Negativas

- 449 ocorrências de strings legacy no código atual (auditoria via
  `grep -rniE "vitoria|trigger" src/ app/ tests/`). Migração parcial
  nesta sprint cobre os pontos de domínio críticos (schema, vault,
  hooks, UI principal); identificadores cosméticos (variáveis locais,
  comentários explicativos) ficam para sprints subsequentes da Onda R.
- Contratos públicos preservados (`ConquistaOrigem = 'diario_vitoria'
  | 'evento_positivo'`) — refator do id requer sprint nova com
  migração de cache de Recap e Galeria.
- Documento `SCHEMA-MIGRATION.md` deve ser mantido em sincronia com
  o sibling Python para evitar drift silencioso.

## Alternativas consideradas

### Alternativa A — Renomear apenas labels de UI, manter enum legado

Vantagem: zero impacto em schema e tipos.
Desvantagem: descasamento entre vocabulário visível e código gera
confusão para devs novos. Reaparece a cada PR ("por que `modo:
'trigger'` aparece como 'Crise' na tela?"). Não foi aceito.

### Alternativa B — Renomear tudo + rewrite do .md no boot

Vantagem: vault converge para canônico em uma janela.
Desvantagem: write storm em primeiro boot pos-update (centenas de
arquivos), conflito com Syncthing rodando em paralelo, risco de
perda de dados em falha de I/O. Não foi aceito.

### Alternativa C (escolhida) — Renomear + transform Zod, sem rewrite

Vantagem: idempotente, sem custo de migração, sem risco. Sibling
ETL aplica mesma transformacao.
Desvantagem: arquivos antigos permanecem com chave legada
indefinidamente — auditor de `grep` precisa estar ciente.

## Implementação

- `src/lib/migration/lexicon.ts` — Mapa bi-direcional + helper
  `normalizarDiarioModo`.
- `src/lib/schemas/diario_emocional.ts` — `DiarioEmocionalModoSchema`
  via `z.preprocess`. Enum canônico passa a ser
  `['gatilho', 'conquista', 'reflexao']`.
- `app/diario-emocional.tsx` — `normalizarModoParam` aceita deeplinks
  com valor legacy (`?modo=trigger`) e remapeia.
- `src/lib/navigation/captureRoutes.ts` — Rotas emitem param canônico
  (`?modo=gatilho`, `?modo=conquista`).
- `src/components/chrome/MenuLateral.tsx` — Entry "Reflexão" no slot
  de acesso rápido (ícone Sparkles, abre `/diario-emocional?modo=reflexao`).
- `scripts/dicionario_ptbr_canonico.json` — Adiciona "conquista" e
  "gatilho" no dicionário PT-BR.
- `docs/SCHEMA-MIGRATION.md` — Documento canônico do mapeamento
  para sibling ETL.
- `tests/lib/migration/lexicon.test.ts` — 16 testes do helper +
  integridade bi-direcional.
- `tests/schemas/diario_emocional.test.ts` — Bloco
  "R0 backward-compat (legacy modo)" cobre leitura de `.md` antigo.

## Notas

- Identificadores em `FABRadialKey` (`'vitoria'`, `'trigger'`) são
  **chaves internas de UI**, não vão para arquivo. Mantidas para não
  quebrar o componente; quando o FAB aciona a rota, o param emitido
  é canônico via `captureRoutes`.
- `ConquistaItem.origem === 'diario_vitoria'` é id de contrato
  cross-platform (também usado por widget Android e cache de Galeria).
  Renomear exige sprint própria com versionamento de cache.
- O slug `'vitoria'` ainda aparece em `TAGS_SUGERIDAS` do
  `SheetNovoMarco` foi substituído por `'conquista'`. Tags em `.md`
  antigas que usam `'vitoria'` permanecem legíveis (são strings
  livres sem schema enum).
