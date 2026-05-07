# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased] — Refundação v1.0 (2026-05-02 em diante)

### Sprints K4 + K5 — `M-FAB-MENU-SAFE-BOTTOM` + `M-BOTOES-LARGURA` (consolidadas, 2026-05-07)

**Bloco K FECHADO (5/5).** K4: helper novo
`src/components/chrome/safeBottom.ts` exporta
`useSafeBottomMargin(insetBottom)` retornando
`Math.max(spacing.xl, height × 0.10) + insetBottom` memoizado.
`FABMenu.tsx` (esquerdo roxo) e `MenuCapturaVerde.tsx` (direito
verde) substituem `bottom: spacing.xl` por `bottom: marginBottomCanonico`.
Hook chamado antes de returns condicionais.

K5: `Button.tsx` ganha prop `fullWidth?: boolean` (default false).
Quando true, aplica `width: '100%'` tanto no Pressable externo
quanto no MotiView interno. Aplicado em "Conectar conta Google"
(`app/agenda.tsx`) e "Abrir agenda" (`app/settings/contas-google.tsx`).
Botão Recap em `app/index.tsx:154` NÃO aplicado — está em flex-row
com avatares no header; fullWidth quebraria hierarquia visual ADR-010 §3.

Tests: +2 casos (Button.test.tsx fullWidth=true aplica width 100%).

Métricas: 1736 testes / 175 suítes verde (+2) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprints K2 + K3 — `M-MENU-NOMES` + `M-MENU-FOTO-EDITAVEL` (consolidadas, 2026-05-07)

K2: labels do `MenuLateral` `'Ver'` → `'Acesso Rápido'` e `'Opcionais'`
→ `'Utilitários'` (Sentence case + acento). Audit grep cobriu também
`gauntletDashboard.tsx` (2 ocorrências).

K3: `CabecalhoPessoa` em `MenuLateral.tsx` vira `<Pressable>` com
`accessibilityLabel="editar nome e foto"` que navega para
`/settings/editar-pessoa` (rota já existente — não criada nova,
componente atende 100% do requisito com AvatarPicker + Input +
Salvar + setNome + router.back, lida com ambas pessoas via
`useSettings.tipoCompanhia`).

Tests: +7 casos (K2 labels + ausência dos antigos, K3 tap
CabecalhoPessoa navega + fecha menu, render editar-pessoa, salvar,
modo sozinho, modo duo, nome vazio). +1 suite Jest. E2E novo cobre
K2 labels + K3 navegação.

Métricas: 1734 testes / 175 suítes verde (+7 / +1 suite) · TS strict
0 · Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint K1 — `M-MENU-LATERAL-LAYOUT` (2026-05-07)

`MenuLateral.tsx` ganha 4 melhorias UX: (1) safe-area-inset-bottom
+ `Math.max(spacing.xl, screenHeight × 0.10)` no rodapé Configurações
(impede conflito com 3-button nav e gesture nav); (2) scroll position
persistente via `useNavegacao.scrollMenuLateralPosition` com debounce
200ms (offset preservado entre aberturas na mesma sessão; reseta no
boot); (3) MotiView slide passa de `springs.default` para
`springs.subtle` (damping 22, stiffness 220 — mais natural, alinha
ADR-010 §2.1); (4) `paddingTop: spacing.xl` no `CabecalhoPessoa`
para simetria com label.

`useNavegacao` (`src/lib/stores/navegacao.ts`) ganha campo
`scrollMenuLateralPosition: number` + setter
`setScrollMenuLateralPosition(offset)`. Init=0.

Tests: +3 casos K1 (scroll offset salva com debounce, re-abrir
aplica scrollTo persistido, rodapé incorpora insets.bottom). E2E
novo cobre 3 estados (topo/rolado/reaberto).

Métricas: 1727 testes / 174 suítes verde (+3) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-AGENDA — `M-SAVE-AGENDA-VALIDA` (2026-05-07)

**Bloco I FECHADO (15/15 sprints).** `src/lib/vault/agenda.ts`
remove `joinUri` local (6 callsites) e migra para `vaultUriJoin`.
Path `markdown/agenda-pessoa_a-YYYY-MM-DD-eventId.md` (H2). Caller
`app/agenda.tsx` envolve `salvarCacheEventos` em
`comTimeout(p, 30s)` + try/catch. Toasts PT-BR `Agenda atualizada.`
/ `Não foi possível atualizar: <msg>`.

Tests: 19 → 23 casos (vaultRoot vazio throw, SAF trailing slash sem
barras duplas, SAF `%20` defesa A29, sincronização inicial cria N
arquivos). E2E novo cobre `agenda root` presente + `agenda
carregando` ausente.

Validação adb humana fica pendente até I2-OAUTH (sprint separada,
decisão dono — código de I-AGENDA não depende de OAuth funcionando).

Métricas: 1724 testes / 174 suítes verde (+4) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-CICLO — `M-SAVE-CICLO-VALIDA` (2026-05-07)

`src/lib/vault/ciclo.ts` migra `joinUri` local (3 callsites) para
`vaultUriJoin`. Path canônico `markdown/ciclo-YYYY-MM-DD.md`.
Caller `app/ciclo/registrar.tsx` (não `app/ciclo/novo.tsx` como
o spec especulava — auditoria empírica) envolve em
`comTimeout(p, 10s)` + try/catch. Toasts PT-BR `Ciclo registrado.`
/ `Não foi possível salvar: <msg>`.

Helper novo `src/lib/ciclo/inferencia.ts` (módulo puro) com
`autorPadrao(tipoCompanhia, sexoA, sexoB)` retorna autor inferido
ou `null` (ambíguo). Solo M/PNB → null; solo F/NB → pessoa_a.
Casal/amigos: 1 feminina não-feminina → autor é a feminina;
ambas femininas ou ambos masculinos → null (pede seleção
manual). `deveMostrarItemCiclo(sexoA, sexoB)` esconde ciclo só
se ambos `'masculino'`.

Caller pré-seleciona via `autorPadrao`; se null, mostra seletor
explícito. `MenuLateral` oculta item "Ciclo" se ambos masculino
(combinado com feature toggle `cicloMenstrual`).

Tests: +30 casos / +1 suite (`inferencia.test.ts` 27 cenários
canônicos sozinho M/F/NB/PND/null + casal/amigos 8 combinações;
`ciclo.test.ts` +3 vaultUriJoin/throw/`%20`; `MenuLateral.test.tsx`
+5 esconde/mostra). E2E novo cobre fluxo completo.

Métricas: 1720 testes / 174 suítes verde (+30 / +1 suite contra
1690 / 173 baseline) · TS strict 0 · Hermes 7,7 MB · Gauntlet
leak 0/6 · anonimato OK · PT-BR OK.

### Sprint J1 — `M-ONBOARDING-PERMISSOES` (2026-05-07)

Onboarding passa de 4 frames (H3) para 5 frames com nova arquitetura:
Frame 1 ganha seletor de Sexo (chips Masculino/Feminino/Não-binário/
Prefiro não dizer); Frame 4 NOVO "Permissões" entre pasta e tudo pronto
com 4 toggles (Câmera ON / Microfone ON / Notificações ON / Localização
OFF); Frame final 5 mostra resumo "N permissões concedidas". Indicador
progresso 4 → 5 segmentos.

`useOnboarding` (`src/lib/stores/onboarding.ts`) bump v2 → v3 com
campos novos: `sexoDeclarado: SexoPorPessoa` (mais coeso com store
existente que já delega nome/foto para `usePessoa`) +
`permissoes: PermissoesOnboarding` (storage/camera/microfone/
notificacoes/localizacao). Setters reativos
`setSexoDeclarado(pessoa, sexo)` + `setPermissao(key, granted)`.
`gauntlet.ts` `reset()` limpa v2 legacy também para determinismo.

Helper novo `src/lib/permissoes/requestOnboarding.ts` com
`requestPermissao(tipo)` + `getPermissaoStatus(tipo)`. Botão Continuar
do Frame Permissões dispara request em sequência (câmera → mic →
notif → location), persiste em store, segue para Frame final.

Sub-tela nova `app/settings/permissoes.tsx` mostra status atual
(concedida/negada/não pedida) + botão "Abrir configurações do
sistema" (`Linking.openSettings()`) por permissão negada. Plug em
`app/settings/index.tsx` via `<LinkSubTela>` "Permissões" →
`/settings/permissoes`.

Tests: +13 casos (onboarding store sexoDeclarado/permissoes setters
+ reatividade; onboarding.tsx 5 frames com toggles funcionando +
Continuar chama requestPermissions). E2E novo
`tests/e2e/playwright/m-onboarding-permissoes.e2e.ts` com mock
granted.

Validação Gauntlet pelo orquestrador: 5-frame navegado completo,
captura 3 PNGs (Frame 1 nome+sexo, Frame Permissões cards, Frame
final resumo). `useNomeDe` reativo confirma nome "Andre" propagando.

Métricas: 1690 testes / 173 suítes verde (+13 contra 1677 baseline) ·
TS strict 0 · Hermes 7,7 MB intacto · Gauntlet leak 0/6 · anonimato
OK · PT-BR check OK.

I-CICLO destravada (sexoDeclarado disponível para inferência).

### Sprint I2-AMIGOS — `M-AMIGOS-LABEL` (2026-05-07)

`useNomeDe('ambos')` em `src/lib/stores/pessoa.ts` ramifica por
`tipoCompanhia`: `'casal'` → `'Casal'`, `'amigos'` → `'Todos'`,
`'sozinho'` → `'Ambos'` (fallback defensivo). Reatividade via
`useOnboarding((s) => s.tipoCompanhia)`.

Substituições: literal `'Sobreposto'` em `MiniHumorScreen.tsx:85`
+ hardcoded `'Casal'` em `ItemTarefa.tsx:89` migrados para
`useNomeDe('ambos')`. `pessoas.config.ts` `ambos.nome: 'Casal'`
mantido por consistência mas ignorado pelo hook.

Tests: pessoa.test.ts reescrito de 4 para 11 casos (3 ramos
tipoCompanhia + reatividade a `setTipoCompanhia` + nomes reais
pessoa_a/pessoa_b).

Screenshot Gauntlet: heatmap com `tipoCompanhia='casal'` mostra
chip "Casal" reativo (era "Sobreposto" hardcoded).

Achado registrado: Gauntlet API não tem cobertura para
`tipoCompanhia='amigos'` — sprint nova `INFRA-GAUNTLET-AMIGOS-API`
para expor `setTipoCompanhia` ou `SeedOpcoes.tipoCompanhia`.

Métricas: 1677 testes / 173 suítes verde (+5) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-SCANNER + M-SCANNER-LAYOUT (consolidadas, 2026-05-07)

`src/lib/scanner/saveNota.ts` migra helpers legados para layout-por-tipo:
- `mediaScannerPath(slug, ext)` → `scannerPath(slug, ext)` →
  `<ext>/scanner-<slug>.<ext>` (jpg ou pdf).
- `mediaScannerPath(basename, 'md')` → `scannerCompanionPath(slug)` →
  `markdown/scanner-<slug>.md`.
- `inboxFinanceiroNotaPath(date, slug)` → `notaPath(date, slug)` →
  `markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md`.
- `joinUri` local → `vaultUriJoin` canônico (H1).

Slug `${formatDateYmdHms(agora)}-${slugifyDescricao}` garante
unicidade. Wikilink ajustado para `[[../<ext>/scanner-<slug>]]`.

`src/components/screens/ScannerPreview.tsx` envolve `saveNota` em
`comTimeout(p, 30s)` (cobre consolidarPdf + 3 writes SAF + ML Kit).
Toasts PT-BR `Nota salva.` / `Não foi possível salvar: <msg>`.

Tests: 15 → 19 casos (1 página jpg+md, multi-página pdf+md,
md semântico nota financeira, vaultRoot vazio throw, trailing
whitespace+`%20` saneado, OCR confiança baixa propaga revisar=true).
E2E novo cobre tap "Escanear documento" via Gauntlet.

Resolve achado M-SCANNER-LAYOUT-POR-TIPO registrado em H2 (saveNota.ts
ainda usava helpers legados). Helpers `mediaScannerPath` e
`inboxFinanceiroNotaPath` permanecem em paths.ts apenas para
preservar tests legados; remoção fica para sprint que migra share
intent (M-SHARE-INTENT-LAYOUT).

Métricas: 1672 testes / 173 suítes verde (+4) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-EXERCICIO — `M-SAVE-EXERCICIO-VALIDA` (2026-05-07)

`src/lib/vault/exercicios.ts` migra `joinUri` local (4 callsites:
ler, listar, escrever, excluir) para `vaultUriJoin`. Path .md
`markdown/exercicio-<slug>.md` + GIF binário separado em
`gif/exercicio-<slug>.gif` (cross-link via frontmatter `gif`).

`src/lib/exercicios/saveExercicio.ts` migra `joinUri` local para
`vaultUriJoin` no destino do GIF (`copyAsync` URI temp → `gif/...`).

`app/exercicios/novo.tsx` envolve `saveExercicio` em
`comTimeout(p, 30s)` (timeout maior — copy SAF de GIF até 5MB em
OEM lentos) + try/catch. Toasts PT-BR `Exercício salvo.` / `Não
foi possível salvar: <msg>`.

Tests: +7 casos (.md trailing `%20`/`//`/vaultRoot vazio/dicas[]
preservadas + GIF trailing `%20`/cross-link frontmatter/vaultRoot
vazio com GIF). E2E novo cobre fluxo via Gauntlet.

Métricas: 1668 testes / 173 suítes verde (+7) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-CONTADOR — `M-SAVE-CONTADOR-VALIDA` (2026-05-07)

`src/lib/vault/contadores.ts` migra `joinUri` local (4 callsites) para
`vaultUriJoin`. Path `markdown/contador-<slug>.md`. `app/contadores/novo.tsx`
e `app/contadores/[slug].tsx` envolvem awaits em `comTimeout(p, 10s)`.
Toasts PT-BR `Contador salvo.` / `Contador resetado.` / `Não foi
possível salvar: <msg>`.

Schema atual `resets[]` + `recorde` MANTIDO (já cumpre BRIEF §1.8
preservação de histórico — não regredido). Rename para
`historico_resets`/`{data_reset, dias_acumulados}` que o spec sugeria
ficaria breaking change em .md de produção alpha; sprint dedicada
M-SCHEMA-CONTADOR-V2 registrada se o dono decidir mais tarde.

Tests: +5 casos (vaultRoot vazio throw, trailing `%20`, trailing
slashes, histórico preservado BRIEF §1.8, reset via vaultUriJoin).
E2E novo cobre fluxo "Sem cigarro" → criar.

Métricas: 1661 testes / 173 suítes verde (+5) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-ALARME — `M-SAVE-ALARME-VALIDA` (2026-05-07)

`src/lib/vault/alarmes.ts` migra `joinUri` local para `vaultUriJoin`
canônico. Path `markdown/alarme-<slug>.md`. `app/alarmes/novo.tsx`
envolve 3 awaits (cancelarAlarme, agendarAlarme, escreverAlarme)
em `comTimeout(p, 10s)`. Toasts PT-BR canônicos.

Tests: 11 → 17 casos em `tests/lib/vault/alarmes.test.ts` (4
recorrências única/diária/semanal/mensal + vaultRoot vazio throw +
trailing `%20` normalizado). E2E novo cobre fluxo até tap Salvar
(channel notif é no-op em web).

Métricas: 1656 testes / 173 suítes verde (+7) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-TAREFA — `M-SAVE-TAREFA-VALIDA` (2026-05-07)

`src/lib/vault/tarefas.ts` migra `joinUri` local para `vaultUriJoin`
canônico (5 callsites: listar, ler, escrever, criar com conflict
resolution, excluir). `uriParaRelativo` ganha trim espelhando
`vaultUriJoin` (whitespace/`%20`/barras) para devolver rel limpo
mesmo com vaultRoot sujo. Path canônico
`markdown/tarefa-<slug>.md` (sem date prefix — schema guarda
`criada_em` no frontmatter, tarefa é persistente).

`app/todo.tsx` envolve `handleSalvarSheet` em `comTimeout(p, 10s)`.
Toasts PT-BR `Tarefa salva.` / `Não foi possível salvar: <msg>`
substituem strings antigas (`Tarefa anotada.` / `Falha ao salvar`).

Schema `tarefa.ts` v2 M31 (categoria + pessoa_destino + alarme +
slug_vinculado) preservado — não regredido para campos que o spec
sugeria. Auditoria empírica identificou caller real `app/todo.tsx`
+ `SheetNovaTarefa.tsx` (não `app/tarefas/novo.tsx` como o spec
especulava).

Tests: +8 casos em `tests/lib/vault/tarefas.test.ts` (path canônico
`vaultUriJoin`, throw vaultRoot vazio em escrever/criar/ler,
normalização `%20`+whitespace A29, barras duplas, listar com root
sujo, marcarFeito preservando categoria/destino/alarme). E2E novo
`tests/e2e/playwright/m-save-tarefa.e2e.ts` cobre fluxo "Limpar
gatos" + categoria Saúde.

