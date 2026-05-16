# Auditoria cross-flow Onda R — 2026-05-16

**Sprint**: R-CROSS-FLOW-AUDIT
**Modo**: audit + fix cirúrgico
**Worktree**: `.claude/worktrees/agent-af2b22c3af313e89a`
**Branch**: `worktree-agent-af2b22c3af313e89a`
**Baseline**: commit `7f7975f` (main)

## Sumário executivo

- **12 cenários canônicos** auditados conforme spec.
- **OK**: 4 cenários (1, 3, 6, 9).
- **OK com fix cirúrgico aplicado**: 2 cenários (7, 12 — mas 12
  parcial).
- **FAIL cirúrgico aplicado in-line**: 1 cenário (fotos no
  recap-lista redireciona para galeria).
- **FAIL invasivo → sprint derivada**: 3 cenários (10, 11, 4).
- **SUSPEITO / dependência externa**: 3 cenários (2, 5, 8 —
  esperam R-FAB-2, R-HOME-3, R-INT-3 já no roadmap).

## Tabela 12 cenários

| # | Cenário | Esperado | Observado | Status |
|---|---------|----------|-----------|--------|
| 1 | FAB Câmera vs FAB+ Saúde Física | Foto via FAB Câmera entra em `/galeria`, Saúde Física e Recap Memórias | FAB "Câmera" no MenuLateral → `/captura` → "Registrar momento" → `/saude-fisica?abrirCaptura=1` → MenuCapturaVerde com 4 opções (foto/áudio/vídeo/frase). Todas via `origem: 'galeria'` (não `camera` direto). Path canônico H2 (`jpg/foto-...` + `markdown/foto-...md`); galeria, useFotosAgregadas e Recap leem corretamente via `listarItensGaleria` e `listarMidiasStandalone`. R-CRIT-3 (`c722538`) já fechou mídia ausente em Recap. **Não há captura direta câmera real no FAB** — só galeria picker. Decisão consciente conforme R-FAB-2 spec ainda pendente. | **OK** (com nota: câmera real só via `MidiaPicker > MidiaFotoTab > "Tirar foto"` em diário emocional) |
| 2 | FAB Câmera vs Reflexão com foto | Foto via "Reflexão com foto" navega para `/diario-emocional?modo=reflexao` com foto pré-anexada; companion `.md` referencia foto | R-FAB-2 ainda spec (`docs/sprints/R-FAB-2-CAMERA-REPENSAR-spec.md`). Fluxo não implementado. **Sem regressão**: fluxo atual (`/captura` → "Registrar momento" → `/saude-fisica?abrirCaptura=1`) funciona, só não é o renomeado da R-FAB-2. | **SUSPEITO / DERIVADO** (sprint R-FAB-2 já existe) |
| 3 | MicrofoneButton em Reflexão vs Diário | Áudio gravado no atalho Reflexão escreve mesmo `.md` do diário | `app/diario-emocional.tsx:575-595`: `<MicrofoneButton onAudioGravado={setAudioPath}>` + `<TranscreverButton onTextoTranscrito={setTexto}>`. Ambos preenchem o mesmo `meta` (audio + texto) salvo em arquivo único `markdown/diario-...md`. Q5.1 separou os botões (áudio≠transcrição) por restrição Android (`A36` log no logcat). Reflexão é `modoParam='reflexao'` (R0 lexical) — mesmo handler. | **OK** |
| 4 | Scanner OCR vs Galeria | Nota fiscal escaneada aparece em `/galeria` com tag financeiro | `saveNota` (I-SCANNER) escreve 3 arquivos: binário (`<ext>/scanner-<slug>.<ext>`), companion (`markdown/scanner-<slug>.md`, tipo `midia_foto`/`midia_pdf`) e semantico (`markdown/nota-<ts>-<slug>.md`, FinanceiroNotaSchema). `listarItensGaleria` lista **ambos `nota-` e `scanner-`** como tipos canônicos distintos — **cada nota fiscal aparece duplicada**. Galeria filtrada por aba "Texto" mostra a nota; aba "Tudo" mostra os 2 lados. | **FAIL** → sprint derivada `R-CROSS-FLOW-FIX-3` |
| 5 | Tarefa concluída na Home vs `/tarefas` | Checkbox inline da Home persiste no .md e reflete em `/tarefas` | R-HOME-3 (`docs/sprints/R-HOME-3-TODO-INLINE-CHECK-spec.md`) ainda spec. `SecaoProximos.tsx` mostra tarefas sem checkbox; tap só navega. `marcarFeito` em `src/lib/vault/tarefas.ts:361` é canônico e idempotente — quando R-HOME-3 implementar, basta chamar esse helper. Cross-flow do helper para `/tarefas` já está coberto. | **SUSPEITO / DERIVADO** (sprint R-HOME-3 já no roadmap) |
| 6 | Humor registrado vs Recap | Humor de hoje aparece em Recap > Numeros (registros count) e Lista do dia | `saveHumor` grava `markdown/humor-YYYY-MM-DD-<deviceId>.md` (T2 lock-vault). `useRecap` → `listarHumor` lê todos `humor-*.md`, agrega via `agregarRecap` que soma em `numeros.registros` + cria item em `evolucoes` (humor médio quando ≥2 registros). **Caveat**: humor não aparece como "item de registro" na lista detalhada (`/recap-lista?tipo=registros` lista reflexões + marcos + diário_vitoria mas não humor). É design intencional — humor é "diário", não "registro narrativo". Contagem `numeros.registros` o inclui. | **OK** (com caveat documentado: humor é numerico-only no recap-lista) |
| 7 | Conquista anexada com foto vs Saúde Física > Evolução | Marco com `medidaRef` aparece como card em Evolução | Marco salva `medidaRef` via `SheetNovoMarco` (linhas 61, 97, 119) mas **nenhum consumidor lia o campo**. `EvolucaoCorporalTab > ItemTimeline` exibia descricao/tags/auto mas ignorava `medidaRef`. **Fix cirúrgico aplicado** (`src/components/screens/EvolucaoCorporalTab.tsx`): timeline agora mostra linha `"Vinculado a medida <dd mmm>"` em roxo quando `marco.medidaRef` presente. SecaoEvolucaoCorporal continua independente (lê só medidas). | **OK** após fix cirúrgico |
| 8 | Toggle Health Connect vs sync real | Liga toggle → treino salvo aparece em Samsung Health/Google Fit ≤30s | R-INT-3 (`docs/sprints/R-INT-3-HEALTH-CONNECT-NAO-FUNCIONA-spec.md`) já registrado como bug crítico aberto. Toggle UI funciona (`app/settings/integracoes.tsx`), hooks `useHealthConnectResumo` lê resumo, mas write real silenciosamente falha (R-INT-3 investiga raiz). | **SUSPEITO / DERIVADO** (R-INT-3 spec já no roadmap, bloqueado por R0/R-INT-2/R-CRIT-3) |
| 9 | Onboarding nomes vs telas com nomes | Muda nome em Settings → `useNomeDe('pessoa_a')` reativo em todas as telas | `useNomeDe` (linha 89-103 de `src/lib/stores/pessoa.ts`) é zustand selector reativo (`usePessoa((s) => s.nomes.pessoa_a)`). Toda alteração via `setNome` (`pessoa.ts:46`) reidrata consumidores automaticamente. 21+ consumidores espalhados (HumorHeatmapStats, ItemTarefa, SeletorPara, FiltrosBar, MenuLateral, SecaoStatusCasal, ShareReceiver). | **OK** |
| 10 | Toggle backup auto (D6) vs scheduler | Liga toggle → boot hook agenda? Após 7 dias, dispara? | **`avaliarBackupAutomatico` está órfão**. Declarado, exportado e testado em `src/lib/backup/agendarBackup.ts`, mas **nenhum lugar em `app/_layout.tsx` ou helpers de boot chama o avaliador**. Toggle ON em Settings nunca aciona o backup porque o avaliador nunca roda. Settings UI completa (`SecaoBackupAutomatico.tsx`); comentário em `agendarBackup.ts:7` diz "helper plugado em `_layout` via `avaliarBackupAutomatico`" mas plug não existe. | **FAIL CRÍTICO** → sprint derivada `R-CROSS-FLOW-FIX-1` |
| 11 | Mobile escreve .md vs ETL Python lê | Mobile salva humor → sibling ETL lê via `./run.sh` sem drift | **Drift de schema layout-por-tipo**. Mobile migrou para H2 (ADR-0023) — todo write canônico em `markdown/<feature>-*.md`. Sibling Python em `/home/andrefarias/Desenvolvimento/protocolo-ouroboros/src/mobile_cache/*.py` ainda usa SUBPATHS legados: `("marcos",)`, `("eventos",)`, `("tarefas",)`, `("treinos",)`, `("medidas",)`, `("ciclo",)`, `("inbox","mente","diario")`. **Mobile não escreve nenhum desses paths há 10+ sprints**. Run real do ETL (`OUROBOROS_VAULT=~/Protocolo-Ouroboros .venv/bin/python -m src.mobile_cache`) confirma: nenhuma menção a `markdown/` em todo `src/mobile_cache/`, ETL processa só dados legados do vault desktop (que tem pastas legadas porque migração manual antiga). Dados novos do mobile via Syncthing ficam **invisíveis** ao ETL. | **FAIL CRÍTICO CROSS-REPO** → sprint derivada `R-CROSS-FLOW-FIX-2` |
| 12 | Frontmatter compatível v2 | Schemas v2 (Onda Q) ainda decodificam no parser sibling; migração lexical (pós R0) preserva backward-compat | **Mobile side**: R0 fez `DiarioEmocionalModoSchema = z.preprocess(...)` aceitando legados (`trigger` → `gatilho`, `vitoria` → `conquista`). Schemas têm preprocess fields em `diario_emocional.ts`, `evento.ts`, `ciclo_menstrual.ts`, `midia-companion.ts`. **Sibling side**: como sibling ainda lê pastas legadas (cenário 11), só vê arquivos pre-R0. Não testou backward-compat real porque sibling não chega aos arquivos novos. Drift documentado em FIX-2. **Backward-compat de leitura mobile**: confirmado. **Forward-compat sibling**: bloqueado pelo FIX-2. | **OK parcial** (mobile side OK; sibling side bloqueado por FIX-2) |

