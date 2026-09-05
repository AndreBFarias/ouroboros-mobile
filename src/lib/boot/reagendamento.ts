// Orquestrador de hooks de boot. Cada sprint que precisa de tarefa
// idempotente no início do app faz `BOOT_HOOKS.push(suaFuncao)` em
// seu proprio modulo (CONTRACT seções 1.7 e 5.4).
//
// Lista canonica dos 17 hooks empurrados NESTE arquivo, na ordem real
// do BOOT_HOOKS.push no fim dele. Manter esta lista sincronizada com o
// push: o cabecalho ficou defasado ate a AUDIT-P1-1A (dizia "5 hooks" e
// enumerava 6, com 15 registrados de fato).
//
//   1.  M11 migrarDraftsParaTreinoSessao (sempre, idempotente)
//   2.  M11 verificarMarcosAuto (uma vez por dia)
//   3.  M30 migrarLembretesParaAlarmes (uma vez, antes do reagendar)
//   4.  M30 apagarChannelsLegadosUmaVez (uma vez por instalacao)
//   5.  M16 reagendarAlarmes (sempre, idempotente)
//   6.  M17 limparLixeiraExpirada (uma vez por dia)
//   7.  M20 atualizarWidgetHomescreen (sempre, com rate-limit interno)
//   8.  M15 reagendarLembretes (sempre, idempotente)
//   9.  M39 migrarAssetsLegacyParaMedia (idempotente, depende de vault)
//   10. M37.1.2 migrarCacheAgendaJsonParaMd (uma vez por instalacao)
//   11. H2/ADR-0023 migrarVaultLayoutPorTipo (uma vez por instalacao)
//   12. AUDIT-T2 migrarArquivosCanonicosParaDeviceId (uma vez)
//   13. M38 atualizarDeviceIndex (sempre, idempotente)
//   14. AUDIT-T1-BUGS B1 limparArquivosWritingOrfaos (sempre)
//   15. V4.0.2 reconciliarTipoCompanhia (sempre, so stores em memoria)
//   16. AUDIT-P2-4 statsAgregadasHook (sempre; escreve os 4 periodos)
//   17. AUDIT-P1-1A sincronizarWidgetTodoBootHook (sempre, idempotente)
//
// ATENCAO (AUDIT-P2-4, 2026-09-05): a lista acima NAO e o conteudo de
// BOOT_HOOKS em runtime, e nunca foi. Dois hooks se registram de fora
// deste arquivo e nunca entraram na enumeracao:
//   18. limparDuplicatasAgendaUmaVez (src/lib/boot/
//       limparDuplicatasAgenda.ts, no fim do proprio modulo)
//   19. sanearEstadoTextoPuroUmaVez (src/lib/boot/
//       sanearEstadoTextoPuro.ts, idem)
// Os dois modulos entram por import de side-effect em app/_layout.tsx,
// depois do import deste arquivo -- por isso caem no fim da fila, nessa
// ordem. Em runtime sao 19 hooks. Os testes que importam somente este
// modulo enxergam 17, porque o grafo de modulos deles nao carrega os
// outros dois arquivos. Quem for conferir contagem precisa dizer de
// qual dos dois numeros esta falando.
//
// Sprint que acrescentar hook registra-o na lista acima (se o push for
// deste arquivo) ou nesta nota (se o modulo dono se registrar sozinho).
//
// Em M00.5 a lista comeca vazia. O orquestrador roda cada hook em
// sequência, isolando erros: falha de um não trava os demais.
//
// -------------------------------------------------------------------
// MECANISMO CANONICO DE ROTINA ONE-SHOT DE BOOT (AUDIT-P1-9, 2026-09-05)
// -------------------------------------------------------------------
//
// BOOT_HOOKS e' o mecanismo canonico. Rotina nova de arranque entra
// aqui, nao como useEffect proprio em app/_layout.tsx.
//
// Por que: o modulo dono registra a si mesmo, entao o _layout nao
// precisa conhecer cada sprint; a ordem fica declarada num lugar so' e
// e' auditavel; e a fila inteira ganha teste de execucao de graca
// (tests/lib/boot/reagendamento-migrations-vault.test.ts).
//
// Ate' esta sprint havia uma diferenca real entre os dois mecanismos: a
// fila disparava num useEffect de deps vazias, antes da hidratacao das
// stores, enquanto os efeitos diretos ja' guardavam por appPronto.
// AUDIT-P1-9 alinhou o disparo da fila ao mesmo guard, e a diferenca
// funcional deixou de existir.
//
// Sobraram tres efeitos diretos em app/_layout.tsx, por acidente
// historico e nao por criterio: migrarEstadoParaVault,
// sanearRecordesContadores e avaliarBackupAutomatico. Todos rodam na
// mesma janela desta fila. Migra-los muda a ordem relativa de execucao
// das migrations de Vault, o que exige sprint propria com validacao --
// AUDIT-P1-9 declarou isso NAO-objetivo. Ficam registrados aqui como
// debito conhecido, nao como padrao a imitar.
//
// Criterio para quem for escrever rotina nova:
//   - depende do Vault ou de store hidratada, roda uma vez por boot ou
//     por instalacao  -> BOOT_HOOKS, no modulo dono;
//   - precisa de cleanup no unmount, de estado de componente, ou reage
//     a mudanca de prop/estado ao longo da sessao -> useEffect no
//     componente que tem esse ciclo de vida (ex.: o timer de
//     avaliarBackupAutomatico, que cancela no unmount).