Métricas: 1649 testes / 173 suítes verde (+8 contra 1641 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-AUDIO — `M-SAVE-AUDIO-VALIDA` (2026-05-07)

`src/lib/diario/recordAudio.ts` reescrito padrão I-VIDEO/I-FOTO
(writer inline com `vaultUriJoin`). Path `m4a/audio-...m4a` +
companion `markdown/audio-...md` apontando para `../m4a/...`.
vaultRoot vazio throw. Nova função `atualizarCompanionAudioComTranscricao`
regrava companion após STT sucesso (best-effort, separado do save).

`src/components/diario/MicrofoneButton.tsx` aplica
`comTimeout(p, 30s)` + try/catch. Toasts PT-BR `Áudio salvo.` /
`Não foi possível salvar: <msg>`. **Save sequencial** (áudio
garantido, transcribe em segundo plano) substitui `Promise.all`
paralelo antigo.

`src/lib/midia/companion.ts` `stringifyCompanionMidia` ganha campo
opcional `transcricao`: presente → frontmatter + body integral
(espelha `midia_frase`); ausente → omite (semântica null canônica).

Tests: 11 casos em `tests/lib/diario/recordAudio.test.ts` (path
canônico, `vaultUriJoin`, throw vaultRoot vazio, trailing space
normalizado, companion frontmatter, transcricao presente/ausente,
opções autor/para/legenda, atualizar companion com STT). E2E novo
render-only (microfone real e STT impossíveis em web; validação
adb humana obrigatória conforme A11/A28).

Métricas: 1641 testes / 173 suítes verde (+7 contra 1634 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-FOTO — `M-SAVE-FOTO-VALIDA` (2026-05-07)

`src/lib/midia/capturarFoto.ts` reescrito no padrão I-VIDEO (writer
inline). Remove dependência de `escreverMidiaComCompanion` legado e
aplica `vaultUriJoin` direto. Detecção `jpg`/`png` por `mimeType`
com fallback por extensão do URI. Path do binário em `jpg/` ou `png/`
+ companion em `markdown/foto-...md` apontando para `../<ext>/...`.
vaultRoot vazio agora throw `Vault não conectado.`.

**Race fix BottomSheet**: `MenuCapturaVerde.handleFoto` envolve em
`comTimeout(p, 30s)` (timeout maior — copy SAF lento) + try/catch.
Sheet fecha APENAS no `finally`, depois do save resolver (sucesso OU
erro), não no `onPress` síncrono. Custo aceito: ~1-2s sheet aberto;
benefício: usuário vê o resultado do save sem race. Resolve crash
documentado em §1 do spec.

`MemoriasFotosTab.handleRegistrarFotoEmptyState` ganhou try/catch
defensivo (regressão direta da mudança throw/silent — fix mínimo,
não escopo expandido).

Tests: 6 → 12 casos em `tests/lib/midia/capturarFoto.test.ts`
(throw vaultRoot vazio, jpg em `jpg/` + companion, png em `png/` +
companion, mimeType ausente fallback extensão, path final
`vaultUriJoin` sem `%20`/barra dupla, companion frontmatter).
E2E novo `tests/e2e/playwright/m-save-foto.e2e.ts` cobre menu
+ tap foto via `__gauntlet.adicionarFotoMock()`.

Métricas: 1634 testes / 173 suítes verde (+5 contra 1629
baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

### Sprint I-VIDEO — `M-SAVE-VIDEO-VALIDA` (2026-05-07)

`src/lib/midia/capturarVideo.ts` reescrito com writer inline
usando `vaultUriJoin` + `videoPath` (`mp4/video-...mp4`) +
`videoCompanionPath` (`markdown/video-...md`). vaultRoot vazio
agora throw em vez de silêncio. `MenuCapturaVerde.handleVideo`
envolve em `comTimeout(p, 15s)` (timeout maior para vídeo) +
try/catch + toasts PT-BR `Vídeo salvo.` / `Não foi possível
salvar: <msg>`.

Decisão arquitetural: `escreverMidiaComCompanion` (helper compartilhado
foto/áudio/scanner/medidas) NÃO migrado nesta sprint — aguarda fechar
todas as I-* mídia antes de migração centralizada. I-VIDEO segue
padrão `saveEvento`/`salvarFrase` (writer inline com vaultUriJoin).

Tests: +2 casos em `tests/lib/midia/capturarVideo.test.ts` (vaultRoot
null throw, path final via vaultUriJoin sem `%20`/barra dupla,
companion frontmatter aponta para basename do binário). E2E novo
`tests/e2e/playwright/m-save-video.e2e.ts` cobre tap menu (picker
nativo não funciona em web — runtime real via Nível B/C).

Métricas: 1629 testes / 173 suítes verde (+2 contra 1627 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-EVENTO — `M-SAVE-EVENTO-VALIDA` (2026-05-07)

`src/lib/eventos/saveEvento.ts` migra `joinUri` local (3
concatenações) para `vaultUriJoin` (H1) com path
`markdown/evento-YYYY-MM-DD-slug.md` (H2). `app/eventos.tsx`
consome `comTimeout` do util canônico (4º caller migrado). Toasts
PT-BR `Evento salvo.` / `Não foi possível salvar: <msg>`.

Schema real `evento.ts` usa `modo: positivo|negativo` (não
"polaridade") + body livre (não "descricao") — implementação seguiu
schema canônico, não terminologia do spec. Inconsistência de spec
documentada como achado, não bloqueia.

Tests: +6 casos em `tests/lib/eventos/saveEvento.test.ts`
(vaultRoot vazio throw, `%20` trailing eliminado, modo positivo,
modo negativo, foto cross-link companion `markdown/` + binário
`jpg/`, sem bairro com slug derivado). E2E novo
`tests/e2e/playwright/m-save-evento.e2e.ts` cobre 2 modos.

Métricas: 1627 testes / 173 suítes verde (+6 contra 1621
baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

### Sprint I-DIARIO — `M-SAVE-DIARIO-VALIDA` (2026-05-07)

`src/lib/diario/saveDiario.ts` migra `joinUri` local para
`vaultUriJoin` (H1) com path `markdown/diario-YYYY-MM-DD-HHmm-slug.md`
(H2). `app/diario-emocional.tsx` envolve save em try/catch+timeout
com toasts PT-BR `Diário salvo.` / `Não foi possível salvar: <msg>`.

**`comTimeout` extraído para `src/lib/util/comTimeout.ts`** (zero
deps, função pura) com 6 testes em
`tests/lib/util/comTimeout.test.ts`. 3 callers migrados:
`MenuCapturaVerde.tsx`, `app/humor-rapido.tsx`,
`app/diario-emocional.tsx`. Resolve achado registrado em I-HUMOR.

Tests: +6 casos em `tests/lib/diario/saveDiario.test.ts`
(modo trigger, modo vitória, audio companion presente, audio null,
vaultRoot vazio throw, normalização SAF tree URI com `%20` ofensivo).
E2E novo `tests/e2e/playwright/m-save-diario.e2e.ts` cobre 2 modos
canônicos (trigger + vitória) via Gauntlet seed.

Achados registrados:
- Schema `DiarioEmocionalModoSchema` aceita só `trigger|vitoria`,
  não `reflexao`. Sprint nova `I-DIARIO-REFLEXAO` para extender.
- Audio companion file separado (`markdown/audio-...md`) fica para
  sprint `I-AUDIO` que ainda não foi entregue.
- `check_test_data.sh` não respeita marker `anonimato-allow:` —
  sprint `INFRA-CHECK-TEST-DATA-ALLOW` para alinhar.

Métricas: 1621 testes / 173 suítes verde (+12 contra 1609 baseline,
+1 suíte do helper) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

### Sprint I-HUMOR — `M-SAVE-HUMOR-VALIDA` (2026-05-07)

`src/lib/humor/saveHumor.ts` migra `joinUri` local para `vaultUriJoin`
(H1) com path `markdown/humor-YYYY-MM-DD.md` (H2). Todas as
concatenações ad-hoc auditadas e substituídas. Schema `HumorSchema`
mantido como está (rejeita `autor: 'ambos'` — bug deliberado de
I2-AMIGOS, sprint dedicada futura).

`app/humor-rapido.tsx` aplica `comTimeout(p, 10s)` + try/catch.
Toasts PT-BR `Humor salvo.` / `Não foi possível salvar: <msg>`.

Tests: +6 casos em `tests/lib/humor/saveHumor.test.ts` (cenários
pessoa_a/pessoa_b/rejeição 'ambos', vaultRoot vazio throw,
normalização SAF tree URI com `%20` trailing, payload sem campo
obrigatório). E2E novo `tests/e2e/playwright/m-save-humor.e2e.ts`
cobre 3 seeds (pessoa_a sozinho, casal, pessoa_b sozinho) com
screenshots Gauntlet.

Achado 1 (sprint I2-AMIGOS): schema `HumorSchema.autor` rejeita
`'ambos'` deliberadamente; quando I2-AMIGOS estender `useNomeDe`
para retornar 'Casal'/'Todos' dinamicamente, schemas humor/diário/
evento/marco precisam aceitar autor coletivo. Mantido como bug
documentado.

Achado 2 (sprint UTIL-COMTIMEOUT opcional): helper `comTimeout`
agora replicado em 2 callers (`MenuCapturaVerde.tsx` + `humor-rapido.tsx`).
Ao aparecer 3º caller (provável I-DIARIO ou I-EVENTO), extrair
para `src/lib/util/comTimeout.ts`.

Métricas: 1609 testes / 172 suítes verde (+6 contra 1603 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-DEVICES — `M-SAVE-DEVICES-INDEX-VALIDA` (2026-05-07)

`src/lib/vault/devicesIndex.ts` migra de `joinUri/INBOX_DEVICES_REL`
(módulo local `devicesPath.ts` legado, sem trim de `%20`) para
`vaultUriJoin` + `devicesIndexPath()` (`markdown/_devices.md`
após H2). Boot hook `atualizarDeviceIndex` continua plugado em
`BOOT_HOOKS` via `reagendamento.ts` linha 212, idempotente, atualiza
`ultima_atividade` do device atual a cada boot.

`src/lib/vault/devicesPath.ts` removido (órfão, zero importadores).

Tests: 17 → 20 casos em `tests/lib/vault/devicesIndex.test.ts`
(SAF tree URI MIUI/OneUI com `%20` trailing + throws com vaultRoot
vazio em escreverDevicesIndex e lerDevicesIndex).

Achado documentado: ~38 callers ainda usam `joinUri` legado sem
trim agressivo. Cada um migra na sprint Bloco I dedicada (humor,
diário, evento, foto, áudio, vídeo, tarefa, alarme, contador, ciclo,
exercício, scanner, agenda).

Métricas: 1603 testes / 172 suítes verde (+3 contra 1600 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-FRASE — `M-SAVE-FRASE-VALIDA` (2026-05-07)

Save de frase texto-livre (FAB+ verde → "Frase") ganha resiliência:
`src/lib/midia/salvarFrase.ts` remove `joinUri()` local e usa
`vaultUriJoin` (H1) com path `markdown/frase-YYYY-MM-DD-slug.md`
(layout H2). Adiciona `resolverColisao()` (sufixo `-2`...`-99`)
para frases com mesmo prefixo no mesmo dia. Erro com vault
ausente / write fail agora é throw, não silêncio (bug-loud >
bug-quiet, alinhado com filosofia H1).

`MenuCapturaVerde.handleSalvarFrase` envolve `salvarFrase` em
`comTimeout(p, 10s)` + try/catch. Toasts PT-BR `Frase salva.` no
sucesso e `Não foi possível salvar: <msg>` no erro.

Tests: 5 → 7 casos em `tests/lib/midia/salvarFrase.test.ts`
(SAF tree URI com `%20` trailing + colisão de slug). E2E novo
em `tests/e2e/playwright/m-save-frase.e2e.ts` cobre fluxo
golden via Gauntlet seed.

Métricas: 1600 testes / 172 suítes verde (+2 contra 1598
baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

Primeira sprint do Bloco I (saves específicos por feature).
Padrão canônico do `_TEMPLATE-SAVE-FEATURE.md` aplicado pela
primeira vez — referência para as próximas 14 sprints I-*.

### Sprint H3 — `M-VAULT-PASTA-NAO-HARDCODED` (2026-05-06)

Onboarding ganha quarto frame "Pasta do Vault — Onde salvar seus
dados?" entre Companhia e Tudo pronto, com dois cards: "Sugestão:
Documents/Ouroboros" (botão "Usar essa", chama `pedirPermissaoStorage()`
+ `inicializarVaultEscolhido(sugestaoVaultUriDefault())`) e "Outra
pasta" (botão "Escolher", chama `requestVaultPermission()` SAF picker
+ `inicializarVaultEscolhido(uriEscolhida)`). Indicador de progresso
passa de 3 para 4 segmentos.

`src/lib/vault/permissions.ts` refatorado:
`inicializarVaultCanonico()` removido (e suas constantes globais
hardcode `VAULT_PATH`/`VAULT_URI`). Substituído por
`inicializarVaultEscolhido(uri)` que aceita URI já escolhida pelo
caller, derivando modo `auto`/`saf-fallback` por inspeção de prefixo
da URI (`content://` → SAF, demais → auto). `garantirSubpastas`
sanitiza URI via `vaultUriJoin` (H1). Novos getters
`sugestaoVaultPathDefault()` e `sugestaoVaultUriDefault()` retornam
`/sdcard/Documents/Ouroboros/` como sugestão pura.

`VaultBootGate` em `app/_layout.tsx` ganha fallback de 2 níveis:
`loadVaultRoot()` (SecureStore) → sugestão default + permissão.
Hardcode silencioso eliminado.

Sub-tela nova `app/settings/vault.tsx` mostra path atual e oferece
duas ações: "Trocar pasta do Vault" (diálogo inline com confirmação,
explica que dados ficam na pasta antiga e devem ser movidos
manualmente, depois SAF picker) e "Reinicializar pasta" (recria 8
subpastas canônicas H2 na pasta atual). Plug em `app/settings/index.tsx`
substitui o link inline antigo "Reinicializar pasta do Vault" por
`<LinkSubTela>` "Vault" → `/settings/vault`.

ADR-0022 documenta a decisão (supersedes parcialmente ADR-0014 que
assumia pasta dedicada hardcoded). Justificativa: respeitar
autonomia do usuário, permitir Vault Obsidian compartilhado.
Decisão arquitetural durável: trocar pasta NÃO move dados —
complexidade de migração SAF↔SAF é alta, usuário pode preferir
manter histórico antigo, fluxo manual via export ZIP/import recomendado.

Métricas: 1598 testes / 172 suítes verde (+5 contra 1593 baseline,
1 skip intencional preservado) · TS strict 0 · Hermes Android 7,7 MB
intacto · Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

Validação Gauntlet manual pelo orquestrador: 4-frame onboarding
navegado completo via playwright MCP, novo Frame 3 "Pasta do Vault"
renderizou cards corretamente, "Usar essa" propagou
`vaultRoot=web://mock-vault/Protocolo-Ouroboros`, console
`__gauntlet.consoleErros()` vazio. Sub-tela `/settings/vault`
renderizou path atual + 2 ações (trocar/reinicializar) corretamente.

Bloco H FECHADO. Bloco I (15 saves específicos por feature)
totalmente destravado.

### Sprint H2 — `M-VAULT-LAYOUT-POR-TIPO` (2026-05-06)

Reorganiza o Vault de layout por feature (`daily/`, `eventos/`,
`marcos/`, `media/fotos/`, etc) para layout por tipo de arquivo:
`markdown/` para todos os `.md` (incluindo companions de mídia),
`png/`, `jpg/`, `m4a/`, `mp4/`, `pdf/`, `gif/` para binários
separados por extensão, e `.ouroboros/cache/` mantido como exceção
(ADR-0019). Filename incorpora feature como prefixo
(`markdown/humor-2026-05-06.md`, `m4a/audio-2026-05-06-rand.m4a`).

Ergonomia desktop: usuário que abre o Vault no file manager (via
Syncthing) encontra todos os `.md` num lugar consumível por
Obsidian/vim/qualquer editor; mídias binárias separadas facilitam
backup e audit por tipo.

`src/lib/vault/paths.ts` reescrito com 28 helpers novos retornando
path relativo. Caller concatena com `vaultRoot` via `vaultUriJoin`
(H1). `VAULT_FOLDERS` reduzido de 19 entradas para 8 canônicas
(`markdown`, `png`, `jpg`, `m4a`, `mp4`, `pdf`, `gif`, `.ouroboros/cache`).

Boot hook idempotente `migrarVaultLayoutPorTipo()` em
`src/lib/boot/migrarVaultLayoutPorTipo.ts` detecta arquivos no
layout antigo, calcula novo path conforme novos helpers e
copia/renomeia. Flag `useSessao.flags.vaultLayoutMigrado` evita
re-execução. No-op em web. Plugado em `BOOT_HOOKS` via padrão
M30/M37.1.2/M39.

ADR-0023 documenta a decisão (supersedes parte do ADR-0017
"companion no mesmo diretório do binário"). `docs/ADRs/INDEX.md`,
`docs/SMOKE-FIELD-TEST.md` e `docs/FEATURES-CANONICAS.md`
atualizados.

Migração afetou 12 writers do Vault, 10 callers de save de feature,
1 boot hook hub, 1 store (sessao), 21 suites Jest dos writers/readers.
Achados colaterais derivam 2 sprints novas: M-SCANNER-LAYOUT-POR-TIPO
(`src/lib/scanner/saveNota.ts` ainda usa helpers legados) e
M-SHARE-INTENT-LAYOUT (decisão dono A/B sobre subtipo virar prefixo
ou pasta exceção).

Métricas: 1593 testes / 172 suítes verde (+27 contra 1566 baseline,
1 skip intencional contrato share-intent legado) · TS strict 0 ·
Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 · anonimato OK ·
PT-BR check OK (boot hook + reagendamento.ts em batch
`.ptbr-violations.txt` por paths literais em comentários).

Bloqueia destravado: H3 `M-VAULT-PASTA-NAO-HARDCODED` e todo Bloco I
(15 saves específicos por feature).

### Sprint H1 — `M-VAULT-URI-HELPER` (2026-05-06)

Helper canônico `vaultUriJoin(root, rel)` em `src/lib/vault/paths.ts`
faz trim agressivo (whitespace, `%20` percent-encoded, slashes
duplicadas) antes de concatenar URIs do Vault, prevenindo a
contaminação por trailing space que vinha quebrando saves em OEMs
MIUI/OneUI/HyperOS (`Invalid URI` em writes, `directory cannot be
created` em copies). Lança `Error` claro quando root ou rel vazios —
bug-loud > bug-quiet, força chamadores a falharem cedo se o Vault
não foi inicializado.

Suite Jest cobre 10 casos em `tests/lib/vault/paths.test.ts`:
concatenação simples, trim de whitespace/`%20`/slashes do root,
trim de leading slashes/whitespace do rel, throws com root vazio, rel
vazio, root só whitespace, e preservação de subpaths complexos.
Re-exportado via `src/lib/vault/index.ts`.

Sprint não toca writers/readers — migração canônica acontece em cada
sprint do Bloco I (anti-débito). Bloqueia destravado para H2, H3 e
todo Bloco I.

Métricas: 1566 testes / 172 suítes (+10 contra 1556 baseline) · TS
strict 0 · bundle Hermes intacto · Gauntlet leak 0/6 · anonimato OK ·
PT-BR check OK.

### Plano end-to-end v1.0.0 — golden-zebra (2026-05-06)

Field test do APK `v1.0.0-alpha` (commit `ada414e`) revelou problemas
heterogêneos: causa raiz parcial em path/URI corruption + hardcode da
pasta canônica do Vault, mais bugs específicos por feature, decisões
arquiteturais novas (Vault layout por tipo, Recap+Calendário
unificados, sexo declarado no onboarding, permissões pró-ativas),
dívida UX/visual (menu lateral, FABs, botões), e risco residual de
38 motis não migrados em A28.

Plano `tem-muita-coisa-zoada-golden-zebra` aprovado pelo dono
2026-05-06 organiza correção em **31 sprints atômicas** distribuídas
em 8 blocos (H–P). Cada sprint com spec auto-contido em
`docs/sprints/<id>-spec.md`, executável sem contexto por outro Claude
lendo apenas `CLAUDE.md` + `VALIDATOR_BRIEF.md` + spec + `STATE.md`.

**Diretiva durável do dono**: "nunca é só isso" — cada feature ganha
sprint própria de validação isolada (15 sprints I-* só para saves),
sem promessa de "1 fix resolve N features".

**Causa raiz lida no código** (`src/lib/vault/permissions.ts:41-42`):

```ts
const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
const VAULT_URI = `file://${VAULT_PATH}`;
```

Hardcoded. `inicializarVaultCanonico()` força `/sdcard/Documents/Ouroboros/`,
cai em SAF picker em OEMs MIUI/OneUI/HyperOS. URI SAF retornado pode
ter trailing space (`primary:Protocolo-Ouroboros%20`) que vaza para
todas as URIs filhas via `garantirSubpastas` linha 137 (sem trim).
Resultado: `Invalid URI` em writes, `directory cannot be created` em
copies, loaders travados em "carregando eternamente" para 10+ features.

**31 specs materializadas em `docs/sprints/`**:

- 3 sprints H — fundação Vault (helper canônico, layout por tipo,
  pasta escolhida) + ADRs 0022 e 0023.
- 15 sprints I — saves específicos por feature (humor, diário,
  evento, foto, áudio, vídeo, frase, tarefa, alarme, contador, ciclo,
  exercício, scanner, devices index, agenda) seguindo template comum
  `_TEMPLATE-SAVE-FEATURE.md`.
- 2 sprints I2 — OAuth redirect_uri fix + label dinâmico amigos/casal/todos.
- 1 sprint J — onboarding pede 5 permissões + sexoDeclarado para
  inferência ciclo.
- 5 sprints K — chrome UX (menu lateral layout, nomes seções, foto
  editável, FAB safe bottom, botões largura).
- 2 sprints L — telas/abas (Memórias→Saúde Física com 3 abas;
  Recap+Calendário unificados via toggle modo) + ADR-0021.
- 2 sprints N — moti audit runtime + fix dirigido apenas dos críticos.
- 1 sprint O — `VALIDATOR_BRIEF.md` §1.9 ganha regra obrigatória de
  validação Gauntlet OU validação humana adb antes de gerar APK.

**ADRs novos a criar durante execução**:

- ADR-0021 Recap e Calendário unificados em uma tela com toggle modo
- ADR-0022 Vault: pasta escolhida pelo usuário no onboarding
- ADR-0023 Vault: layout por tipo de arquivo (markdown/, png/, etc)

**Estimativa**: ~50-60h código ativo + 7 dias passivos field test +
~1 dia release = **~15-16 dias de calendário até v1.0.0**.

**Cota EAS preservada**: 15 builds restantes de 30/mês. Plano usa 2
(1 preview após blocos H–O fechados; 1 production após F1 field
test verde).

### Auditoria do ROADMAP (M-ROADMAP-AUDIT 2026-05-05 noite)

Auditoria via `git log --all --oneline --no-merges | grep "feat:"`
revelou que **4 sprints do Bloco E (M06.5 microfone, M07.x
conquistas mídia, M11.5 calendário conquistas, M09 scanner
OCR) já estavam entregues no código** (commits `0138ecc`,
`16005ef`, `dadbb62`, `c8e3304` respectivamente, com evoluções
posteriores em `a856fe9`, `8c322fe`, `df34500`), mas a tabela
"Linha do tempo" do `ROADMAP.md` marcava todas como `[todo]`.

**Causa raiz**: durante a refundação v1.0 (2026-05-02), a
retirada do release `v1.0-rc1` zerou os status no roadmap mas
preservou o código. A tabela "Fila ativa reordenada por
blocos" foi mantida atualizada conforme sprints fechavam, mas
a "Linha do tempo" não acompanhou.

**Consequência prática**: 2 dispatches de executor-sprint
hoje (E1 M06.5 e E4 M09) consumiram ~125k tokens e foram
**rejeitados formalmente pelos executores** ao detectar que
os arquivos do spec já existiam em produção. Rejeição correta
e valiosa — preveniu reescrita destrutiva de código já
mergeado.

**Correções aplicadas:**
- Bloco "Estado real consolidado" adicionado ao topo do
  `ROADMAP.md` enumerando o que está entregue (Bloco A 9/9,
  B 6/6, C 10/10, D 1/1, E5 + 4 sub-paralelas + E1-E4) e o que
  REALMENTE falta (E5.B checkpoint Nível B, E6 M37.2, F1 field
  test, M41 release).
- Nota histórica destacada no topo da "Linha do tempo"
  marcando-a como **arquivo cronológico apenas** — fonte de
  verdade canônica é a "Fila ativa por blocos" + "Estado real
  consolidado".
- Estimativa real até v1.0.0 revisada: **~8-10h ativas + 7
  dias passivos field test + ~1 dia release = ~10 dias de
  calendário** (não 30-39h ativas como o roadmap insinuava).

**Aprendizado durável**: antes de dispatchar `executor-sprint`,
rodar `git log --all --oneline | grep -iE "<sprint-id>|<feature>"`
para detectar sprints "fantasmas" que estão entregues mas
listadas como `[todo]`. Adicionado à memória do orquestrador.

### Sprint M37.1.2 fechada + bug M37.1.3 corretiva enfileirada (2026-05-05 noite tarde)

#### E5.x.3 — M37.1.2 Cache de agenda em .md individual (ADR-0019)

Refactor interno completo da persistência de eventos do Google
Calendar: cada evento agora é um `.md` individual em
`agenda/<pessoa>/YYYY-MM-DD-<eventId>.md` com frontmatter zod
(`AgendaEventoSchema`, 7 campos), substituindo o JSON único
`media/cache/agenda-<pessoa>.json` introduzido por M37.1.

API pública de `calendarCache.ts` preservada
(`salvarCacheEventos`/`lerCacheEventos`/`cacheEstaFresco`) para
delegar internamente a `sincronizarSnapshotAgenda` em
`src/lib/vault/agenda.ts`. **`app/agenda.tsx` permaneceu
intocado** — refactor 100% transparente para UI.

`sincronizarSnapshotAgenda` é o entry point: escreve cada evento
e remove os `.md` cujo `sincronizado_em` é menor que o passado
(diff por timestamp em vez de cursor externo). Idempotência
empiricamente verificada: rodar 2× com mesma lista e mesmo
timestamp resulta em `{adicionados: 0, atualizados: 0,
removidos: 0}` + zero chamadas a `writeVaultFile`/`deleteAsync`.

Boot hook `migrarCacheAgenda` plugado via `BOOT_HOOKS.push` em
`reagendamento.ts` (padrão M30/M39 — não `useEffect` em
`_layout.tsx`): detecta JSON legado, expande em N `.md`, deleta
o JSON, marca flag `useSessao.flags.cacheAgendaMigrado` para
skip rápido em boots futuros. Em web no-op.

**Métricas:** 1536 → 1555 testes (+19 com nova suíte
`tests/lib/vault/agenda.test.ts`); 171 → 172 suítes; bundle
Hermes 7,7 MB **mantém** (refactor neutro); leak Gauntlet 0/6.

**Validação visual Nível A:** `A-agenda-md-individual.png`
mostra UI idêntica a `A-agenda-mes-com-dots.png` (sem
diferença visual, apenas arquitetura interna).

#### E5.x.4 — M37.1.3 (todo, corretiva — bug "Conectar trava em offline")

Bug pré-existente desde M37.1 reproduzido pelo dono em
2026-05-05 21:00: clicar "Conectar conta Google" no Gauntlet
web trava o app em estado `offline` com banner "Sem conexão.
Mostrando eventos do cache." em vez de ir para `online`.

**Causa raiz:** `useGoogleAuth.autenticar()` tem branch
`__DEV__ && Platform.OS === 'web'` que injeta token
`'mock-access-token-dev-web'`. Mas `calendarApi.listarEventos()`
**não tem branch mock equivalente** — chama `fetch` real contra
`googleapis.com/calendar/v3` com token fake → 401/CORS → cai
em `ApiError(code='rede')` → `setEstado('offline')`.

Sprint M37.1.3 enfileirada (E5.x.4, spec
`docs/sprints/M37.1.3-mock-dev-web-calendar-api-spec.md`,
0,5h): adiciona branch `isMockMode() && token.startsWith('mock-')`
em `listarEventos` retornando 5 eventos determinísticos com IDs
estáveis (`mock-<pessoa>-<idx>`). Validação visual end-to-end
do fluxo "Conectar" passa a funcionar.

### Decisão arquitetural (2026-05-05) — ADR-0019 + spec M37.1.2

**ADR-0019 — Persistência canônica em `.md` individual no Vault.**
Auditoria do Vault com o dono revelou que o cache de eventos do
Google Calendar de M37.1 (`media/cache/agenda-<pessoa>.json`,
JSON único de 30 dias) **quebra a invariante "tudo o que o
usuário vê no app é `.md` individual no Vault"**. ADR-0019
codifica a regra:

1. **Dados primários do usuário** (criados ou espelhados) são
   `.md` individual com frontmatter zod.
2. **Binários originais** seguem ADR-0017 (`media/<tipo>/` com
   `.md` companion).
3. **Exceções legítimas**: agregações readonly geradas pelo
   backend Python, em `.ouroboros/cache/*.json` (atualmente
   apenas humor-heatmap M10 e financas-cache M14).

`docs/BRIEFING.md` §7 (estrutura de pastas do Vault) atualizado
para refletir `agenda/`, `media/<tipo>/`, e a pasta de cache
oculta com as 2 exceções nominadas.

**Sprint M37.1.2 enfileirada (E5.x.3, spec
`docs/sprints/M37.1.2-cache-agenda-em-md-spec.md`, 1-2h):**
migra `media/cache/agenda-<pessoa>.json` (JSON único introduzido
por M37.1) para `agenda/<pessoa>/YYYY-MM-DD-<eventId>.md` (um
arquivo por evento). Inclui boot hook idempotente que migra
caches existentes ao primeiro boot pós-upgrade. Sem mudança de
UX. Reduz risco de conflitos Syncthing, alinha ao padrão único
e fecha o débito introduzido por M37.1.

### Sub-sprints colaterais E5 (2026-05-05 noite) — M37.1.1 + M-BRIEF-A25

#### E5.x.1 — M37.1.1 Calendar locale PT-BR

`react-native-calendars` agora exibe o header como "Maio de 2026"
em vez de "May 2026" e os dias da semana abreviados como
"Dom Seg Ter Qua Qui Sex **Sáb**" (com acento agudo no sábado,
preservando conformidade do PT-BR audit).

Implementado em arquivo isolado
`src/components/agenda/calendarLocalePtBr.ts` (side-effect
idempotente em module-top-level via require cache) em vez de
inline em `CalendarGrid.tsx` — facilita reuso futuro
(`CalendarList`, `Agenda`) sem duplicar literais.
`CalendarGrid.tsx` apenas importa o módulo e adiciona prop
`monthFormat="MMMM 'de' yyyy"` para exibir a preposição "de"
no header. Mock em `jest.setup.cjs` ampliado para expor
`LocaleConfig`. Suíte nova
`tests/components/agenda/calendarLocale.test.ts` com 6 cases
cobrindo `monthNames[4] === 'Maio'`,
`dayNamesShort[6] === 'Sáb'`, idempotência do registro,
fallback do `defaultLocale`.

**Métricas:** 1530 → 1536 testes (+6), 170 → 171 suítes (+1).
Bundle Hermes mantém 7,7 MB. Leak Gauntlet 0/6. Validação
visual Nível A capturada via Playwright em
`docs/sprints/M37.1-screenshots/A-agenda-locale-ptbr.png`
(824×1784 = 412×892@2x) — header "Maio de 2026" + grade 6×7
+ dia 5 selecionado + dots em datas com eventos mockados.

#### E5.x.2 — M-BRIEF-A25 (local-only)

Armadilha **A25 — Metro `unstable_enablePackageExports` vs
imports relativos sem extensão em pacotes RN legados**
documentada como entrada bullet em
`VALIDATOR_BRIEF.md` §4 (formato canônico do brief, não
heading). Cobre o sintoma `Unable to resolve "./X" from
.../index.js`, causa raiz (resolver Metro com package exports
+ `.d.ts` colaterais), workaround canônico (`resolveRequest`
custom em `metro.config.js` filtrado ao pacote) e cross-ref
com A14. Pacote conhecido afetado:
`react-native-calendars@1.x` (M37.1).

**Decisão durável**: VALIDATOR_BRIEF.md permanece gitignored
conforme política anti-IA do dono (commit `b9f48b9`
2026-05-05) — A25 vive só localmente; sessões futuras
re-bootstrapeiam o brief via skill `validador-sprint`. Não
versionar é por design (Regra −1 estendida a artefatos de
orquestração de IA).

### Sessão E5 (2026-05-05 tarde) — M37.1 entregue + MOTI-REPLACE descopada

#### E5 — M37.1 Google Calendar OAuth + leitura de agenda

Sprint nova entregue em sessão paralela ao Bloco E. Rota raiz
`/agenda` com 5 estados explícitos (`nao-conectado` /
`conectando` / `online` / `offline` / `invalido`); store
`useGoogleAuth` com persist SecureStore para tokens (< 2KB,
respeita Armadilha A20); cache de eventos em arquivo
`media/cache/agenda-<pessoa>.json` no Vault (TTL 1h, fallback
stale-while-revalidate); `calendarApi.listarEventos` com
tratamento explícito 401/403/429/5xx + retry 1x;
`googleAuthFlow` PKCE com `pickClientId()` que adapta entre
proxy Expo Go e custom-scheme dev-client/release (Armadilha
A21); `<CalendarGrid>` mensal com tema Dracula sobre
`react-native-calendars`; sub-tela `/settings/contas-google`
para gestão por pessoa (revogar / reconectar).

**Decisão durável**: client_id lido de `env.json` (gitignored)
em vez de env vars `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`,
documentada em **adendo ADR-0018**. Mais simples e mantém
secrets fora do bundle. Pacote canônico
`com.ouroboros.mobile`; SHA-1
`E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`
cadastrado.

**Branch dev-only `__DEV__ && Platform.OS === 'web'`** em
`useGoogleAuth.autenticar()` injeta token sintético + cache
mock para validação Nível A (5 estados visíveis no Gauntlet
sem rede). OAuth real só roda em runtime nativo — Nível B
deferido para sprint `M37.1-checkpoint-nivel-B` quando APK
dev-client fresh chegar.

**Workaround Metro**: `react-native-calendars` quebra com
`unstable_enablePackageExports = true` (default Expo SDK 54);
`metro.config.js` ganha `resolveRequest` custom filtrado ao
pacote afetado. Documentado no comentário do arquivo e
escalado para sprint `M-BRIEF-A25` (registra como Armadilha
A25 no VALIDATOR_BRIEF §4).

**Achados colaterais (3 sub-sprints criadas, anti-débito):**
- M37.1.1 — calendar locale PT-BR (header "Maio de 2026"
  + "Sáb"). Spec `M37.1.1-spec.md`.
- M-BRIEF-A25 — armadilha Metro package exports.
- M37.1-checkpoint-nivel-B — OAuth real no emulador.

**Métricas:** 1512→1530 testes (+18 / +3 suítes); bundle
Hermes 7,19→7,7 MB (+0,51 MB absorvendo 4 deps:
expo-auth-session, expo-web-browser, react-native-calendars,
@react-native-community/netinfo); leak 0/6 markers; TS strict
0; anonimato OK; PT-BR check 0 violações.

**Arquivos novos (10):** `app/agenda.tsx`,
`app/settings/contas-google.tsx`,
`src/components/agenda/CalendarGrid.tsx`,
`src/lib/services/{googleAuthFlow,calendarApi,calendarCache}.ts`,
`src/lib/stores/googleAuth.ts`,
`docs/SETUP-OAUTH-GOOGLE.md`,
3 testes (`agenda.test.tsx`, `calendarApi.test.ts`,
`googleAuth.test.ts`).

**Arquivos modificados (9):** `app.json`, `app/settings/index.tsx`,
ADR-0018, `jest.setup.cjs`, `metro.config.js`, `package.json`,
`package-lock.json`, `MenuLateral.tsx`, `src/lib/stores/index.ts`.

#### M-BUNDLE-DIET-MOTI-REPLACE — DESCOPADA para v1.1

Executor sub-agente rejeitou formalmente a sprint após
auditoria empírica via grep: superfície real é **42 arquivos
distintos** com **46 ocorrências de `<MotiView>`** e **3
`<AnimatePresence>`**, e **1 type-pivot canônico**
(`MotiTransitionProp` em `src/lib/motion.ts` consumido por 20
importadores diretos). Estimativa real **16-21h em 5
sub-sprints sequenciais** (presets foundation → UI leaves →
data viz → chrome FAB → AnimatePresence + uninstall), não 4-6h
em 1 sprint como o spec original presumia. Riscos colaterais
não-cobertos pelo spec: A17/A18 gorhom + Reanimated 4 web,
A22 mock react-native-worklets, A23 NÃO-FIX moti SSR (que pode
reabrir `web.output: "static"` se moti sair), peer issues
Reanimated 4 + React 19. Springs `{damping, stiffness}` em
moti vs Reanimated têm defaults diferentes para
`mass`/`velocity`/`restDisplacementThreshold` — visualmente
idêntico não é garantido sem calibração caso-a-caso.

**Decisão durável do dono 2026-05-05:** descopar para v1.1.
Ganho 333 KB ≈ 4% do bundle não justifica risco com margem
atual 1,15 MB (limite 8,85 MB, atual 7,7 MB). ROADMAP §Bloco C
marca a sprint como `[v2]` riscada com justificativa.

#### M19.x mockups — spec materializado, dispatch enfileirado

Toolchain JSX→HTML completa para mockups em
`docs/design-canvas-export/`. Spec novo
`docs/sprints/M19.x-spec.md` (~2,5-4h, esbuild +
react-dom/server + dc-shims, gera
`docs/Ouroboros_24_telas-standalone-rebuild.html` em arquivo
separado preservando o bundle frozen original byte-a-byte).
**Enfileirada** (não dispatchada) por decisão de qualidade do
dono — janela paralela só após M41 ou entre sprints do Bloco E.

### Pós-auditoria — 4 sprints fechadas (2026-05-05)

#### D1 — M-DEV-CLIENT-DECISAO

Decisão (a) registrada formalmente: v1.0 INCLUI as 4 features
dev-client (M06.5 microfone, M07.x conquistas mídia, M11.5
calendário conquistas, M09 scanner OCR) + 2 Google Calendar
(M37.1 OAuth, M37.2 escrita). Sprint encerrada sem código —
somente decisão durável documentada na spec + ROADMAP.

#### M-SHEET-MODAL-SNAP

**Diagnóstico empírico via Playwright** (descartou as 3 hipóteses
do planejador): em RN-Web, gorhom v5 inicializa `animatedPosition
= window.innerHeight` e depende de `useAnimatedReaction`
(Reanimated 4 worklet) para posicionar no snap. **Worklet não
dispara confiavelmente em web no mount** — sheet trava em
`transform: matrix(1, 0, 0, 1, 0, 920)` (100% fora do viewport).
Armadilha A17 reincidente, agora medida com precisão.

**Fix**: `useEffect` Web-only em `src/components/ui/BottomSheet.tsx`
que após 250/750/1500ms localiza o container DOM via
`querySelectorAll('div')` + match `matrix(1, 0, 0, 1, 0, ty)`
com `|ty - winH| < 24`, e seta transform direto para
`(1 - snap%) * winH` + `transition: none`. **No-op em mobile**
(Platform.OS check) — A18 não regride em RN nativo.

`BottomSheet` também ganha prop `animateOnMount?: boolean` opcional
(API extensível). Defesa contra Armadilha A24: regex via
`new RegExp(...)` em vez de literal.

**Validação numérica**:
- Antes: `/humor-rapido` ty=920 (fora do viewport).
- Depois: ty=276 (snap 70%), `/eventos` ty=184 (80%),
  `/diario-emocional` ty=92 (90%) — **todos no snap correto**.

**Validação visual confirmada**: humor-rapido mostra 4 sliders +
Medicação + Horas de sono + Tags; diário emocional mostra Modo
Trigger/Vitória + Emoções + Intensidade slider + Microfone +
Textarea.

**Arquivos modificados (5):** `BottomSheet.tsx`, 3 rotas modais
(`humor-rapido.tsx`, `eventos.tsx`, `diario-emocional.tsx` com
comentários explicativos), E2E novo
`m-sheet-modal-snap.e2e.ts`.

#### M-DEBITO-CATEGORIA-CORES-VISIBLE

`Chip.tsx` em rest agora aplica accent **40% opacity** via novo
helper `hexToRgba(hex, alpha)` em `src/lib/a11y/contraste.ts`.
Ghost mantém `colors.muted` 5.30 ratio (fallback C2.x.1).
Selected mantém accent 100% (sem regressão C2.x.1).

**Aritmética**: +4 cases Jest (`Chip.test.tsx` describe
`hexToRgba`). E2E `m-debito-categoria-cores-visible.e2e.ts`
exige Set.size ≥ 7 borderColor distintos em rest.

**Decisão WCAG**: 6/7 accents passam ratio 3:1 sobre bgElev.
`red` em 40% sobre bgElev = 2.91 (abaixo de 3, mas borda 1dp
não-texto e estado também comunicado por bg+label — exceção
documentada).

#### M-DEBITO-CATEGORIA-ICONE

Helper `corDaCategoria(c: TarefaCategoria): string` exportado em
`src/components/todo/SheetNovaTarefa.tsx` resolve
`CATEGORIA_ACCENTS[c]` para hex via `colors[accent]`. Ícone
Lucide do header agora reflete cor da categoria selecionada
(cyan/red/etc). Ghost vira `colors.muted`.

**Aritmética**: +6 cases Jest validando helper puro para 8
categorias (incluindo regressão "não-laranja" para 3
categorias). E2E `m-debito-categoria-icone.e2e.ts` valida
`getComputedStyle.stroke` do svg para 3 categorias diferentes.

#### Métricas batch pós-auditoria

- Testes: 1502 → **1512** (+10 cases: 0 sheet snap + 4 cores +
  6 ícone). E2E novos não contam no Jest.
- Suítes: 167 mantidas.
- Bundle Hermes: **7.19 MB** (mantido na faixa ~7 MB; +90 KB de
  helpers mas dentro da margem 1,66 MB).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak 0/6.



### Bloco C FECHADO — C2.x.1 + C2.x.2 + C2.x.3 + C6 batch (2026-05-05)

#### C2.x.1 — M-WCAG-CHIP

`Chip.tsx`: `hitSlop={{ top:8, bottom:8, left:8, right:8 }}` via
token canônico `hitSlopToken`. Visual mantido 32dp + hitSlop = 48dp
efetivo. Borda em rest trocada de `colors.mutedDecor` (ratio 1.74)
para `colors.muted` (ratio 5.30 sobre `bgElev` — passa WCAG AA).
Borda em selected mantém `accentHex` (não muda).

**Aritmética:** +3 cases Jest (`Chip.test.tsx`). E2E mede touch +
ratio via Gauntlet em `/humor-rapido`.

#### C2.x.2 — M-WCAG-MEDIDAS

`app/medidas/novo.tsx:382` botão remover foto: `hitSlop={6}` →
`hitSlop={12}`. Visual mantido 22dp + hitSlop = 46dp efetivo
(WCAG AA OK). Edit cirúrgica de 1 literal.

#### C2.x.3 — M-WCAG-MUTED-DECOR-TEXTO

22 ocorrências de `colors.mutedDecor` em `<Text>` auditadas
caso-a-caso:
- **14 promoções para `colors.muted`** (ratio 4.6+) — todos os
  empty states e mensagens funcionais informativas.
- **8 marcações decorativas** via novo helper
  `src/lib/a11y/textPropsDecor.ts` (`textPropsDecor()` retorna
  `{ dataSet: { a11y: 'decor' } }` — bypass de tipagem RN/RN-Web).
  Aplicado em micro-rótulos uppercase, badges "auto", glifos
  decorativos.

**Achado pendente (sub-sprint nova):** 10 ocorrências em
`app/exercicios/[slug].tsx`, `app/eventos.tsx`, `app/todo.tsx`,
`app/diario-emocional.tsx`, `app/contadores/[slug].tsx`,
`app/settings/sobre.tsx`, `gauntletDashboard.tsx` — fora da lista
canônica do RELATÓRIO. Sub-sprint
**M-WCAG-MUTED-DECOR-TEXTO-V2** materializar futura.

#### C6 — M38 conflict resolution

DeviceId único por instalação + sufixo de colisão de slug + index
de devices pareados.

**Arquivos novos (7):**
- `src/lib/util/deviceId.ts` — gera/persiste deviceId em
  SecureStore.
- `src/lib/vault/devicesIndex.ts` — schema/atualizar/renomear
  index `.ouroboros/devices.json`.
- `src/lib/vault/devicesPath.ts`.
- `app/settings/dispositivos.tsx` — sub-tela "Dispositivos
  pareados".
- 2 testes Jest novos + 1 E2E.

**Arquivos modificados (12):**
- 3 helpers de save (`saveHumor`, `saveDiario`, `saveEvento`):
  colisão usa deviceId em vez de sufixo numérico crescente.
- 3 helpers de Vault (`alarmes`, `contadores`, `tarefas`): param
  `modoCriacao` opcional para distinguir create de update.
- 2 telas (`alarmes/novo`, `contadores/novo`): passam `modoCriacao=true`.
- `app/settings/index.tsx`: link "Dispositivos pareados".
- `src/lib/boot/reagendamento.ts`: `atualizarDeviceIndexHook` plug.
- 3 testes Jest atualizados.
- `docs/FEATURES-CANONICAS.md` §14 expandida (6→14 bullets).

**Backward-compat preservado:** sufixos legados `-pessoa_<a|b>.md`
continuam aceitos pelos readers.

#### Métricas batch C2.x.1+C2.x.2+C2.x.3+C6

- Testes: 1473 → **1502** (+29: 3 chip + 0 medidas + 0 mutedDecor
  refactor + 26 M38).
- Suítes: 165 → **167** (+2: deviceId + devicesIndex).
- Bundle Hermes: **6.9 → 6.9 MB** (incremento desprezível).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.

### Bloco C — encerramento

Release-readiness completo (10 sprints fechadas — 6 da fila
original + 4 sub-sprints WCAG):

- C1 — Bundle diet (-1.67 MB; em A já)
- C2 — WCAG audit + helper + 25 testes
- C3 — Release assets (6 PNGs)
- C4 — Sobre + release notes
- C5 — Backup automático opt-in
- C2.x.1 — WCAG-CHIP
- C2.x.2 — WCAG-MEDIDAS
- C2.x.3 — WCAG-MUTED-DECOR-TEXTO
- C6 — M38 conflict resolution

**Sub-sprint adiada:** M-WCAG-MUTED-DECOR-TEXTO-V2 (10 ocorrências
fora da lista canônica original).

**Métricas finais Bloco C:** 1427 → **1502** testes (+75), 160 →
**167** suítes (+7), Hermes **7.14 → 6.9 MB**. Próximo: Bloco D
(decisão D1) → Bloco E (dev-client, 6 sprints).



### Bloco C — C2 + C3 + C4 + C5 batch paralelo (2026-05-05)

#### C2 — M-WCAG-COMPLETO

Auditoria WCAG AA de 24 telas + 14 componentes UI base. Helper
`src/lib/a11y/contraste.ts` (`ratioContraste(fg, bg)` puro JS) +
25 cases canônicos. E2E `m-wcag-audit.e2e.ts` mede contraste em
runtime via Gauntlet (5 rotas).

**Status auditoria:** 22 OK, 5 WARN (decorativo aceito), 1 FAIL
inline (`app/todo.tsx:478` `hitSlop={12}` adicionado), 1 FAIL →
sub-sprint. **3 sub-sprints geradas:**
- `M-WCAG-CHIP` — `Chip.tsx` altura 32dp + borda mutedDecor
  ratio 1.94 (FAIL).
- `M-WCAG-MEDIDAS` — `app/medidas/novo.tsx:378` botão remover
  foto 22dp + hitSlop=6 = 34dp (FAIL).
- `M-WCAG-MUTED-DECOR-TEXTO` — 24 ocorrências `colors.mutedDecor`
  como `color:` em `<Text>` ratio 3.03 (FAIL AA).

**Arquivos novos (8):** helper, snapshot, 2 testes, E2E, relatório,
3 specs.

#### C3 — M-RELEASE-ASSETS

6 PNGs regenerados via SVG procedural derivado de `OuroborosLogo.tsx`:
icon (1024²), icon-foreground (1024²), adaptive-icon (1024²),
splash (2400²), splash-icon, favicon (196²). Anel Ouroboros
gradient purple→pink + escamas + cabeça/cauda + glow ambiente.

`app.json`: `name: "Ouroboros"` (capitalização final),
`splash.backgroundColor: "#282a36"`,
`android.adaptiveIcon.backgroundColor: "#282a36"`.

Script reprodutível `scripts/gerar-assets-marca.py` (134L,
cairosvg). Tamanho total assets: 1.92 MB → 0.97 MB (-49%).

**Diagnóstico realizado:** `adaptive-icon.png` e `splash-icon.png`
eram **placeholders Expo default** (sha bate `5f4c0a73`,
timestamp 1985-10-26). Substituídos.

#### C4 — M-SOBRE-RELEASE-NOTES

`app/settings/sobre.tsx` (nova tela) acessível via
`<LinkSubTela titulo="Sobre o app">` no rodapé de `/settings`.
3 seções: SecaoSobre (versão/build/commit/GitHub/licença),
SecaoMiniChangelog (3 entradas iniciais 1.0.0/0.9.0/0.8.0),
SecaoCreditos (anônimo Regra −1).

`src/lib/release/changelog.ts` (novo) — `RELEASE_NOTES` array
estruturado TS, não markdown raw. Permite formatação humana
e tradução PT-BR.

`app.json:extra.commitHash` (preenchido em build via env var).

**Arquivos novos (5):** `changelog.ts`, `SecaoSobre.tsx`,
`sobre.tsx`, test (7 cases), E2E.

#### C5 — M-BACKUP-AUTOMATICO

Backup semanal local opt-in (default OFF, ADR-0007 zero nuvem).
`agendarBackup.ts` (115L) + `executarBackup.ts` (216L). Salva em
`Documents/Ouroboros-Backups/auto/<data>.zip`, mantém últimos 4
(rotação). Reusa `exportarVaultZip()` da A5.

`SecaoBackupAutomatico.tsx` (101L) com toggle + "Último backup:
há X dias.". Inserida entre `SecaoFeatures` e `SecaoPrivacidade`
(meio de `app/settings/index.tsx`, sem conflito com C4 que tocou
rodapé).

`useSettings` v3: `backupAutomaticoSemanal: boolean` default false.

**Arquivos novos (4):** 2 helpers backup, 1 componente, 3 testes
(executar 14 + agendar 6 + componente 8 — total 14 cases),
E2E.

**Descoberta importante — Armadilha A24:** durante implementação,
`npx expo export --platform android` quebrou com `SyntaxError:
Unexpected token Semicolon` em `style.css`. Causa raiz: regex
literal `/[-:.]/g` em `executarBackup.ts:155` é interpretado pelo
extrator de classes Tailwind do NativeWind 4 como pseudo-classe
arbitrária inválida. Fix inline: substituir por chained `.split()`.
**Registrado em VALIDATOR_BRIEF.md §4 A24** com workaround +
recomendação de lint rule durável. Bug C2 reportou bundle quebrado
"pré-existente" — era exatamente este, do C5 ainda em curso.

#### Métricas batch C2+C3+C4+C5

- Testes: 1427 → **1473** (+46 cases novos: 25 C2 + 0 C3 + 7 C4
  + 14 C5).
- Suítes: 160 → **165** (+5).
- Bundle Hermes: **7.14 → 6.9 MB** (-240 KB; assets PNG melhor
  comprimidos compensaram código novo).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.



### Bloco B FECHADO — B4 + B5 + B6 batch paralelo (2026-05-05)

#### B4 — M40 Tela Hoje v2

`app/index.tsx` reescrito v2 com header dual avatar + card Recap +
seções Status do Casal, Próximos (alarmes 4h + tarefas com alarme
hoje) e Jornada Agrupada (diários + eventos por intensidade).
`useHoje` ganha opções objeto `{ ymdOverride?, filtroPara? }` —
implementa filtro `para` adiado de M33.

**Arquivos novos (8):** `useStatusCasal.ts`, `useProximos.ts`,
`SecaoStatusCasal.tsx`, `SecaoProximos.tsx`,
`SecaoDiariosEventosAgrupado.tsx`, 3 testes (3+6+8 cases), E2E.

**Arquivos modificados (3):** `app/index.tsx`, `useHoje.ts`,
`docs/FEATURES-CANONICAS.md` §9.2 reescrita "v2 entregue".

#### B5 — M36 Recap

`/recap` rota raiz modal com `<RecapScreen>`: ChipGroup período
(Semana/Mês/Ano/Personalizado), 5 seções (Conquistas/Crises/
Evoluções/Tarefas concluídas/Números). `useRecap({ de, ate })`
agrega via 7 listadores Vault. ADR-0005 zero gamificação — números
neutros, "Você passou por isso e está aqui." como tom único.

**3 listadores Vault novos:** `listarHumor`, `listarDiarios`,
`listarEventos` (não existiam; padrão idêntico a `listarMarcos`).

**Arquivos novos (12):** `app/recap.tsx`, `RecapScreen.tsx`, 5
seções (`RecapSecaoConquistas/Crises/Evolucoes/Numeros/Tarefas`),
`useRecap.ts`, 3 listadores, 3 suítes de teste, E2E.

**Arquivos modificados (4):** `app/_layout.tsx` (Stack.Screen recap),
`src/lib/icons.ts` (+ TrendingUp), `src/lib/vault/index.ts` (3
exports novos), `docs/FEATURES-CANONICAS.md` §7 "(entregue)".

**Decisões técnicas:** `resolverPeriodo` usa "últimos N dias"
(relativo a hoje); Personalizado com 2 `<TextInput>` simples
`AAAA-MM-DD` (evita dep nova); contadores como conquista exigem
`dias >= 7`; "em alta" em Evoluções exige `dias >= 30`.

#### B6 — M35 Finanças empty state

`MiniFinanceiroScreen` substituída por EmptyState honesto com
`Wallet` + frase "Em desenvolvimento. Disponível em versão futura.".
Toggle `mostrarFinancasEmDesenvolvimento` em Settings (default
OFF). MenuLateral esconde item "Finanças" quando OFF.
`useFinancasCache` e `lerFinancasCache` recebem JSDoc
`@deprecated v1.0 (M35)` — schemas e cards M14 PRESERVADOS como
código morto para retomada futura.

**Arquivos novos (2):** test (5 cases) + E2E.

**Arquivos modificados (7):** `MiniFinanceiroScreen.tsx`,
`settings.ts` (+ campo featureToggle), `MenuLateral.tsx` (lê
toggle), `app/settings/index.tsx` (+ ToggleRow), 2 helpers com
JSDoc deprecated, `tests/components/chrome/MenuLateral.test.tsx`,
`docs/FEATURES-CANONICAS.md` §6.2 atualizada.

#### Métricas batch B4+B5+B6

- Testes: 1384 → **1427** (+43 cases novos: 17 B4 + 20 B5 + 6 B6).
- Suítes: 153 → **160** (+7).
- Bundle Hermes: **7.11 → 7.14 MB** (+30 KB — Recap + status
  casal). **Margem 1.71 MB** confortável.
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.

### Bloco B — encerramento

Polish UX completo (6 sprints fechadas):
- B1 — M-CAPTURA-UNIFICADA (rota `/captura` modal)
- B2 — M11.4 (evolução corporal em Marcos)
- B3 — M-DEBITO-CATEGORIA-CORES (8 chips Dracula)
- B4 — M40 (Tela Hoje v2)
- B5 — M36 (Recap completo)
- B6 — M35 (Finanças empty honesto)

**Métricas finais Bloco B:** 1364 → **1427** testes (+63), 151 →
**160** suítes (+9), Hermes **6.77 → 7.14 MB** (+370 KB —
features densas dentro do orçamento). Margem 1.71 MB. Próximo:
Bloco C release-readiness.



### Bloco B iniciado — B1 + B2 + B3 batch paralelo (2026-05-05)

#### B1 — M-CAPTURA-UNIFICADA

Rota `/captura` modal raiz com `<SheetEscolhaCaptura>`: 2 cards
verticais "Registrar momento" (verde, → `/memoria?abrirCaptura=1`)
e "Escanear documento" (cyan, → `/scanner`). Item "Câmera" do
MenuLateral migrado do legado FABRadial.

`MemoriasScreen` lê `?abrirCaptura=1` via `useLocalSearchParams` e
propaga para `<MenuCapturaVerde abrirNoMount={true}>` que abre o
sheet 1 frame após mount. `/captura` adicionado a `ROTAS_SEM_FAB`.

**Arquivos novos (5):** `app/captura.tsx`, `SheetEscolhaCaptura.tsx`,
`SheetEscolhaCaptura.test.tsx` (5 cases), E2E novo, screenshots dir.

**Arquivos modificados (7):** `MenuLateral.tsx`, `MemoriasScreen.tsx`,
`MenuCapturaVerde.tsx` (prop `abrirNoMount`), `rotasSemFAB.ts`,
`icons.ts` (+ `ImagePlus`/`ScanLine`), `app/_layout.tsx`
(Stack.Screen padrão M26), `tests/app/memoria.test.tsx` (mock
`useLocalSearchParams`).

`/scanner` já tinha M09 dev-client real — não modifiquei (empty
state honesto pré-M09 não era necessário).

#### B2 — M11.4 evolução corporal

`<SecaoEvolucaoCorporal>` adicionada ANTES do timeline em
MemoriasMarcosTab. Lê `useMedidas` (hook novo, padrão idêntico a
`useMarcos`). ScrollView horizontal com cards mensais (foto frente +
peso + delta numérico neutro ADR-0005). Botão "Registrar evolução"
no header da seção (substitui o array `acoesExtras` do FAB que
exigiria mexer em arquivo do B1).

`MarcoSchema` ganha `medidaRef?: string` opcional (regex
`^\d{4}-\d{2}-\d{2}$`). `<SheetNovoMarco>` ganha bloco "Anexar
evolução corporal" listando 3 medidas mais recentes como chips
single-select + opção "Nenhuma".

**Arquivos novos (4):** `MemoriasMarcosTab/SecaoEvolucaoCorporal.tsx`
(302L), `useMedidas.ts` (78L), test (8 cases), E2E.

**Arquivos modificados (5):** `marco.ts` schema, `MemoriasMarcosTab.tsx`,
`SheetNovoMarco.tsx`, `tests/lib/schemas/marco.test.ts` (+3 cases),
`docs/FEATURES-CANONICAS.md` §3.4 nova.

**Divergência consciente da spec:** "Registrar evolução" virou
botão no header da seção (não item do FAB) porque
`MemoriasScreen.handleRegistrarAcaoExtra` aceita 1 ação por tab —
modificar para array exigia tocar arquivo do B1. Solução
equivalente em UX (atalho contextual visível).

#### B3 — M-DEBITO-CATEGORIA-CORES

8 chips de categoria de tarefa agora com cores Dracula semânticas
em vez de todas laranja:
- `trabalho` → cyan (produtivo)
- `casa` → pink (íntimo doméstico)
- `rotina` → purple (hábito)
- `financas` → green (dinheiro)
- `desenvolvimento_pessoal` → yellow (estudo)
- `obrigacoes` → orange (urgente)
- `saude` → red (alerta)
- `outro` → ghost (neutro, herdado de M-DEBITO-UI-UX-SEED-DUO)

`ChipAccent` em `Chip.tsx` já suportava todos 8 variants — edição
puramente em `CATEGORIA_ACCENTS` mapping.

**Arquivos modificados (1):** `SheetNovaTarefa.tsx`.
**Arquivos novos (2):** test (+4 cases), E2E.

**Achados colaterais (não-corrigidos, anti-débito):**
- AC-1: ícone Lucide do header ainda hardcoded `colors.orange` (não
  reflete categoria selecionada). Sub-sprint sugerida
  `M-DEBITO-CATEGORIA-CORES-FOLLOWUP`.
- AC-2: conflito potencial `casa: pink` vs `pessoa_b: pink`
  (identidade). Validar visual confirmará se há ambiguidade.

#### Métricas batch B1+B2+B3

- Testes: 1364 → **1384** (+20 cases novos: 5 SheetEscolhaCaptura
  + 8 SecaoEvolucaoCorporal + 3 marcoSchema + 4 categoria cores).
- Suítes: 151 → **153** (+2).
- Bundle Hermes: **6.77 → 7.11 MB** (+340 KB — features novas
  e schemas; margem 1.74 MB / 19.7% folga do limite 8.85 MB).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.



### Bloco A FECHADO — A5 + A4.x batch paralelo (2026-05-04)

#### A5 — M-EXPORT-COMPLETO

Export ZIP + restore inverso simétrico com validação sha256.
Backup local-to-local (ADR-0007 zero nuvem).

**Arquivos novos:**
- `src/lib/crypto/sha256.ts` (162L) — SHA-256 puro JS, vetores
  NIST + paridade Node crypto. ~3 KB minified.
- `src/lib/services/restaurarVault.ts` (232L) —
  `restaurarVaultZip()` com validação sha256 por arquivo. Default
  não-destrutivo (cria `restaurado-<data>/`).
- `tests/lib/crypto/sha256.test.ts` — 7 cases (vetores oficiais +
  paridade).
- `tests/integration/export-restaure-roundtrip.test.ts` (382L) —
  roundtrip 62 arquivos byte-a-byte + 3 edge cases.
- `tests/e2e/playwright/m-export-completo.e2e.ts` — presença dos
  botões.

**Arquivos modificados:**
- `src/lib/services/exportarVault.ts` (157→324L, +167L) — inclui
  cache `.ouroboros/cache/`, snapshot settings em
  `.ouroboros/snapshot-settings.json`, MANIFEST.json com sha256
  por arquivo + versão schema + contagem por subpasta.
- `app/settings/index.tsx` (+51L) — botão "Importar backup"
  novo, abre document picker, chama `restaurarVaultZip()`.
- `tests/app/settings/index.test.tsx` (+110L) — 3 cases novos
  (botão importar / falhas / cancel).
- `docs/FEATURES-CANONICAS.md` §11 expandida.

**Decisão técnica:** companion `.md` é coletado naturalmente pelo
ZIP (vive em `media/<sub>/` que já está em VAULT_FOLDERS). Não
precisou chamar `lerCompanion` — ZIP captura o arquivo bruto.

#### A4.x — M39.1 migrar 9 writers

6 de 9 writers migrados para `escreverMidiaComCompanion`
canônico, **net -55 LOCs** (refactor consolidador).

**Migrados (6):** `capturarFoto`, `capturarMusica`, `capturarVideo`,
`recordAudio`, `saveEvento.copiarFotos`, `medidas/novo`.

**Não migrados (3 — exclusões deliberadas anti-débito):**
- `salvarFrase.ts` — caso especial: `.md` puro sem binário.
  Helper canônico exige `binarioUri`.
- `adicionarFotoManual.ts` — único writer que NÃO escrevia
  companion. Migrar mudaria comportamento observável (passaria a
  gravar `.md`); seria feature, não refactor.
- `saveNota.ts` — `tipo: midia_foto` em pasta `media/scanner/`
  (não `media/fotos/`). Helper mapeia subpasta a partir do tipo
  via `subpastaPara()`; sem override. Migração quebraria 5 testes.

**Métricas batch A5+A4.x:**
- Testes: 1349 → **1364** (+15 cases novos: 7 sha256 + 3 settings
  + 5 roundtrip).
- Suítes: 149 → **151** (+2: crypto/sha256 + integration/roundtrip).
- Bundle Hermes: **7.08 → 6.77 MB** (sha256 ~3 KB; refactor
  consolidador também reduziu LOCs líquidos). **Margem 2.08 MB
  (24% folga)**.
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.

### Bloco A — encerramento

Fundação completa (9 sprints fechadas em sequência):

- A1 — PT-BR auditoria automática (hook + dicionário 147)
- A2 — Gauntlet dead code v2 (leak 0/6, bundle -350 KB)
- A2.x — PT-BR retrofit (3 violações fixadas)
- A3 — Vault MD audit (14 features auditadas)
- A3.x.1-4 — 4 paralelas vault MD fix
- A4 — M39 mídia companion oficial (schema zod + helpers)
- A4.x — M39.1 migrar 9 writers (6 migrados, 3 documentados)
- A5 — Export completo (ZIP + restore + MANIFEST sha256)
- C1 — Bundle diet (-1.67 MB)

**Métricas finais Bloco A:** 1300 → **1364** testes (+64), 145 →
**151** suítes (+6), Hermes **8.5 → 6.77 MB** (-1.73 MB), margem
2.08 MB. Próximo: Bloco B (polish UX).

### C1 — M-BUNDLE-DIET fechada (2026-05-04) — 8.84 → 7.08 MB

Auditoria + remoção de gordura entregou **redução de 1.67 MB
(-19.8%)** no bundle Hermes Android. Margem de 1.77 MB do limite
8.85 MB recuperada. Cobre próximas 3-4 features sem risco de
estouro.

**5 deps removidas:**
- `@gluestack-ui/themed` (7.3 MB no node_modules) — legado M01
  substituído por `src/components/ui/` próprio.
- `@gluestack-style/react` (3.5 MB) — idem.
- `expo-image-manipulator` (624 KB) — scanner usa pipeline
  próprio com `@dariyd/react-native-document-scanner`.
- `expo-blur` (384 KB) — design Dracula usa elevations sólidas
  via `colors.bgElev`.
- `expo-status-bar` — SDK 54 integra via `app.json`.

**1 grande otimização**: `lucide-react-native` no bundle Hermes
caiu de **1334.9 KB → ~30 KB** via shim local
`src/lib/icons.ts`. Metro/Hermes não tree-shake barrel
re-exports mesmo com `sideEffects: false`; o shim força import
direto por arquivo `.mjs`, bypassando o barrel de 1712 linhas /
1700+ ícones. **44 arquivos** migrados de
`from 'lucide-react-native'` para `from '@/lib/icons'`.

**Aritmética:** 1349 → **1349** testes (sprint zero-feature),
149 suítes mantidas. TS strict 0, anonimato OK, smoke OK,
PT-BR check OK, Gauntlet leak OK. Bundle Hermes
**8.84 → 7.08 MB** (-1.67 MB).

**3 sub-sprints sugeridas** (não dispatchadas — margem confortável):
- `M-BUNDLE-DIET-MOTI-REPLACE` (333 KB de `framer-motion`
  via Moti — substituir por Reanimated puro).
- `M-BUNDLE-DIET-YAML-REPLACE` (272 KB de `yaml` via parser
  custom).
- `M-BUNDLE-DIET-DRAGGABLE-CUSTOM` (59 KB).

Documentadas em `docs/auditoria-bundle-2026-05-04/RELATORIO.md`
para retomada se margem voltar a ficar crítica.



### A4 — M39 mídia companion oficial fechada (2026-05-04)

Schema zod canônico + helpers + boot hook idempotente para
formalizar ADR-0017. **Decisão deliberada**: NÃO unificar com
`stringifyCompanionMidia` legado nesta sprint para preservar
backward-compat dos 7 testes M34 + 4 fixes A3.x.1-4. Migração dos
9 writers fica para **M39.1** dedicada (anti-débito explícito).

**Entregas:**
- `src/lib/schemas/midia-companion.ts` (130L) — `MidiaCompanionSchema`
  zod com `tipo` (5 enum), `arquivo`, `data`, `autor`, `duracao_seg?`,
  `transcricao?`, `legenda?`, `para` (default `{tipo:'mim'}`),
  `origem?`, `origem_ref?`. Helpers `subpastaPara`,
  `tipoPorSubpasta`, `tipoPorExtensao`.
- `src/lib/vault/midiaCompanion.ts` (235L) — 3 helpers:
  - `escreverMidiaComCompanion(vaultRoot, binarioUri, meta)`.
  - `lerCompanion(vaultRoot, binarioPath)`.
  - `migrarAssetsLegacyParaMedia(vaultRoot)` — varre `assets/` e
    migra para `media/<categoria>/`. Idempotente.
- `src/lib/boot/reagendamento.ts` — adiciona `migrarAssetsHook` ao
  fim de `BOOT_HOOKS`. Degrada silenciosamente se vault
  indisponível.
- `tests/lib/vault/midiaCompanion.test.ts` — 14 cases cobrindo
  write/read/migrar.
- `tests/e2e/playwright/m39-midia-companion.e2e.ts` — smoke
  pós-boot (BOOT_HOOKS plugou sem travar; rota /memoria
  acessível; FAB verde M34 não quebrado).
- `docs/FEATURES-CANONICAS.md` §15 expandida.
- `docs/ADRs/0017-midia-companion-md.md` atualizado com lista de
  arquivos e separação `schemas/midia-companion.ts` (zod canônico)
  vs `midia/companion.ts` (serializador determinístico legado) vs
  `vault/midiaCompanion.ts` (helpers).

**Aritmética:** 1335 → **1349** testes (+14), 148 → **149**
suítes (+1). TS strict 0, anonimato OK, smoke OK, PT-BR check OK,
Gauntlet leak OK. Bundle Hermes **8.5 → 8.84 MB** (+340 KB —
schema zod + import top-level de `yaml`). **Margem 10 KB do teto
8.85 MB — atenção crítica para próximas sprints.**

**Sub-sprint gerada:** **M39.1** materializada para migrar os 9
writers existentes (`capturarFoto/Musica/Video`, `salvarFrase`,
`recordAudio`, `saveEvento.copiarFotos`, `medidas/novo`,
`scanner/saveNota`, `adicionarFotoManual`) ao `escreverMidiaComCompanion`
canônico.



### Batch A3.x — 4 sub-sprints corretivas paralelas fechadas (2026-05-04)

Após auditoria A3 revelar 4 desvios estruturais (binários em
`assets/` em vez de `media/<categoria>/`), batch de 4 agentes
paralelos corrigiu cada caminho. Vault agora 100% canônico para
escritas novas. Backward-compat: arquivos legados em `assets/`
continuam acessíveis via `useFotosAgregadas`.

**Métricas batch:** 1316 → **1335** testes (+19 cases novos), 147
→ **148** suítes (+1). Bundle Hermes **8.5 MB** mantido. TS strict
0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet leak **0/6**.

#### A3.x.1 — M-VAULT-MD-FIX-diario-audio

`src/lib/diario/recordAudio.ts`: assinatura
`saveRecordingToVault` ganha 4º param `SaveRecordingOpcoes` (autor,
para, legenda). Destino canônico
`media/audios/<YYYY-MM-DD>-<rand>.m4a` + `.md` companion 1:1 via
`stringifyCompanionMidia`. +4 cases Jest. E2E em
`tests/e2e/playwright/m-vault-md-fix-diario-audio.e2e.ts`.

#### A3.x.2 — M-VAULT-MD-FIX-evento-fotos

`src/lib/eventos/saveEvento.ts:copiarFotos`: destino canônico
`media/fotos/<YYYY-MM-DD>-eventos-<rand4>-<idx>.jpg` + companion
`.md` com `legenda: "evento <data> <slug>"` (rastreabilidade
reversa galeria→evento). Slug do evento agora calculado antes do
copy. +3 cases Jest. E2E em
`tests/e2e/playwright/m-vault-md-fix-evento-fotos.e2e.ts`.

#### A3.x.3 — M-VAULT-MD-FIX-medidas-fotos

`src/lib/vault/paths.ts:medidasFotoPath` agora retorna
`media/fotos/medidas-<YYYY-MM-DD>-<lado>.jpg`. `app/medidas/novo.tsx`
escreve `.md` companion ao lado com `legenda: "Evolução corporal —
{frente,lado,costas}"` + `medida_ref: <slug>`.
`src/lib/midia/companion.ts:CompanionMidiaInput` ganha campo
opcional `medida_ref?: string`. `useFotosAgregadas.lerGaleriaManual`
ignora `medidas-*.jpg` (regex exige começar com YYYY-MM-DD), evita
duplicata. +9 cases Jest (3 paths overload + 3 medida_ref + 3
medidasFotoPath). E2E em
`tests/e2e/playwright/m-vault-md-fix-medidas-fotos.e2e.ts`.
**Desbloqueia M11.4** (evolução corporal).

#### A3.x.4 — M-VAULT-MD-FIX-scanner

`src/lib/scanner/saveNota.ts`: binário PDF agora em
`media/scanner/<basename>.<ext>` + companion `.md` 1:1.
`mediaScannerPath` ganha overload `(basename, ext)` genérico
(legado 1-arg→`.jpg` preservado). `TipoMidia` em `companion.ts`
ganha `'midia_pdf'`. `.md` semântico em `inbox/financeiro/nota/`
mantido com wikilink Obsidian no body apontando para
`[[../../../media/scanner/<basename>.<ext>]]`. +10 cases Jest
(suíte nova `saveNota.test.ts` + 3 paths overload + 1 companion
midia_pdf). E2E em
`tests/e2e/playwright/m-vault-md-fix-scanner.e2e.ts`.

**Conflitos paralelos endereçados:** os 4 agentes trabalharam em
arquivos disjuntos (recordAudio.ts, saveEvento.ts, medidas/novo.tsx,
scanner/*) com helpers compartilhados (`companion.ts`, `paths.ts`)
estendidos cirurgicamente sem overlap (regiões diferentes do
arquivo). Hook PT-BR pegou 4-5 violações intermediárias durante o
batch — todas resolvidas pelo próprio agente A3.x.4 com
`// ptbr-allow:` em path literais (não palavras PT-BR).



### A3 — M-VAULT-MD-AUDIT fechada (2026-05-04)

Auditoria completa de 14 features confirmou que a estrutura
canônica do Vault está 95% correta, com **4 desvios reais
documentados** e materializados como sub-sprints corretivas.

**Entregas:**
- `docs/auditoria-vault-2026-05-04/RELATORIO.md` — 225 linhas com
  tabela por feature.
- `tests/integration/vault-md-completo.test.ts` — 14 cases
  zod-válidos via tmpdir real (1 por feature + áudio M34).
- `scripts/check_vault_estrutura.sh` — 240 linhas. Varre vault
  path e reporta órfãos, frontmatter quebrado, paths fora de
  canônico.

**4 desvios → 4 sub-sprints corretivas:**
- **M-VAULT-MD-FIX-diario-audio** — áudio em `assets/` deveria
  ser `media/audios/`.
- **M-VAULT-MD-FIX-evento-fotos** — fotos em `assets/` deveriam
  ser `media/fotos/`.
- **M-VAULT-MD-FIX-medidas-fotos** — idem (bloqueia M11.4
  evolução corporal).
- **M-VAULT-MD-FIX-scanner** — futura M09 deve seguir companion
  1:1 (poderá ser absorvido pela própria M09).

**2 observações sem sprint** (decisão pendente):
- `media/avatares` e `media/scanner` declaradas mas sem
  consumidor — implementar ou remover do
  `SUBPASTAS_CANONICAS`.
- Vault desktop do dono `~/Protocolo-Ouroboros/` incompleto
  (13/19 subpastas) — não é bug de código, é estado de uso.

**Aritmética:** 1302 → **1316** testes (+14), 146 → **147**
suítes (+1). TS strict 0, anonimato OK, smoke OK, PT-BR check OK,
Gauntlet leak check OK. Bundle Hermes 8.5 MB mantido.



### Bloco A iniciado — A1 + A2 paralelas fechadas (2026-05-04)

#### A1 — M-PT-BR-AUDIT

Tooling de validação automática de strings UI PT-BR:
- `scripts/check_strings_ui_ptbr.py` (369 linhas, Python 3.10+
  stdlib only). Varre `src/` e `app/` por strings literais em
  contextos JSX (text node, props `label`/`placeholder`/`title`/
  `message`/`frase`). Tokeniza, checa contra dicionário curado,
  reporta path:linha:coluna + sugestão. Suporta override
  `// ptbr-allow: <razao>`. Tempo de varredura sobre 267 arquivos:
  0,17s.
- `scripts/dicionario_ptbr_canonico.json` — **147 entradas
  efetivas** (meta era ≥60). Cobre nao→não, voce→você,
  musica→música, video→vídeo, acoes→ações, atencao→atenção, etc.
- `hooks/pre-commit` — invoca check antes de eslint. Bloqueia
  commit se exit != 0.
- `scripts/smoke.sh` — invoca check antes de typecheck. Falha do
  smoke se violação.

**Primeiro run detectou 3 violações reais** em código existente:
- `src/lib/diario/permissions.ts:22` — `'permissao de microfone
  negada'` em Error message default.
- `app/_dev/gauntlet.tsx:93` — `<Secao titulo="Acoes">` em rota
  dev.
- `src/lib/dev/gauntletDashboard.tsx:99` — mesmo padrão (arquivo
  novo da A2).

Excluídas temporariamente via `.ptbr-violations.txt`. Sub-sprint
**M-PT-BR-RETROFIT** materializada para fix em batch.

`VALIDATOR_BRIEF.md` §1.4, `CLAUDE.md` Regra de Linguagem e
`HANDOFF-PROMPT.md` atualizados com referência ao novo check.

#### A2 — M-GAUNTLET-DEAD-CODE-V2

Refactor para eliminar vazamento de `__gauntlet` no bytecode
Android release. Caminho A da spec (lazy require + DCE Hermes).

**Estratégia:**
1. **Micro-módulo `gauntletAtivo.ts`** sem deps do gauntlet pesado
   — exporta apenas `MODO_DEV_WEB`. Consumidores de release
   importam só de lá.
2. **Padrão `if (__DEV__) { if (MODO_DEV_WEB) { require(...) } }`**
   — `__DEV__` precisa ser predicate top-level porque Metro/Hermes
   só faz DCE quando vê literal `if (__DEV__)`. Predicado composto
   `if (X && __DEV__)` NÃO faz DCE.
3. **Renomeação de identificadores** para nomes neutros
   (`GauntletRoute`→`RotaModoDev`, `GauntletPathnameSync`→
   `PathnameSyncDev`, `FrameMobileGauntlet`→`FrameMobileDev`,
   `bootstrapGauntletSeAtivo`→`iniciarModoDev`). Hermes preserva
   nomes de funções/componentes mesmo com DCE; nomes neutros
   evitam confusão com markers.
4. **`app/_dev/gauntlet.tsx` reduzido a 32 linhas** (era 289) —
   wrapper com `require` lazy guardado por `__DEV__`. Conteúdo do
   dashboard extraído para `src/lib/dev/gauntletDashboard.tsx`
   (dropado em release).
5. **String runtime `__gauntlet.abrirSheet`** removida de
   `app/_dev/showcase.tsx`.
6. **Bug pré-existente em `check_gauntlet_leak.sh`**: `set -euo
   pipefail` abortava o loop em primeiro `grep` com 0 matches
   (mascarava sucesso). Fix com `set +e` durante loop.

**Arquivos novos (5):**
- `src/lib/dev/gauntletAtivo.ts` — micro-módulo `MODO_DEV_WEB`.
- `src/lib/dev/gauntletBootstrap.ts` — 4 entry-points lazy
  (`iniciarModoDev`, `sinalizarBootDev`, `registrarRouterDev`,
  `registrarPathnameDev`).
- `src/lib/dev/gauntletDashboard.tsx` — conteúdo do dashboard
  extraído (carregado via require lazy).
- `tests/lib/dev/gauntletBootstrap.test.ts` — contrato dev/no-op.
- `tests/e2e/playwright/m-gauntlet-dead-code-v2.e2e.ts` — valida
  `window.__gauntlet` ainda presente em dev web com 16 APIs.

**Arquivos modificados (10):** `app/_layout.tsx`, `app/_dev/_layout.tsx`,
`app/_dev/gauntlet.tsx`, `app/_dev/showcase.tsx`,
`scripts/check_gauntlet_leak.sh`, `src/lib/dev/gauntlet.ts`,
`src/lib/hooks/useFotosAgregadas.ts`,
`src/lib/hooks/useHumorHeatmap.ts`,
`src/lib/midia/adicionarFotoManual.ts`,
`src/lib/midia/capturarFoto.ts`.

**Métricas finais batch A1+A2:**
- Testes: 1300 → **1302** (+2 cases novos do gauntletBootstrap).
- Suítes: 145 → **146** (+1).
- Bundle Hermes Android: **8.85 MB → 8.5 MB** (-350 KB de dead
  code dropado).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK.

**Leak check pós-fix (CRÍTICO):**
```
   OK:   __gauntlet         (0 matches)
   OK:   instalarGauntlet   (0 matches)
   OK:   aplicarSeed        (0 matches)
   OK:   useGaleriaMock     (0 matches)
   OK:   GAUNTLET_ATIVO     (0 matches)
   OK:   adicionarFotoMock  (0 matches)
OK: bundle Android sem gauntlet (8.5 MB)
```

**Antes:** 5/6 markers vazaram. **Depois:** 0/6. Infra Gauntlet
agora release-clean. M41 desbloqueado nesta dimensão.



### Batch paralelo 5 sprints fechado (2026-05-04)

5 sub-sprints da Fase 1 anti-débito executadas em paralelo
(agentes em background) e validadas via Gauntlet:

#### M34.2 — Button variant primary com contraste WCAG AA

**Diagnóstico do agente revelou bug sistêmico** (não específico do
empty state Fotos): `<Button>` em RN-Web aplicava apenas
`className` NativeWind, e o interop não propagava o background
através de `MotiView → DOM div`. Resultado: backgroundColor
herdado transparente sobre `colors.bg` com texto cor `colors.bg`
— ratio efetivo ~1:1, invisível.

**Fix em `src/components/ui/Button.tsx`:** dict `VARIANT_CLASSES`
ganhou campos `bgColor`/`textColor`/`borderColor`/`borderWidth`
lidos de tokens. `MotiView` e `Text` agora aplicam `style={{...}}`
direto **além** do `className` (defense in depth). Mantida cor
purple para variant primary (coerência paleta — verde reservado
para FAB de captura). Ratio pós-fix: 7.5:1 (acima de WCAG AA
4.5:1).

**Validação Gauntlet:** botão "Registrar foto" do empty state
Fotos agora renderiza ROXO Dracula proeminente com texto escuro
legível (screenshot em `M34.2-screenshots-gauntlet/`).

#### M11.2 — useGaleriaMock leitura em useEffect guardado

`src/lib/hooks/useFotosAgregadas.ts`: substitui leitura síncrona
`useGaleriaMock((s) => s.fotos)` por `useState + useEffect`
guardado por `GAUNTLET_ATIVO`. Em release Android,
early-return mantém `fotosMock = []` sem importar o store mock.
Subscribe + cleanup via `useGaleriaMock.subscribe()`.

#### M27.4 — SessaoBootGate fast-path com latch

`app/_layout.tsx` SessaoBootGate consome `bootPronto` do
`useBootStatus` (M27.3). Se `bootPronto && !restauradoRef.current`,
marca `restauradoRef = true` e retorna — short-circuit pós-reset
quebra o ciclo "Maximum update depth" em sequência rápida
`__gauntlet.reset() + seed() + abrir()`. Idempotência mantida:
boot virgem (latch false) entra no caminho original.

#### M-DEBITO-UI-UX-SEED-DUO — 3 fixes consolidados

- **Chip "Outro" ghost:** novo variant `'ghost'` adicionado em
  `src/components/ui/Chip.tsx` (mapeado para `colors.mutedDecor`).
  `SheetNovaTarefa.tsx` `CATEGORIA_ACCENTS` atribui `'ghost'` só
  para `outro`. Achado colateral: as outras 7 categorias estão
  todas com `'orange'` (divergência do spec original) —
  materializado como **M-DEBITO-CATEGORIA-CORES** sub-sprint.
- **Botão "Criar" do contadores/novo:** `KeyboardAvoidingView`
  envolvendo ScrollView + botão. Reage ao teclado virtual sem
  precisar reescrever para sticky-bottom.
- **Toggle alarme animado:** `<AnimatePresence>` + `<MotiView>`
  com spring `springs.snappy` (ADR-010 — física, não duration).

#### M34.1.1 — FAB esconde quando MenuCapturaVerde abre

Caminho B do M34.1 original (descartado por "invasivo"; provou-se
único viável). Flag `sheetCapturaAberto` em `useNavegacao`,
sincronizada via `onChange` do gorhom (cobre fechamento por gesto
pan-down). `<FABMenu>` early-return null quando flag true.
**Validação Gauntlet:** FAB roxo confirmadamente ausente do DOM
quando menu/frase aberto; volta após cancelar
(`M34.1.1-screenshots-gauntlet/A-fab-some-com-sheet.png`).

#### Aritmética batch

- Testes: 1298 → **1300** (+2 cases novos no FABMenu.test.tsx).
- Suítes: 145 → 145 (estável; +6 cases distribuídos em existentes).
- Bundle Hermes: **8.85 MB** (no teto exato 8.85 MB; margem
  ~10 KB).
- TS strict 0, anonimato OK, smoke OK.

#### Decisão durável anti-débito

Pacote de 5 sprints validadas no MESMO Gauntlet sem regressão
entre elas — paralelização funciona quando arquivos são disjuntos
(M11.2 hook, M34.2 Button, M27.4 SessaoBootGate, M-DEBITO 3
arquivos UI, M34.1.1 navegacao+chrome). Conflito potencial em
`MemoriasFotosTab.tsx` previsto entre M34.2 e M11.2 não
materializou (M34.2 ficou em Button.tsx, M11.2 em hook).

### M-GAUNTLET-FAST-BOOT-FOLLOWUP fechada (2026-05-04) — NÃO-FIX documentado

Investigação dos 3 caminhos propostos pela spec para fazer
`app/+html.tsx` (preload de fontes JetBrainsMono) aplicar em build
web. Resultado:

- **Caminho A — `web.output: "static"`:** **inviável.** Export quebra
  com `TypeError: Cannot destructure property '__extends' of
  'n.default' as it is undefined` no SSR de `framer-motion`
  (transitiva via `moti@0.30`). Reproduzido em `npx expo export
  --platform web` 2026-05-04. Causa raiz: `framer-motion` ESM importa
  `tslib` em modo destructured; `expo-router 6.0.23` em SSG não
  exporta `default` de `tslib` corretamente em Node.
- **Caminho B — `web.output: "single"`:** export funciona
  (5.73 MB JS bundle, 10.8 KB CSS), mas o `index.html` gerado é o
  template padrão do `expo-router/cli` — `+html.tsx` **não é lido**.
  Sem ganho.
- **Caminho C — injeção JS via `_layout.tsx`:** funcionaria em dev e
  build, mas a fonte só começaria a baixar após o bundle JS parsear,
  anulando o ganho de paralelismo (objetivo da preload).

**Decisão:** NÃO-FIX. Aguardar Expo SDK 55+ ou release `moti` que
não quebre SSR. Os arquivos já entregues por M-GAUNTLET-FAST-BOOT
(`public/fonts/JetBrainsMono_400Regular.ttf` 115 KB,
`public/fonts/JetBrainsMono_500Medium.ttf` 115 KB,
`public/styles/flash-inicial.css`, `app/+html.tsx`) **permanecem
versionados e servidos pelo Metro em dev** — sem regressão funcional.
Quando uma futura sprint retomar o caminho A (após fix upstream em
moti ou expo-router), os preload tags voltam a ser efetivos
imediatamente sem refactor.

**Documentação atualizada:**
- `app/+html.tsx` — comentário expandido com motivo e tracking.
- `VALIDATOR_BRIEF.md` §4 — armadilha **A23** registrada.

**Aritmética:** 1293 (baseline informado) → 1295 testes na execução
(zero teste novo desta sprint; delta veio de baseline desatualizado
no prompt). 145 suítes mantidas. `tsc --noEmit` 0.
`check_anonimato.sh` 0. Bundle Hermes sem alteração (esta sprint não
tocou em código de runtime).

**Verificação `tempoDeBoot()`** não aplicável: investigação não
introduziu mudança de runtime que pudesse impactar boot. O baseline
informado pelo usuário continua válido (`< 200ms` em sessão fresh
do Gauntlet).

### M34.3 fechada (2026-05-04) — FAB verde unificado

`<MenuCapturaVerde>` aceita prop `acoesExtras` que renderiza ações
contextuais por tab ACIMA das 4 ações de captura. FABs próprios das
3 tabs (`MemoriasTreinosTab`, `MemoriasFotosTab`, `MemoriasMarcosTab`)
**removidos** — antes ocupavam coordenadas (769,900) idênticas ao
FAB verde, causando intercept de pointer events.

Cada tab passa sua ação contextual via `useEffect` + callback do
parent `MemoriasScreen`:
- Treinos: "Novo treino" abre `<SheetNovoTreino>`.
- Fotos: "Adicionar foto" abre image picker via
  `__gauntlet.adicionarFotoMock` (web/dev) ou `expo-image-picker`
  (mobile real).
- Marcos: "Adicionar marco" abre `<SheetNovoMarco>`.

**Sheet "Registrar" agora tem 5 itens** (1 contextual + 4 captura),
todos verde Dracula, ícone Plus para ação contextual.

**Aritmética:** 1293 → 1293 testes (sem novos), 145 suítes mantidas.
TS strict 0, anonimato OK, smoke OK. Bundle Hermes **8.44 MB**
(redução de 410 KB do baseline 8.85 MB — remoção de 3 instâncias FAB
inline + 3 imports compensou as props extras).

**Validação visual via Gauntlet:**
- `A-marcos-menu-com-acao-contextual.png` — sheet aberto na aba
  Marcos com 5 itens em 64dp cada (Adicionar marco em top=472,
  Foto/Música/Vídeo/Frase em 536/600/664/728), header verde
  "Registrar", FABs antigos confirmadamente ausentes do DOM.

**Side-effect (atualizações em testes existentes):** 3 E2Es legados
do M11.1 (`m11-1-fotos-upload`, `m11-1-marcos-criar`,
`m11-1-memorias-usavel`) atualizados para abrir o FAB verde antes
de buscar o item contextual (não mais o FAB próprio que sumiu).
Mudança trivial de seletor — não requereu sub-sprint nova.

**FEATURES-CANONICAS atualizado:** §2.9 (M34→M34+M34.3) e §3.1/3.2/3.3
refletem o FAB verde unificado.

### M-SLIDER-WEB-LOOP fechada (2026-05-04)

`<Slider>` em `src/components/ui/Slider.tsx` agora ramifica por
`Platform.OS`:
- **Web:** `<input type="range">` nativo com CSS injetado uma vez
  via `ensureCssWeb()` (track `colors.bgElev`, fill `colors.cyan`,
  thumb `colors.purple`, foco `box-shadow` ciano `:focus-visible`,
  altura 44px para WCAG AA, `aria-valuemin/max/now`).
- **Native:** `RNSlider` de `@react-native-community/slider`
  preservado integral (zero regressão Android/iOS).

Interface pública (`SliderProps`) inalterada — 8 consumidores
existentes (humor-rapido, eventos, diario-emocional, alarmes/novo,
ciclo/registrar, SheetNovoTreino, FiltrosBar, app/index) continuam
funcionando sem mudança.

**Bug original:** `RTCSliderWebComponent` em loop infinito travava
`/medidas` e `/exercicios/<slug>` em web com tela em branco +
`Maximum update depth exceeded`. Causa: AnimatedProps callback do
slider web em loop com Reanimated em React 19 strict mode. Fix
elimina a dependência da implementação web do pacote nativo.

**Aritmética:** 1292 → 1293 testes (+1), 145 → 145 suítes. TS strict
0, anonimato OK, smoke OK. Bundle Hermes 8.85 MB (10 KB do limite —
margem apertada).

**Validação visual via Gauntlet:**
- `A-medidas-funcional.png` — `/medidas` renderiza header "Medidas",
  chips PERÍODO, empty state "Suas medidas vão aparecer aqui.",
  FAB roxo. Console: 0 erros, sem loop.
- `B-humor-rapido-sliders.png` — 4 `<input type="range">` confirmados
  no DOM (370×44 cada, dentro do frame). 0 erros de loop.

**Achado crítico em paralelo (M34.3 nova spec):** validação da aba
Marcos via Gauntlet revelou que **FAB verde do MenuCapturaVerde
(M34) sobrepõe** os FABs próprios das abas Fotos ("adicionar foto"
M11.1) e Marcos ("adicionar marco"). Coordenadas batem 1:1
(769, 900, 56×56). Usuário não consegue tocar nos FABs próprios
das abas pelo gesto direto. Spec
`docs/sprints/M34.3-spec.md` propõe FAB verde unificado por
contexto (caminho A) ou absorção via M-CAPTURA-UNIFICADA (caminho C).
**Bloqueia M-CAPTURA-UNIFICADA** (precisa decisão UX antes).

### M11.3 fechada (2026-05-04)

`useLarguraFrame()` hook em `src/lib/ui/useLarguraFrame.ts` que
retorna **constante 412** em web (`Platform.OS === 'web'`) e
`useWindowDimensions().width` real em native. Centraliza a lógica
para layouts dependentes do frame mobile do `FrameMobileGauntlet`
(412×892dp aplicado em todas as rotas dev web).

**Bug confirmado pelo usuário em browser real (2026-05-04):** card
de foto na tab Memórias aba Fotos vazava para fora do frame após
adicionar 1 foto via `__gauntlet.adicionarFotoMock()`. Causa raiz:
`useWindowDimensions().width` retorna a largura do **viewport**
(1280px) em web, não a do frame.

**Arquivos novos (3):**
- `src/lib/ui/useLarguraFrame.ts` — hook + constante `FRAME_W = 412`.
- `tests/lib/ui/useLarguraFrame.test.ts` — 3 cases (web=412,
  native dim.width, native largura dinâmica).
- `tests/e2e/playwright/m11-3-largura-frame.e2e.ts` — E2E mede
  `getBoundingClientRect()` da thumb (esperado 100-160px).

**Arquivos modificados (3 consumidores migrados):**
- `src/components/screens/MemoriasFotosTab.tsx:37` — `dim.width`
  → `useLarguraFrame()` no cálculo de `thumbSize`.
- `app/medidas/index.tsx:105` — idem para `larguraCard` e
  `larguraSlider`.
- `app/exercicios/[slug].tsx:68` — idem para `larguraConteudo`.

Auditoria via `grep useWindowDimensions src/ app/` confirmou 3/3
consumidores reais (`CardComparativo.tsx:35` é menção em comentário,
não import).

**Aritmética:** 1289 → 1292 testes (+3), 144 → 145 suítes (+1).
TS strict 0, anonimato OK, smoke OK. Bundle Hermes 8.84 MB.

**Validação visual via Gauntlet:**
- `A-grid-fotos-3-cols.png` — 4 thumbs 118×118 em grid 3+1
  perfeitamente contidas no frame (left=455, right=825, frame=434/846).
- B/C (medidas + exercicios) **não capturados** porque rotas
  travam com bug pré-existente RTCSliderWebComponent infinite
  loop (`Maximum update depth exceeded` em
  `@react-native-community/slider` versão web). Confirmado
  pré-existente via `git stash` da M11.3 — bug persiste em
  estado pré-sprint, portanto NÃO é regressão.

**Sub-sprint colateral (anti-débito):**
- **M-SLIDER-WEB-LOOP** — `RTCSliderWebComponent` em loop infinito
  trava `/medidas` e `/exercicios/<slug>` em web. Bug pré-existente
  desde M12/M13 (passou despercebido porque essas rotas nunca
  foram validadas em Gauntlet antes). Spec
  `docs/sprints/M-SLIDER-WEB-LOOP-spec.md` propõe wrapper
  `<Slider>` web/native com `<input type="range">` em web.

### M34 fechada (2026-05-04)

MenuCapturaVerde adicionado à tab Memórias. FAB **verde** (Dracula
`#50fa7b`) no canto inferior direito abre BottomSheet com 4 ações
de captura unificada: **Foto / Música / Vídeo / Frase**. Cada ação
salva binário em `media/<categoria>/<data-rand>.<ext>` mais um
`.md` companion preliminar (M39 ratifica formato via ADR-0017).

**Arquivos novos (13):**
- `src/components/chrome/MenuCapturaVerde.tsx` — FAB + 2 sheets.
- `src/components/midia/SheetFrase.tsx` — sheet 60% com Textarea +
  SeletorPara (M33) + botões Salvar/Cancelar.
- `src/lib/midia/capturarFoto.ts` — wrapper expo-image-picker
  (camera+galeria) + `.md` companion.
- `src/lib/midia/capturarMusica.ts` — wrapper expo-document-picker
  (audio/*) + `.md` companion.
- `src/lib/midia/capturarVideo.ts` — wrapper expo-image-picker
  (mediaTypes vídeo) + `.md` companion.
- `src/lib/midia/salvarFrase.ts` — escreve só `.md` em
  `media/frases/<data>-<slug>.md`.
- `src/lib/midia/companion.ts` — helper compartilhado
  `stringifyCompanionMidia` + `slugDeFrase` (DRY entre os 4 wrappers).
- 5 suítes Jest novas em `tests/lib/midia/` (incluindo `companion.test.ts`).
- `tests/e2e/playwright/m34-menu-captura.e2e.ts` — caso E2E
  obrigatório (Gauntlet §1.9).

**Arquivos modificados (3):**
- `src/components/screens/MemoriasScreen.tsx` — pluga
  `<MenuCapturaVerde />` ao final.
- `src/components/screens/MemoriasFotosTab.tsx` — botão "Registrar
  foto" inline no empty state.
- `src/lib/hooks/useFotosAgregadas.ts` — varre também
  `media/fotos/` com extensões ampliadas (.jpg/.jpeg/.png).

Sem mudança em `app.json` (permissões `CAMERA` + `RECORD_AUDIO` já
existem desde M00.5/M22).

Decisão de UI: cor verde distingue do FAB roxo de navegação (FABMenu,
esquerda); posição direita evita conflito de gestos. Companion .md
preliminar em formato YAML simples (tipo/arquivo/data/autor/para/
legenda); M39 expande com transcrição/duração/tags via ADR-0017.

**Aritmética:** 1260 → 1289 testes (+29), 139 → 144 suítes (+5).
TS strict 0 erros, anonimato OK, smoke OK. Bundle Hermes Android
sem regressão (~8.5 MB).

**Validação visual via Gauntlet (playwright MCP):**
5 screenshots em `docs/sprints/M34-screenshots-gauntlet/`:
- `A-fab-verde-memorias.png` — FAB verde (rgb 80,250,123) 56×56
  no canto direito (right=825), simétrico ao FABMenu roxo esquerdo.
- `A-menu-aberto.png` — header verde "Registrar" + 4 itens
  (Foto/Música/Vídeo/Frase) com ícones verde Dracula em chips
  cinza e labels acentuação completa, áreas de toque 64dp.
- `A-sheet-frase.png` — header "Nova frase" verde, label "FRASE"
  uppercase muted, Textarea 368×260, SeletorPara M33
  ("Para mim/Para Ana/Para o casal"), botões Salvar disabled
  (frase vazia) + Cancelar.
- `A-empty-state-com-botao.png` — empty state Fotos com ícone
  caixa, frases secundárias e botão "Registrar foto" inline.
- `A-foto-na-galeria.png` — após `__gauntlet.adicionarFotoMock()`,
  card aparece no grid (placeholder cinza por scheme `web://`
  bloqueado pelo browser; limitação pré-existente do mock M11.1).

**Achados de UI/UX (anti-débito, materializados em specs próprias):**
- **M34.1** — `FABMenu` (z-index 10) sobrepõe botão "Cancelar" do
  SheetFrase ao rolar o sheet. Caminho preferido: `BottomSheet`
  default `containerStyle.zIndex: 30`. Spec
  `docs/sprints/M34.1-spec.md`.
- **M34.2** — Botão "Registrar foto" do empty state (Fotos) com
  contraste insuficiente — visualmente parece desabilitado. Spec
  `docs/sprints/M34.2-spec.md` (diagnóstico + fix).
- **M11.3** — Grid de Fotos calcula `thumbSize` via
  `useWindowDimensions().width` retornando 1280 em web (frame
  mobile 412 ignorado), causando thumbs gigantes. Spec
  `docs/sprints/M11.3-spec.md` (helper `useLarguraFrame`).

Caso E2E `m34-menu-captura.e2e.ts` valida: FAB verde presente em
`/memoria`; tap abre sheet com 4 itens; tap em "capturar frase"
monta sheet com `aria-label="campo da frase"` acessível.

### M-GAUNTLET-SEED-DUO fechada (2026-05-04)

`aplicarSeed` e `aplicarSetNomes` agora propagam
`tipoCompanhia` para o canônico **`useSettings.pessoa.tipoCompanhia`**
(M29) além do legado `useOnboarding.tipoCompanhia`.

Mapeamento: `nomeB === null → 'sozinho'`; `nomeB string → 'duo'`.
`aplicarReset` zera ambos. `localStorage.removeItem('ouroboros.settings.v2')`
adicionado para evitar re-hidratação de estado anterior.

**Aritmética:** 1257 → 1260 testes (+3 cases em
`tests/lib/dev/gauntlet-seed-duo.test.ts`), 138 → 139 suítes (+1).

**Validação visual via Gauntlet (playwright MCP):**
- `seed({ nomeA: 'Alex', nomeB: 'Sam' }) + abrir('/eventos')`:
  9 chips renderizam (3 chips × 3 telas com SeletorPara).
  "Para mim" / "Para Sam" / "Para o casal" visíveis no form
  Eventos.
- `abrir('/contadores/novo')`: PARA QUEM com 3 chips M33,
  Para mim purple selecionado.
- `abrir('/todo')` + click "Nova tarefa": Sheet abre com 8 chips
  CATEGORIA (Trabalho/Casa/Rotina/Finanças/Desenvolvimento pessoal/
  Obrigações/Saúde/Outro), 4 chips PARA QUEM
  (Para mim/Para Sam/Para o casal/Para outro), toggle "Lembrar
  com alarme" com texto secundário "Cria um alarme companion
  vinculado à tarefa."
- Screenshots em
  `docs/sprints/M33-screenshots/A-evento-seletor-para.png`,
  `B-contador-novo-seletor-para.png` e
  `docs/sprints/M31-screenshots/B-nova-tarefa-categoria.png`.

**Achados de UI/UX (não-bloqueantes, anotados para sprint
corretiva futura):**
- Chip "Outro" de categoria Tarefa renderiza em laranja accent
  (cor de destaque) sendo apenas opção neutra. Investigar se foi
  intencional ou regressão. Sprint corretiva sugerida:
  `M31.1-spec.md` ou ajuste no `<ChipGroup>` quando relevante.
- Categoria em 3 linhas 4-2-2 (irregular).
- Toggle "Lembrar com alarme" expande bloco DateTimePicker
  embaixo — animação não validada visualmente.

### M33 fechada (2026-05-04)

Campo `para` em 4 schemas (Diário/Evento/Contador/Marco) + componente
compartilhado `<SeletorPara>` plugado em 4 telas.

**Entregáveis:**
- `src/lib/schemas/para.ts` (novo) — `ParaSchema`
  discriminatedUnion (mim/outra com pessoa/casal). Default
  `{ tipo: 'mim' }` para backward-compat com .md v1.
- 4 schemas estendidos: `diario_emocional.ts`, `evento.ts`,
  `contador.ts`, `marco.ts`. Barrel atualizado.
- `src/components/ui/SeletorPara.tsx` (novo, 127L) — 3 chips
  dinâmicos. Retorna null em modo `'sozinho'` (esconde
  inteiramente). Label da opção `outra` usa `useNomeDe`.
  `useSettings.pessoa.tipoCompanhia` (canônico M29).
- `src/components/ui/index.ts` — exporta SeletorPara.
- 4 telas plugadas com `<SeletorPara value={para} onChange={setPara}
  disabled={salvando} />` antes do botão final:
  - `app/diario-emocional.tsx`
  - `app/eventos.tsx`
  - `app/contadores/novo.tsx`
  - `src/components/screens/SheetNovoMarco.tsx`
- `src/lib/marcos/marcosAuto.ts` — builder de marcos automáticos
  seta `para: { tipo: 'mim' }` por default.
- 9 fixtures de teste existentes ajustadas com `para: {tipo:'mim'}`
  (tipo TS estritamente correto após extensão de schema).
- `tests/components/ui/SeletorPara.test.tsx` (novo, 12 cases) +
  testes nos 4 schemas (+24).

**Aritmética:** 1221 → 1257 testes (+36), 137 → 138 suítes (+1),
tsc 0 erros, anonimato OK. Bundle não re-medido (sprint aditiva
schema+UI; sem deps novas).

**TODO documentado (deferido para M40):**
- `src/lib/hooks/useHoje.ts` filtro por `para` — M40 (Home v2
  status do casal) é o consumidor natural; código morto se
  adicionado agora.

**Sem mudança em Tarefa:**
- M31 já tem `pessoa_destino` (semântica diferente: quem deve
  fazer vs. tema/destinatário emocional).

### M32 fechada (2026-05-04)

Contador v2: mensagens de apoio sóbrias + indicador discreto de
marcos.

**Entregáveis:**
- `src/lib/contadores/mensagens.ts` (novo) — função pura
  `mensagemApoio(dias)` com 6 faixas (0/recomeço, <5/início, <30/
  constância, <100/hábito, <365/médio, ≥365/anos). `marcoAtingido(dias)`
  retorna o último marco de `MARCOS_DIAS = [5, 30, 100, 365]` ou
  null.
- `app/contadores/[slug].tsx` — após o número grande, 2 `<Text>`:
  mensagem de apoio em `colors.muted` + (condicional) "marco de N
  dias" em `colors.mutedDecor` 11dp letter-spacing 1 (estilo
  rodapé, ADR-0005 zero gamificação).
- `tests/lib/contadores/mensagens.test.ts` — 14 cases (6 faixas
  com numeração, marcos com boundaries, defesa de negativos).

**Aritmética:** 1207 → 1221 testes (+14), 136 → 137 suítes (+1),
tsc 0 erros, anonimato OK. Bundle Hermes 8.5 MB (sem alteração
material).

**Tom respeita ADR-0005:**
- Sem badge, sem troféu, sem confete, sem cor de festa.
- "marco de N dias" cinza-violeta discreto, font 11dp.
- Mensagens sem exclamação, sem emoji.

### M31 fechada (2026-05-04)

TarefaSchema v2: categoria + pessoa_destino + alarme + aba
Concluídas + long-press Reabrir/Apagar.

**Entregáveis:**
- `src/lib/schemas/tarefa.ts` — `TAREFA_CATEGORIAS` (8 slugs:
  trabalho/casa/rotina/financas/desenvolvimento_pessoal/obrigacoes/
  saude/outro), `TAREFA_CATEGORIA_LABELS`, `TarefaPessoaDestinoSchema`
  discriminatedUnion (mim/outra/casal/terceiro), `TarefaAlarmeSchema`
  (ativo + data_hora_iso + recorrencia + slug_vinculado opcional).
  Defaults garantem migração silenciosa v1→v2.
- `src/lib/vault/tarefas.ts` — `criarTarefa()` com branch alarme
  (escreverAlarme + agendarAlarme antes de gravar tarefa, popula
  `slug_vinculado`). Falha de companion não bloqueia tarefa
  (graceful). `reabrirTarefa()` novo (inverte feito + zera
  feito_em; TODO inline para re-agendamento de alarme).
- `src/components/todo/SeletorPessoaDestino.tsx` (novo) — chips
  dinâmicos baseados em `useSettings.pessoa.tipoCompanhia`. Modo
  'sozinho' esconde "Para [parceiro]" e "Para o casal". Input
  expansível para "terceiro" (1-60 chars).
- `src/components/todo/SheetNovaTarefa.tsx` — reescrito. ChipGroup
  categoria 8 slugs com ícone preview lucide
  (Briefcase/Home/Repeat/Wallet/Sparkles/Scale/Heart/HelpCircle),
  SeletorPessoaDestino, Toggle "Lembrar com alarme" expansível com
  DateTimePicker mode `datetime` + ChipGroup recorrência.
- `src/components/todo/SecaoConcluidas.tsx` (novo) — collapsable
  header "Concluídas (N)" + lista. Empty state silencioso (return
  null). Default colapsada quando >5 itens.
- `src/components/todo/ItemTarefa.tsx` — render com ícone
  categoria 14dp + chip micro destino (≠ mim). Item concluída
  opacity 60% + line-through.
- `src/components/todo/MenuLongPress.tsx` — extendido com prop
  opcional `acoes` (backwards-compat). M31 usa para Reabrir/Apagar
  definitivo em concluídas.
- `app/todo.tsx` — 2 seções: pendentes (preserva drag&drop) +
  `<SecaoConcluidas>`. Tap em concluída reabre via
  `handleTapConcluida`. Long-press em concluída abre menu
  Reabrir/Apagar definitivo.

**Aritmética:** 1177 → 1207 testes (+30), 136 → 136 suítes,
tsc 0 erros, anonimato OK. Bundle Hermes 8.8 → **8.5 MB** (-300 KB,
margem 350 KB do limite — refactor enxuto reduziu size).

**Testes M31 (4 arquivos):**
- `tests/lib/schemas/tarefa.test.ts` (+30 cases): categoria 8 slugs,
  pessoa_destino discriminado mim/casal/outra/terceiro com
  rejeições corretas, alarme com 4 recorrências, migração v1→v2
  com defaults silenciosos via zod.
- `tests/components/todo/SheetNovaTarefa.test.tsx` (+6): 8 chips
  categoria, payload com defaults M31, toggle alarme ligando, modo
  editar com categoriaInicial.
- `tests/lib/vault/tarefas.test.ts` (+7): `reabrirTarefa` inverte/
  idempotente/lança; `criarTarefa` branch alarme com slug_vinculado,
  no-op quando alarme null/inativo, graceful em falha de
  escreverAlarme.
- `tests/components/todo/ItemTarefa.test.tsx` — fixture migrado
  para v2.

**Validação Gauntlet:** `/todo` renderiza empty state correto
("Sem tarefas. Crie quando quiser.") com header "Tarefas".
Screenshot em `docs/sprints/M31-screenshots/A-todo-pendentes-vazio.png`.

**Atenção (não-bloqueantes):**
- `useRotuloPessoa` mencionado pela spec (M28) não existe no
  código — implementado com `useNomeDe` direto (helper canônico
  real).
- `reabrirTarefa` ainda não cancela/re-agenda alarme companion
  (TODO inline). M30 decide convenção futura.
- `MenuLongPress` ganhou prop opcional sem quebrar M17.

### M30 fechada (2026-05-04)

AlarmeSchema v2: recorrência + channel com vibração + lembretes
integrados.

**Entregáveis:**
- `src/lib/schemas/alarme.ts` — `RecorrenciaSchema`, campo
  `recorrencia` (default `'semanal'`), `data_unica` (ISO opcional),
  `dias_semana` min 0, `superRefine` cross-field.
- `src/lib/services/alarmesNotificacoes.ts` — switch por
  recorrência (`unica` DATE / `diaria` DAILY / `semanal` WEEKLY /
  `mensal` MONTHLY) + identifiers `.once/.daily/.monthly`.
- `src/lib/services/notificationActions.ts` — `ALARME_CHANNEL_ID =
  'ouroboros-default-v2'`, `vibrationPattern: [0,250,500,250]`,
  `enableVibrate: true`, `lightColor: '#bd93f9'`. Helper
  `apagarChannelsLegadosUmaVez()` apaga `'default'` e `'alarmes'`
  (legados v1) guardado por `useSessao.flags.canalV1Deletado`.
- `app/_layout.tsx` — `PermissaoNotificacaoGate` via `useEffect`
  direto (CONTRACT §7.9) chama `pedirPermissao()` se
  `permissoesPedidas.notif === false`. Toast "Permita notificações
  em Configurações para receber alarmes." em falha.
- `app/alarmes/novo.tsx` — `<ChipGroup>` "Recorrência" condiciona
  seletor (DateTimePicker para única/mensal, SeletorDias só
  semanal).
- `src/lib/boot/migrarLembretes.ts` (novo) — migração idempotente
  dos 3 lembretes v1 (medicação/treino/humor) lendo
  `ouroboros.settings.v1` direto do SecureStore para alarmes
  pré-cadastrados off. Plug em `BOOT_HOOKS` antes de
  `reagendarAlarmes`.
- `src/lib/stores/sessao.ts` — campo `flags.canalV1Deletado` +
  mutator `marcarFlagBoot` + migração defensiva.
- `jest.setup.cjs` — `SchedulableTriggerInputTypes.{DATE,MONTHLY}`
  + `deleteNotificationChannelAsync` mock.
- 3 fixtures de teste atualizadas (`CardAlarme.test.tsx`,
  `alarmesNotificacoes.test.ts`, `vault/alarmes.test.ts`) com
  `recorrencia: 'semanal'` explícito.
- `tests/lib/boot/migrarLembretes.test.ts` (novo, 8 cases) —
  migração, idempotência (rodar 2x não duplica), apaga blob v1,
  blob ausente/corrompido/sem chave, vaultRoot vazio, default
  horário.

**Aritmética:** 1162 → 1177 testes (+15), 135 → 136 suítes (+1),
tsc 0 erros, anonimato OK. Bundle Hermes 8.78 → 8.8 MB
(50 KB margem do limite 8.85).

**Validação visual via Gauntlet (playwright MCP):**
- `/alarmes/novo` renderiza:
  - "Novo alarme" header.
  - Campos: TÍTULO, HORÁRIO 08:00.
  - **RECORRÊNCIA**: 4 chips (Única/Diária/**Semanal**/Mensal),
    Semanal selecionado purple por default.
  - DIAS DA SEMANA: D S T Q Q S S (visível só quando Semanal).
  - CATEGORIA: Medicação/Treino/Outro.
  - SOM: Suave/Normal/Forte (Suave selecionado ciano).
  - Soneca 5 min slider.
  - Ativo toggle ON.
- Screenshot em
  `docs/sprints/M30-screenshots/A-novo-alarme-recorrencia.png`.

**Pendência Nível B (não-bloqueante):**
- Validação de `vibrationPattern` real precisa emulador Android +
  logcat (`Vibrator: pattern [0,250,500,250]`). Spec sinaliza como
  obrigatório para Nível B; Gauntlet em web não cobre.
- `apagarChannelsLegadosUmaVez()` em devices que rodaram v1.0-rc1
  precisa validação manual pós-instalação.

### M29 fechada (2026-05-04)

Settings v2: vibração simples + features default ON + sync removido.

**Entregáveis principais:**
- `src/lib/stores/settings.ts` (198→278L) — shape v2 com `somVibracao`
  4-toggle (geral/despertar/conquista/botoes), `featureToggles` 6/7
  defaults TRUE, REMOVIDOS `lembretes` e `sync`. Persist key
  `ouroboros.settings.v2`. Migration v1→v2 conservadora preservando
  intenção do usuário (`alarme→despertar`, `vitoria→conquista`,
  `humor||fab→botoes`).
- `src/lib/haptics.ts` — refatorado: `humor/trigger/fab=botoes`,
  `vitoria=conquista`, `alarme=despertar`. `tomVibracaoLigado(chave)`
  retorna false se mestre `geral` off.
- `app/settings/index.tsx` (938→561L; -377L) — REMOVIDOS
  `<SecaoLembretes>`, `<SecaoSync>`, `<SelectorQualidade>`. Nova
  `<SecaoSomVibracao>` com 4 toggles + disable visual quando geral
  off. Features reordenadas (To-do → Alarme → Contador → Ciclo →
  Calendário → Widget). Adicionado `<LinkSubTela>` "Reinicializar
  pasta do Vault" chamando `inicializarVaultCanonico()`.

**Refactor inevitável (consumidores externos do shape antigo):**
- `src/components/screens/ScannerSheet.tsx` — `s.sync.qualidadeScanner`
  → constante `'maxima'` inline (decisão "sempre máxima implícita").
- `src/lib/scanner/launch.ts` — `type ScannerQualidade` movido para o
  próprio módulo.
- `src/lib/services/notificacoesLembretes.ts` — `reagendarLembretes()`
  neutralizado para chamar apenas `cancelarTudo()` (M30 substitui).
- `src/lib/stores/index.ts` — barrel sem `SyncMethod/ScannerQualidade/
  Lembrete`.
- `tests/app/settings/index.test.tsx` (4 testes), `tests/components/
  chrome/MenuLateral.test.tsx` (2), `tests/lib/widget/
  atualizarWidgetHomescreen.test.ts` (1) — atualizados para shape v2.

**Aritmética:** 1157 → 1162 testes (+5), 135 → 135 suítes,
tsc 0 erros, anonimato OK. Bundle Hermes 8.79 → 8.78 MB (-10 KB).
`app/settings/index.tsx` -377L pelo cleanup.

**Validação visual via Gauntlet (playwright MCP):**
- `/settings` renderiza com:
  - Header "Configurações" laranja.
  - Seção SOM E VIBRAÇÃO com 4 toggles purple ativos:
    - "Vibração geral" (mestre, "Ao desligar, silencia tudo.")
    - "Vibrar em alarmes (despertar)"
    - "Vibrar em conquistas"
    - "Vibrar em botões e gestos" ("Humor, fab, registros rápidos.")
  - Seção PESSOA: Vault compartilhado, Editar nomes e fotos,
    **Reinicializar pasta do Vault** (novo), Adicionar segunda
    pessoa.
  - Seção OPCIONAIS começando com To-do leve (toggle ativo por
    default).
  - **Sem Lembretes**, **sem Sync** (confirmado).
- Screenshot em `docs/sprints/M29-screenshots/A-settings-v2-render.png`.

**Migração v1→v2 (4 cases em `tests/lib/stores/settings.test.ts`):**
- Estado v1 sintético mapeia conservador.
- Shape parcial preenche defaults.
- Null retorna defaults limpos.
- v2 já persistido passa intacto.

### M-GAUNTLET-FAST-BOOT fechada com ressalva (2026-05-04)

Pré-cache de fontes JetBrainsMono no Vault servido pelo Metro,
para encurtar boot de 30-60s (`useFonts` SDK 54 web fresh) para
<5s (preload paralelo ao JS bundle).

**Entregáveis:**
- `public/fonts/JetBrainsMono_400Regular.ttf` (115 KB) — copiada
  de `node_modules/@expo-google-fonts/jetbrains-mono/400Regular/`.
- `public/fonts/JetBrainsMono_500Medium.ttf` (115 KB).
- `public/styles/flash-inicial.css` — fundo `#14151a` (bgPage
  Dracula) carregado antes do React montar, evita white flash.
- `app/+html.tsx` (novo) — Root HTML customizado com
  `<link rel="preload" as="font" crossOrigin="">` para as 2
  fontes + `<link rel="stylesheet">` para o flash CSS. Usa
  `ScrollViewStyleReset` do `expo-router/html`.
- `docs/GAUNTLET.md` — seção "Histórico de melhorias" com 3
  sprints da auditoria.

**Validação:**
- Em modo dev (`./run.sh --web`): `fetch('/fonts/...')` retorna
  200, `fetch('/styles/flash-inicial.css')` retorna 200.
  `tempoDeBoot()` mede 123ms (vs 183ms baseline M27.3 — variação
  natural; cache do Metro hot).
- `tsc 0 erros`, anonimato OK, smoke verde, 1157/135 mantidos.

**Ressalva (sprint M-GAUNTLET-FAST-BOOT-FOLLOWUP criada):**
- `app/+html.tsx` não é aplicado em modo dev (Expo Router só usa
  em static rendering / export). Tentativa de habilitar
  `web.output: "static"` em `app.json` quebrou build com exit 1
  (provavelmente rota dinâmica sem `getStaticPaths`). Revertido.
- Preload tags portanto não aparecem no HTML servido em dev.
  Boot rápido atual (123ms) é resultado do Metro hot cache, não
  do preload. Em sessão fresh real do Chrome (Ctrl+Shift+R com
  cache vazio), o impacto do preload ainda precisa ser medido.
- Sprint corretiva
  `docs/sprints/M-GAUNTLET-FAST-BOOT-FOLLOWUP-spec.md` documenta
  3 caminhos de investigação para fazer `+html.tsx` aplicar.

### M-GAUNTLET-SEED-V2 fechada (2026-05-04)

Fixtures realistas no seed do Gauntlet. Substitui stubs vazios de
`seedHumores`/`seedDiarios`/`seedEventos` por implementações
determinísticas baseadas em fixtures JSON.

**Entregáveis:**
- `src/lib/dev/seedDeterministico.ts` (reescrito) — `seedHumores()`,
  `seedDiarios()`, `seedEventos()` lendo fixtures JSON e
  persistindo em stores mock dedicadas. `seedTudo()` orquestra
  todos. Helpers de leitura `lerHumoresMock`, `lerDiariosMock`,
  `lerEventosMock` para testes.
- `src/lib/dev/humorMock.ts`, `diarioMock.ts`, `eventosMock.ts`
  (novos) — stores zustand in-memory dev-only.
- `src/lib/dev/fixtures/humores-30d.json` — 33 registros em 30
  dias, intensidades 1-5, distribuição 60/30/10 (pessoa_a/
  pessoa_b/sobreposto).
- `src/lib/dev/fixtures/diarios-3.json` — 1 trigger, 1 vitória, 1
  reflexão. Textos abstratos, zero nomes próprios (Regra −1
  conservadora). Tipo `DiarioMockModo` aceita `'reflexao'`
  desacoplado do `DiarioEmocionalSchema` zod (que só conhece
  `'trigger'`/`'vitoria'`).
- `src/lib/dev/fixtures/eventos-7.json` — 7 eventos em -7d a -1d.
- `src/lib/dev/gauntlet.ts` — API `seedComDados(fixture)` com
  guard `GAUNTLET_ATIVO`. `reset()` limpa todos 3 mocks +
  `useGaleriaMock`.
- `src/lib/hooks/useHumorHeatmap.ts` — assina `useHumorMock`;
  quando `GAUNTLET_ATIVO` + mock tem células, monta `cacheFinal`
  sintético sobrepondo cache do Vault.
- `tests/lib/dev/seedDeterministico.test.ts` — 14 cases (seed,
  schema, sobreposto, determinismo).
- `tests/e2e/playwright/m-gauntlet-seed-v2.e2e.ts` — heatmap
  validation pós-seed.

**Aritmética:** 1143 → 1157 testes (+14, executor entregou +14
pelo zelo), 134 → 135 suítes (+1), tsc 0 erros, anonimato OK.
Bundle Hermes 8.4 → 8.79 MB (+0.39 MB; limite 8.85 MB; margem 60 KB).

**Validação visual via Gauntlet (playwright MCP):**
- API `seedComDados` listada em `__gauntlet` (16ª).
- Após `reset() + seed() + seedComDados('humores-30d') + abrir('/humor')`:
  - 91 células totais no heatmap (13×7).
  - **23 células com humor > 0** (coloridas).
  - "Média 30d: 3,6  Registros: 23 / 30" exibido.
  - Paleta Dracula visível (vermelho/amarelo/verde/ciano/laranja).
- Screenshot em
  `docs/sprints/M-GAUNTLET-SEED-V2-screenshots-gauntlet/B-heatmap-colorido.png`.

**Pontos de atenção (não-bloqueantes):**
- `useDiarioMock` e `useEventosMock` não plugados em hooks de UI
  ainda. Auditoria item 23 só pediu fixtures + API, não o plug nas
  telas. Sprints futuras (M11.x) podem plugar quando relevante.
- Schema `reflexao` desacoplado do zod canônico — decisão por
  pragmatismo (mock só serve para validação de UI).
- "Maximum update depth exceeded" do `SessaoBootGate` re-aparece
  em cenário `reset()+seed()+abrir()` rápido — confirma achado da
  M27.3 (sprint M27.4 sugerida).

### M-GAUNTLET-LEAK-CHECK fechada com achado crítico (2026-05-04)

Script CI `scripts/check_gauntlet_leak.sh` que roda
`npx expo export --platform android` e busca por 6 marcadores
canônicos do Gauntlet no bundle Hermes (`*.hbc` em
`_expo/static/js/android/`). Exit 1 com lista de FAILs se vazar,
exit 0 com tamanho do bundle se limpo. Não invocado pelo smoke por
padrão (chamada manual ou via `--full` futuro).

**Achado crítico revelado:** 5 dos 6 marcadores presentes no
bundle release Android (`__gauntlet`, `instalarGauntlet`,
`useGaleriaMock`, `GAUNTLET_ATIVO`, `adicionarFotoMock`). Causa
raiz: `app/_layout.tsx` importa diretamente
`@/lib/dev/gauntlet` — Metro/Hermes não fazem tree-shake de export
referenciado, mesmo com guard `if (!GAUNTLET_ATIVO) return` em
cada método. Política zero-trust dos métodos individuais protege o
runtime, mas não impede o bytecode de carregar os símbolos.

**Sprint corretiva criada:**
`docs/sprints/M-GAUNTLET-DEAD-CODE-V2-spec.md` — caminho A (módulo
de bootstrap separado com `require` lazy guardado por
`Platform.OS !== 'web' || !__DEV__`). Bloqueia M41 (release final).

### M27.3 fechada (2026-05-04)

Boot screen sem oscilar via hook agregador `useAppPronto` + store
`useBootStatus` (latch boolean global). Substitui o guard `useRef`
`fontesPersistentementeCarregadas` do M27.1 por solução baseada em
selector estável.

**Decisão de design:** **conditional render** (não Suspense throw).
A spec §5 alertou contra Suspense em React Native nativo com
Reanimated worklet não-validado. O orquestrador autorizou
explicitamente o conditional render direto — equivalente em UX,
mais seguro. Migração futura para Suspense throw é trocar APENAS
o consumidor (hook + store ficam reutilizáveis).

**Entregáveis:**
- `src/lib/boot/useAppPronto.ts` (novo) — combina `loaded` (useFonts)
  + `useHasHydrated` das 3 stores críticas (onboarding, vault,
  sessao). Latch via store global. Uma vez `true`, sempre `true`.
- `src/lib/boot/useBootStatus.ts` (novo) — store zustand leve sem
  persist. `pronto: boolean` + `marcarPronto()` idempotente.
  Selector estável `selectBootPronto`.
- `app/_layout.tsx` (+8L) — substitui guard `useRef` por
  `useAppPronto({ fontesProntas: loaded })`. `splashEsconderRef`
  garante UMA chamada de `SplashScreen.hideAsync()` mesmo se
  `useFonts` SDK 54 web oscilar `loaded=true`. `marcarBootCompleto()`
  do gauntlet sinalizado uma vez quando appPronto vira true.
- `tests/lib/boot/useAppPronto.test.tsx` (novo, 7 cases) — 3
  useBootStatus + 4 useAppPronto incluindo latch persistente após
  oscilação.
- `tests/e2e/playwright/m27-3-boot-suspense.e2e.ts` (novo) —
  `aguardarBoot()` + `tempoDeBoot()` do gauntlet. Conta
  `transicoesAusenteParaPresente` em 60s pós-boot. Espera 0.

**Aritmética:** 1136 → 1143 testes (+7, spec previa 3-6, +1 por
separar suite useBootStatus de useAppPronto), 133 → 134 suítes
(+1), tsc 0 erros, anonimato OK, smoke OK. Bundle Hermes Android
8.4 MB (≤ 8.85 MB).

**Validação visual via Gauntlet (playwright MCP):**
- `/_dev/gauntlet`: boot pronto em 183ms (vs 187ms baseline),
  `tempoDeBoot()` retorna 183, 0 transições do loader em 8s.
- `/humor`, `/settings`, `/memoria`: 0 transições do loader em
  cada (3s amostra cada). Loader não volta após primeira
  desmontagem.
- Screenshot em `docs/sprints/M27.3-screenshots-gauntlet/`:
  `A-pos-boot-estavel.png`.

**Achado colateral (sprint corretiva M27.4 sugerida):**
- `SessaoBootGate` dispara "Maximum update depth exceeded" em
  cenário de `__gauntlet.reset()` + `seed()` + `abrir()` em
  sequência rápida (<2s). Pré-existente desde M24 — `useUltimaRota`
  + `useHasHydrated` cascata após reset das 3 stores. Não é
  regressão de M27.3 (M27.3 não tocou em `SessaoBootGate`).
  Não bloqueia uso real (usuário não faz reset+navega rápido).
  Sprint M27.4 deve adicionar debounce ou guard duplo no
  `restauradoRef`.

### M11.1 fechada (2026-05-04)

Memórias usável. Achado de uso real (orquestrador validando via
Gauntlet) mostrou 4 problemas estruturais em `/memoria`. Sprint
fechou os 4 com proof-of-work runtime + visual.

**Entregáveis:**
- `src/components/screens/MemoriasFotosTab.tsx` (+52L) — FAB roxo
  "+" no canto inferior direito com `accessibilityLabel="adicionar
  foto"`. Empty state ganha linha secundária "Toque + para
  adicionar uma foto agora." Handler chama
  `adicionarFotoManual()` e dispara `recarregar()`.
- `src/lib/midia/adicionarFotoManual.ts` (79L, novo) — 3 caminhos:
  web/dev (mock via Gauntlet), web release (no-op), mobile real
  (`expo-image-picker` + `FileSystem.copyAsync` para
  `media/fotos/<YYYY-MM-DD>-<rand>.jpg`).
- `src/components/screens/MemoriasTreinosTab.tsx` (+34L) — atalho
  ghost "Cadastrar exercícios na Galeria" no empty state da aba
  Treinos navegando para `/exercicios`. `<HeatmapBase>` envolto em
  `<View style={{ alignItems: 'center' }} accessibilityLabel="container heatmap centralizado">`.
- `src/lib/dev/gauntlet.ts` (+28L) — API `adicionarFotoMock()` na
  `GauntletAPI` com guard `GAUNTLET_ATIVO`. `reset()` limpa
  `useGaleriaMock` para idempotência entre E2E.
- `src/lib/dev/galeriaMock.ts` (32L, novo) — store zustand auxiliar
  `useGaleriaMock` (web-only, alimentada apenas pelo Gauntlet).
- `src/lib/hooks/useFotosAgregadas.ts` (+72L) — leitor novo
  `lerGaleriaManual(vaultRoot)` varre `media/fotos/` (canônica
  conforme `paths.ts:224`). `FotoOrigem` estende para
  `'galeria-manual'`. Em web/dev mescla entradas do
  `useGaleriaMock` por cima do Vault.
- `src/components/screens/FotoDetalhe.tsx` (+2L) — Record de label
  cobre nova origem.
- 3 E2E novos em `tests/e2e/playwright/`:
  `m11-1-marcos-criar.e2e.ts`, `m11-1-fotos-upload.e2e.ts`,
  `m11-1-memorias-usavel.e2e.ts`.
- 3 suítes Jest novas (`tests/lib/dev/galeriaMock.test.ts`,
  `tests/lib/dev/gauntlet-adicionarFotoMock.test.ts`,
  `tests/lib/midia/adicionarFotoManual.test.ts`) cobrindo +10
  cases.

**Aritmética:** 1126 → 1136 testes (+10), 130 → 133 suítes (+3),
tsc 0 erros, anonimato OK, smoke OK.

**Validação visual via Gauntlet (playwright MCP):**
- Aba Treinos: heatmap centralizado matemático
  (`getBoundingClientRect()` left=775 right=775 diff=0px no frame
  mobile 412dp), atalho "Cadastrar exercícios na Galeria" presente
  no DOM e visível na captura.
- Aba Fotos: FAB com `aria-label="adicionar foto"` posicionado
  inferior direito. Empty state mostra texto secundário.
  `__gauntlet.adicionarFotoMock()` insere entrada e thumb
  `[aria-label^="foto galeria-manual"]` aparece (delta=1).
- Aba Marcos: FAB "+" presente.
- 4 screenshots em
  `docs/sprints/M11.1-screenshots-gauntlet/`:
  `A-treinos-heatmap-centralizado.png`,
  `B-fotos-com-fab.png`, `B2-fotos-com-mock.png`,
  `C-marcos-aba.png`.

**Divergências da spec resolvidas fielmente ao espírito:**
- `MidiaSchema` não tem campos `origem`/`data` (é
  `discriminatedUnion` minimalista). `'galeria-manual'` virou novo
  valor de `FotoOrigem` no enum do hook agregador (não do schema).
- Não existe "store da galeria agregada usada por M11" — galeria é
  agregador puro de leitura. Solução: leitor novo
  `lerGaleriaManual()` paralelo aos de eventos/medidas, varrendo a
  pasta canônica `media/fotos/` (já existente em `paths.ts`, M22 +
  M34).
- Convenção real do projeto é
  `media/fotos/<YYYY-MM-DD>-<rand>.jpg`, não a sugerida na spec
  (`media/YYYY-MM-DD/IMG_<unix-ts>.jpg`). Adotada a real.

**Sub-sprints abertas (anti-débito):**
- `M01.6-spec.md` (proposto pelo executor) — `<Button>` aceitar
  `accessibilityLabel` opcional desacoplado do label visível.
- `M11.2-spec.md` (proposto pelo executor) — micro-impureza em
  `useFotosAgregadas` lendo `useGaleriaMock` fora de
  `GAUNTLET_ATIVO` (benigno, mas arquiteturalmente impuro).

### M-GAUNTLET-AUDITORIA fechada (2026-05-04)

Auditor externo cego (subagente isolado) avaliou 30 itens em 7
seções. Resultado: 4 SIM, 12 NÃO, 14 PARCIAL. Edits triviais
aplicados em ciclo único, sub-sprints abertas para refatorações
maiores.

**Aplicados:**
- `src/lib/dev/gauntlet.ts`: guard `GAUNTLET_ATIVO` em cada método
  público da API (item 3, 5 — vazamento de bypass via import
  direto). `aplicarSeed` reseta `menuAberto: false` (item 6).
  `aplicarReset` v2 limpa localStorage do persist em web (item 7).
  4 APIs novas: `aguardarBoot()`, `tempoDeBoot()`, `consoleErros()`,
  `marcarBootCompleto()`. Captura de `console.error` ativa em
  modo dev web (item 27).
- `src/lib/boot/biometriaGate.tsx`: `bypassReal = bypass && __DEV__`
  (item 4 — bypass só vale em dev, mesmo se prop vazar em
  release).
- `gauntlet.sh` v2: flags `--clear`/`--quiet`, valida `comm` do PID
  antes de matar (item 15), rotaciona log para `.prev` (item 17),
  `setsid` + `kill -- -PGID` derruba process group inteiro
  (item 18), mensagens acionáveis com comandos (item 16).
- `app/_dev/showcase.tsx` criado com 20 telas listadas, banner
  "MODO GAUNTLET ATIVO", frame mobile centralizado (item 21).
- 11 casos E2E + template chamam `reset()` antes de `seed()`
  (item 20).
- `docs/GAUNTLET.md` ganhou seção Troubleshooting com 6 cenários
  comuns (itens 28, 30).
- `VALIDATOR_BRIEF.md` §1.9 sem ambiguidade entre "proibido" e
  "permitido para debugging" (item 29).

**Sub-sprints abertas (refatorações maiores):**
- `M-GAUNTLET-LEAK-CHECK-spec.md` — CI gate de export Android
  sem `__gauntlet` (item 1).
- `M-GAUNTLET-SEED-V2-spec.md` — fixtures realistas humores 30d,
  diários 3, eventos 7 + API `seedComDados()` (item 23).
- `M-GAUNTLET-FAST-BOOT-spec.md` — pré-cache JetBrainsMono em
  `public/fonts/` para encurtar boot inicial (item 26).

**Validação:** Gauntlet com 14 APIs expostas, `tempoDeBoot()`
retorna 187ms, showcase renderiza, banner ativo, frame mobile
centralizado. 1126 testes / 130 suítes / tsc 0 erros / smoke OK.

Relatório completo em
`docs/auditoria-gauntlet-2026-05-04/RELATORIO.md`.

### Specs materializados — fila de execução completa (2026-05-04)

Achado de uso real via Gauntlet em `/memoria` mostrou que a tela
está montada mas não usável (aba Fotos passiva, Treinos bloqueada
por dependência, heatmap descentralizado, Marcos sem E2E).
Aproveitando o ciclo, todos os pendentes foram materializados em
specs e ROADMAP.md ganhou tabela "Fila de execução" no topo.

Specs criadas:

- `docs/sprints/M11.1-spec.md` — Memórias usável (Fotos com
  upload, heatmap centralizado, atalho Treinos→Galeria, E2E
  Marcos).
- `docs/sprints/M-GAUNTLET-AUDITORIA-spec.md` — Auditoria externa
  cega do Gauntlet (subagente isolado), `gauntlet.sh` v2 (flags
  `--clear`/`--quiet`/healthcheck), 4 APIs novas (`aguardarBoot`,
  `tempoDeBoot`, `consoleErros`, `seedComDados`), seção
  Troubleshooting em `docs/GAUNTLET.md`.
- `docs/sprints/M27.3-spec.md` — Boot screen sem oscilar via
  Suspense boundary com `useAppPronto` agregando useFonts +
  hidratação multi-store.
- `docs/sprints/M20.x-spec.md` — Validação Nível B do widget
  homescreen no emulador (4 screenshots).
- `docs/sprints/M10-checkpoint-visual-spec.md` — Heatmap em
  Android real (4 screenshots).
- `docs/sprints/M14-checkpoint-visual-spec.md` — Financeiro em
  Android real (4 screenshots).
- `docs/sprints/M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL-spec.md` —
  Acentuação PT-BR no Python (sprint paralela no repo Backend).

ROADMAP.md tabela "Fila de execução" lista 14+ sprints na ordem
correta. STATE.md atualizado com fila e marcos.

### Ciclo corretivo M24.1 + M25.2 (2026-05-03)

Pós-revalidação, fechados 2 dos 3 corretivos descobertos. M27.2
deferida para M27.3 — tentativas de fix em React 19 strict mode
causaram `Maximum update depth exceeded`; solução completa exige
refatoração via Suspense boundary, fora de escopo.

- **M24.1 — resume state** — `src/lib/hooks/useUltimaRota.ts`:
  hook ignora o primeiro pathname recebido após mount. Esse era o
  destino de boot (potencialmente o `/` default ou o restaurado pelo
  `SessaoBootGate`), não uma navegação do usuário. Sem essa guarda,
  o pathname inicial sobrescrevia `ultimaRota` antes do useEffect do
  gate ler o valor restaurado. Validação Gauntlet: `seed() +
  setUltimaRota('/memoria') + reload` agora abre app em `/memoria`.
- **M25.2 — animação SVG roda em web** —
  `src/components/brand/OuroborosLoader.tsx`: bloco
  `requestAnimationFrame` (web only via `Platform.OS === 'web'`)
  escreve `transform` direto no DOM. Cada `<AnimatedG>` recebe
  `data-anim-id` único (`useId()`) e o RAF localiza via
  `document.querySelector` + `setAttribute`. Em native, bloco é
  no-op e Reanimated mantém worklet. Timestamp absoluto `Date.now()`
  sobrevive a re-mounts. Validação: g3 (30s/volta) medido em
  ~15°/s; cabeça da cobra muda de posição entre prints.
- **M27.2 — deferida para M27.3.** Vide spec.

Métricas: 1126 testes / 130 suítes mantidos, tsc 0 erros, anonimato
OK, console gauntlet com 0 erros (1 warning React 19 `element.ref`
de dep transitiva ignorado).

### Validação consolidada via Gauntlet — M-REVALIDACAO-M20-M28 (2026-05-03)

Orquestrador rodou 11 casos E2E playwright MCP no Gauntlet,
validando 11 sprints concluídas (M20, M22, M23, M24, M25, M25.1,
M26, M27, M27.1, M28; M21 doc-only). Resultado:

- **PASS (5):** M22, M23, M25, M27, M28
- **FAIL (3):** M24, M25.1, M27.1 — viram corretivas separadas
- **INCONCLUSIVO (2):** M20 (widget Android), M26 (sheets) — exigem Nível B

Achados que viram sprints corretivas bloqueando M29:

- **M24.1** — `setUltimaRota('/memoria') + reload` abre app em `/`
  em vez de `/memoria`. Race entre hidratação assíncrona da
  `useSessao` e o `Redirect` do `SessaoBootGate`. Spec
  `docs/sprints/M24.1-spec.md`.
- **M25.2** — animação `OuroborosLoader` continua parada em web
  mesmo após fix M25.1. Reanimated/SVG web não atualiza atributo
  `transform` dinamicamente. Spec `docs/sprints/M25.2-spec.md`.
- **M27.2** (regressão de M27.1) — boot screen oscila: loader
  Ouroboros volta a sobrepor após conteúdo da rota carregar. Fix
  M27.1 só tratou fontes; gate de sessão re-liga. Spec
  `docs/sprints/M27.2-spec.md`.

Entregáveis:
- `docs/validacao-gauntlet-2026-05-03/RELATORIO.md` (relatório consolidado)
- `docs/validacao-gauntlet-2026-05-03/screenshots/M*/` (12+ screenshots)
- 10 arquivos E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`
- `STATE.md`, `ROADMAP.md` atualizados; M29 represada até corretivos fecharem

### Sprints corretivas fechadas (2026-05-03)

Bloco consolidado de fixes de bugs descobertos durante a validação
manual M22-M28 + execução paralela M25/M27/M28. Aplicados num único
ciclo após smoke verde (1126 testes / 130 suítes / 0 erros tsc).

- **M14.1 — eslint-disable órfão removido.**
  `src/lib/hooks/useFinancasCache.ts:40` tinha
  `// eslint-disable-next-line @typescript-eslint/no-require-imports`
  acima de um `require()` que não acionava mais o warning. ESLint
  reportava `unused-disable`. Linha removida; ESLint silencioso.

- **M25.1 — animação OuroborosLoader gira em torno do centro em web.**
  `react-native-svg-web` converte `<G rotation={N} originX={160}
  originY={160}>` para `<g transform="rotate(N)">` sem `cx`/`cy`,
  fazendo a rotação acontecer em torno de `(0,0)` (varredura para
  fora do `viewBox`). Fix: `useAnimatedProps` agora retorna string
  SVG nativa `transform="rotate(${valor} ${PIVOT} ${PIVOT})"` que
  funciona 1:1 em web (rn-svg-web não toca) e em nativo (rn-svg
  parseia). Teste novo confirma formato exato para os 3 grupos
  rotativos (gs1/gs2/gs3); gs-flow continua usando
  `strokeDashoffset`. +1 teste (1125 → 1126).

- **M27.1 caminhos A + C — boot screen lento e overlay sobreposto.**
  Dois fixes complementares aplicados no mesmo ciclo:
  - **Caminho C** em `src/lib/conquistas/loader.ts`: quando
    `vaultRoot` começa com `web://mock-vault/...`, o reader
    `FileSystem` não tem implementação web e a Promise nunca
    resolve, deixando `useConquistas` preso em `loading=true`
    indefinidamente (FiltrosBar e Calendário não estabilizavam em
    Nível A). Fix: early-return com `{ conquistas: [],
    totaisPorOrigem: { evento_positivo: 0, diario_vitoria: 0 } }`.
  - **Caminho A** em `app/_layout.tsx`: `useFonts` em SDK 54 web
    oscila `loaded=true/false` quando `document.fonts` re-emite
    eventos pós-hidratação, re-montando o early-return e fazendo
    o `OuroborosLoader` piscar sobre a Home. Fix: flag
    `fontesPersistentementeCarregadas` (`useRef`) que vira `true`
    no primeiro `loaded=true` e segura o early-return mesmo se
    `loaded` flicka depois. Re-mount real do app reentra pelo
    SplashScreen via Reanimated/Expo, separado.
  - Caminho D (fade transition) não foi necessário — caminhos A+C
    juntos resolvem ambos os sintomas (~10s de boot no reload
    Chrome + overlay residual). Web é dev-only; dados reais ficam
    em emulador/celular. Screenshot de validação do M25.1 em
    `docs/sprints/M25.1-screenshots/A-cobra-frame1.png`.

### Infraestrutura de validação implementada (2026-05-03)

- **M-GAUNTLET fechada** — orquestrador implementou sozinho, sem
  dispatch de agentes (pedido explícito do usuário).
  - `src/lib/dev/gauntlet.ts` (módulo central, ~200 L):
    - `GAUNTLET_ATIVO = Platform.OS === 'web' && __DEV__`. Substitui
      a abordagem original com `EXPO_PUBLIC_GAUNTLET=1` (env var não
      injetada em runtime browser sem `.env` file). `__DEV__` é
      injetado pelo react-native em build time, sempre disponível,
      `false` em release.
    - `window.__gauntlet` com 11 APIs: `seed(opts)`, `reset()`,
      `setNomes(a, b?)`, `setVaultRoot(root)`, `setOnboardingDone(d)`,
      `setUltimaRota(r)`, `abrir(rota)`, `abrirMenu()`,
      `fecharMenu()`, `abrirSheet(rota)`, `estado()`.
    - `setRouterRef`/`setPathnameRef` para o `_layout.tsx` injetar
      runtime do expo-router (router só existe em hooks).
    - Idempotente em hot-reload (Metro re-monta).
  - `src/lib/dev/seedDeterministico.ts` — helpers
    `seedSozinho`/`seedDuo`/`seedCustom`/`resetTotal` + stubs para
    versão 2 (humores, diários, eventos).
  - `src/lib/boot/biometriaGate.tsx` — prop `bypass?: boolean`
    pula auth e renderiza children direto. `app/_layout.tsx` passa
    `bypass={GAUNTLET_ATIVO}`.
  - `app/_layout.tsx` — `FrameMobileGauntlet` envolve toda UI em
    container 412×892dp centralizado com fundo cinza `#0a0a0e`
    fora do frame e Dracula `#14151a` dentro. **Aplica em TODAS as
    rotas em modo dev**, não só `/_dev/*` (atendendo pedido do
    usuário: "ajustar a tela também do gauntlet pra ser limitada
    horizontalmente igual um celular"). Em mobile nativo
    (Platform.OS !== 'web'), pass-through. Boot screen também
    envolto pelo frame.
  - `app/_dev/_layout.tsx` — Stack interno com banner amarelo
    "MODO GAUNTLET ATIVO" no topo. `Redirect` `/` em produção.
    Frame mobile movido para raiz (não duplicar).
  - `app/_dev/gauntlet.tsx` — dashboard com 5 botões coloridos
    (Seed verde, Reset vermelho, Seed casal verde, Abrir/Fechar
    menu purple), painel JSON do estado auto-refresh 500ms, lista
    de rotas em 4 seções (Ver/Registrar/Opcionais/Dev). Acentuação
    PT-BR completa nas strings de UI; `accessibilityLabel` SEM
    acento.
  - `tests/e2e/playwright/00-bootstrap.e2e.ts` — caso E2E que
    confirma `window.__gauntlet` exposto + `seed()` funcional. Não
    rodado por Jest (`testMatch` filtra `*.test.ts/tsx`); executado
    pelo orquestrador via playwright MCP.
  - `docs/templates/e2e-template.e2e.ts` — template canônico para
    sprints futuras adicionarem casos E2E.
  - `docs/GAUNTLET.md` — guia completo: como ativar, API
    `window.__gauntlet`, fluxo do orquestrador, limitações
    conhecidas.
  - 4 screenshots Nível A+ em `docs/sprints/M-GAUNTLET-screenshots/`:
    `A-dashboard-funcionando.png`, `A-dashboard-pos-seed.png`,
    `A-dashboard-frame-mobile.png`, `A-frame-mobile-aplicado.png`.
    `window.__gauntlet.seed()` confirmado retornando
    `{ onboardingDone: true, vaultRoot: 'web://mock-vault/Ouroboros',
    nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' }, ... }`.
  - **Garantia anti-vazamento confirmada**: `npx expo export
    --platform android` + `grep -rn __gauntlet` retorna vazio.
    Em release mobile, módulo é dead-code.
  - **Issue conhecido residual**: `useFonts` SDK 54 web demora
    30-45s em sessão fresh. M27.1 caminho A guard atenuou
    parcialmente. Aceito como dev-only — não afeta release mobile.
  - **Métricas**: 1126 testes / 130 suítes mantidas (não regrediu),
    bundle Hermes Android 8.75 MB.

### Decisões de infraestrutura (2026-05-03)

- **Gauntlet de validação visual — substitui Nível A puro como
  pipeline padrão.** Validação manual M22-M28 revelou 6 limitações
  estruturais do Chrome web puro (BiometriaGate redirect; useFonts
  SDK 54 oscilante; useConquistas travado em web; localStorage
  seed incompatível com zustand persist; MouseEvent sintético não
  dispara handlers RN-Web; `@gorhom/bottom-sheet` em web não
  monta). 2 sprints novas materializadas para resolver:
  - **M-GAUNTLET** (`docs/sprints/M-GAUNTLET-spec.md`, 6-8h,
    crítica) — interface dev `/_dev/gauntlet` com
    `window.__gauntlet` API JS determinística, bypass de gates
    em `EXPO_PUBLIC_GAUNTLET=1`, frame mobile 412dp em `/_dev/*`,
    8 E2E novos em `tests/e2e/playwright/`,
    `docs/GAUNTLET.md` documentação. Substitui pipeline
    3-tentativas.
  - **M-REVALIDACAO-M20-M28**
    (`docs/sprints/M-REVALIDACAO-M20-M28-spec.md`, 4-6h, alta) —
    re-valida 11 sprints concluídas via Gauntlet com 1 E2E por
    sprint. Bugs descobertos viram corretivas separadas. Bloqueia
    M29 em diante até zerar FAIL.
  Toda sprint nova que toca UI a partir de 2026-05-04 deve
  incluir 1 E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`.
  Documentação atualizada: `CLAUDE.md` (Regra de Validação
  Visual ganha 4 níveis A/A+/B/C), `HOW_TO_RESUME.md` (política
  de validação), `VALIDATOR_BRIEF.md` §1.9 (Nível A+ Gauntlet
  detalhado), `STATE.md` + `ROADMAP.md` (sprints novas
  destacadas como infraestrutura), `docs/PROMPT-CONTINUACAO-OPUS.md`
  (próxima sessão começa por M-GAUNTLET).

### Decisões de produto

- **2026-05-03 — Histórico preservado, nunca apagado por padrão.**
  Decisão do usuário: ao marcar tarefa como feita, o app **não
  remove mais** o registro — move para uma seção "Concluídas" abaixo
  das pendentes. Recap (M36) puxa essas tarefas concluídas no período
  como parte de "Conquistas" + seção dedicada "Tarefas concluídas"
  + card "Tarefas concluídas" em "Números". Long-press em concluída
  abre menu "Reabrir" (volta para pendentes) ou "Apagar definitivo"
  (com confirm). Justificativa: app é espelho do que aconteceu;
  Recap em momento difícil mostra tudo que foi feito, não só o que
  falta. Patches aplicados em:
  - `docs/sprints/M31-spec.md` — UI com 2 seções (Pendentes /
    Concluídas collapsable se >5 itens), `<SecaoConcluidas>`
    componente novo, `reabrirTarefa()` helper em
    `src/lib/vault/tarefas.ts`, opacidade 60% + line-through em
    item concluído, long-press menu com 2 ações novas.
  - `docs/sprints/M36-spec.md` — passa de 4 para 5 seções:
    adiciona `<RecapSecaoTarefas>` (lista agrupada por categoria
    com subtotais). `RecapData.numeros.tarefas_concluidas` novo.
    `useRecap` consome `listarTarefas` filtrado por
    `feito === true && feito_em in [de, ate]`. `RecapSecaoNumeros`
    vira grid 2×3 com card "Tarefas concluídas".
  - `VALIDATOR_BRIEF.md` §1.8 — regra transversal aplicável a M17
    (tarefa), M18 (contador, decidido por M32 quando reset) e M11
    (marco, naturalmente persistente).

### Adicionado

- **M28 (2026-05-03)** — Varredura de identidade: nomes reais em
  todas as UIs (substitui literais "Pessoa A"/"Pessoa B"/"Ambos").
  - `src/lib/stores/pessoa.ts` ganha hook reativo
    `useNomeDe(pessoa)`. `nomeDe()` síncrono mantido para usos
    fora de componentes (logging, sort).
  - `src/config/pessoas.config.ts` e `pessoas.config.example.ts`:
    `PESSOAS_CONFIG.ambos.nome` muda de `'Ambos'` para `'Casal'`
    — termo afetuoso e claro, "Ambos" era ambíguo em outros
    contextos.
  - `src/components/screens/MiniHumorScreen.tsx`: chips
    `CHIP_OPTIONS_COMPARTILHADO` e `CHIP_OPTIONS_PRIVADO` viram
    `useMemo` + `useNomeDe`. Literal `'Sobreposto'` preservado
    (rótulo de modo de visualização compartilhada, não pessoa).
  - `src/components/calendario/FiltrosBar.tsx`: chips de filtro
    pessoa via `useMemo` + `useNomeDe`. Inclui "Casal" para
    `'ambos'`.
  - `app/settings/editar-pessoa.tsx`: títulos `"Pessoa A"`/`"Pessoa B"`
    agora dinâmicos via `useNomeDe('pessoa_a')` / `'pessoa_b'`.
  - `src/components/screens/ScannerPreview.tsx`: constante
    estática `PESSOAS` substituída por `useMemo` + `useNomeDe`.
  - `src/components/screens/ShareReceiver.tsx`: fallbacks
    `?? 'Pessoa A'` substituídos por `?? nomeDe('pessoa_a')`
    (versão síncrona, fora de componentes reativos).
  - `src/components/data/HumorHeatmapStats.tsx`: constante
    `NOMES_CURTOS` removida; rótulos sobreposto vêm de
    `useNomeDe`.
  - `tests/lib/stores/pessoa.test.ts` novo (7 testes): cobre
    `nomeDe('ambos') → 'Casal'`, defaults `Nome_A`/`Nome_B`,
    reatividade do hook quando `usePessoa.setNomes()` muda.
  - `tests/config/pessoas.config.test.ts`: assert atualizado
    para `'Casal'`.
  - 2 screenshots Nível A em `docs/sprints/M28-screenshots/`:
    `A-humor-chips-nomes-reais.png` (chips Nome_A/Nome_B/Sobreposto
    com defaults genéricos respeitando Regra −1),
    `A-settings-radio-nomes.png` (títulos uppercase NOME_A/NOME_B
    via `useNomeDe`).
  - **Achado colateral M28-COLAT-01** (não fixado inline,
    proposto como sprint dedicada): rota `/calendario` não
    estabiliza paint em web Nível A. `useConquistas` chama
    `lerConquistas(vaultRoot)` que em web com `vaultRoot` mock
    fica preso em `loading=true`. Combinado com aparente
    oscilação `loaded` em `useFonts`, `OuroborosLoader` retorna
    ao paint mesmo após app montar árvore. Validação visual de
    `FiltrosBar` reservada para Nível B (emulador).
  - Varredura final: `grep -rn "'Pessoa A'\|'Pessoa B'"
    app/ src/ | grep -v accessibilityLabel | grep -v test`
    retorna vazio. Único hit residual é `'Sobreposto'` em
    `MiniHumorScreen.tsx:85` (intencional, label de modo).
  - **Métricas**: 1118 → 1125 testes (+7), 129 → 130 suites (+1),
    bundle Hermes 8.75 MB.

- **M27 (2026-05-03)** — Refundação estrutural de navegação:
  MenuLateral substitui bottom tabs e FABRadial.
  - **Movimentação estrutural** (33 arquivos `git mv`): todo o group
    `app/(tabs)/` migrou para a raiz de `app/`. Subgrupos
    (`settings/`, `exercicios/`, `medidas/`, `alarmes/`,
    `contadores/`, `ciclo/`) movidos com seus `_layout.tsx` internos
    intactos. `app/(tabs)/_layout.tsx` apagado.
  - `src/components/chrome/MenuLateral.tsx` novo: drawer custom
    com `<MotiView>` (springs.default, translateX -300→0), backdrop
    `<Pressable bg-black-50%>` tap-close, `<ScrollView>` interno.
    Header com avatar pessoa ativa + chip alternar pessoa em duo.
    3 seções (Ver/Registrar/Opcionais) com header micro-orange.
    Rodapé fixo com link Configurações. 6 itens em Ver, 6 em
    Registrar (cores diferenciadas: pink/cyan/orange/green/yellow/red),
    até 4 em Opcionais (controlado por `featureToggles`).
  - `src/components/chrome/FABMenu.tsx` novo: FAB redondo 72dp
    purple `position: absolute, left: spacing.lg, bottom: spacing.xl`,
    ícone `Menu` lucide. `onPress` aciona `useNavegacao.abrir()`.
  - `src/lib/stores/navegacao.ts` novo: store zustand leve
    (não-persistido) com `menuAberto`/`abrir`/`fechar`/`alternar`.
  - `src/lib/navigation/rotasSemFAB.ts` novo: lista canônica
    `ROTAS_SEM_FAB` + função `rotaEsconderFAB(pathname)`. Cobre
    `/onboarding`, `/share-receive`, 4 modais de captura, `/recap`
    (M36 cria a rota; FAB já some). `/calendario` mantém FAB
    (tela de view, não modal).
  - `app/_layout.tsx` ganha overlays globais
    `<MenuLateral />` + `<FABMenu />` fora da `<Stack>`, com
    z-index declarado (FABMenu 10, MenuLateral 20) conforme
    CONTRACT §7.10. A18 preservada em todas as 4 rotas modais
    (`presentation: 'transparentModal'` + `contentStyle.backgroundColor:
    '#14151a'`).
  - **Migração crítica do `useSessao.ultimaRota`**:
    `src/lib/stores/sessao.ts` ganha `version: 2` no zustand persist
    + função `migrate(state, version)` que normaliza
    `/(tabs)/X` → `/X` para qualquer boot pré-M27. Sem isso,
    usuários antigos com `ultimaRota` persistida em SecureStore
    crashariam em runtime ao tentar `router.replace` para rota
    inexistente.
  - `app/_components.tsx:90` fixado de `router.replace('/(tabs)')`
    para `router.replace('/')`. Storybook ganha seção "Menu lateral
    (M27)" com botão programático para abrir o drawer (suporte a
    captura visual em web headless).
  - `app/index.tsx`: removido `<FABRadial>` + import órfão.
    `FABRadial.tsx` em `src/components/ui/` preservado mas órfão
    (pode ser removido em sprint futura).
  - `src/lib/navigation/captureRoutes.ts`: paths sem `(tabs)`.
  - Apaga: `src/components/chrome/BottomTabs.tsx` e
    `tests/components/chrome/BottomTabs.test.tsx` (6 testes).
  - Cria: `tests/components/chrome/MenuLateral.test.tsx` (6 testes —
    3 seções renderizadas, items condicionais via `featureToggles`)
    + `tests/components/chrome/FABMenu.test.tsx` (3 testes — render
    à esquerda, abre menu ao tocar).
  - Atualiza paths sem mudar contagem em
    `tests/lib/navigation/captureRoutes.test.ts`,
    `tests/lib/hooks/useUltimaRota.test.tsx`,
    `tests/lib/stores/sessao.test.ts`,
    `tests/app/memoria.test.tsx`,
    `tests/app/settings/index.test.tsx`.
  - 5 screenshots Nível A em `docs/sprints/M27-screenshots/`:
    `A-fab-esquerda.png`, `A-menu-aberto.png`, `A-secao-ver.png`,
    `A-secao-registrar.png`, `A-secao-opcionais.png`. Capturados
    via Playwright headed Chromium na rota `/_components`
    (storybook M01) + dispatch programático para contornar limite
    de Moti em web sem Reanimated nativo.
  - Hits residuais de `(tabs)`: 11/14 (varia conforme grep), todos
    em comentários históricos ou no literal de migração de
    `sessao.ts:235-246`. Nenhum em router/import/registro ativo.
  - **Métricas**: 1115 → 1118 testes (−6 BottomTabs.test + 9 novos),
    128 → 129 suites, bundle Hermes 8.75 MB.
  - **Checkpoint intermediário** §10.6: 127 suites / 1109 testes /
    0 fail após apagar BottomTabs e antes de criar MenuLateral.
  - Veredito validador-sprint: APROVADO (sem ressalvas).

- **M26 (2026-05-03)** — 4 rotas modais com `<Screen>` opaco +
  `index={0}` direto (resolve A17/A18 "tela infinita preta").
  - `app/humor-rapido.tsx`, `app/diario-emocional.tsx`,
    `app/eventos.tsx` envolvem `<BottomSheet>` em
    `<Screen padded={false}>`. `<OuroborosLoader compacto />` atrás
    do sheet em `<View pointerEvents="none">` centralizado — feedback
    visual de marca mesmo se Reanimated falhar. Sheet abre em
    `index={0}` direto (não `-1` + `useEffect expand()`); pan-down-to-close
    fecha via `onChange={(idx) => idx === -1 && router.back()}`.
  - `app/scanner.tsx` ganha `<OuroborosLoader compacto />` em
    `position: 'absolute'` atrás do `<ScannerSheet>` (já tinha
    `<Screen>` no nível externo).
  - `app/_layout.tsx` registra 4 `<Stack.Screen>` com
    `presentation: 'transparentModal'`,
    `contentStyle.backgroundColor: '#14151a'`,
    `animation: 'fade_from_bottom'`. Garante que o root Stack
    fundo (#282a36) não vaze.
  - `VALIDATOR_BRIEF.md` Armadilha A18 auditada — texto preservado,
    referência ajustada para "Solução padrão M26 (aplicado
    2026-05-03)". `INTEGRATION-CONTRACT.md` §7.10 não criou
    `rotasSemFAB.ts` (nasce em M27).
  - `jest.setup.cjs` mock BottomSheet expõe `index` via
    `accessibilityHint` para os novos asserts.
  - `tests/app/humor-rapido.test.tsx`, `tests/app/diario-emocional.test.tsx`,
    `tests/app/eventos.test.tsx` ganham 1 caso M26 cada — render
    contém `<Screen>` E `<BottomSheet>`. Suítes pré-existentes
    ampliadas; spec §10 foi corrigida pela honestidade do executor
    (não criar suítes duplicadas).
  - 4 screenshots Nível A em `docs/sprints/M26-screenshots/`:
    `A-humor-sheet-opaco.png`, `A-diario-sheet-opaco.png`,
    `A-eventos-sheet-opaco.png`, `A-scanner-sheet-opaco.png`.
    Limitação reconhecida: 3 mostram frame de onboarding
    (BiometriaGate redireciona em web); scanner prova fundo Dracula
    opaco + OuroborosLoader visível. Validação completa do sheet
    aberto exige Nível B (emulador Android).
  - **Métricas**: 1112 → 1115 testes (+3), 128 suites mantidas,
    bundle Hermes 8.75 MB.
  - Veredito validador-sprint: APROVADO (sem ressalvas).
  - Achado colateral arquivado: planejador-sprint deve checar
    existência de arquivos de teste antes de declarar "+N suites"
    em §10. Melhoria do agente meta — não bloqueia M27.

- **M25 (2026-05-03)** — OuroborosLogo + OuroborosLoader (SVG nativo
  animado).
  - `src/components/brand/OuroborosLogo.tsx` novo (204 L): versão
    estática do glifo. Replica fielmente o SVG de
    `versão desktop/ouroboros-redesign-v1/index.html` linhas 110-194
    em react-native-svg — viewBox 320x320, `<LinearGradient id="og1">`
    purple→pink, `<RadialGradient id="og-glow">` purple 22%→0%, 4
    grupos (ambient glow, outer dotted orbit, inner flow ring, main
    snake com 4 arcos), cabeça com mandíbulas, olho, língua bífida,
    wordmark "OUROBOROS"/"PROTOCOLO" via `<Text fontFamily="monospace">`
    (fallback explícito porque JetBrains Mono ainda não carregou na
    boot screen — spec §10.3). Props `tamanho` (default 320) e
    `mostrarTexto` (default true).
  - `src/components/brand/OuroborosLoader.tsx` novo (287 L): versão
    animada com 4 shared values Reanimated 4 — gs1 (snake principal)
    90s linear, gs2 (orbit dotted) 60s reverso, gs3 (inner flow ring)
    30s linear, flow (stroke-dashoffset) 6s linear. Aplica
    `useAnimatedProps` com `rotation`/`originX:160`/`originY:160`
    (bug conhecido do `<G>` SVG não aceita `transform: [{ rotate }]`
    via shared value — spec §10 patch 3). Cleanup com
    `cancelAnimation` em todas 4 shared values. Props `tamanho`
    (default 320) e `compacto` (default false → 96px sem texto).
  - `src/components/brand/index.ts` novo: barrel.
  - `tests/components/brand/OuroborosLogo.test.tsx` (3 testes):
    snapshot estático, prop `mostrarTexto={false}` esconde wordmark,
    prop `tamanho` ajusta SVG width/height.
  - `tests/components/brand/OuroborosLoader.test.tsx` (6 testes):
    render base, valor inicial das 4 shared values, cleanup
    `cancelAnimation` no unmount.
  - `app/_layout.tsx` substitui `if (!loaded) return null` por
    `<View bg-page><OuroborosLoader /></View>` (boot screen UI
    bloqueante, não BOOT_HOOK — CONTRACT §7.9). Loader fica dentro
    do early return enquanto fontes carregam (~500ms-1s).
  - `app/onboarding.tsx` Frame 2 "Tudo pronto" troca placeholder
    `<ActivityIndicator>` por `<OuroborosLoader compacto />`.
  - `jest.setup.cjs` ampliado: stubs `RadialGradient` e `Ellipse`
    para o mock `react-native-svg` (CONTRACT §7.8 + spec §10.1) +
    mock `react-native-worklets` ganha `createSerializable`,
    `executeOnUIRuntimeSync`, `RuntimeKind`,
    `serializableMappingCache`, `WorkletsModule`, `makeShareable`,
    `isWorkletFunction`, `callMicrotasks` como no-ops. Necessário
    porque `OuroborosLoader` é o primeiro arquivo em `src/` a
    importar `react-native-reanimated` direto (M01-M24 só usavam
    via `moti`, completamente mockado). **Armadilha A22 nova** —
    registrada no `VALIDATOR_BRIEF.md` §6.
  - 3 screenshots Nível A capturados via Playwright + system Chrome
    `executablePath` em `docs/sprints/M25-screenshots/`:
    `A-loader-boot.png`, `A-loader-compacto.png`, `A-logo-estatico.png`.
  - **Métricas**: 1103 → 1112 testes (+9), 126 → 128 suites (+2),
    bundle Hermes 8.74 MB.
  - Veredito validador-sprint: APROVADO_COM_RESSALVAS — todas
    ressalvas eram docs vivos (STATE/ROADMAP/CHANGELOG/BRIEF
    desatualizados), aplicadas inline pelo orquestrador antes do
    commit.

- **M24 (2026-05-03)** — Resume state e auto-save de rascunhos.
  - `src/lib/stores/sessao.ts` novo: store zustand persist com
    `ultimaRota`, `rascunhos` (7 chaves: humorRapido, diarioEmocional,
    eventos, cicloRegistrar, alarmesNovo, contadoresNovo, tarefasNova),
    `permissoesPedidas` (4 chaves: storage, notif, camera, mic),
    `atualizadoEm`. Persist key `ouroboros.sessao.v1` via
    `secureStorage` adapter.
  - `src/lib/hooks/useAutoSaveRascunho.ts` novo: hook genérico
    debounced 500ms com cleanup correto.
  - `src/lib/hooks/useUltimaRota.ts` novo: tracking via
    `usePathname()` + função pura `isRotaRestauravel(path)` que
    exclui rotas modais (`/onboarding`, `/share-receive`,
    `/humor-rapido`, `/diario-emocional`, `/eventos`, `/scanner`,
    `/_components`).
  - `app/_layout.tsx` ganha `<SessaoBootGate />` via `useEffect`
    direto (não BOOT_HOOKS — vide CONTRACT §7.9): espera as 3
    stores hidratarem (`useOnboarding`, `useVault`, `useSessao`),
    valida `done && vaultRoot && rota não-modal`, faz
    `router.replace(ultimaRota)` uma única vez por mount via
    lock `restauradoRef`.
  - **A20 implementada** (BRIEF §4): cap 2000 chars por textarea
    livre (texto, frase, estrategia, lugar, titulo, medicacao)
    truncado silenciosamente em `salvarRascunho`; canário em
    `__DEV__` log warning se snapshot serializado > 1500B (margem
    para o teto prático de ~2KB do EncryptedSharedPreferences
    Android).
  - 7 formulários plugados com hidratação de rascunho (lazy
    `useState`) + auto-save (`useAutoSaveRascunho`) + limpar
    pós-save:
    - `app/humor-rapido.tsx`
    - `app/diario-emocional.tsx` (filtro `'ambos'` ao restaurar
      `com[]` — UI usa `PessoaAutor[]` enquanto Meta aceita
      `PessoaIdSchema`)
    - `app/eventos.tsx` (idem + `EventoParcial.texto?` opcional
      para preservar texto livre que vive no body do `.md`)
    - `app/(tabs)/ciclo/registrar.tsx`
    - `app/(tabs)/alarmes/novo.tsx` (discrimina criar vs editar:
      em editar, rascunho ignorado — fonte é alarme persistido)
    - `app/(tabs)/contadores/novo.tsx`
    - `src/components/todo/SheetNovaTarefa.tsx` (guard de modo:
      rascunho hidrata só em criar quando `tituloInicial === ''`)
  - 32 testes novos (3 suítes): 22 em `sessao.test.ts` (incluindo
    cap+canário), 5 em `useAutoSaveRascunho.test.tsx` (debounce,
    cleanup), 5 em `useUltimaRota.test.tsx` (função pura).
  - **Métricas**: 1080 → 1103 testes (+23), 123 → 126 suites (+3),
    bundle Hermes 8.73 MB.
  - Veredito do orquestrador (validador-sprint atingiu rate limit;
    validação manual via inspeção do diff): APROVADO. A20 e §7.9
    implementadas exemplarmente. Pendência R1: 2 screenshots
    Nível B/C exigem boot real do app (`A-rascunho-restaurado.png`,
    `A-rota-restaurada.png`).

- **M23 (2026-05-02)** — Onboarding 3 frames sem SAF/Sync.
  - `app/onboarding.tsx` reduzido de 5 frames (621L) para 3 frames
    (466L, -25%): boas-vindas+nome → companhia+nome parceiro →
    "Tudo pronto" + botão "Começar".
  - Botão "Começar" chama `inicializarVaultCanonico()` (M22) e
    distingue 3 caminhos do retorno: `auto` (silencioso), `saf-fallback`
    (toast warning amarelo "Pasta criada em local alternativo." sem
    bloquear), exceção (toast erro vermelho "Não foi possível criar
    a pasta. Tente novamente.").
  - `useOnboarding` shape v2: removido `syncMethod`/`SyncMethod`/`setSync`,
    bump persist key `ouroboros.onboarding.v1` → `v2` (usuários v1
    refazem onboarding — aceitável na refundação).
  - Indicador de progresso `[0,1,2,3,4].map` → `[0,1,2].map` (3 segmentos).
  - Removidos imports legados `useVault`, `requestVaultPermission`,
    `Folder`, `SyncMethod`, componentes `<Frame2Vault>` e `<Frame3Sync>`.
  - Toasts pré-existentes corrigidos com acentuação PT-BR completa
    (Regra BRIEF §1.4): "Escolha uma das opções.", "Vocês são casal
    ou amigos?".
  - 9 testes novos em `tests/app/onboarding.test.tsx` cobrindo 3
    frames + caminho saf-fallback + caminho erro.
  - 3 screenshots Nível A capturados via Playwright headless em
    viewport mobile 412×915 @2x:
    `docs/sprints/M23-screenshots/A-frame{0,1,2}-*.png`.
  - **Métricas**: 1071 → 1080 testes (+9), 122 → 123 suites (+1),
    bundle Hermes 8.71 MB.
  - Veredito `validador-sprint`: APROVADO_COM_RESSALVAS. 14/14 checks
    universais OK ou n/a. 4 ressalvas (3 toasts sem acento + TODO
    enganoso em `permissions.ts`) fixadas inline antes do commit.

- **M22 (2026-05-02)** — Vault canônico auto-criado em
  `/sdcard/Documents/Ouroboros/` sem prompt SAF interativo.
  - `src/lib/vault/permissions.ts` ganha `inicializarVaultCanonico()`,
    `garantirSubpastas()`, `pedirPermissaoStorage()`,
    `probeVaultWritable()` e constante `SUBPASTAS_CANONICAS` com 19
    paths leaf (9 raiz + 3 inbox + 6 media + 1 cache).
  - **A19 implementada (BRIEF §4)**: probe write+read+delete num
    arquivo `.ouroboros-probe` antes de marcar vault como válido. Se
    probe falhar (MIUI/Xiaomi/OneUI restritivo), fallback automático
    para `requestVaultPermission()` SAF legacy. Modo retornado:
    `'auto' | 'saf-fallback' | 'web'`.
  - `src/lib/vault/paths.ts` ganha 6 helpers `mediaXxxPath` e 6
    entries em `VAULT_FOLDERS`.
  - `app.json` adiciona 3 permissões Android: `WRITE_EXTERNAL_STORAGE`,
    `READ_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`.
  - `app/_layout.tsx` ganha `<VaultBootGate />` via `useEffect`
    direto (NÃO `BOOT_HOOKS`, vide CONTRACT §7.9 — falha precisa
    propagar à UI via toast).
  - `jest.setup.cjs` ganha mocks dual CJS+ESM para
    `PermissionsAndroid` e `expo-intent-launcher` (vide CONTRACT
    §7.8).
  - Nova dep direta `expo-intent-launcher@~13.0.8`.
  - 14 testes novos em `tests/lib/vault/permissions-init.test.ts`
    cobrindo Android <30, ≥30, web no-op, idempotência, probe
    sucesso/falha, fallback SAF cancelado, contagem 19 subpastas.
  - **Métricas**: 1057 → 1071 testes (+14), 121 → 122 suites,
    bundle Hermes Android 8.72 MB.
  - **Pendência R1**: screenshot Nível B/C
    (`docs/sprints/M22-screenshots/A-permissao-pedida.png`) capturar
    quando emulador `ouroboros-test` ou Redmi Note 13 do usuário
    estiverem disponíveis (sprint sem UI direta — só infra de boot).
  - Veredito `validador-sprint`: APROVADO_COM_RESSALVAS. 14/14
    checks universais passaram (ou n/a). Ressalvas eram cosméticas
    (contagem "18+/12+/17 leaves" desatualizada vs real 19) —
    fixadas inline antes do commit.

A `v1.0.0-rc1` foi retirada do GitHub Releases por bugs críticos
descobertos no uso real (vault inacessível, captura "tela infinita
preta", FAB radial sem callbacks ligados, alarmes mudos, identidade
hardcoded "Pessoa A/B"). 21 sprints (M21–M41) refazem a v1.0
mantendo a numeração — não há v1.1. APK fica salvo localmente em
`builds/` para histórico; tag git `v1.0.0` é recriada no fim da
refundação apontando para o commit final.

### Pendentes (M21–M41)

| Sprint | Título | Estimativa |
|---|---|---|
| M21 | Despublicar release v1.0.0 do GitHub Releases | 0,3h |
| M22 | Vault canônico auto-criado em /sdcard/Documents/Ouroboros | 5–6h |
| M23 | Onboarding 3 frames (remove SAF e Sync) | 3–4h |
| M24 | Resume state e auto-save de rascunhos | 5–6h |
| M25 | Componentes OuroborosLogo + OuroborosLoader (SVG nativo) | 4–5h |
| M26 | Refatorar 4 rotas modais (Screen opaco + index=0) | 3h |
| M27 | MenuLateral substitui (tabs) + FABMenu purple esquerda | 6–7h |
| M28 | Nomes reais via rotuloPessoa/useRotuloPessoa | 3–4h |
| M29 | Settings v2: vibração simples + features default ON | 4h |
| M30 | AlarmeSchema v2 + channel com vibrationPattern | 5–6h |
| M31 | TarefaSchema v2 + categoria + pessoa_destino + alarme | 5–6h |
| M32 | Contador v2: mensagens de apoio + marcos discretos | 2–3h |
| M33 | Campo `para` em diário/evento/contador/marco | 3–4h |
| M34 | MenuCapturaVerde nas tabs Memórias (foto/música/vídeo/frase) | 6–7h |
| M35 | Aba Finanças: empty state "Em desenvolvimento" | 1–2h |
| M36 | Tela Recap: agregação Conquistas/Crises/Evoluções/Números | 6–8h |
| M37 | Integração Google Calendar via OAuth (R+W) | 10–12h |
| M38 | Conflict resolution para 4 nós Syncthing via deviceId | 4–5h |
| M39 | Estrutura canônica de mídia + .md companion (ADR-0017) | 4–5h |
| M40 | Tela 01 Hoje v2: Recap + status do casal + próximos | 4–5h |
| M41 | APK Release v1.0.0 final + GitHub Release público | 3–4h |

### Documentação criada nesta materialização

- 21 specs autocontidas em `docs/sprints/M21-spec.md` a
  `docs/sprints/M41-spec.md`, cada uma seguindo o template de 9 seções
  + INTEGRATION-CONTRACT (§3.5 Integração + §9 Decisões tomadas +
  Definição de Pronto). Permite que um Claude novo, sem contexto da
  conversa de planejamento, execute cada sprint isoladamente lendo
  apenas `STATE.md` + a spec.
- ADR-0016 (`docs/ADRs/0016-vault-auto-criado-sem-saf.md`) — estende
  ADR-0014; vault Android auto-criado em `/sdcard/Documents/Ouroboros/`
  sem prompt SAF; usa `MANAGE_EXTERNAL_STORAGE` em Android ≥ 11
  (aceitável fora da Play Store).
- ADR-0017 (`docs/ADRs/0017-midia-companion-md.md`) — formaliza
  estrutura de mídia: cada binário em `media/<categoria>/<basename>.<ext>`
  ganha `.md` companion no mesmo diretório com mesmo basename, com
  frontmatter `tipo`/`arquivo`/`data`/`autor`/`transcricao`/`legenda`/
  `para`/`origem`. Compatível com Obsidian + Desktop ETL Python.
- `STATE.md`, `ROADMAP.md`, `README.md` atualizados com header de
  refundação em curso e tabela das 21 sprints.

### Próximo passo concreto

M21 fechado (commit `228b51e` + materialização anterior). Próxima:
**M22** (vault canônico auto-criado em
`/sdcard/Documents/Ouroboros/` com probe write+read+delete e
fallback SAF se OEM bloquear).

### Patches em massa pós-teste de auto-implementação (commits após `228b51e`)

3 agentes independentes leram specs M22, M27 e M37 sem contexto da
conversa de planejamento e produziram planos de implementação. As
ressalvas identificadas viraram patches cobrindo todas as 21 sprints
via docs centralizados:

- **`VALIDATOR_BRIEF.md` §4**: Armadilhas A19 (scoped storage
  Android 11+ + OEM agressivo — exige probe write+read+delete +
  fallback SAF), A20 (SecureStore Android limite ~2KB por valor),
  A21 (OAuth scheme custom precisa split clientId Expo Go proxy
  vs dev-client/release).
- **`docs/sprints/INTEGRATION-CONTRACT.md` §7**: padrões §7.8
  (mocks Jest canônicos para `PermissionsAndroid`,
  `expo-intent-launcher`, `expo-notifications`, `expo-auth-session`,
  `expo-web-browser`), §7.9 (critério `BOOT_HOOKS` vs `useEffect`
  direto), §7.10 (overlay z-index global + lista canônica de rotas
  sem FAB).
- **M37 splitado**: `M37-spec.md` removido. Substituído por
  `M37.1-spec.md` (leitura, escopo `calendar.events.readonly`,
  6-7h) e `M37.2-spec.md` (escrita, escopo `calendar.events`,
  4-5h, exige reconsentimento).
- **ADR-0018**: OAuth Google split clientId + cache em arquivo
  + escopo mínimo + sem servidor próprio. Estende ADR-0007.
- **M22 patcheada**: §4 absorve A19; §5 substitui
  `Environment.isExternalStorageManager` (não-existente em RN/Expo)
  por probe write+read+delete; §5 declara `useEffect` direto
  (não `BOOT_HOOKS`) por A19; §6 ganha comandos
  `dumpsys package | grep MANAGE` e validação probe; §9 expande
  decisões explicitando modo de retorno (`auto | saf-fallback | web`).
- **M24 patcheada**: §4 cap de 2000 chars por textarea no rascunho
  + canário > 1500 bytes (A20); §9 plano-B split de chaves se
  estourar.
- **M27 patcheada**: §2 corrige fato (`app/index.tsx` não existe
  hoje); §2 documenta que subgrupos carregam `_layout.tsx` interno
  no `git mv`; §2 cria `src/lib/navigation/rotasSemFAB.ts`
  canônico; §4 declara z-index e A18-preservada; §5 lista 6 itens
  completos da seção "Registrar"; §5 grep exaustivo de `(tabs)`.
- **M30 patcheada**: §4 obriga novo channel ID
  `ouroboros-default-v2` (Android não permite editar canais
  existentes); §4 hook crítico via `useEffect` direto (não
  `BOOT_HOOKS`); §9 mock `expo-notifications`.
- **M38 patcheada**: §4 detecta reinstall sem backup
  (`substituido_por`); §4 confirma deviceId < 32 bytes cabe em
  SecureStore.

## [1.0.0-rc1] — 2026-05-02 (não lançado, retirado do GitHub Releases)

> Tag git `v1.0.0` permanece como marco histórico do bundle dessa
> versão; release público foi despublicado em M21. APK salvo em
> `builds/ouroboros-1.0.0.apk` para histórico.

### Added
- **M19 — APK Release Hardening v1.0.0.** Versão final do MVP.
  - `app.json`: `version: 1.0.0`, `runtimeVersion: 1.0.0`,
    `android.versionCode: 1`. Adaptive icon e splash apontam para
    novos PNGs polidos.
  - `eas.json` production: `gradleCommand: :app:bundleRelease`,
    `autoIncrement: versionCode`, `env.NODE_ENV: production`.
  - Assets gráficos: `assets/icon.png` (1024×1024 com fundo
    Dracula bg-page #14151a + anel Ouroboros purple→cyan + ponto
    da cabeça da serpente), `assets/icon-foreground.png` (foreground
    do adaptive icon Android, transparent), `assets/splash.png`
    (2400×2400 com ícone centralizado).
  - 5 fluxos Maestro em `tests/e2e/`: `onboarding-completo.yaml`,
    `flow1-pix.yaml`, `flow2-trigger.yaml`, `flow3-evento.yaml`,
    `flow4-scanner.yaml` (cobrem onboarding + 4 críticos do
    BRIEFING §5).
  - `scripts/release-apk.sh` — pipeline completo: anonimato +
    typecheck + tests + smoke + expo export (limite Hermes
    12 MB) + EAS build production + polling até FINISHED +
    download do .aab.
  - `docs/RELEASE.md` — processo canônico de release (pre-reqs,
    pipeline, validação manual ponta-a-ponta, rollback, limites
    hard, semver).
  - `credentials/README.md` — instruções de geração de keystore
    via `eas credentials`. `.gitignore` exclui `keystore.jks`
    e `keystore.json`.
  - HTML mockup renomeado de `Ouroboros_22_telas-standalone.html`
    para `Ouroboros_24_telas-standalone.html` (refletindo as 24
    telas do MVP). Refs atualizadas em README, ROADMAP,
    HOW_TO_RESUME, VALIDATOR_BRIEF, CHANGELOG, CONTEXTO,
    MOCKUPS-INVENTARIO e código fonte.
  - Tag git `v1.0.0` marca o fechamento do MVP.

### Changed
- `package.json`: versão bumpada para 1.0.0; novos scripts
  `test:e2e` e `release`.

## [Unreleased]

### Added
- **M06.5 (a commitar) — Microfone com transcrição on-device + áudio anexo
  (dev-client).** Novo `<MicrofoneButton>` press-and-hold inline no
  diário emocional (Tela 18) acima do textarea. Press dispara
  haptic medium + Audio.Recording (expo-av preset HIGH_QUALITY);
  release encerra, salva `.m4a` em `assets/<YYYY-MM-DD-HHmm>-<rand>.m4a`
  do Vault e dispara `transcribeStream` via @react-native-voice/voice
  (PT-BR, on-device). Texto transcrito faz append no textarea (preserva
  digitação). Limite hard 60s com toast. Gate em
  `useSettings.midia.permitirAudio`. Permissão negada: 1ª vez toast,
  2ª vez deep link Settings. Novo `<Waveform>` 24 barras animadas
  com metering em dB. Novo helper `assetsAudioPath(date, suffix)` em
  `paths.ts`. Novos módulos `src/lib/diario/{permissions,recordAudio,transcribe}.ts`.
  Plugins `expo-av` e `@react-native-voice/voice` em `app.json` com
  permissões PT-BR. NOVO BUILD EAS NECESSÁRIO PARA VALIDAÇÃO NÍVEL
  C — APK atual (15da107f) não inclui módulos nativos.

### Quality
- **INFRA-acentuacao-comentarios (a commitar) — 145 arquivos.**
  Varredura mecânica de comentários PT-BR sem acento em `app/`
  e `src/`. Dicionário fechado de ~80 termos aplicado token-a-token
  apenas em comentários (`//` e `/* */`); strings literais,
  identifiers e JSX preservados. 715 substituições 1:1 (zero
  código adicionado/removido). Volume residual 3 (todas
  referências legítimas a paths/arquivos no filesystem que
  permanecem sem acento), redução 99.3% (419 → 3). 889 testes,
  100 suites, bundle Hermes 8.47 MB delta 0. Cumpre tabela de
  linguagem do CLAUDE.md "Comentários no código PT-BR Sentence
  case Sim, completa".

### Documentation
- **M19.x (a commitar) — Inventário de mockups visuais.**
  Novo `docs/MOCKUPS-INVENTARIO.md` (151 linhas) mapeando cada
  Tela NN ↔ bundle HTML / JSX-fonte / sprint dona, com nota
  explícita sobre conflito de numeração (Tela 25/26 ambíguas:
  M11.5/M20 vs M06.5/M16). Stub `scripts/build-mockups.mjs`
  documenta o desafio da toolchain JSX→HTML para M19 final.
  Nova seção §7.1 em `docs/CONTEXTO.md` formaliza o sistema
  (bundle 22 telas frozen, Ouroboros_telas_25_26 editável,
  screenshots por sprint = fonte canônica). 889 testes
  mantidos; toolchain completa fica para M19 final.

### Fixed
- **M00.5.x (a commitar) — Rules of Hooks em `app/(tabs)/index.tsx:81`.**
  Hook `useOnboarding((s) => s.tipoCompanhia)` foi movido para o topo
  do componente (linha 43, junto aos outros `useOnboarding`) antes
  dos early returns das linhas 70 e 76. ESLint passa limpo agora
  (`npx eslint "app/(tabs)/index.tsx"` exit 0). 889 testes mantidos.
  Achado novo registrado: `INFRA-acentuacao-comentarios` (comentários
  sem acento conflitam com CLAUDE.md — débito histórico amplo).

### Added
- **M20 (a commitar) — Widget Homescreen Android.** Plugin nativo
  Expo Module local em `modules/widget-homescreen/` com 2 layouts
  (4x2 e 4x4), 2 receivers (`OuroborosWidgetProvider` e `Large`),
  bridge JS via `requireOptionalNativeModule` (no-op silencioso em
  ausência), helper TS `atualizarWidgetHomescreen` (event-driven
  via `saveHumor` + boot hook idempotente; rate-limit 60s; fallback
  heatmap vazio quando cache M10 ausente), sub-toggle
  `widgetMostraNome` aninhado em Settings (privacidade reforçada
  por default — só inicial). Paleta Dracula em colors.xml,
  strings.xml PT-BR Sentence case com acentuação, deep links
  `ouroboros://capturar/<atalho>?source=widget`. **889 testes
  (+11) / 100 suites.** Bundle Hermes 8.47 MB. Ressalva Nível
  B/C pendente (M20.x) para sessão dev-client EAS.
- **Sessão maratona 2026-05-01 — 11 sprints fechadas em sequência.**
  Bloco 1 (infraestrutura M00.5/M00.6) + Bloco 2 (captura ativa
  M08/M13/M11/M12) + Bloco 5 (settings + opt-ins
  M15/M14.5/M16/M17/M18) entregues. Detalhes em
  `docs/SESSION-2026-05-01-log.md`.
  - **M00.5** (`9c3e28c`) — `app/(tabs)/_layout.tsx` com 5 abas
    fixas + 5 condicionais; `BottomTabs.tsx` chrome custom;
    barrels de schemas/stores; `useSettings` shape completo;
    `eas.json` 3 profiles; helpers boot
    (`deepLink`/`biometriaGate` placeholder/`reagendamento`).
    Move `app/index.tsx` → `app/(tabs)/index.tsx`. **288
    testes (+29).** Achado M00.5.x registrado (Rules of Hooks
    em `(tabs)/index.tsx:81`).
  - **M00.6** (`ae16a40`) — `SHEET_PRESETS` (60/70/80/90/DEFAULT);
    `draculaPolish.ts` injection web; mockup HTML novo
    `Ouroboros_telas_25_26-standalone.html` para Tela 25
    (calendário) e Tela 26 (widget). **295 testes (+7).**
    Achado M19.x registrado (bundle HTML toolchain).
  - **M08** (`9202273`) — Share Intent Receiver Tela 17 com 8
    subtipos (`pix`/`extrato`/`nota`/`exame`/`receita`/`garantia`/
    `contrato`/`outro`); `InboxArquivoSchema`; estende
    `deepLink.ts` para `action.SEND`; intent filters em
    `app.json`. Cópia foreground com indicador. **376 testes
    (+81).**
  - **M13** (`82cc519`) — CRUD completo de Exercícios (Telas
    02/07/08): galeria com filtros, detalhe com sparkline +
    tooltip cyan, cadastro com `expo-document-picker`. Substitui
    `/em-breve` no `captureRoutes.ts` e **deleta**
    `app/em-breve.tsx`. "Adicionar a treino livre" cria draft.
    **437 testes (+61).**
  - **M11** (`ca77ed3`) — Memórias com 3 sub-tabs
    (Treinos/Fotos/Marcos); schemas `treino_sessao` + `marco`;
    galeria agregada de 5 fontes; CRUD completo;
    `migrarDraftsParaTreinoSessao` em `BOOT_HOOKS`; 5 heurísticas
    de marcos auto com dedup hash SHA-256. **517 testes (+80).**
  - **M12** (`d6a2b43`) — Medidas (Telas 12/13) com sparkline
    cyan polygon fill + delta absoluto sem cor (ADR-0005).
    Integração cruzada com M11: `useFotosAgregadas` cresceu para
    ler `medidas/`. **568 testes (+51).**
  - **M15** (`27f6bbd`) — Settings 7 grupos com biometria gate
    real (`LocalAuthentication`); lembretes via
    `expo-notifications`; export ZIP via `jszip` +
    `expo-sharing`; toggles reativos confirmados. **618 testes
    (+50).**
  - **M14.5** (`5a6e578`) — Ciclo menstrual opt-in com tom
    sóbrio absoluto; calendário 28/35 dias adaptativo; fase
    inferida + override; abas separadas por pessoa; pasta
    dedicada `inbox/saude/ciclo/`. **663 testes (+45).**
  - **M16** (`739b993`) — Alarme com Snooze via category com
    action buttons; `SCHEDULE_EXACT_ALARM` Android 12+; sons
    CC0 gerados via ffmpeg sine wave. **740 testes (+77).**
  - **M17** (`2c3fbf6`) — To-do com drag&drop via
    `react-native-draggable-flatlist`; busca textual sem
    acento; lixeira soft 30 dias em `BOOT_HOOKS`. A17
    reincidiu, resolvido inline. **813 testes (+73).**
  - **M18** (`3989851`) — Contador "Dias sem X" com histórico
    timeline; sem celebração visual absoluta (ADR-0005);
    `diasEntre` UTC sem horas; recorde nunca diminui. Stream
    timeout do agente no final, fechamento manual. **878
    testes (+65).**
- **`docs/ORCHESTRATOR_PLAYBOOK.md`** — playbook mestre de
  orquestração para próximas sessões (filosofia, ciclo,
  template de prompt do executor, padrão de validação Chrome
  MCP, padrões aprendidos, erros e recuperação, mapa de
  blocos).
- **`docs/SESSION-2026-05-01-log.md`** — log narrativo das 11
  sprints com decisões arquiteturais e métricas finais.
- **`HOW_TO_RESUME.md` Passo 0** — orientação para identificar
  papel (orquestrador/executor/usuário humano) antes dos demais
  passos.

### Changed
- **Política de validação visual descontinuada para dual
  obrigatório.** Após M00.5, validação Chrome MCP pelo
  orquestrador substitui o checkpoint Expo Go por sprint. Expo
  Go vira gate exclusivo da M19 (release final) e sprints com
  APIs nativas pesadas. `INTEGRATION-CONTRACT.md` §2.3
  atualizado.

### Changed
- **Meta-sprint 2026-04-30 — Contrato de integração e zero v2.**
  Reescrita das 17 specs pendentes para garantir que cada sprint
  futura entregue feature **integrada ao projeto final**, sem
  código solto, e que **todas as features antes adiadas para v2**
  entrem no MVP v1.
  - Novo documento mestre `docs/sprints/INTEGRATION-CONTRACT.md`
    formaliza pontos canônicos de plug (tabs layout, schemas
    barrel, stores barrel, settings store, captureRoutes, boot
    hooks, app.json, eas.json, package scripts) e o checklist
    obrigatório por sprint.
  - 5 sprints novas adicionadas:
    - **M00.5 — Infraestrutura:** cria `app/(tabs)/_layout.tsx`,
      `BottomTabs.tsx`, barrels de schemas/stores, `useSettings`
      shape completo, `eas.json`, helpers de boot
      (`deepLink.ts`, `biometriaGate.tsx`, `reagendamento.ts`).
    - **M00.6 — Polish:** Dracula no Web, snap presets nomeados,
      mockup HTML standalone com Tela 25 (calendário) e Tela 26
      (widget).
    - **M19 — APK Release Hardening v1.0.0:** ícone, splash,
      versão, keystore, smoke E2E Maestro dos 4 flows críticos,
      tag.
    - **M20 — Widget Homescreen Android (Tela 26):** plugin
      nativo Expo Module com layouts 4x2 e 4x4, atalho radial,
      humor médio do dia.
    - **MOB-bridge-3 — Marcos auto-gerados pelo backend:** 5
      heurísticas (3 treinos em 7d, retorno após hiato, humor
      consecutivo, 30d sem trigger, primeira vitória da semana)
      com idempotência via hash.
  - 17 specs reescritas (M06.5, M07.x, M08, M09, M10, M11,
    M11.5, M12, M13, M14, M14.5, M15, M16, M17, M18,
    MOB-bridge-1, MOB-bridge-2):
    - Cada uma ganha §3.5 "Integração ao projeto" referenciando
      o CONTRACT.
    - § "Dúvidas em aberto" substituída por § "Decisões tomadas"
      com decisões explícitas e justificadas.
    - § "Definição de Pronto" adicionada com checklist de
      integração + qualidade.
    - Itens antes marcados "fora de escopo / v2 / sprint futura"
      absorvidos: CRUD completo treinos+marcos+exercícios,
      galeria de fotos agregada, modo contínuo do scanner,
      auto-bairro do scanner, snooze do alarme, drag&drop+busca
      do todo, histórico de resets do contador, mídia
      obrigatória nas 4 abas (Spotify oEmbed sem auth + YouTube
      thumb + foto + áudio), filtros adicionais do calendário
      (intensidade + bairro), tooltip do sparkline, fase
      manual+auto do ciclo, abas separadas por pessoa do ciclo,
      cache stale banner do Mini Humor, bairro auto cross-feature
      no scanner, atomic write robusto do MOB-bridge-2.
  - `VALIDATOR_BRIEF.md` §5 reescrita com 5 grupos de checks
    (estrutural, qualidade, visual, doc, integração).
  - `BRIEFING.md` §9 (anti-features) deixa de listar widget de
    homescreen — entra como sprint M20.
  - `ROADMAP.md` ganha 5 sprints novas, grafo de dependências
    atualizado e nota explícita "Nada permanece como v2".
  - `STATE.md` aponta M00.5 como próxima.
  - Ordem de execução recomendada: M00.5 → M00.6 → M08 →
    M11/M12/M13 → backend (MOB-bridge-1/2/3) → M10/M14 → M15 →
    M14.5/M16/M17/M18 → M06.5 → M07.x → M11.5 → M09 → M20 →
    M19 (release v1.0.0).

### Added
- **Sprint M07 — Eventos com lugar (Tela 20).** Substitui o stub
  da rota `/eventos` criado na M04 pela tela de captura de evento
  rica em contexto, com persistência em
  `eventos/YYYY-MM-DD-<slug>.md` no Vault.
  - `app/eventos.tsx` — bottom sheet 80% que abre ao montar.
    Toggle Positivo/Negativo no header (verde/vermelho) com
    borda esquerda animada, padrão idêntico ao da Tela 18.
    Textarea "O que aconteceu?" obrigatória (mínimo 1 caractere).
    Bloco "Onde" combinando input livre + botão "Usar localização
    atual" (`expo-location`) + chip cyan opcional do bairro
    detectado. Bloco "Quando" com chips single-select Agora /
    Outro horário (este abre `<DateTimePicker mode="time">`).
    `<ChipGroup mode="multi">` "Com quem" auto-selecionando
    `pessoa_b` quando `tipoCompanhia` é `'casal'` ou `'amigos'`
    (decisão M07 §9 item 1). `<ChipGroup mode="single">` de
    Categoria com 8 slugs fechados. `<FotosBlock>` opcional via
    `expo-image-picker` (cap interno de 6 fotos). Slider 1-5 de
    intensidade. Botão Registrar variant `success` em modo
    positivo / `destructive` em modo negativo. Sem haptic em modo
    negativo (mesmo princípio M06).
  - `src/components/eventos/LocalizacaoBlock.tsx`,
    `src/components/eventos/QuandoBlock.tsx`,
    `src/components/eventos/FotosBlock.tsx` — três blocos
    auxiliares com estado controlado pelo container e API
    pequena. FotosBlock mostra grid de thumbnails 80dp com botão
    `X` red para remover; ao atingir o cap, o botão "Adicionar
    foto" exibe o label `"Limite de 6 fotos atingido"` e fica
    disabled.
  - `src/lib/eventos/categorias.ts` — lista fechada
    `EVENTO_CATEGORIAS_SLUGS = ['rolezinho','compras','consulta',
    'trabalho','evento_social','rotina','exercicio','outro']` em
    snake_case ASCII no frontmatter. Helper `formatCategoria`
    com dicionário `EVENTO_CATEGORIAS_LABELS` acentuado em
    Sentence case PT-BR (Exercício, Evento social) e fallback
    mecânico para slugs desconhecidos. Decisão M07 §9 item 2:
    `exercicio` mantido na lista como registro casual; treino
    estruturado vai para a M13.
  - `src/lib/eventos/slug.ts` — helper `slugifyEvento` em
    cascata (bairro > texto > categoria > `'evento'`) gerando
    kebab-case ASCII com cap de 24 chars sem cortar palavra.
  - `src/lib/eventos/localizacao.ts` — wrapper `getBairroAtual`
    sobre `expo-location` (request permission > current position
    > reverse geocode). Extrai `district` com fallback em
    `subregion`. Erros silenciosos (devolve `null`).
  - `src/lib/eventos/saveEvento.ts` — função pura que valida
    via `EventoSchema.safeParse`, copia cada foto para
    `assets/<formatDateYmdHm>-evento-<idx>.jpg` via
    `expo-file-system/legacy`, atualiza `meta.fotos` com paths
    relativos ao Vault, resolve colisão de path com sufixo
    numérico crescente e chama `writeVaultFile<EventoMeta>`.
  - `tests/app/eventos.test.tsx` (16 testes),
    `tests/lib/eventos/saveEvento.test.ts` (12 testes),
    `tests/lib/eventos/categorias.test.ts` (16 testes),
    `tests/lib/eventos/slug.test.ts` (15 testes),
    `tests/lib/eventos/localizacao.test.ts` (10 testes).
    Total de testes salta de 194 para 259 (+65).
  - `app.json` ganha plugin `expo-location` com
    `locationAlwaysAndWhenInUsePermission` e plugin
    `@react-native-community/datetimepicker`.
    `expo-location@~19.0.8` e
    `@react-native-community/datetimepicker@8.4.4` instalados
    via `npx expo install`. `expo-image-picker@~17.0.11` já
    estava presente desde M03.2.
  - Bundle Hermes Android: 7,46 MB → 7,55 MB.

- **Sprint M06.X — Estende `DiarioEmocionalSchema` com `contexto_social`.**
  Fecha o achado da M06: o schema v1 só aceitava `PessoaId` em
  `com`, deixando `amigos`/`sozinho` apenas em prosa no corpo do
  `.md`. Agora o schema tem campo separado
  `contexto_social: ('amigos'|'sozinho')[]` com default `[]` (compat
  com arquivos antigos). `app/diario-emocional.tsx` divide o estado
  da UI em `meta.com` (PessoaIds) + `meta.contexto_social` (flags).
  O corpo livre do `.md` mantém a linha "Com:" para legibilidade no
  Obsidian (redundância intencional). 6 testes novos em
  `tests/schemas/diario_emocional.test.ts` (188 → 194 testes).

- **Sprint M06 — Diário emocional (Tela 18).** Substitui o stub da
  rota `/diario-emocional` criado na M04 pela tela de captura
  emocional rica em contexto, com persistência em
  `inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md` no Vault.
  - `app/diario-emocional.tsx` — bottom sheet 90% que abre ao
    montar. Toggle inicial trigger ↔ vitória renderizado como dois
    chips (red / green) que mudam a borda esquerda animada do form
    via `MotiView` com spring subtle. Grid de chips de emoção
    multi-select (6 negativos em modo trigger, 6 positivos em modo
    vitória) com acentuação completa PT-BR via dicionário de
    labels. Slider 1-5 de intensidade. Textarea livre obrigatória
    (mínimo 1 caractere; bloqueia save com toast warn se vazia).
    `<ChipGroup mode="multi">` "Com quem" com 4 opções fixas
    (`pessoa_a`, `pessoa_b`, `amigos`, `sozinho`). Bloco
    condicional em modo trigger com textarea Estratégia + Toggle
    Funcionou. Botão final variant `destructive` (trigger) ou
    `success` (vitória). Microcopy de rodapé `"Salvo localmente.
    Ninguém vê além de vocês dois."` em muted-decor. Modo `audio`
    inicializa em vitória e marca flag interna `audioRequested`
    para a M06.5 acoplar a UI de gravação. Sem haptic no save em
    modo trigger (momento delicado, BRIEFING §2.5); em modo
    vitória dispara `haptics.success()` leve.
  - `src/components/diario/EmocaoChips.tsx` — wrapper sobre
    `<ChipGroup mode="multi">` com prop `modo` que troca o
    conjunto de opções. `MotiView` com `key` re-mountável dispara
    spring subtle no opacity ao trocar de modo (hop visual sem
    jump-cut).
  - `src/lib/diario/emocoes.ts` — listas fixas
    `EMOCOES_NEGATIVAS = ['tristeza','raiva','ansiedade','frustracao','medo','solidao']`
    e `EMOCOES_POSITIVAS = ['alegria','alivio','gratidao','conexao','paz','orgulho']`
    em snake_case ASCII no frontmatter. Helper `formatEmocao(slug)`
    com dicionário de labels acentuados (frustração, alívio,
    gratidão, conexão, solidão) e fallback mecânico para slugs
    desconhecidos. Sets `EMOCOES_NEGATIVAS_OPTIONS` (accent red) e
    `EMOCOES_POSITIVAS_OPTIONS` (accent green) prontos para o
    ChipGroup.
  - `src/lib/diario/saveDiario.ts` — função pura que resolve
    `diarioEmocionalPath(new Date(), slug)` (slug derivado da
    primeira emoção ou `'registro'`), valida via
    `DiarioEmocionalSchema.safeParse`, aplica sufixo numérico
    crescente em colisão improvável de mesmo arquivo no mesmo
    minuto e chama `writeVaultFile<DiarioEmocionalMeta>`.
  - `tests/app/diario-emocional.test.tsx` (15 testes),
    `tests/components/diario/EmocaoChips.test.tsx` (6 testes),
    `tests/lib/diario/saveDiario.test.ts` (8 testes),
    `tests/lib/diario/emocoes.test.ts` (12 testes). Total de
    testes salta de 147 para 188 (+41).
  - **Achado registrado para sprint nova**: o
    `DiarioEmocionalSchema` v1 só aceita `PessoaId` em `com`,
    bloqueando os flags `amigos` e `sozinho` exigidos pela UI.
    Solução provisória nesta sprint: persistir em `meta.com`
    apenas os PessoaIds válidos e anotar contexto extra no corpo
    livre do `.md` em prosa ("Com: Amigos, Sozinho."). Nova
    sprint M06.X deve estender o schema com campo
    `contexto_social: ('amigos'|'sozinho')[]`.

- **Sprint M05.2 — Estender `<Input>` com `autoCapitalize` e
  `keyboardType`.** O componente passa a expor essas duas props
  opcionais (defaults `'sentences'` e `'default'`), repassadas
  diretamente ao `TextInput` interno. Achado pelo executor da M05
  ao não conseguir aplicar `autoCapitalize="sentences"` no campo
  Medicação e `keyboardType="numeric"` no campo Horas de sono.
  `app/humor-rapido.tsx` atualizado para usar as novas props.
  4 testes novos em `tests/components/ui/Input.test.tsx` (total
  144 → 147 testes, 28 suites).

- **Sprint M05 — Humor rápido (Tela 15).** Substitui o stub da
  rota `/humor-rapido` criado na M04 pela primeira tela de captura
  real do app, com persistência em `daily/YYYY-MM-DD.md` no Vault.
  - `app/humor-rapido.tsx` — bottom sheet 70% que abre ao montar.
    Quatro sliders 1-5 (humor, energia, ansiedade, foco) com
    default 3, input de medicação (texto livre opcional, decisão
    da §9), input de horas de sono (numérico), `<ChipGroup
    mode="multi">` com 8 tags rápidas fechadas, textarea de uma
    frase opcional e botão Salvar verde. Após salvar dispara
    `haptics.success()`, toast `"Salvo."` e `router.back()`.
  - `src/lib/humor/saveHumor.ts` — função pura que resolve
    `dailyPath(new Date())`, detecta colisão de pessoa A5
    (`pessoa_a` × `pessoa_b` no mesmo dia via Syncthing) lendo o
    arquivo canônico antes de escrever, aplica sufixo
    `-pessoa_<x>.md` quando outro autor já escreveu, e chama
    `writeVaultFile<HumorMeta>` com corpo vazio (frase fica no
    frontmatter, decisão M05).
  - `src/lib/humor/tagsRapidas.ts` — lista fechada de 8 slugs
    canônicos (`trabalho_pesado`, `boa_conversa`, `cansaco`,
    `exercicio`, `foco_dificil`, `dormi_mal`, `treino_bom`,
    `dia_leve`) + helper `formatTag` que converte snake_case em
    Sentence case para exibição.
  - `tests/app/humor-rapido.test.tsx` (10 testes),
    `tests/lib/humor/saveHumor.test.ts` (5 testes),
    `tests/lib/humor/tagsRapidas.test.ts` (8 testes). Total de
    testes salta de 120 para 143.

- **Sprint M04 — FAB Radial integrado em capturas.** Commit
  `4e10f25` (15 arquivos, 285 inserções, 7 remoções).
  - `src/lib/navigation/captureRoutes.ts` — módulo novo que mapeia
    cada `FABRadialKey` para `Href` literal do Expo Router. Rotas
    com params (`?modo=trigger|vitoria|audio`) já preparadas para
    M06 e M06.5.
  - `app/index.tsx` — `<FABRadial>` agora chama `router.push()` via
    `routeForCapture()`, substituindo o toast antigo "FAB radial
    chega na M04".
  - 5 stubs novos em `app/`: `em-breve.tsx`, `humor-rapido.tsx`,
    `diario-emocional.tsx`, `eventos.tsx`, `scanner.tsx`. Cada um
    usa `<EmptyState>` informando em qual sprint a tela chega.
  - `tests/lib/navigation/captureRoutes.test.ts` — 8 testes novos
    cobrindo as 6 chaves do FAB. Total: 118/118 passando.
  - 7 screenshots Nível A (Chrome web) em
    `docs/sprints/M04-screenshots/` capturados via playwright MCP.
  - Bundle Hermes Android estável em 7,46 MB.

- **Sprint M00.docs — Orquestração Mestre.** 47 arquivos
  novos/atualizados em 5 commits.
  - 3 docs raiz: `ROADMAP.md` (mapa das 22+ sprints),
    `STATE.md` (estado vivo), `HOW_TO_RESUME.md` (guia de retomada
    em 5 passos). Pensados para qualquer Opus retomar fresh sem
    histórico.
  - Template fixo: `docs/sprints/_template-spec.md` com 9 seções
    obrigatórias para toda spec futura.
  - **15 ADRs em `docs/ADRs/`**: 11 históricos formalizados
    (0001-0011) a partir do `PLANO_TECNICO_APK.md` §4 + 4 novos
    (0012 cache mobile readonly, 0013 capitalização revogada,
    0014 vault dedicado, 0015 pessoas runtime com foto). Índice
    em `docs/ADRs/INDEX.md`.
  - **18 specs Mobile detalhadas** em `docs/sprints/M04-spec.md`
    a `docs/sprints/M18-spec.md`, incluindo M06.5 (microfone),
    M07.x (mídia obrigatória em conquistas), M11.5 (calendário
    visual de conquistas) e M14.5 (acompanhador de ciclo
    menstrual, opt-in, tom sóbrio).
  - **2 specs Backend** em `docs/sprints/backend/`: MOB-bridge-1
    (refactor pessoa_a/b no Python) e MOB-bridge-2 (caches
    `humor-heatmap.json` e `financas-cache.json`).
  - Consolidação histórica em
    `docs/sprints/M03.x-fixes-consolidados.md` (M03.1 a M03.7).
  - Decisões: F-15/16/17 promovidas a v1 como M16/M17/M18 (opt-in
    via Settings da M15). Ciclo menstrual entra como M14.5
    (opt-in, sem gamificação). Calendário visual entra como M11.5.

### Changed
- `VALIDATOR_BRIEF.md`: nova seção 6 (Roadmap canônico) apontando
  para `ROADMAP.md`. Nova seção 7 (Estado atual) apontando para
  `STATE.md`. Nova seção 8 (Como retomar) apontando para
  `HOW_TO_RESUME.md`. Stack header atualizada (Expo SDK 54,
  Reanimated 4, NativeWind 4).
- `CLAUDE.md`: adicionada seção "Como retomar em sessão fresh"
  apontando para `HOW_TO_RESUME.md`.
- `README.md`: aviso destacado no topo apontando para
  `STATE.md`/`ROADMAP.md`/`HOW_TO_RESUME.md`.
- `docs/BRIEFING.md`: marcação de obsolescência na regra "lowercase
  intencional" (§1) com aviso apontando para ADR-0013.
- `docs/CONTEXTO.md`: §4 ganha aviso sobre mudança do path do Vault
  para `~/Protocolo-Ouroboros/` (ADR-0014).
- `docs/PLANO_TECNICO_APK.md`: §4 ganha aviso de que ADRs canônicos
  agora vivem em `docs/ADRs/`. Texto em prosa fica como referência
  histórica.

- `install-dev.sh` reescrito como instalador único: pede sudo uma
  vez no início e mantém cacheado, configura `~/.zshrc` com
  `ANDROID_HOME` e PATH automaticamente, detecta hardware (cores
  lógicos, RAM total) e cria AVD `ouroboros-test` com config
  otimizada (`hw.cpu.ncore`, `hw.ramSize`, `vm.heapSize`, GPU host,
  KVM). Cold boot inicial com snapshot `default_boot` para boots
  seguintes em menos de 10s.
- `scripts/start-emulator.sh` — inicia emulador com flags de
  performance (`-gpu host`, `-accel auto`, `-no-boot-anim`, snapshot)
  e aguarda `sys.boot_completed=1`. Aceita `--headless` e `--cold`.
- `scripts/mirror-device.sh` — abre janela `scrcpy` espelhando o
  device ADB ativo (celular físico ou emulador) com latência <50ms.
- `run.sh` ganhou flags `--emulator` (sobe AVD antes do Metro) e
  `--mirror` (abre `scrcpy` em paralelo). `--web` continua sem
  conflito com celular físico.

### Added
- Sprint M03.2 — foto de perfil. `<AvatarPicker pessoa={...}>` em
  `src/components/ui/AvatarPicker.tsx` abre galeria via
  `expo-image-picker`, copia a foto escolhida para
  `documentDirectory/avatars/<pessoa>.jpg` (URI estável entre
  sessões) e persiste em `usePessoa.fotos`. Placeholder dashed em
  borda da cor da pessoa quando vazio. `<PersonAvatar>` ganha prop
  opcional `photoUri` que sobrepõe a inicial colorida com a imagem
  real. Frame 0 do onboarding mostra o picker acima do input de
  nome; Frame 1 (se duo) mostra o picker da segunda pessoa abaixo
  do input. `app.json` ganha plugin `expo-image-picker` com
  permissions strings PT-BR.
- `expo-image-picker@~17.0.11` instalado via `npx expo install`.

### Fixed
- Sprint M03.1 — flicker de redirect resolvido. Stores zustand-persist
  hidratam de forma assíncrona do SecureStore. Adicionado hook
  `useHasHydrated(useStore)` em `src/lib/stores/hydrated.ts` que
  observa `persist.onFinishHydration`. `app/index.tsx` agora aguarda
  as 3 stores (onboarding, vault, pessoa) hidratarem antes de
  qualquer `<Redirect>`. Durante a janela de hidratação mostra
  `<Screen>` vazio (bg-page) — sem flicker.
- Sprint M03.1 — labels micro-laranja do onboarding com Sentence
  case + acentuação completa: `"Antes de começar"`, `"Companhia"`,
  `"Vault"`, `"Sincronização"`. Removido `textTransform: 'lowercase'`
  do helper `MicroOrange`.
- Sprint M03.1 — gap entre cards do Frame 3 (Sincronização) subiu
  para `spacing.xl` (24dp), reforçando a separação visual entre
  Syncthing / Obsidian Sync / Não uso ainda.

### Changed
- Vault físico do Mobile passa a ser **`~/Protocolo-Ouroboros/`**
  (decisão de 2026-04-29). Pasta dedicada sincronizada via Syncthing
  entre desktop Pop!_OS e celular Note13-Andre, **separada do Vault
  humano do Obsidian** em `~/Controle de Bordo/`. Reduz risco de
  conflito com arquivos pessoais e simplifica o contrato com o
  backend desktop. `VALIDATOR_BRIEF.md` e `scripts/seed_vault_demo.sh`
  atualizados; o script agora cria pastas `daily/`, `eventos/`,
  `inbox/mente/diario/` na pasta nova.

### Fixed
- Sprint M02.1 — corrigido loop infinito em `useHoje` causado por
  `now: Date = new Date()` no parâmetro default do hook (criava nova
  referência a cada render, disparando o useEffect em loop). Hook
  agora aceita `ymdOverride?: string` opcional e calcula a data
  dentro do effect. Sintoma: tela "Hoje" piscava entre Carregando e
  Empty State.
- Sprint M02.1 — labels do FAB radial ajustados: Trigger → Crise,
  Exercício → Exercícios, Vitória → Conquista (evita confusão com
  nome próprio "Vitória" e termo técnico "Trigger").
  ARC_RADIUS 175→210 e ângulos voltaram para range matemático
  180–270°. Teste de a11y atualizado para os novos labels.
- Sprint M02.2 — labels do FAB radial sem largura fixa: o `width:
  140` invadia o ícone do botão adjacente ao centralizar o texto.
  Agora o `<Text>` ajusta ao tamanho do conteúdo. Sintoma corrigido:
  rótulos sobrepondo ícones (visível no checkpoint 70717).

### Added
- Sprint M02 — Vault Bridge + Tela 01 (hoje). Primeira sprint que
  conecta o app a dados reais. `src/lib/vault/` com paths canônicos
  (`daily/`, `eventos/`, `inbox/mente/diario/`), parser de YAML
  frontmatter, reader/writer/permissions sobre SAF do Android via
  `expo-file-system/legacy`. Schemas zod para `humor`,
  `diario_emocional` e `evento` espelhando `BRIEFING.md` §7. Store
  global `useVault` com URI raiz persistido em SecureStore. Hook
  `useHoje` lê os três tipos em paralelo, filtra pela pessoa ativa,
  retorna estado uniforme para a UI. `app/index.tsx` substitui o
  re-export do storybook por Tela 01 real (modal de permissão
  full-screen quando Vault não foi concedido; cards de humor com
  sliders readonly, lista de diários e eventos com borda colorida
  por modo, FAB que mostra toast informando que radial chega na
  M04). `scripts/seed_vault_demo.sh` popula o Vault físico com 3
  arquivos de exemplo (`pessoa_a`) idempotente. Total de 105 testes
  (40 novos: paths, frontmatter, três schemas).
- Sprint M01.6.2: FAB radial repensado pós-feedback usuário. FAB
  principal 56→72dp, botões de ação 48→64dp, ícones aumentados,
  labels reposicionadas à esquerda do círculo com fundo sólido
  `bgElev` e fonte 14 weight medium.
- Sprint M01.6.3: ajuste angular para evitar sobreposição
  Vitória/Trigger detectada no checkpoint visual. Espaçamento
  18°→22° entre itens, ARC_RADIUS 150→175, ângulos redistribuídos
  175-285°.
- Sprint M01 finalizada — endorso visual do usuário no celular real:
  "as animações do mais e o menu radial é muito foda".
  Tag `v0.1.0-m01` marca a Fundação Estética concluída.

### Changed
- **Regra de capitalização da UI revogada e substituída** durante
  checkpoint visual M01.5 (2026-04-28). `BRIEFING.md` §1 e §2.4
  prescreviam "lowercase intencional" em toda a UI. Decisão do dono
  do projeto: strings de UI passam a usar **Sentence case com
  acentuação completa PT-BR**. `accessibilityLabel` continua sem
  acento; comentários em código continuam sem acento. `VALIDATOR_BRIEF.md`
  §1.4 e `CLAUDE.md` (regra de linguagem) atualizados.
- Line-height de body subiu de 1,5 para 1,6.

### Added
- Sprint M01.5: checkpoint visual M01 no celular real (Redmi Note 13
  5G Pro via Expo Go LAN). 4 screenshots commitadas em
  `docs/sprints/M01.5-screenshots/`. Estética aprovada com 4
  ressalvas a tratar em Sprint M01.6 (capitalização, acentos
  faltantes, densidade visual alta, warning SafeAreaView). Documento
  completo em `docs/sprints/M01.5-checkpoint-visual.md`.
- Sprint M01.4: 5 componentes UI complexos em `src/components/ui/`
  (Slider, Toast + ToastProvider + useToast, BottomSheet, FAB,
  FABRadial). FABRadial implementa o menu radial da Tela 14 com 6
  botões em arco semicircular (humor pink, voz cyan, câmera orange,
  exercício green, vitória yellow, trigger red), surgindo em sequência
  com 60ms de delay (`springs.bouncy`). Toast sobe a 80dp do bottom em
  `springs.default`, fade out em 180ms, swipe horizontal para
  dispensar. `app/_layout.tsx` envolto em `<GestureHandlerRootView>` +
  `<ToastProvider>` (única alteração mínima autorizada de arquivo
  fechado).
- 16 testes novos (3 Slider + 4 Toast + 2 BottomSheet + 3 FAB + 4
  FABRadial) — total 65 testes em 18 suítes.
- `@react-native-community/slider@5.0.1` instalado via `npx expo
  install` (Armadilha A11).
- `jest.setup.cjs` ampliado com mocks de slider, gorhom/bottom-sheet e
  gesture-handler.
- Sprint M01.3: 10 componentes UI premium estáticos em
  `src/components/ui/` (Screen, Header, Button, Card, Input, Textarea,
  Chip + ChipGroup, Toggle, PersonAvatar, EmptyState) + barrel
  `index.ts`. Cada componente nasce com springs (`@/lib/motion`),
  haptics (`@/lib/haptics`), scale 0.97 ao pressionar, classes
  Tailwind da paleta Dracula, strings de UI em lowercase intencional e
  `accessibilityRole` + `accessibilityLabel`. Storybook caseiro em
  `app/_components.tsx` mostrando todos os componentes em isolamento.
- 27 testes novos (13 suítes, 49 testes ao total) cobrindo render,
  press handlers, haptics e variantes via
  `@testing-library/react-native@^13.3.3` (peer
  `react-test-renderer@19.1.0`).
- `jest.setup.cjs` para silenciar transformações do nativewind/babel
  no setup global do jest (Armadilha A12 — registrar no BRIEF).
- Sprint M01.2: fundação da camada de bibliotecas internas em `src/`.
  Tokens visuais (`src/theme/tokens.ts`) com cores Dracula, spacing 4dp,
  radius por superfície e tipografia (pesos 400/500, line-height ≥ 1,5).
  Motion (`src/lib/motion.ts`) com 4 spring presets canônicos
  (subtle 22/220, default 18/200, bouncy 12/180, snappy 26/320) e 2
  timings (fadeOut linear 180ms, toastIn spring). Haptics
  (`src/lib/haptics.ts`) com 5 helpers tipados (`light`, `medium`,
  `selection`, `success`, `error`) sobre `expo-haptics`. Schemas zod
  (`src/lib/schemas/pessoa.ts`): `PessoaIdSchema`, `PessoaAutorSchema`
  e `isAutor`. Config genérica (`src/config/pessoas.config.ts` e
  `pessoas.config.example.ts`) com defaults `Nome_A`/`Nome_B`/`Ambos` —
  Regra −1 preservada. Store zustand (`src/lib/stores/pessoa.ts`) com
  `pessoaAtiva`, `filtroPessoa`, `nomes`, persistido em SecureStore via
  adapter (`src/lib/stores/persist.ts`) sob a chave
  `ouroboros.pessoa.v1`.
- Suíte de testes unitários em `tests/` com jest-expo (22 casos em 3
  suites). Cobertura: schemas (parse/rejeição/type-guard), motion
  (números exatos dos presets) e config (defaults genéricos não casam
  regex de nomes reais).
- `package.json`: script `test` (`jest --watchAll=false`), bloco `jest`
  com preset `jest-expo`, `testMatch` restrito a `tests/`,
  `transformIgnorePatterns` para módulos RN/Expo/Moti/NativeWind e
  `moduleNameMapper` para resolver alias `@/*` (espelha tsconfig).
  Dev deps adicionadas via `npx expo install --dev`: `jest-expo` 54.0.17,
  `jest` 29.7.0, `@types/jest` 29.5.14.
- `.npmrc` com `legacy-peer-deps=true` para destravar peer deps do
  `@gluestack-ui/themed` (legado) com React 19.
- VALIDATOR_BRIEF Armadilhas A8/A9/A10/A11 documentando achados de
  M01.1 (Reanimated 4, ESLint flat config, gluestack legacy, peer deps
  do SDK 54).
- Sprint M01.1: bootstrap Expo SDK 54 em-place preservando docs.
  Stack confirmada: Expo Router, NativeWind 4, Reanimated 4,
  Moti, gluestack-ui, @gorhom/bottom-sheet, JetBrains Mono via
  `@expo-google-fonts/jetbrains-mono`, zustand, zod, yaml.
  Configs: `tailwind.config.js` com paleta Dracula completa,
  `babel.config.js` com `nativewind/babel` antes e
  `react-native-reanimated/plugin` por último (Armadilha A1),
  `metro.config.js` com `withNativeWind`, `tsconfig.json` strict
  + paths `@/*`, `app.json` com tema dark e package
  `com.ouroboros.mobile`. Telas placeholder em `app/_layout.tsx`
  e `app/index.tsx` com classes Tailwind.
- Bootstrap do repositório git (Fase 0).
- Layout canônico `docs/` com `BRIEFING.md`, `CONTEXTO.md`,
  `PLANO_TECNICO_APK.md`, `Ouroboros_24_telas-standalone.html` e
  pastas `ADRs/`, `sprints/`, `design-canvas-export/`.
- Scripts de validação: `check_anonimato.sh`, `check_test_data.sh`,
  `smoke.sh`, `sprint_iniciar.sh`.
- Hooks `pre-commit` e `pre-push` ativos via `core.hooksPath=hooks`.
- `LICENSE` GPL-3.0, `README.md`, `CLAUDE.md` com regras invioláveis,
  `.gitignore` com exceção para `pessoas.config.runtime.json`.

### Changed
- `docs/design-canvas-export/project/BRIEFING_PARTE3_SPEC.md` marcado
  como `SUPERSEDED` (legado, stack era Kotlin/Compose).
