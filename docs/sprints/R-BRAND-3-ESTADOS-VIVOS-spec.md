# Sprint R-BRAND-3-ESTADOS-VIVOS — a marca reage aos estados vivos do app (erro · ritual mensal · progresso)

> **SUPERADO (2026-07-14).** A onda R-BRAND-SYSTEM
> ([`_ONDA-R-BRAND-SYSTEM.md`](_ONDA-R-BRAND-SYSTEM.md), aprovada pelo
> dono) substituiu a arquitetura de `variant` no `OuroborosLoading` pelo
> glifo canônico animável (`R-BRAND-3-GLIFO`). O escopo daqui migrou:
> C3 → `R-BRAND-5-FEEDBACK-spec.md` · D1 → `R-BRAND-6-LONGA-DURACAO-spec.md`
> · F2 → `R-BRAND-8-RITUAIS-spec.md`. O ID R-BRAND-3 agora é da sprint
> GLIFO; "estados vivos" (seção B da marca) é `R-BRAND-7-ESTADOS-VIVOS`.
> A pesquisa de superfícies abaixo (Toast error, OAuth negado, infra de
> virada de mês) continua leitura útil para os executores das sprints
> novas. Não executar este spec.

```
DEPENDE:    (hard, para TODAS as sub-sprints)
            - R-AUDIT-A11Y-MOVIMENTO mergeada — consome o hook
              useReduceMotion() (src/lib/hooks/useReduceMotion.ts). Hoje NAO
              existe (rg "useReduceMotion" em src/ e app/ = 0 ocorrencias,
              confirmado). Mesmo motivo da R-BRAND-2: animacao que chama
              AccessibilityInfo direto teria que ser refeita.
            - R-BRAND-2-ANIMACOES mergeada — reusa o componente-base de glifo
              animado que a R-BRAND-2 cria (src/components/brand/
              OuroborosLoading.tsx, variantes sync/inline). NAO reportar o
              porte do SVG; esta sprint ESTENDE aquele componente.
            (soft, so' para R-BRAND-3b/F2)
            - R-AUDIT-RECAP-TECIDO / Recap v2 idealmente ANTES — a superficie
              do ritual mensal e' o Recap (periodo 'mes'). F2 pode ser
              implementado sem o tecido do RECAP-TECIDO, mas a leitura do
              ritual fica mais rica depois dele.
BLOQUEIA:   nada estrutural. E' folha na arvore de dependencias.
ESTIMATIVA: 3 sub-sprints independentes, IDs proprios:
            - R-BRAND-3a (C3 estados de erro)  ~1 dia
            - R-BRAND-3b (F2 ritual mensal)    ~1-1.5 dia (inclui infra de
              deteccao de virada de mes, que NAO existe hoje)
            - R-BRAND-3c (D1 progresso segmentado) ~1-1.5 dia (inclui
              plumbing de onProgress em servicos que hoje nao emitem)
            Total ~3-4 dias. Cada sub-sprint tem escopo, aceite, aritmetica,
            E2E e proof-of-work proprios abaixo.
STATUS:     [superseded] (2026-07-14) — ver header; nao executar
ORIGEM:     reavaliacao de escopo do dono (2026-07-13). A spec-mae
            docs/sprints/R-BRAND-ASSETS-APP-spec.md §3.5 reavaliou os 17
            conceitos da marca e §3.6 remeteu C3/F2/D1-mecanismo para
            "sprint propria (R-BRAND-3-ESTADOS-VIVOS, para nao inflar esta)".
            Assets-fonte em ~/Desktop/assets-ouroboros-loading-logo/
            (read-only, fora do repo): Conceitos Ouroboros.html (doc dos 17
            conceitos, cada um com tag app/site e timing), ouroboros-lib.js
            (factory que expoe cabeca/cauda/olho/boca/snake/ring/beads),
            ouroboros.svg (logo canonico, 43 contas + rosto).
VISAO:      publico com depressao/TDAH/ansiedade/autismo. Os 3 conceitos
            eram descartados como "site"; o CENARIO de site sai, o TRATAMENTO
            VISUAL fica, readaptado a uma superficie de APP real. Cada peca
            honra a Regra de Tom (zero alarme, zero comparacao negativa) e a
            Regra de Estetica (ADR-010). Toda animacao honra reduce-motion.
```

> **Tres sub-sprints, IDs proprios, ordem propria — mesma estrutura da
> spec-mae** (que carrega R-BRAND-1 + R-BRAND-2 num unico arquivo). Este
> arquivo carrega R-BRAND-3a/3b/3c em secoes separadas. Cada uma e'
> independente e pode ser enfileirada/executada por si. Todas exigem
> R-AUDIT-A11Y-MOVIMENTO + R-BRAND-2-ANIMACOES mergeadas antes de iniciar.
> R-BRAND-3b idealmente depois de R-AUDIT-RECAP-TECIDO.

