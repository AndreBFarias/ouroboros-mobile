# Sprint R-BRAND-6-LONGA-DURACAO — D3 Percentual, D2 Fluxo do Vault, D1 Contas por Arquivo

```
ONDA:       R-BRAND-SYSTEM (docs/sprints/_ONDA-R-BRAND-SYSTEM.md), sprint 3 de 8
DEPENDE:    R-BRAND-3-GLIFO mergeada (PRE-REQUISITO BLOQUEANTE — ainda NÃO mergeada;
            entrega src/components/brand/glifo/{geometria.ts, ordenarDaCabeca.ts,
            OuroborosGlifo.tsx} + driver por shared values + benchmark >=45fps).
            Encadeamento da onda: R-BRAND-4-ABERTURAS e R-BRAND-5-FEEDBACK vem antes.
BLOQUEIA:   R-BRAND-9-MIGRACAO (aposenta a geracao antiga de loaders).
ESTIMATIVA: 5-7h (3 conceitos finos + plumbing de progresso em 2 servicos + 3 mounts).
```

> REGRA DURA DA SPRINT (design doc §5, linha 3): **progresso REAL, nunca
> simulado.** As demos do `conceitos-ouroboros.html` simulam com um ciclo de
> 7.5-8s (`(now - start) % CYCLE`); no app o driver recebe `progresso` 0→1
> **real** vindo do fluxo em andamento e nomes **reais** dos arquivos
> processados. Toda a matemática de wrap/HOLD/reinício das demos é
> **descartada** — os conceitos rodam uma vez, 0→1, e seguram em 100%.

---

## 1. Objetivo

Entregar os três conceitos de longa duração da marca como componentes finos
que dirigem a anatomia do glifo (43 contas + rosto) entregue pela
R-BRAND-3-GLIFO, e ligá-los a fluxos que expõem **progresso e nomes reais**:

- **D3 — logo com percentual:** processamento longo com `%` central real
  (prop `progresso` 0..1). Home: restauração/import de Vault (loop determinístico).
- **D1 — contas por arquivo:** import em lote com rodapé `arquivo n/N · <nome>`.
  Home: o mesmo fluxo de import de Vault (restauração de backup .zip).
- **D2 — fluxo do vault:** cobra girando com sparks de nomes **reais** dos `.md`.
  Home: indicador de sincronização (Obsidian/Syncthing), alimentado pela
  listagem real do Vault em disco.

O usuário, ao restaurar um backup ou ao sincronizar, vê a marca viva
apresentando o trabalho de verdade que está acontecendo — não uma animação
decorativa em loop.

## 2. Contexto e investigação (fluxos com progresso real)

Levantamento por `grep` dos fluxos candidatos (design doc §4 pergunta
explicitamente: import de vault? recap? backup?). Evidência confirmada:

| Fluxo | Arquivo | Tem total conhecido? | Tem nome de arquivo real? | Serve |
|-------|---------|----------------------|---------------------------|-------|
| **Restauração / import de Vault** | `src/lib/services/restaurarVault.ts` — `restaurarVaultZip()`, loop `for (const entry of manifest.arquivos)` (linha 193) | **Sim** — `manifest.arquivos.length` conhecido antes do loop | **Sim** — `entry.path` por iteração | **D1 + D3 + D2** |
| **Backup / export de Vault** | `src/lib/services/exportarVault.ts` — `exportarVaultZip()`, loop sobre `VAULT_FOLDERS` + arquivos (linhas 269-303), `totalArquivos` incremental | **Sim** — após listar recursivo por pasta | **Sim** — `rel` por iteração | **D3** (plumbing) |
| **Backup automático** | `src/lib/backup/executarBackup.ts` — chama `exportarVaultZip()`, `BackupResultado.totalArquivos` | herda do export | herda do export | **D3** (plumbing) |
| **Recap** | `src/lib/hooks/useRecap.ts` + `RecapScreen` | **Não** — agregação opaca, hoje usa `<OuroborosLoader compacto/>` indeterminado | não itera arquivos nomeados | **descartado para D3** |
| **Sync status** | `src/lib/services/syncStatus.ts` — `verificarSyncStatus()`, heurística de `mtime` | **Não** — Syncthing é processo **externo**, sem stream por-arquivo | listagem via `listVaultFolder` (não é evento) | **D2** (ambiente) |