## Fixes cirúrgicos aplicados in-line

### Fix 1: `src/components/screens/EvolucaoCorporalTab.tsx`

Adiciona render de `marco.medidaRef` em `ItemTimeline` quando
presente — exibe linha purple "Vinculado a medida <dd mmm>".
Resolve cenário 7 (campo gravado mas nunca consumido).

### Fix 2: `app/recap-lista.tsx` + `app/galeria/index.tsx`

`recap-lista` com `tipo='fotos'` redireciona via `router.replace`
para `/galeria?filtro=foto`. Galeria parseia `?filtro=` da query
e seleciona a aba inicial correspondente. Antes: empty state
inevitável "nenhum item no período" porque Q24.a.d nunca foi
implementado. Agora: tap em "Fotos" no Recap leva direto à
galeria filtrada por fotos. UX delta significativo.

## FAILs cirúrgicos não aplicados

Nenhum — todos os fixes cirúrgicos identificados foram aplicados
ou viraram sprint derivada por escopo (cenários 10, 11, 4).

## FAILs invasivos descopados como sprints

| ID derivado | Cenário origem | Path do spec |
|-------------|----------------|--------------|
| R-CROSS-FLOW-FIX-1 | 10 (backup órfão) | `docs/sprints/R-CROSS-FLOW-FIX-1-BACKUP-AUTOMATICO-ORFAO-spec.md` |
| R-CROSS-FLOW-FIX-2 | 11 (sibling ETL pre-H2) | `docs/sprints/R-CROSS-FLOW-FIX-2-SIBLING-ETL-LAYOUT-H2-spec.md` |
| R-CROSS-FLOW-FIX-3 | 4 (scanner duplicata) | `docs/sprints/R-CROSS-FLOW-FIX-3-SCANNER-DUPLICATA-GALERIA-spec.md` |