> **Por que dividir (licao 10).** As 3 frentes cruzam tres areas
> arquiteturais distintas: (a) tratamento de erro/toast, (b) marcos temporais
> + Recap + store persistido, (c) plumbing de progresso em servicos de
> export/import/backup. Nenhuma compartilha os arquivos de wire-up da outra.
> Somadas passam de 15 arquivos tocados. O dono ja previu o split
> ("sub-dividir com IDs proprios R-BRAND-3a/3b/3c").

---

## 1. Objetivo

Trazer tres conceitos da marca — antes rotulados "site" — como ESTADOS VIVOS
que o glifo Ouroboros assume em resposta a eventos reais do app, sempre
consumindo `useReduceMotion()` e estendendo o `OuroborosLoading.tsx` criado
na R-BRAND-2 (sem re-portar o SVG):

1. **C3 — Rejeicao atenta -> estados de erro** (R-BRAND-3a). A cobra recolhe,
   cabeca/boca ficam vermelhas, "atencao sem susto". Superficies: save de
   humor/diario falhou, sync/backup do Vault falhou, OAuth Google negado,
   permissao negada. Casa com a Regra de Tom (sem alarme).
2. **F2 — Ritual de fim de mes -> Recap mensal / marcos temporais**
   (R-BRAND-3b). Mes antigo "fecha" (desatura), novo abre, badge silencioso.
   Superficie: primeiro acesso ao Recap/Home apos a virada de mes. Guardrail:
   zero comparacao negativa.
3. **D1-mecanismo -> progresso segmentado** (R-BRAND-3c). A cobra segmentada
   por N itens de progresso REAL: import/export de N arquivos do Vault,
   backup off-device. Cada item preenche ~43/N contas. Superficie: operacoes
   longas com contagem de itens conhecida.

**Fora de escopo (permanece descartado da marca):** G1 (diagrama ETL do
projeto-irmao) e qualquer codigo de integracao Streamlit
(`st.components.html`/`st.fragment`) das telas 01-05. Porta-se o tratamento
visual pro RN, nunca o codigo de site.

---

## 2. Estado atual (arquivo:linha, confirmado por grep/read)

> Nota de leitura: o output de `grep` via shell nesta base mostra alguns
> tokens embaralhados (artefato de exibicao); os numeros de linha e os paths
> sao confiaveis, e o conteudo abaixo foi confirmado com leitura direta dos
> arquivos.

### 2.1 Infra compartilhada (pre-requisitos)

- **Hook reduce-motion:** `src/lib/hooks/useReduceMotion.ts` **ainda nao
  existe** (`rg "useReduceMotion"` em src/ e app/ = 0 ocorrencias). E'
  entregue por R-AUDIT-A11Y-MOVIMENTO (spec §3.1, §4). Toda peca nova consome
  esse hook.
- **Glifo animado base:** `src/components/brand/OuroborosLoader.tsx` (versao
  atual, 4 aneis girando, Reanimated 4 + rAF web). A R-BRAND-2 cria
  `src/components/brand/OuroborosLoading.tsx` (variantes `sync`/`inline`) e o
  barrel `src/components/brand/index.ts`. Esta sprint ESTENDE `OuroborosLoading`
  com novos estados; nao duplica o porte do SVG.
