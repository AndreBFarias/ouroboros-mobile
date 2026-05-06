// Orquestrador de hooks de boot. Cada sprint que precisa de tarefa
// idempotente no início do app faz `BOOT_HOOKS.push(suaFuncao)` em
// seu proprio modulo (CONTRACT seções 1.7 e 5.4).
//
// Lista canonica plugada (5 hooks):
//   - M11 migrarDraftsParaTreinoSessao (sempre, idempotente)
//   - M11 verificarMarcosAuto (uma vez por dia)
//   - M16 reagendarAlarmes (sempre, idempotente)
//   - M17 limparLixeiraExpirada (uma vez por dia)
//   - M20 atualizarWidgetHomescreen (sempre, com rate-limit interno)
//   - M15 reagendarLembretes (sempre, idempotente)
//
// Em M00.5 a lista comeca vazia. O orquestrador roda cada hook em
// sequência, isolando erros: falha de um não trava os demais.

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
  const { migrarDraftsParaTreinoSessao } = await import(
    '@/lib/treinos/migrarDraftsParaTreinoSessao'
  );
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
  const { reagendarAlarmes } = await import(
    '@/lib/services/alarmesNotificacoes'
  );
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
  const { migrarLembretesParaAlarmes } = await import(
    '@/lib/boot/migrarLembretes'
  );
  await migrarLembretesParaAlarmes(vaultRoot);
};

// M30: apaga channels Android legados uma unica vez por instalacao.
// Necessario porque Android nao permite editar vibrationPattern de
// channel existente; o novo channel 'ouroboros-default-v2' nasce via
// registrarCategoriasAlarme em app/_layout.tsx, e este hook limpa o
// lixo. Guardado por useSessao.flags.canalV1Deletado.
const apagarChannelsLegadosHook: BootHook = async () => {
  const { apagarChannelsLegadosUmaVez } = await import(
    '@/lib/services/notificationActions'
  );
  await apagarChannelsLegadosUmaVez();
};

// M17 to-do leve: limpa lixeira soft de tarefas com retencao de 30
// dias. Idempotente: roda uma vez por dia, controlado por timestamp
// em SecureStore.
const limparLixeiraTarefasHook: BootHook = async () => {
  const { limparLixeiraExpirada } = await import(
    '@/lib/tarefas/limparLixeiraExpirada'
  );
  await limparLixeiraExpirada();
};

// M20 widget homescreen: ao abrir o app, refresca o widget com o
// humor do dia mesmo se não houve save novo. Idempotente: respeita
// rate-limit interno (1 update por minuto). Toggle off curta cedo
// chamando desativarWidget no provider nativo.
const atualizarWidgetHomescreenHook: BootHook = async () => {
  const { atualizarWidgetHomescreenBootHook } = await import(
    '@/lib/widget/atualizarWidgetHomescreen'
  );
  await atualizarWidgetHomescreenBootHook();
};

// M15 lembretes diários (medicação/treino/humor): reagenda no boot
// porque expo-notifications no Android não persiste schedules entre
// reboots e updates do app. Mesmo padrão do M16. Lê estado atual de
// useSettings.lembretes; cada chave ativa vira schedule, inativa
// vira cancel idempotente.
const reagendarLembretesHook: BootHook = async () => {
  const { reagendarLembretes } = await import(
    '@/lib/services/notificacoesLembretes'
  );
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
  const { migrarAssetsLegacyParaMedia } = await import(
    '@/lib/vault/midiaCompanion'
  );
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
  const { migrarCacheAgendaJsonParaMd } = await import(
    '@/lib/boot/migrarCacheAgenda'
  );
  await migrarCacheAgendaJsonParaMd(vaultRoot);
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
  // M38: registra/atualiza dispositivo atual no devices index. Roda
  // depois de migrarAssets para nao competir por SAF de leitura no
  // arranque. Idempotente (so ultima_atividade muda em boot subsequente).
  atualizarDeviceIndexHook
);