export type BootHook = () => Promise<void>;

// Array exportado mutavel: sprints fazem `BOOT_HOOKS.push(fn)` em
// seus modulos, antes do RootLayout montar (import side-effect ou
// chamada explicita de registro).
export const BOOT_HOOKS: BootHook[] = [];

export async function reagendarTodosBootHooks(): Promise<void> {
  for (const hook of BOOT_HOOKS) {
    try {
      await hook();
    } catch {
      // Isola falha: hook quebrado não impede demais.
    }
  }
}

// Side-effect: M11 pluga seus dois hooks de boot diretamente. A
// migracao roda primeiro (consolida drafts antigos) e depois a
// verificacao de marcos auto avalia o estado consolidado.
//
// Import dinamico (lazy require) evita ciclo entre @/lib/boot/* e
// @/lib/treinos|marcos/*. Funções wrapper encapsulam o require.
const migrarDraftsHook: BootHook = async () => {
  const { migrarDraftsParaTreinoSessao } =
    await import('@/lib/treinos/migrarDraftsParaTreinoSessao');
  await migrarDraftsParaTreinoSessao();
};

const marcosAutoHook: BootHook = async () => {
  const { verificarMarcosAuto } = await import('@/lib/marcos/marcosAuto');
  await verificarMarcosAuto();
};

// M16 alarmes pessoais: reagenda todos os alarmes ativos no boot.
// Idempotente (cancela tudo do prefixo antes de re-criar). Necessario
// porque expo-notifications não persiste schedules entre reboots ou
// updates do app no Android.
const reagendarAlarmesHook: BootHook = async () => {
  const { reagendarAlarmes } =
    await import('@/lib/services/alarmesNotificacoes');
  await reagendarAlarmes();
};

// M30: migra lembretes legados (medicacao/treino/humor) do shape v1
// de useSettings para alarmes pre-cadastrados no Vault. Idempotente
// (alarmes existentes com mesmo slug sao preservados; apos sucesso
// apaga o blob v1 do SecureStore). Roda ANTES de reagendarAlarmes
// para que os alarmes pre-cadastrados ja entrem no schedule do boot
// quando estiverem com ativo=true.
const migrarLembretesHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { migrarLembretesParaAlarmes } =
    await import('@/lib/boot/migrarLembretes');
  await migrarLembretesParaAlarmes(vaultRoot);
};

// M30: apaga channels Android legados uma unica vez por instalacao.
// Necessario porque Android nao permite editar vibrationPattern de
// channel existente; o novo channel 'ouroboros-default-v2' nasce via
// registrarCategoriasAlarme em app/_layout.tsx, e este hook limpa o
// lixo. Guardado por useSessao.flags.canalV1Deletado.
const apagarChannelsLegadosHook: BootHook = async () => {
  const { apagarChannelsLegadosUmaVez } =
    await import('@/lib/services/notificationActions');
  await apagarChannelsLegadosUmaVez();
};

// M17 to-do leve: limpa lixeira soft de tarefas com retencao de 30
// dias. Idempotente: roda uma vez por dia, controlado por timestamp
// em SecureStore.
const limparLixeiraTarefasHook: BootHook = async () => {
  const { limparLixeiraExpirada } =
    await import('@/lib/tarefas/limparLixeiraExpirada');
  await limparLixeiraExpirada();
};

// M20 widget homescreen: ao abrir o app, refresca o widget com o
// humor do dia mesmo se não houve save novo. Idempotente: respeita
// rate-limit interno (1 update por minuto). Toggle off curta cedo
// chamando desativarWidget no provider nativo.
const atualizarWidgetHomescreenHook: BootHook = async () => {
  const { atualizarWidgetHomescreenBootHook } =
    await import('@/lib/widget/atualizarWidgetHomescreen');
  await atualizarWidgetHomescreenBootHook();
};