Conclusões travadas por esta investigação:

1. **D3 (percentual real):** o único fluxo com total conhecido *antes* de
   começar e progresso monotônico é o **loop de restauração** (`restaurarVaultZip`),
   secundado pelo **loop de export** (`exportarVaultZip`). O Recap **não** tem
   percentual real (agregação indeterminada) — não recebe D3.
2. **D1 (import em lote):** **existe** fluxo de import em lote real — a
   restauração de um backup `.zip` (`restaurarVaultZip`) itera `manifest.arquivos`
   com `entry.path` e total conhecido. D1 **não é descopado**; sua casa é o
   fluxo de import de Vault. (Design doc §4 exigia decisão explícita aqui.)
3. **D2 (nomes reais):** o app **não controla o Syncthing** (processo externo);
   `syncStatus.ts` é heurística passiva de `mtime`, sem evento por-arquivo.
   Portanto D2 **não** é um monitor ao vivo do Syncthing (isso seria simular).
   Os nomes reais dos `.md` vêm de duas fontes honestas: (a) o loop de import
   em andamento (nome real por arquivo processado) e (b) a listagem real do
   Vault em disco via `listVaultFolder()` para o estado ambiente de sincronização.
   Um monitor por-arquivo verdadeiro exigiria a REST API do Syncthing — fora de
   escopo, registrado como não-objetivo (§10), não como follow-up vago.

## 3. Escopo (touches autorizados)

### Arquivos a criar

- `src/components/brand/conceitos/D3LogoComPercentual.tsx` — glifo com fill
  progressivo das 43 contas + percentual central `tabular-nums`. Prop
  `progresso: number` (0..1). Cabeça+olho lideram; cauda+boca só após a última conta.
- `src/components/brand/conceitos/D2FluxoVault.tsx` — glifo (cobra+rosto)
  girando lento + overlay de sparks com nomes **reais** de `.md`. Prop
  `nomes: string[]` (runtime local; nunca literal versionado com nome real).
- `src/components/brand/conceitos/D1ContasPorArquivo.tsx` — glifo com fill
  progressivo (igual D3) + rodapé de status `arquivo n/N · <nome>`. Props
  `progresso: number`, `indice: number`, `total: number`, `nome: string`.
- `tests/components/brand/D3LogoComPercentual.test.tsx` — render + reduce-motion
  (estático em 100%) + mapeamento progresso→percentual inteiro.
- `tests/components/brand/D2FluxoVault.test.tsx` — render + sparks a partir de
  `nomes` **sintéticos** + reduce-motion (só símbolo, sem sparks).
- `tests/components/brand/D1ContasPorArquivo.test.tsx` — render + rodapé
  `n/N · nome` com fixtures **sintéticas** + reduce-motion (estático completo).
- `tests/e2e/playwright/r-brand-6-longa-duracao.e2e.ts` — copiado do padrão de
  `tests/e2e/playwright/rbrand-loading.e2e.ts`; dirige os 3 conceitos via
  `window.__gauntlet` com progresso/nomes sintéticos e asserta estado.

### Arquivos a modificar

- `src/lib/services/restaurarVault.ts` — adicionar callback **opcional**
  `onProgress?: (feito: number, total: number, nome: string) => void` em
  `RestauracaoOpcoes`, disparado por iteração do loop `manifest.arquivos`
  (após cada write bem-sucedido). **Aditivo, sem mudança de comportamento** —
  a saída restaurada permanece byte-a-byte idêntica; o callback só observa.
