// AUDIT-P1-9 -- canario do `import()` dinamico sob Jest.
//
// POR QUE ESTE TESTE EXISTE
//
// babel-preset-expo preserva `import()` verbatim, e o VM CJS do Jest o
// rejeita com "A dynamic import callback was invoked without
// --experimental-vm-modules". Os 16 wrappers de BOOT_HOOKS usam
// `await import()` para quebrar o ciclo entre @/lib/boot/* e os modulos
// donos, e reagendarTodosBootHooks isola a excecao de cada hook. A soma
// das duas coisas produzia um falso-verde silencioso: qualquer teste que
// rodasse a fila e espiasse um mock de modulo registrava ZERO chamadas, e
// passava tanto com o hook plugado quanto sem ele.
//
// babel.config.js resolve isso habilitando babel-plugin-dynamic-import-node
// em env.test. Este canario falha se essa transformacao parar de valer --
// uma atualizacao de babel-preset-expo ou de jest-expo reintroduziria o
// falso-verde, e o sintoma seria "tudo verde" de novo.
//
// Se este teste falhar, NAO o marque como skip: toda prova de execucao de
// boot hook volta a ser inutil junto com ele.
//
// Comentarios sem acento.

describe('canario: import() dinamico e executavel sob Jest', () => {
  it('resolve um modulo real do projeto e devolve o export', async () => {
    const mod = await import('@/lib/boot/reagendamento');
    expect(typeof mod.reagendarTodosBootHooks).toBe('function');
    expect(Array.isArray(mod.BOOT_HOOKS)).toBe(true);
  });

  it('resolve modulo de biblioteca e nao devolve undefined', async () => {
    const mod = await import('@/lib/stores/vault');
    expect(mod.useVault).toBeDefined();
    expect(typeof mod.useVault.getState).toBe('function');
  });

  it('propaga rejeicao de modulo inexistente (nao engole silenciosamente)', async () => {
    // Caminho em variavel: o TS nao resolve estaticamente, senao o
    // typecheck reprovaria um modulo que existe para nao existir.
    const inexistente = '@/lib/boot/modulo-que-nao-existe-audit-p1-9';
    await expect(import(inexistente)).rejects.toBeDefined();
  });
});