// M15 lembretes diários (medicação/treino/humor): reagenda no boot
// porque expo-notifications no Android não persiste schedules entre
// reboots e updates do app. Mesmo padrão do M16. Lê estado atual de
// useSettings.lembretes; cada chave ativa vira schedule, inativa
// vira cancel idempotente.
const reagendarLembretesHook: BootHook = async () => {
  const { reagendarLembretes } =
    await import('@/lib/services/notificacoesLembretes');
  await reagendarLembretes();
};

// M39: migra binarios de midia legados em assets/ para
// media/<categoria>/. Idempotente: arquivos ja migrados sao ignorados.
// Companions .md nao sao gerados aqui (writers cuidam ao salvar
// proxima vez); arquivos legados ficam sem companion ate que o
// usuario edite o registro mae. Roda no boot porque novas instalacoes
// que importem Vault de instalacao antiga (Syncthing) podem trazer
// assets/ com binarios pre-M22.
const migrarAssetsHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { migrarAssetsLegacyParaMedia } =
    await import('@/lib/vault/midiaCompanion');
  await migrarAssetsLegacyParaMedia(vaultRoot);
};

// M37.1.2: migra cache de agenda do JSON unico (formato M37.1) para
// .md individual em agenda/<pessoa>/ (alinhado ao ADR-0019).
// Idempotente: flag useSessao.flags.cacheAgendaMigrado garante que
// roda uma unica vez por instalacao. Em web no-op (Platform.OS check
// interno). Roda depois de migrarAssets para nao competir por SAF.
const migrarCacheAgendaHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { migrarCacheAgendaJsonParaMd } =
    await import('@/lib/boot/migrarCacheAgenda');
  await migrarCacheAgendaJsonParaMd(vaultRoot);
};

// H2 (ADR-0023): migra Vault do layout legado por feature para
// layout-por-tipo (markdown/, jpg/, m4a/, etc.). Idempotente: flag
// useSessao.flags.vaultLayoutMigrado garante uma unica execucao por
// instalacao. Em web no-op. Roda DEPOIS de migrarAssets e
// migrarCacheAgenda para que essas migrations rodem no layout que
// elas conheciam (assets/ -> media/<sub>/, agenda JSON -> agenda/.md);
// H2 entao consolida tudo no novo layout-por-tipo.
const migrarLayoutVaultHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { migrarVaultLayoutPorTipo } =
    await import('@/lib/boot/migrarVaultLayoutPorTipo');
  await migrarVaultLayoutPorTipo(vaultRoot);
};

// AUDIT-T2-LOCK-VAULT (2026-05-15): renomeia arquivos canonicos
// (.md sem suffix de deviceId) para a forma '-<deviceIdAtual>.md'.
// Idempotente via flag useSessao.flags.t2DeviceIdSuffixMigrado. Roda
// DEPOIS de migrarLayoutVaultHook (que prepara `markdown/`) e ANTES de
// atualizarDeviceIndexHook (que escreve em `markdown/_devices.md` ja
// no layout final pos-T2).
const migrarT2DeviceIdSuffixHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { migrarArquivosCanonicosParaDeviceId } =
    await import('@/lib/boot/migrarArquivosCanonicosParaDeviceId');
  await migrarArquivosCanonicosParaDeviceId(vaultRoot);
};

// M38: registra/atualiza este dispositivo no inbox/_devices.md a cada
// boot. Idempotente. Marca dispositivos antigos com mesma pessoa como
// 'substituido_por: <novoId>' quando SecureStore foi zerado por
// uninstall+reinstall sem backup (resilience). Swallow-erro tolerado
// (CONTRACT secao 7.9): falha de I/O nao impede o boot.
const atualizarDeviceIndexHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { atualizarDeviceIndex } = await import('@/lib/vault/devicesIndex');
  await atualizarDeviceIndex();
};

// AUDIT-T1-BUGS B1 (2026-05-15): apaga arquivos `*.writing` orfaos
// deixados por writes interrompidos (app matado entre writeAsStringAsync
// do tmp e moveAsync do rename atomico em file://). Apenas branch
// file://; vault root em content:// nao usa o sufixo .writing.
// Idempotente. Roda apos migrarAssetsHook para nao competir por SAF e
// antes do reconciliarTipoCompanhiaHook (que so toca stores).
const limparOrfaosWritingHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { limparArquivosWritingOrfaos } =
    await import('@/lib/boot/limparArquivosWritingOrfaos');
  await limparArquivosWritingOrfaos(vaultRoot);
};