- `src/lib/services/exportarVault.ts` — adicionar parâmetro **opcional**
  `onProgress?` a `exportarVaultZip()`; pré-contar total (somando o
  `listarRecursivo` de cada pasta) e disparar por arquivo. Aditivo.
- `src/lib/backup/executarBackup.ts` — encaminhar `onProgress` para
  `exportarVaultZip()` (thread do plumbing; nenhuma mudança de resultado).
- `src/components/screens/IntegracoesScreen.tsx` — no `restaurarBackup`
  (linha ~403), trocar o texto isolado "Restaurando…" por um overlay que monta
  **D3 (percentual central) + D1 (rodapé n/N · nome)**, alimentados pelo
  `onProgress` do `restaurarVaultZip`. Montar **D2** no bloco do indicador de
  sincronização (consumidor de `verificarSyncStatus`), alimentado por
  `listVaultFolder()` do Vault real.
- `src/components/brand/index.ts` — exportar os 3 conceitos + seus tipos de props.
- `docs/FEATURES-CANONICAS.md` — **no mesmo commit** (obrigatório): nova
  subseção §1.x "Marca — conceitos de longa duração (D1/D2/D3) — R-BRAND-6"
  descrevendo componente, home e comportamento; e atualizar a nota de §1.2
  (linhas 112-113) que anteriormente atribuía a variante de progresso à antiga
  "R-BRAND-3-ESTADOS-VIVOS" (renomeada nesta onda).

### Arquivos NÃO a tocar

- `src/components/brand/OuroborosLoader.tsx`, `OuroborosLoading.tsx`,
  `OuroborosFechamento.tsx`, `OuroborosLogo.tsx` — geração antiga; aposentada
  só na R-BRAND-9-MIGRACAO. Não mexer in-place (14 consumidores do Loader).
- `src/lib/services/syncStatus.ts` — heurística de sync permanece intacta; D2
  apenas consome `listVaultFolder`, não altera a classificação de cor.
- `docs/design/ouroboros/*` — referência somente-leitura.
- Qualquer arquivo fora da lista de "a modificar".

## 4. Fidelidade às coreografias (portar a matemática de `coreografias-extraidas.js`)

Fonte: `docs/design/ouroboros/coreografias-extraidas.js` — `mount_D1` (linha 670),
`mount_D2` (763), `mount_D3` (831). Portar **literalmente**, trocando o tempo
simulado (`t = (now-start)%CYCLE`) pelo `progresso` real.

### D3 e D1 — fill das contas (idêntico entre os dois)

```
ordered = orderFromHead(beads, 'ccw')   // do driver do glifo (R-BRAND-3-GLIFO)
N       = 43
t       = progresso                     // REAL 0..1 (não o ciclo da demo)
frente  = t * N
para cada conta i:
  o       = frente - i
  bo      = o >= 1 ? 1 : (o <= 0 ? 0.1 : 0.1 + o * 0.9)
  opacity = bo                          // sem o fator `fade` de wrap da demo

// rosto: cabeça + olho LIDERAM; cauda + boca só APÓS a última conta
headOp = min(1, 0.15 + t * 7)           // sobe nos primeiros ~12%
tailOp = t < 0.94 ? 0.15 : min(1, 0.15 + (t - 0.94) * 14.2)   // últimos ~6%
cabeca.opacity = headOp;  olho.opacity = headOp * 0.65
cauda.opacity  = tailOp;  boca.opacity = tailOp
```