## Validação cross-repo (sibling Python)

```bash
$ cd /home/andrefarias/Desenvolvimento/protocolo-ouroboros
$ OUROBOROS_VAULT=~/Protocolo-Ouroboros timeout 30 .venv/bin/python -m src.mobile_cache 2>&1 | tail -15

[05/16/26 00:40:06] INFO     marcos_auto: 6 eventos coletados de
                             /home/andrefarias/Protocolo-Ouroboros
                    INFO     marcos_auto: 0 marcos novos gravados em
                             /home/andrefarias/Protocolo-Ouroboros/marcos
[05/16/26 00:40:06] INFO     humor-heatmap.json gerado: 1 células, 2 pessoas,
                             período=90d
[05/16/26 00:40:07] INFO     financas-cache.json gerado: gasto_semana=0.00,
                             top=0, ultimas=20
```

**Diagnóstico**: ETL processa só `eventos/` legado (6 itens), nenhum
do `markdown/` (que existiria se o usuário sincronizasse mobile com
desktop via Syncthing). Cache JSON regenerado mas dados mobile não
entram. Confirma drift de FIX-2.

## Validação Mobile-side (smoke + jest)

```bash
$ ./scripts/smoke.sh 2>&1 | tail -5
Test Suites: 223 passed, 223 total
Tests:       1 skipped, 2081 passed, 2082 total
Snapshots:   2 passed, 2 total
Time:        71.241 s
OK: smoke test passou

$ npx jest --silent 2>&1 | tail -5
Test Suites: 223 passed, 223 total
Tests:       1 skipped, 2081 passed, 2082 total
Snapshots:   2 passed, 2 total
Time:        12.503 s

$ npx tsc --noEmit
(sem erros)
```