- **Factory de referencia (read-only, fora do repo):**
  `~/Desktop/assets-ouroboros-loading-logo/ouroboros-lib.js` expoe
  `cabeca` (#head-coroa), `cauda` (#head-focinho), `olho` (#eye),
  `boca` (#lingua), `snake` (43 contas `#conta-01..#conta-43`), `ring`
  (#bolinhas-internas) e o helper `orderFromHead(beads, 'ccw')` que ordena as
  contas do pescoco (index 0) ate a boca (index 42). E' o mapa para saber
  QUAIS elementos pintar de vermelho (C3) e QUAIS contas acender (D1).
- **Haptics:** `src/lib/haptics.ts` — `haptics.error()`
  (`NotificationFeedbackType.Error`, :59-60) e `haptics.success()` (:57-58).
- **Paleta:** `colors.red` = `#ff5555` (VALIDATOR_BRIEF §1.3;
  `src/theme/tokens.ts`). Cabeca canonica rosa `#fc7ac8`, cauda roxa `#c092f7`
  (spec-mae §2.5).

### 2.2 Superficies de ERRO (para C3 / R-BRAND-3a)

- **Toast global (superficie central de copy de erro):**
  `src/components/ui/Toast.tsx`.
  - `:24` `type ToastType = 'success' | 'error' | 'info' | 'warn'`.
  - `:41-53` `borderColorFor(type)` — `'error'` -> `colors.red`.
  - `:113-144` render: `Animated.View` com `borderLeftColor:
    borderColorFor(toast.type)` e `accessibilityLabel="toast ${type}"`.
  - `:150-156` `useToast()` (API `show(message, type)`).
  E' o unico ponto por onde passam praticamente TODOS os erros de save/sync/
  permissao. Melhor lugar para acoplar um glifo C3 compacto ao toast `'error'`.
- **Save de humor falha:** `app/humor-rapido.tsx`
  - `:158` `toast.show('Algo ficou inconsistente. Tente de novo.', 'error')`.
  - `:174-176` `catch (e) { ... toast.show(\`Nao foi possivel salvar: ${msg}\`,
    'error') }`.
- **Save de diario falha:** `app/diario-emocional.tsx`
  - `:411` `toast.show('Algo ficou inconsistente. Tente de novo.', 'error')`.
  - `:445-447` `catch (e) { ... toast.show(\`Nao foi possivel salvar: ${msg}\`,
    'error') }`.
- **OAuth Google (fluxo com glifo ja na tela):** `app/oauthredirect.tsx:86`
  ja renderiza `<OuroborosLoader />` durante o handshake. Superficie natural
  para o glifo assumir o estado C3 quando o retorno vem com `error`/negado
  (hoje sempre redireciona; a sub-sprint trata o ramo de falha).
- **Fluxo de conectar Google / backup no Drive:**
  `src/components/screens/IntegracoesScreen.tsx`
  - `:372-396` handler de backup (`fazerBackupDrive`), `setDriveUploadando`.
  - `:601`/`:605` botao `'Enviando…'` / `ocupado`.
- **Sync/heuristica de Vault:** `src/lib/services/syncStatus.ts` (status via
  mtime, catch em `:70` e `:97`). Syncthing faz o sync real em background; a
  falha "de primeiro plano" que o usuario ve e' no backup/restore/export
  (§2.4), nao no syncStatus. Registrar como superficie secundaria.
- **Permissao negada:** `src/lib/vault/permissions.ts`,
  `src/lib/diario/permissions.ts` (retornos de permissao SAF/media).

### 2.3 Superficie do RITUAL MENSAL (para F2 / R-BRAND-3b)

- **Recap por periodo 'mes':** `src/lib/hooks/useRecap.ts`
  - `:47` `type PeriodoChave = 'dia' | 'semana' | 'mes' | 'ano' |
    'personalizado'`.
  - `:61` comentario "mes: ultimos 30 dias completos"; `:96`
    `const dias = chave === 'semana' ? 7 : chave === 'mes' ? 30 : 365;`.
- **Tela do Recap (chip "Mes"):** `src/components/screens/RecapScreen.tsx`
  - `:17-19` inicializacao respeita query param `?periodo=dia|semana|mes|ano`.
  - `:65` array `PERIODOS` (Dia / Semana / Mes / Ano / Personalizado).
  - `:25` `useLocalSearchParams` (le o periodo vindo da Tela Hoje).
- **Entrada pela Tela Hoje:** `app/index.tsx`
  - `:161-163` o acesso ao Recap saiu do botao standalone; o card semanal
    navega para `/recap?periodo=semana`.
  - `:299-316` helper de data local (`meses[...]`) — precedente de formatacao
    de mes em PT-BR na Home.
- **Deteccao de virada de mes: NAO EXISTE.** `rg -niE "virada|fim de mes|
  primeiro acesso|marco temporal|ultimoMesVisto|mesAtual|monthKey|getMonth"`
  em src/ e app/ = **0 ocorrencias**. F2 introduz a infra de deteccao (campo
  persistido "ultimo mes visto" + comparacao no mount).
- **Store persistido (onde guardar o "ultimo mes visto"):**
  `src/lib/stores/settings.ts` — usa `zustand/middleware` `persist` +
  `secureStorage` (:20-21); precedentes de campos persistidos nao-toggle:
  `:131-148` (timestamps `ultimaConexao`, `null = nunca enviou`,
  gatilho de notificacao). Mesmo padrao para `ultimoMesVistoRecap`.
  Espelho no Vault: `src/lib/schemas/vault_estado.ts`
  (`EstadoSettingsSchema`, campo novo como `.optional()` — padrao de
  tolerancia a mirrors antigos, citado na A11Y-MOVIMENTO §3.2).

### 2.4 Superficies de PROGRESSO segmentado (para D1 / R-BRAND-3c)

- **Export do Vault (conta N arquivos ao caminhar):**
  `src/lib/services/exportarVault.ts`
  - `:264` `let totalArquivos = 0;`
  - `:269-299` `for (const pasta of VAULT_FOLDERS) { const arquivos =
    await listarRecursivo(...); for (const rel of arquivos) { ... totalArquivos
    += 1; } }` — loop com N conhecido; hoje SEM callback de progresso.
- **Import/restore do Vault (loop por entrada do manifest, N real):**
  `src/lib/services/restaurarVault.ts`
  - `:50-52` resultado com `raizDestino`, `totalEscritos`, `totalIgnorados`.
  - `:116-118` "cada entrada do manifest ... antes de escrever no destino" —
    loop por entry (N = numero de entradas do MANIFEST.json), hoje SEM
    callback de progresso. Melhor superficie de N determinado.
- **Backup off-device (Drive):**
  `src/lib/backup/executarBackup.ts` (`:46` `totalArquivos`, `:324/:335`
  propaga) e `src/lib/integracoes/google/driveBackup.ts` (`fazerBackupDrive`).
  **Importante (honesto):** hoje o backup exporta UM `.zip` e o upload ao
  Drive e' de UM blob — nao ha N itens sequenciais no upload. `totalArquivos`
  e' o numero de arquivos DENTRO do zip. Ver decisao em aberto em §3c.4.
- **UI que hoje so' mostra booleano de progresso:**
  `IntegracoesScreen.tsx:280` `driveUploadando` (boolean), botao `'Enviando…'`
  (`:601`). Nao ha barra nem contagem — D1 e' o primeiro progresso segmentado.

---

## 3. Design

---

### SUB-SPRINT R-BRAND-3a — C3 rejeicao atenta (estados de erro)

> JS puro (Reanimated + rn-svg). DEPENDE de A11Y-MOVIMENTO + R-BRAND-2.

#### 3a.1 Tratamento visual (readaptado de C3, cenario OCR/banco descartado)

Estado de erro do glifo, "atencao sem susto":
- **dim** a cobra por **400ms** (opacidade/saturacao caindo);
- **flash** cabeca+boca (`#head-coroa` + `#lingua`) em `colors.red` (#ff5555)
  **2x, 150ms cada** (recolhimento atento, nao piscar de alarme);
- **recover** de volta ao repouso em **800ms**.
- Sem shake, sem som, sem exclamacao (Regra de Tom).

**Reduce-motion (`useReduceMotion()==true`):** sem dim/flash animado — a
cabeca/boca aparecem na **cor de erro estatica** (estado final direto) e
voltam ao normal por fade curto ou corte. Fallback canonico = a "respiracao"
B1 da R-BRAND-2 (glifo em repouso) com o rosto tingido.

#### 3a.2 Implementacao

- **Estender `OuroborosLoading.tsx`** com um estado/prop de erro
  (`estado="erro"` OU `variant="erro"`, alinhar a API que a R-BRAND-2
  fixar). Reusa o mapa de elementos da factory (§2.1): pinta `cabeca` +
  `boca`, dim no `snake`. NAO criar novo porte de SVG.
- **Acoplar ao Toast `'error'`** (`Toast.tsx:113-144`): quando `type ===
  'error'`, renderizar um glifo C3 **compacto** (ring-only ~24-28dp) a
  esquerda do texto, ao lado da `borderLeftColor` vermelha ja existente.
  Isso cobre save de humor/diario, permissao e demais erros que passam pelo
  toast **sem tocar cada call-site** (Regra 3 — mudanca cirurgica). O glifo
  respeita reduce-motion.
- **OAuth negado** (`oauthredirect.tsx:86`): no ramo de falha do handshake,
  o `<OuroborosLoader />`/`OuroborosLoading` ja presente assume o estado C3
  por ~800ms antes de redirecionar (ou antes de mostrar o toast de falha).
- **Haptic (opcional, decisao em aberto):** `haptics.error()` existe, mas
  "atencao sem susto" pode dispensar haptic de erro (pode soar como alarme
  para o publico ansioso). Recomendacao: **NAO** disparar haptic por padrao;
  se o dono quiser, so' um toque `Light` pontual, nunca `Error`. Marcar como
  decisao de checkpoint Nivel C.

#### 3a.3 Nao-objetivos (3a)

- Nao redesenhar o Toast (so' adicionar o slot do glifo).
- Nao instrumentar TODA superficie de erro do app — cobrir as que passam
  pelo toast + o glifo do OAuth. Novas superficies entram por demanda.

---

### SUB-SPRINT R-BRAND-3b — F2 ritual de fim de mes (Recap / marcos temporais)

> JS puro. DEPENDE de A11Y-MOVIMENTO + R-BRAND-2. SOFT-depende de
> R-AUDIT-RECAP-TECIDO / Recap v2 (superficie do ritual).

#### 3b.1 Tratamento visual (readaptado de F2, dashboard descartado)

Na primeira abertura do Recap/Home apos a virada de mes:
- o mes que **fecha desatura** ao longo de **900ms** (transicao suave, o
  glifo/cabecalho do periodo perde saturacao — "o ciclo se fecha");
- o **novo mes abre** e um **badge silencioso** surge por **fade 400ms**
  (marco discreto, sem numero de "pontuacao", sem celebracao).
- **Guardrail (Regra de Tom + ethos R-RECAP):** zero comparacao negativa.
  Nada de "X% pior que o mes passado". Copy neutra tipo "Novo mes" / nome do
  mes. Sem streak, sem confete.

**Reduce-motion:** transicao de estado SEM a desaturacao animada — o novo mes
aparece direto (corte/fade curto), o badge sem movimento continuo.

#### 3b.2 Implementacao (inclui infra de deteccao, que nao existe hoje)

- **Campo persistido `ultimoMesVistoRecap: string | null`** (formato
  `"YYYY-MM"`, default `null`) em `src/lib/stores/settings.ts` (mesmo padrao
  dos timestamps persistidos, :131-148) + espelho `.optional()` em
  `src/lib/schemas/vault_estado.ts` (`EstadoSettingsSchema`). Reusar o
  mutator generico de settings (nao criar setter novo se `setFeatureToggle`
  nao servir; usar o mutator equivalente para campo escalar — confirmar no
  arquivo qual e').
- **Hook/util de deteccao** `src/lib/hooks/useViradaDeMes.ts` (novo): compara
  o `YYYY-MM` de agora (data local, reusando o helper de
  `app/index.tsx:299-316` / `src/lib/datetime/local`) com
  `ultimoMesVistoRecap`. Se maior -> `viradaPendente = true`; ao consumir,
  grava o mes atual. A28-safe (sem Moti no path critico).
- **Superficie:** `RecapScreen.tsx` (quando `periodo === 'mes'`) e/ou o card
  do Recap na Tela Hoje (`app/index.tsx:161-163`). Quando `viradaPendente`,
  tocar a transicao F2 uma unica vez.
- **Componente** `src/components/brand/OuroborosRitualMes.tsx` (novo, ou uma
  variante `estado="ritual-mes"` do OuroborosLoading) + badge silencioso.
  Consome `useReduceMotion()`.
- **Haptic:** no maximo `haptics.success()` MUITO pontual no badge (opcional,
  decisao de checkpoint). Default: sem haptic (marco silencioso).

#### 3b.3 Nao-objetivos (3b)

- Nao implementar F1 (ritual de meia-noite) — fica no backlog da spec-mae §3.6.
- Nao alterar a agregacao do `useRecap` — F2 e' camada de apresentacao +
  deteccao de virada, nao muda os numeros.
- Nao introduzir comparacao mes-a-mes (proibido pela Regra de Tom).

---

### SUB-SPRINT R-BRAND-3c — D1-mecanismo (progresso segmentado)

> JS puro. DEPENDE de A11Y-MOVIMENTO + R-BRAND-2.

#### 3c.1 Tratamento visual (readaptado de D1, "arquivo financeiro" descartado)

A cobra e' o medidor: as **43 contas** (`#conta-01..#conta-43`) acendem
progressivamente conforme os N itens da operacao concluem, na ordem
`orderFromHead(beads, 'ccw')` (pescoco -> boca). Cada item preenche
`~43/N` contas. Sem rotulo de arquivo, sem percentual financeiro.

**Reduce-motion:** em vez de contas acendendo progressivamente, mostrar
**barra/numero estatico** ("k de N") que atualiza sem animacao de acender —
nenhuma cascata continua.

#### 3c.2 Aritmetica das contas (meta numerica)

- Total de contas no SVG canonico: **43** (`#conta-01..#conta-43`,
  confirmado no `ouroboros-lib.js` comentario `#conta-01 .. #conta-43`).
- Contas acesas apos `k` de `N` itens: `round(43 * k / N)`.
- **Casos de borda a tratar no componente:**
  - `N > 43`: mais itens que contas -> agrupar (cada conta = varios itens);
    a conta `i` acende quando `k >= ceil(i * N / 43)`. Evita "pular" contas.
  - `N == 0` ou `N` desconhecido: cair no modo indeterminado **C2** (onda
    continua da R-BRAND-2), NAO no segmentado. D1 exige N conhecido.
  - `N == 1`: acender tudo de uma vez ao concluir (equivale a C1 fechamento).
- Fallback reduce-motion: numero `k/N` estatico (sem contas), a aritmetica e'
  a mesma; muda so' a apresentacao.

#### 3c.3 Implementacao

- **Estender `OuroborosLoading.tsx`** com `variant="progresso"` recebendo
  `{ atual: number, total: number }`; deriva as contas acesas pela aritmetica
  §3c.2; consome `useReduceMotion()`.
- **Plumbing de progresso nos servicos (hoje inexistente):** adicionar
  callback opcional `onProgress?: (atual: number, total: number) => void`:
  - `src/lib/services/restaurarVault.ts` — emitir no loop por entrada do
    manifest (`:116-118`), N = numero de entradas. **Superficie primaria**
    (N determinado e sequencial).
  - `src/lib/services/exportarVault.ts` — emitir no loop de arquivos
    (`:269-299`), N = `totalArquivos`. Superficie secundaria.
  - Assinatura aditiva e opcional (callers existentes nao quebram).
- **Wire-up de UI:** a tela que dispara import/export mostra o
  `OuroborosLoading variant="progresso"` ligado ao `onProgress`. Confirmar a
  tela real (settings/backup ou fluxo de restore) no passo de implementacao.

#### 3c.4 Decisao em aberto (Drive backup) — nao bloqueia

O backup ao Drive hoje sobe UM `.zip` (um blob), nao N itens sequenciais
(`driveBackup.ts` / `executarBackup.ts`, §2.4). Opcoes para o card Drive do
`IntegracoesScreen.tsx`:
- (a) **Recomendado:** aplicar D1 a import/export local (N de arquivos real,
  sequencial) e deixar o upload ao Drive como indeterminado **C2** (o glifo
  onda) — honesto com o que o servico faz hoje.
- (b) Trocar o upload por progresso de BYTES enviados (isso e' mais D3 "logo
  com percentual" que D1 "contas por item"). So' se o cliente HTTP expuser
  progresso de upload; se nao expuser, fica em (a).
Recomendacao: seguir (a) nesta sprint; (b) e' backlog.

#### 3c.5 Nao-objetivos (3c)

- Nao adicionar barra de progresso generica fora do glifo.
- Nao reescrever os servicos de backup/export/import — so' adicionar o
  callback opcional e ler o N que ja existe.
- Nao inventar N onde ele nao existe (Drive upload de blob unico = C2).

---

## 4. Entregaveis (por sub-sprint)

### R-BRAND-3a (C3 erro)
- Modificar `src/components/brand/OuroborosLoading.tsx` — estado de erro.
- Modificar `src/components/ui/Toast.tsx` — slot do glifo C3 compacto no
  toast `'error'` (consome reduce-motion).
- Modificar `app/oauthredirect.tsx` — ramo de falha com estado C3.
- Barrel `src/components/brand/index.ts` — export se houver componente novo.
- Testes Jest — render com `useReduceMotion()=true` nao arma loop de flash;
  toast `'error'` expoe o glifo; toast `'success'`/`'info'` nao.
- E2E `tests/e2e/playwright/rbrand3a-erro.e2e.ts` (copiar de
  `tests/e2e/playwright/e2e-template.ts`).
- Screenshots `docs/sprints/R-BRAND-3a-screenshots-gauntlet/`.

### R-BRAND-3b (F2 ritual mensal)
- Modificar `src/lib/stores/settings.ts` — campo `ultimoMesVistoRecap`.
- Modificar `src/lib/schemas/vault_estado.ts` — mesmo campo `.optional()`.
- Novo `src/lib/hooks/useViradaDeMes.ts` — deteccao de virada.
- Novo `src/components/brand/OuroborosRitualMes.tsx` (ou variante) + badge.
- Modificar `src/components/screens/RecapScreen.tsx` (e/ou `app/index.tsx`)
  — disparar o ritual quando `periodo==='mes'` e virada pendente.
- Testes Jest — deteccao de virada (mes maior -> pendente; igual -> nada;
  grava mes ao consumir); render estatico com reduce-motion.
- E2E `tests/e2e/playwright/rbrand3b-ritual-mes.e2e.ts`.
- Screenshots `docs/sprints/R-BRAND-3b-screenshots-gauntlet/`.

### R-BRAND-3c (D1 progresso)
- Modificar `src/components/brand/OuroborosLoading.tsx` — `variant="progresso"`.
- Modificar `src/lib/services/restaurarVault.ts` — `onProgress` opcional.
- Modificar `src/lib/services/exportarVault.ts` — `onProgress` opcional.
- Wire-up na tela de import/export/backup (confirmar path na implementacao).
- Barrel se necessario.
- Testes Jest — aritmetica das contas (k/N -> contas acesas, casos de borda
  N>43, N==0->C2, N==1); render estatico com reduce-motion.
- E2E `tests/e2e/playwright/rbrand3c-progresso.e2e.ts`.
- Screenshots `docs/sprints/R-BRAND-3c-screenshots-gauntlet/`.

---

## 5. Proof-of-work esperado (runtime-real)

Comandos-base (VALIDATOR_BRIEF; `package.json` scripts):
```
npx --no-install tsc --noEmit      # typecheck limpo
npm test                           # jest verde (baseline atual, 0 falhas novas)
./scripts/smoke.sh                 # anonimato + strings UI PT-BR + tsc + jest
```
- `FAIL_BEFORE = 0`, esperado `FAIL_AFTER = 0` (sprints aditivas; nao quebrar
  suites de Toast/OuroborosLoader/settings/exportarVault/restaurarVault).

### Gauntlet (Nivel A+, playwright MCP) — obrigatorio (toca UI)
```
EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web    # ou ./gauntlet.sh
# playwright MCP em http://localhost:8081/_dev/gauntlet
```
- **3a:** navegar a uma rota de save (ex.: humor-rapido), forcar erro/toast
  `'error'`, assertar que o glifo C3 aparece e a cabeca/boca ficam vermelhas;
  com `page.emulateMedia({ reducedMotion: 'reduce' })` assertar cor estatica
  SEM flash (transform/estilo estavel entre 2 frames).
- **3b:** `__gauntlet.reset()` + `seed()`, setar `ultimoMesVistoRecap` para um
  mes anterior via estado seedado, abrir `/recap?periodo=mes`, assertar que o
  ritual toca UMA vez e o badge surge; com `reducedMotion:'reduce'` assertar
  transicao sem desaturacao animada.
- **3c:** disparar import/export com N conhecido, assertar que as contas
  acendem monotonicamente ate 43 (nunca regridem); com `reducedMotion:'reduce'`
  assertar numero `k/N` estatico sem contas animadas.
- **Mecanismo canonico de reduce-motion no E2E:** `page.emulateMedia({
  reducedMotion: 'reduce' })` (igual A11Y-MOVIMENTO §5.1 / §6). **NAO** usar um
  setter `__gauntlet.reduzirMovimento` (nao existe entre as 23 APIs do
  `__gauntlet`).
- Template canonico: `tests/e2e/playwright/e2e-template.ts` (NAO
  `docs/templates`, que nao existe mais). Retornar `ResultadoE2E`
  (`sprint`/`aspecto`/`status`/`detalhe`/`screenshots`).
- Validacao navegada e clicada como app real antes de declarar `[ok]`.

### Nivel C (device) — so' se houver haptic
- Se 3a adotar `haptics.error()`/Light ou 3b adotar `haptics.success()`:
  checkpoint no device (dev-client + Metro USB; mudanca so' JS, sem rebuild).
  Backup do Vault antes (`./scripts/adb-vault-pull.sh`). Se NENHUM haptic for
  adotado (recomendacao), o Nivel C e' dispensavel e a validacao fica no
  Gauntlet.

### Higiene antes de retornar
- `rg` dos identificadores citados nesta spec (confirmar que existem antes de
  editar — licao 4). Ja confirmados: `OuroborosLoading`(criado por R-BRAND-2),
  `useReduceMotion`(criado por A11Y-MOVIMENTO), `ToastType`/`borderColorFor`,
  `PeriodoChave='mes'`, `totalArquivos`, `onProgress`(a criar), `haptics.error`.
- Varredura de acentuacao nos arquivos modificados (strings de UI):
  `python3 scripts/check_strings_ui_ptbr.py` (roda dentro do smoke).

---

## 6. Reduce-motion (obrigatorio, todas as sub-sprints)

- **DEPENDE de R-AUDIT-A11Y-MOVIMENTO.** Todo componente novo computa
  `const reduzir = useReduceMotion();` no topo e aplica o estilo ESTATICO
  quando `reduzir` — **sem condicionar a CHAMADA dos hooks de Reanimated**
  (regra dos hooks; A11Y-MOVIMENTO §3.4). `withRepeat`/rAF viram no-op.
- Fallbacks canonicos: **3a** cor de erro estatica (sem flash); **3b**
  transicao de estado sem desaturacao animada; **3c** barra/numero estatico
  em vez de contas acendendo. Todos alinhados ao principio 01 da marca
  (a cobra parada "respirando" ja e' presenca) — critico para o publico
  autista/ansioso.
- Nao duplicar o early-return que o `OuroborosLoader`/`OuroborosLoading` ja
  recebe nas sprints anteriores; estender consistente.

---

## 7. Anonimato (Regra -1)

- Zero mencao a IA ou nomes proibidos em `src/`, `app/`, `tests/`
  (`./scripts/check_anonimato.sh` exit 0; roda no smoke). Este `docs/sprints/`
  e' local-only/untracked, mas a spec ja segue a regra.
- Assets-fonte auditados na spec-mae §7 (0 ocorrencias de andre/vitoria/
  claude/anthropic/gpt/openai etc.). Nada a remover.
- Copy de UI: nomes reais nunca; `pessoa_a`/`pessoa_b` em codigo.

---

## 8. Checklist de docs

- `docs/FEATURES-CANONICAS.md` — registrar os estados vivos da marca (erro C3,
  ritual mensal F2, progresso segmentado D1) como features de UI, no mesmo
  commit. Validador-sprint recusa sprint que toca UI/feature sem este update.
- `CHANGELOG.md` — entrada por sub-sprint no merge.
- `STATE.md` / `ROADMAP.md` — status das 3 sub-sprints.
- `docs/sprints/ORDEM-EXECUCAO-V1.md` — inserir R-BRAND-3a/3b/3c na **Fase 2**,
  **apos R-AUDIT-A11Y-MOVIMENTO e R-BRAND-2-ANIMACOES**; R-BRAND-3b
  idealmente **apos R-AUDIT-RECAP-TECIDO**. Registrar as dependencias.
- `docs/sprints/R-BRAND-ASSETS-APP-spec.md` §3.6 — marcar C3/F2/D1-mecanismo
  como materializados nesta sprint (hoje diz "sprint propria
  R-BRAND-3-ESTADOS-VIVOS").
- `docs/sprints/R-AUDIT-BACKLOG.md` — se listar os conceitos adiados, marcar.
- `VALIDATOR_BRIEF.md` — so' se surgir invariante novo (ex.: "todo estado de
  marca consome useReduceMotion"); caso contrario, nao tocar.
- Screenshots nas pastas `docs/sprints/R-BRAND-3{a,b,c}-screenshots-gauntlet/`.

---

## 9. Riscos e nao-objetivos

- **Dependencia dura nao satisfeita.** Nenhuma sub-sprint INICIA sem
  `src/lib/hooks/useReduceMotion.ts` e `src/components/brand/OuroborosLoading.tsx`
  de fato MERGEADOS na branch de trabalho (nao so' em ancestral). Confirmar
  por `rg` antes de editar (licao 4/7).
- **Zero dep nativa nova.** So' Reanimated + react-native-svg (stack atual).
  Se algum estado exigir lottie-react-native ou @shopify/react-native-skia,
  isso e' dep NATIVA -> FLAGAR interacao com a Fase 3 (bump de infra + gate)
  e NAO adicionar. Objetivo: tudo JS puro.
- **Regra de Tom.** 3a "atencao sem susto" (sem shake/som/exclamacao;
  haptic de erro desaconselhado). 3b zero comparacao negativa, zero streak.
  3c sem gamificacao ("k de N" neutro).
- **F2 sem infra de virada.** A deteccao de mes NAO existe hoje; e' trabalho
  real de store + schema + hook. Nao subestimar (por isso 3b e' a maior).
- **Drive backup nao e' N sequencial** (§3c.4): nao forcar D1 onde so' ha um
  blob; usar C2. Anti-debito: se surgir necessidade de progresso de upload,
  abrir sprint nova (D3 bytes), nao inflar aqui.
- **Sobreposicao com o E2E da A11Y-MOVIMENTO.** Aquele cobre KenBurns/loader;
  estes cobrem os ESTADOS DE MARCA (erro/ritual/progresso). Nao duplicar.
- **Escopo.** Se durante a execucao aparecer achado colateral (ex.: um erro
  que nao passa pelo toast e precisa de C3 proprio), registrar como sprint
  nova (protocolo anti-debito), nao expandir esta.

---

## 10. Aritmetica e estimativa (honesta)

- **D1 (3c):** 43 contas totais. Contas acesas = `round(43*k/N)`; para `N>43`
  a conta `i` acende quando `k >= ceil(i*N/43)`; `N==0`/desconhecido -> C2;
  `N==1` -> tudo ao concluir. Cobrir os 4 casos em teste unitario da funcao
  pura de mapeamento (testar sem render).
- **Sizing / arquivos tocados (justifica o split):**
  - 3a: ~4 arquivos (OuroborosLoading, Toast, oauthredirect, index barrel) +
    testes + E2E. ~1 dia.
  - 3b: ~5 arquivos (settings, vault_estado, useViradaDeMes novo,
    OuroborosRitualMes novo, RecapScreen/index) + testes + E2E. ~1-1.5 dia
    (infra de virada nova).
  - 3c: ~4-5 arquivos (OuroborosLoading, restaurarVault, exportarVault, tela
    de wire-up) + testes + E2E. ~1-1.5 dia (plumbing de onProgress novo).
  - Somadas: 13-15 arquivos, 3 areas arquiteturais distintas -> acima do
    limite de sprint unica (N~5-8). Split confirmado.
- **Baseline de testes:** FAIL_BEFORE = 0; FAIL_AFTER esperado = 0 por
  sub-sprint (aditivas).

---

## 11. Referencias

- BRIEF: `VALIDATOR_BRIEF.md` (§1.3 paleta/red; §1.9 Gauntlet A+; A28 Moti no
  boot path; A46 NPE view-shot + Reanimated).
- Spec-mae: `docs/sprints/R-BRAND-ASSETS-APP-spec.md` (§3.5 tabela reavaliada,
  §3.6 remissao para esta sprint, §7 anonimato dos assets).
- Dependencia dura 1: `docs/sprints/R-AUDIT-A11Y-MOVIMENTO-spec.md`
  (hook `useReduceMotion`, §3.1/§4; mecanismo E2E reduce-motion §5.1/§6).
- Dependencia dura 2: R-BRAND-2-ANIMACOES (secao "SUB-SPRINT
  R-BRAND-2-ANIMACOES" da spec-mae; cria `OuroborosLoading.tsx`).
- Dependencia soft (3b): `docs/sprints/R-AUDIT-RECAP-TECIDO-spec.md`
  (superficie do Recap; VISAO R-RECAP-WRAPPED-V2).
- Fonte visual (read-only): `~/Desktop/assets-ouroboros-loading-logo/`
  (`Conceitos Ouroboros.html`, `ouroboros-lib.js`, `ouroboros.svg`).
- Template E2E: `tests/e2e/playwright/e2e-template.ts`.
- Haptics: `src/lib/haptics.ts`.
```
