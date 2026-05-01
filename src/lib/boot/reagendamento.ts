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