Smoke + tsc + jest verde após os 2 fixes cirúrgicos. Baseline
mantido: 2081 passed antes e depois.

## Achados colaterais não-cenário

1. **`/recap-lista?tipo=fotos` levava a empty state forever** —
   resolvido pelo Fix 2.
2. **Marco com `medidaRef` ficava sem feedback visual** — resolvido
   pelo Fix 1.
3. **Cenário extra (não listado, encontrado durante auditoria)**:
   FAB Câmera não expõe captura direta de câmera real (`origem:
   'camera'`). Só `origem: 'galeria'`. R-FAB-2 spec preserva
   comportamento atual mas renomeia. **Não é regressão** — é o
   estado intencional Q4/M-CAPTURA-UNIFICADA.

## Notas de contrato cross-repo

- Mobile schemas em `src/lib/schemas/` continuam canônicos para
  contrato `docs/CONTRACT-MOBILE-BACKEND.md` (174 campos
  auditados, `test_contract_drift.sh` verde).
- ETL sibling Python **não usa** esses schemas como fonte —
  parseia frontmatter direto. Por isso drift de path layout fica
  invisível aos checks Mobile. FIX-2 propõe atualizar SUBPATHS no
  sibling.
- Schema preprocess (R0): mobile lê arquivos legados com `trigger`/
  `vitoria`/`positivo` legados. Sibling Python parse permissivo
  via `_ler_frontmatter` aceita ambos sem schema rígido — boa
  resiliência cross-repo.

## Próximas ações

1. Avaliar criar **R-CROSS-FLOW-FIX-1** (backup órfão) na próxima
   sprint — é P1-high, 30-60min.
2. Coordenar com sibling Python sobre **R-CROSS-FLOW-FIX-2** (ETL
   H2 paths) — pode ser feito em paralelo com mobile development.
3. **R-CROSS-FLOW-FIX-3** (scanner duplicata) pode esperar P2; só
   atinge quem escaneia notas fiscais.
4. **Não promover R-CROSS-FLOW-AUDIT como permanente** — esta
   sprint conclui com relatório + fixes cirúrgicos + 3 sprints
   derivadas. Próxima auditoria deveria rodar em **2 semanas**
   ou após implementação de R-HOME-3, R-FAB-2, R-INT-3.