// V4.0.2 (2026-05-08): reconcilia useSettings.pessoa.tipoCompanhia
// com useOnboarding.tipoCompanhia. Cobre usuarios v3 que onboardaram
// antes do espelhamento automatico (ficaram presos em settings='sozinho'
// mesmo escolhendo casal/amigos). Idempotente.
const reconciliarTipoCompanhiaHook: BootHook = async () => {
  const { useOnboarding } = await import('@/lib/stores/onboarding');
  const { useSettings } = await import('@/lib/stores/settings');
  const ob = useOnboarding.getState().tipoCompanhia;
  const expected: 'sozinho' | 'duo' = ob === 'sozinho' ? 'sozinho' : 'duo';
  const atual = useSettings.getState().pessoa.tipoCompanhia;
  if (atual !== expected) {
    useSettings.getState().setPessoa('tipoCompanhia', expected);
  }
};

// AUDIT-P2-4 (2026-09-05): escreve as 4 stats agregadas em
// vault/_estado/stats-<periodo>-<deviceId>.md.
//
// Por que existe: os quatro arquivos sao tipos canonicos do contrato
// com o repositorio irmao de desktop (docs/CONTRACT-MOBILE-BACKEND.md,
// secoes 5.28 a 5.31) e src/lib/vault/exportarEstadoCompleto.ts declara
// "9 arquivos esperados". Mas src/lib/stats/calcular.ts e
// src/lib/stats/escreverStats.ts eram um par fechado, sem um unico
// caller externo: nenhum Vault de nenhum usuario jamais teve esses .md,
// e o ZIP de "Exportar estado completo" saia com 5 de 9 sem erro nem
// aviso. Este hook e o gatilho que faltava.
//
// Por que write direto e nao agendarRecalculoStatsTodos: o debounce de
// 30s de escreverStats existe para agrupar RAJADA de mutacao. Uma
// chamada por boot nao tem rajada para agrupar, entao o unico efeito do
// debounce aqui seria abrir uma janela de 30s em que o app pode ir a
// background (o Android estrangula timer) ou ser morto sem escrever
// nada -- e a sprint fecharia verde com zero arquivo produzido. Com
// await, o trabalho termina dentro da fila de boot, que ja isola erro
// hook a hook.
//
// Sequencial e nao Promise.all: cada periodo varre 6 pastas do Vault;
// os 4 em paralelo dariam 24 listagens concorrentes disputando SAF no
// arranque. Custo aceito: e I/O de leitura, e roda depois do arranque
// interativo.
//
// Sem vaultRoot escreverStatsAgregadas devolve cedo (no-op) e o proximo
// boot tenta de novo. Nao ha estado a perder: stats e read-model
// derivado, reconstruido inteiro a cada execucao.
const statsAgregadasHook: BootHook = async () => {
  const { escreverStatsAgregadas } = await import('@/lib/stats/escreverStats');
  const { PERIODOS_STATS } = await import('@/lib/schemas/vault_estado');
  for (const periodo of PERIODOS_STATS) {
    await escreverStatsAgregadas(periodo);
  }
};

// AUDIT-P1-1A (2026-07-28): drena a fila do widget Quick To-do
// (R-WIDG-1). O widget roda em processo de BroadcastReceiver e so tem
// permissao para escrever em cacheDir/widget-todo-queue.json; quem
// converte cada entry em Tarefa real no Vault e este hook. Ate esta
// sprint o wrapper existia sem nenhum call site: a fila nunca era
// drenada automaticamente e o cacheDir e apagado pelo Android sob
// pressao de armazenamento, entao entry enfileirada virava perda
// silenciosa de dado.
//
// Escopo honesto: isto fecha a camada JS. Hoje, em device real, nada
// chega a fila porque o RemoteInput do provider nativo e construido e
// nunca anexado ao PendingIntent — corrigido na AUDIT-P1-1B. O ganho
// aqui e nao perder o que ja esta enfileirado (devices com o widget
// instalado antes de alpha-14) e destravar a 1B, que sem este dreno
// continuaria escrevendo num cacheDir que ninguem le.
//
// Idempotente: fila vazia sai cedo, e limparFilaTodoWidget evita
// replay. Em web/iOS a bridge nativa devolve null e vira no-op.
const sincronizarWidgetTodoHook: BootHook = async () => {
  const { sincronizarWidgetTodoBootHook } =
    await import('@/lib/widget/sincronizarWidget');
  await sincronizarWidgetTodoBootHook();
};

