// Orquestrador de hooks de boot. Cada sprint que precisa de tarefa
// idempotente no inicio do app faz `BOOT_HOOKS.push(suaFuncao)` em
// seu proprio modulo (CONTRACT secoes 1.7 e 5.4).
//
// Lista canonica esperada (a ser plugada por sprints futuras):
//   - M16 reagendarAlarmes (sempre, idempotente)
//   - M17 limparLixeiraExpirada (uma vez por dia)
//   - M11 verificarMarcosAuto (uma vez por dia)
//   - M20 atualizarWidgetHomescreen (quando humor e salvo)
//
// Em M00.5 a lista comeca vazia. O orquestrador roda cada hook em
// sequencia, isolando erros: falha de um nao trava os demais.

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
      // Isola falha: hook quebrado nao impede demais.
    }
  }
}

// Side-effect: M11 pluga seus dois hooks de boot diretamente. A
// migracao roda primeiro (consolida drafts antigos) e depois a
// verificacao de marcos auto avalia o estado consolidado.
//
// Import dinamico (lazy require) evita ciclo entre @/lib/boot/* e
// @/lib/treinos|marcos/*. Funcoes wrapper encapsulam o require.
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
// porque expo-notifications nao persiste schedules entre reboots ou
// updates do app no Android.
const reagendarAlarmesHook: BootHook = async () => {
  const { reagendarAlarmes } = await import(
    '@/lib/services/alarmesNotificacoes'
  );
  await reagendarAlarmes();
};

BOOT_HOOKS.push(migrarDraftsHook, marcosAutoHook, reagendarAlarmesHook);