- **D3** overlay central: `Math.round(t * 100)` seguido de `%`. Fonte mono do
  tema, peso **500** (a UI nunca usa 600+), `fontVariant: ['tabular-nums']`,
  cor `--fg` (#f8f8f2); o `%` menor em `--muted-decor` (#6272a4). Atualizar o
  texto **só quando o inteiro muda** (guarda `if (pct !== lastPct)`, espelhando
  o `lastIdx` da demo) — no máximo ~100 re-renders no fluxo inteiro.
- **D1** rodapé (nunca sobreposto ao glifo — layout em coluna, símbolo em cima,
  status embaixo, como no `mount_D1`): `> arquivo n/N · <nome>`. `>` em
  `--purple`, `n` em `--fg` peso 500, resto em `--muted` (#c9c9cc), mono 11px.

### D2 — sparks de nomes reais

```
cobra + rosto giram JUNTOS: 1 volta / 60s (linear, obSpin)
spark: nasce em 28% da altura do anel, morre em 72%, trajeto 5.4s
       (cubic-bezier .4,0,.55,1), opacity fade-in 900ms + fade-out,
       scale 1 -> 0.82; 1 spark a cada 1.4s; cor --cyan (#8be9fd),
       mono 10.5px, glow text-shadow cyan
nomes: array REAL de .md; cicla pela lista; NUNCA nome literal versionado
```

### Reduce-motion (obrigatório — `useReduceMotion` incondicional no topo)

- **D3:** percentual congela em `100`, rosto em opacidade 1, olho 0.65, contas cheias.
- **D1:** estado final estático (última conta acesa, rodapé no último `n/N`).
- **D2:** só o símbolo estático, **sem** giro e **sem** sparks.

Padrão de hooks igual ao `OuroborosLoading` atual: hook chamado incondicional
no topo; só o corpo dos effects é condicional (early-return sem armar loop).

## 5. Driver, web e nativo (armadilhas já mapeadas — copiar, não redescobrir)

- **Driver do glifo (R-BRAND-3-GLIFO):** os conceitos recebem shared values por
  elemento anatômico. D1/D3 mantêm **um único** `progresso` (shared value) e
  derivam as 43 opacidades por frame via o worklet único do glifo
  (`useFrameCallback` / `useDerivedValue`) — zero re-render React nas contas
  (design doc §3). O `progresso.value` faz `withTiming` suave até o alvo REAL a
  cada tick discreto do `onProgress` (interpolação até o alvo verdadeiro — não é
  fabricação de progresso; é o mesmo que qualquer barra de progresso faz entre
  amostras).
- **Web / Gauntlet (M25.2 + A27):** `rn-svg-web` não propaga `animatedProps` em
  `<G>`/`<Circle>` — reutilizar o fallback rAF + DOM `data-anim-id` +
  `setAttribute` já validado no `OuroborosLoader`/`OuroborosLoading` e herdado do
  `OuroborosGlifo`. UUID por instância (R-CRIT-4) e escopo por `ref`. Os overlays
  de texto de D1/D3 e os sparks de D2 são `View`/`Text` (Reanimated propaga
  transform em `View` no web normalmente) — não sofrem de M25.2.
- **Nativo / Fabric (A27):** nunca `transform` string em SVG — usar
  `rotation`/`x`/`y` ou arrays. Herdado do glifo.
- **A28:** boot path e overlays com Reanimated puro (`useSharedValue` +
  `useAnimatedStyle`), sem `MotiView` — estes conceitos não estão no boot path,
  mas seguem o padrão Reanimated puro por consistência.
- **A22:** se algum novo arquivo importar `react-native-reanimated` direto, os
  stubs no-op de `jest.setup.cjs` já cobrem (nada a adicionar se o import vier do
  glifo já testado).

## 6. Acceptance criteria

1. `D3LogoComPercentual` renderiza com `progresso` 0..1; o percentual central
   exibe `Math.round(progresso*100)` em `tabular-nums`, peso 500, e a cascata das
   contas segue `frente = progresso*N` (cabeça lidera, cauda só após a última conta).
2. `D1ContasPorArquivo` exibe rodapé `arquivo n/N · <nome>` (não sobreposto ao
   símbolo) e o fill das contas idêntico ao D3.
3. `D2FluxoVault` gira cobra+rosto a 1 volta/60s e emite sparks de nomes reais
   passados por prop, um a cada ~1.4s, nascendo em 28% e morrendo em 72% do anel.
4. `restaurarVaultZip` aceita `onProgress` opcional e o dispara por arquivo
   restaurado com `(feito, total, entry.path)` reais; **a saída restaurada
   permanece idêntica** (byte-a-byte) com e sem o callback.
5. `exportarVaultZip`/`executarBackup` aceitam `onProgress` opcional (plumbing),
   com total pré-contado; sem mudança no `.zip` gerado nem no `BackupResultado`.
6. Em `IntegracoesScreen`, restaurar um backup mostra **D3 (%) + D1 (n/N·nome)**
   dirigidos por progresso REAL; o indicador de sincronização mostra **D2** com
   nomes reais lidos do Vault via `listVaultFolder`.
7. Reduce-motion (sistema OU toggle): D3→100% estático, D1→estado final estático,
   D2→só símbolo. Validado nas duas vias (Jest + Gauntlet).
8. Regra de Dados de Teste: nenhum `.md` com nome real em fixture/versionado;
   todos os nomes de teste são sintéticos (`humor-teste.md`, `nota-a.md`, etc.).
9. `docs/FEATURES-CANONICAS.md` atualizado no mesmo commit.

## 7. Invariantes a preservar

- **Regra −1 (Anonimato):** zero referência a IA, zero nome real hardcoded.
  Os nomes reais de `.md` de D2 são **runtime local** (lidos do disco), nunca
  literais no código nem fixtures versionadas (BRIEF §1.1; design doc §6).
- **Regra de Dados de Teste:** fixtures de D1/D2/D3 SEMPRE sintéticas.
- **Paleta Dracula (BRIEF §1.3):** `--fg`, `--muted`, `--muted-decor`, `--purple`,
  `--pink`, `--cyan` via `@/theme/tokens` (`colors`); zero hex literal fora de tokens.
- **Tipografia (BRIEF §1.4):** JetBrains Mono, pesos 400/500 (nunca 600+),
  `tabular-nums` no percentual; strings UI em Sentence case com acentuação PT-BR;
  `accessibilityLabel` sem acento; comentários `.ts`/`.tsx` sem acento.
- **Motion (ADR-010):** física, não durations lineares gratuitas; o `progresso`
  aproxima o alvo real via `withTiming` curto (interpolação até amostra real).
- **Tom (BRIEF §1.8):** zero emoji, zero exclamação, zero gamificação; percentual
  e n/N são informação sóbria, não celebração.
- **Preservação de saída (byte-parity):** o `onProgress` é observador puro; o
  artefato restaurado/exportado não muda (mesma postura do refactor de I/O
  invisível já praticado no repo).
- **43 contas/frame:** reutilizar o worklet único do glifo (design doc §3); não
  criar 43 `useAnimatedStyle` independentes.

## 8. Plano de implementação

1. Ler o driver entregue por R-BRAND-3-GLIFO (`src/components/brand/glifo/`) e
   confirmar a API de shared values por conta + rosto e o helper de ordenação
   (`ordenarDaCabeca`). Se a R-BRAND-3-GLIFO ainda não estiver mergeada, **parar**
   e reportar (pré-requisito bloqueante).
2. Criar `D3LogoComPercentual.tsx`: `progresso` shared value + overlay `%`
   (guarda de inteiro). Reduce-motion no topo.
3. Criar `D1ContasPorArquivo.tsx`: reusar o fill de D3 (extrair helper de fill
   se o driver do glifo não expuser um) + rodapé `n/N · nome` em coluna.
4. Criar `D2FluxoVault.tsx`: giro 60s + spawner de sparks a partir de `nomes`.
5. Adicionar `onProgress` opcional em `restaurarVault.ts` (por iteração do loop).
6. Adicionar `onProgress` opcional + pré-contagem de total em `exportarVault.ts`;
   encaminhar em `executarBackup.ts`.
7. Montar D3+D1 no `restaurarBackup` de `IntegracoesScreen.tsx`; montar D2 no
   indicador de sincronização (alimentado por `listVaultFolder`).
8. Exportar os conceitos em `src/components/brand/index.ts`.
9. Escrever os 3 testes de componente + o E2E playwright.
10. Atualizar `docs/FEATURES-CANONICAS.md` (subseção nova + nota §1.2).
11. Rodar verificação runtime-real (§Proof-of-work) e capturar PNGs no Gauntlet.

## 9. Aritmética / metas numéricas

Não há meta de contagem de linhas — a onda define conceitos como **arquivos finos**
(§3); estimativa ~90-140L por conceito, só orquestrando o driver. Metas numéricas
verificáveis relevantes:

- **Perf (gate herdado da R-BRAND-3-GLIFO):** D1/D3 animam **43 contas/frame** via
  um worklet único → devem sustentar **≥45fps** no device (mesmo gate provado na
  sprint 0). Abaixo disso, não fechar; escalar ao dono (pivô Skia já documentado).
- **Re-render do percentual:** ≤ **100** atualizações de estado no fluxo inteiro
  (guarda de inteiro), não 1 por frame.
- **Total real:** D3 usa `manifest.arquivos.length` (restore) ou o somatório
  pré-contado de `listarRecursivo` (export) — nunca um total chutado.
- **Sparks D2:** 1 a cada 1.4s, trajeto 5.4s → no máximo ~4 sparks vivos
  simultâneos (mesma cadência da demo).

## 10. Testes

- **Novos testes de componente (3):** D1, D2, D3 em `tests/components/brand/`,
  seguindo o padrão de `tests/components/brand/OuroborosLoading.test.tsx` (render,
  props, reduce-motion via mock do `useReduceMotion`). Fixtures sintéticas.
- **Teste de plumbing:** cobrir que `restaurarVaultZip` chama `onProgress` com
  `(feito, total, nome)` corretos e que a lista de arquivos escritos é idêntica
  com/sem callback (byte-parity observável via `totalEscritos` + paths).
- **E2E:** `tests/e2e/playwright/r-brand-6-longa-duracao.e2e.ts` dirige os 3
  conceitos no Gauntlet com progresso/nomes sintéticos e asserta comportamento
  (percentual sobe monotônico; rodapé n/N avança; sparks aparecem), não só presença.
- **Baseline:** total de testes só aumenta (política do template). `FAIL_BEFORE = 0`
  esperado; `FAIL_AFTER = 0`. Rodar `npm test` e registrar o novo total (baseline
  atual citada no CLAUDE.md: 1126 passando).

## 11. Proof-of-work esperado

- **Diff final** dos arquivos criados/modificados listados em §3.
- **Runtime real** (BRIEF §2 — todos exit 0):
  ```bash
  cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
  ./scripts/check_anonimato.sh
  ./scripts/check_anonimato.sh --self-test
  npx tsc --noEmit
  npm test --silent
  ./scripts/smoke.sh                 # inclui anonimato + PT-BR UI + doctor de hooks
  npx expo export --platform android --output-dir /tmp/rbrand6-export && rm -rf /tmp/rbrand6-export
  ```
- **Validação visual — Gauntlet A+ (obrigatório):** `./gauntlet.sh` +
  playwright MCP em `localhost:8081/_dev/gauntlet`, navegando os 3 conceitos
  como app real. PNGs reais (não `.gitkeep`) em
  `docs/sprints/R-BRAND-6-LONGA-DURACAO-screenshots-gauntlet/`, com **paridade
  lado a lado** contra os tiles D1/D2/D3 do `conceitos-ouroboros.html` aberto no
  Chrome. Reduce-motion capturado nas duas vias (toggle on/off).
- **Progresso real no device (Nível C, com permissão):** como `restaurarVaultZip`
  é no-op em web (`Platform.OS === 'web'`), o percentual/n/N REAL só é observável
  no device. Rodar dev-client + Metro USB, restaurar um backup real e gravar a
  tela mostrando D3 subindo de 0→100% com D1 avançando `n/N`. Backup do Vault via
  `./scripts/adb-vault-pull.sh` antes de qualquer troca de app.
- **Acentuação periférica:** varredura em todos os arquivos modificados
  (`python3 scripts/check_strings_ui_ptbr.py` cobre `src/`/`app/`; validar este
  spec com o validador global de acentuação).
- **Hipótese verificada (lição 4):** `rg` confirmando os identificadores citados
  (`restaurarVaultZip`, `exportarVaultZip`, `executarBackup`, `listVaultFolder`,
  `verificarSyncStatus`, `useReduceMotion`, `colors`) antes de iniciar.
- **FEATURES-CANONICAS:** atualização no mesmo commit é condição de aceite do
  validador-sprint (BRIEF "Manutenção do FEATURES-CANONICAS").

## 12. Riscos e não-objetivos

- **Pré-requisito bloqueante:** R-BRAND-3-GLIFO **ainda não está mergeada** (não
  existem `src/components/brand/glifo/` nem `conceitos/` no `main`). Esta sprint
  **não pode começar** antes dela; R-BRAND-4-ABERTURAS e R-BRAND-5-FEEDBACK vêm
  antes no encadeamento da onda. Se despachada fora de ordem, o executor deve
  parar no passo 0.
- **Monitor ao vivo do Syncthing (NÃO-OBJETIVO):** o app não observa eventos
  por-arquivo do Syncthing (processo externo; só `mtime` via `syncStatus.ts`).
  D2 mostra nomes reais **lidos do disco** (`listVaultFolder`) e nomes do loop de
  import em andamento — não um stream de sync ao vivo. Um monitor verdadeiro
  exigiria a REST API do Syncthing: decisão explícita de **fora de escopo**,
  candidato a sprint própria futura se o dono quiser (não é follow-up vago).
- **Backup determinístico com D3 (fora de escopo visual):** o plumbing de
  `onProgress` é adicionado ao export/backup, mas o design doc §4 atribui o
  backup ao conceito C2 (R-BRAND-5). Esta sprint entrega apenas o **plumbing**
  no export; trocar o visual do backup de C2 para D3 é decisão do dono e fica
  registrada aqui, não implementada de surpresa.
- **Recap (descartado para D3):** não tem percentual real (agregação
  indeterminada) — segue com loader indeterminado; não recebe D3.
- **Anti-débito:** qualquer achado colateral durante a execução (ex.: o loop de
  restore precisar de refactor maior para expor progresso sem race) vira **sprint
  nova** via `planejador-sprint`, não um remendo silencioso.

## 13. Referências

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§3 arquitetura,
  §4 mapa conceito→destino, §5 ondas, §6 armadilhas).
- Coreografias: `docs/design/ouroboros/coreografias-extraidas.js`
  (`mount_D1` 670, `mount_D2` 763, `mount_D3` 831).
- Conceitos vivos: `docs/design/ouroboros/conceitos-ouroboros.html` (tiles D1/D2/D3).
- BRIEF: `VALIDATOR_BRIEF.md` (§1.1 anonimato, §1.3 paleta, §1.4 tipografia,
  §1.9 Gauntlet, §2 runtime, §4 armadilhas M25.2/A27/A28/A22).
- Pré-requisito: `R-BRAND-3-GLIFO` (geometria + driver + benchmark).
- Fluxos reais: `src/lib/services/restaurarVault.ts`,
  `src/lib/services/exportarVault.ts`, `src/lib/backup/executarBackup.ts`,
  `src/lib/services/syncStatus.ts`, `src/lib/vault/reader.ts`
  (`listVaultFolder`), `src/components/screens/IntegracoesScreen.tsx`,
  `src/components/settings/SecaoBackupAutomatico.tsx`.
- Padrão de componente/teste: `src/components/brand/OuroborosLoading.tsx`,
  `tests/components/brand/OuroborosLoading.test.tsx`,
  `tests/e2e/playwright/rbrand-loading.e2e.ts`.
- FEATURES-CANONICAS: `docs/FEATURES-CANONICAS.md` §1.1/§1.2.