BOOT_HOOKS.push(
  migrarDraftsHook,
  marcosAutoHook,
  // M30: migracao + limpeza de channels legados rodam ANTES do
  // reagendar para que alarmes pre-cadastrados (humor, medicacao,
  // treino) entrem no schedule do boot ja com o channel v2 disponivel.
  migrarLembretesHook,
  apagarChannelsLegadosHook,
  reagendarAlarmesHook,
  limparLixeiraTarefasHook,
  atualizarWidgetHomescreenHook,
  reagendarLembretesHook,
  // M39: migra binarios assets/ para media/[categoria]/ uma vez por
  // boot (idempotente). Roda por ultimo: nao depende de notificacoes
  // nem de stores reagendados, e seu custo (readDirectory + N copies)
  // nao deve atrasar arranque interativo do app.
  migrarAssetsHook,
  // M37.1.2: migra cache de agenda JSON->.md uma unica vez por
  // instalacao (idempotente via useSessao.flags.cacheAgendaMigrado).
  migrarCacheAgendaHook,
  // H2 (ADR-0023): consolida Vault no layout-por-tipo. Roda depois das
  // migrations M37.1.2 e M39 para que essas terminem no layout antigo
  // antes de ser reorganizado por tipo (markdown/, jpg/, m4a/, etc.).
  migrarLayoutVaultHook,
  // AUDIT-T2-LOCK-VAULT (2026-05-15): renomeia arquivos canonicos
  // pre-T2 (sem suffix de deviceId) para o layout '-<deviceId>.md'.
  // Idempotente. Roda DEPOIS de migrarLayoutVaultHook (precisa que
  // arquivos ja estejam em `markdown/`) e ANTES de atualizarDeviceIndex
  // (que escreve em `markdown/_devices.md` ja no layout final).
  migrarT2DeviceIdSuffixHook,
  // M38: registra/atualiza dispositivo atual no devices index. Roda
  // depois de migrarAssets para nao competir por SAF de leitura no
  // arranque. Idempotente (so ultima_atividade muda em boot subsequente).
  atualizarDeviceIndexHook,
  // AUDIT-T1-BUGS B1: apaga arquivos *.writing orfaos. Idempotente,
  // best-effort. Roda depois das migracoes para nao competir com
  // varreduras concorrentes.
  limparOrfaosWritingHook,
  // V4.0.2: reconcilia tipoCompanhia entre useOnboarding e useSettings.
  // Sem dependencia de I/O (so toca stores em memoria), entao roda por
  // ultimo sem afetar arranque. Idempotente.
  reconciliarTipoCompanhiaHook,
  // AUDIT-P2-4: recalcula e escreve as 4 stats agregadas. Posicao pelo
  // mesmo criterio do dreno do widget: le o Vault inteiro via listarX,
  // entao precisa rodar DEPOIS de migrarLayoutVaultHook e de
  // migrarT2DeviceIdSuffixHook, que definem o layout final que essas
  // listagens varrem. Fica ANTES do dreno do widget porque o dreno e' o
  // ultimo por contrato proprio (tests/lib/boot/
  // reagendamento-widget-todo.test.ts); a tarefa que ele criar nesta
  // execucao entra nas stats do proximo boot, o que e' aceitavel para
  // um read-model recalculado inteiro toda vez.
  statsAgregadasHook,
  // AUDIT-P1-1A: drena a fila do widget Quick To-do. Por ultimo, por
  // tres razoes:
  //   1. Depende do layout final do Vault. drenarFilaTodoWidget grava
  //      via criarTarefa e sincronizarCountPendentes le via
  //      listarTarefas, que varre MARKDOWN_FOLDER. Precisa rodar DEPOIS
  //      de migrarLayoutVaultHook (consolida tudo em markdown/) e de
  //      migrarT2DeviceIdSuffixHook (renomeia canonicos para
  //      -<deviceId>.md); antes disso a tarefa nasceria no meio de uma
  //      reorganizacao e o count sairia de uma varredura que ainda vai
  //      mudar.
  //   2. Depende de vaultRoot, como migrarAssetsHook, migrarCacheAgenda
  //      e atualizarDeviceIndex — todos ja na metade final da lista.
  //   3. E I/O pesado (listVaultFolder + readVaultFiles do diretorio
  //      inteiro) e nao e pre-requisito de ninguem: mesmo argumento que
  //      este arquivo ja usa para migrarAssetsHook, seu custo nao deve
  //      atrasar o arranque interativo do app.
  sincronizarWidgetTodoHook
);
