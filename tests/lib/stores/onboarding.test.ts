import { useOnboarding } from '@/lib/stores/onboarding';

describe('useOnboarding', () => {
  beforeEach(() => {
    useOnboarding.getState().resetar();
  });

  it('comeca com done=false e tipoCompanhia=sozinho', () => {
    const s = useOnboarding.getState();
    expect(s.done).toBe(false);
    expect(s.tipoCompanhia).toBe('sozinho');
    expect(s.syncMethod).toBe('nenhum');
  });

  it('marcarConcluido vira a flag para true', () => {
    useOnboarding.getState().marcarConcluido();
    expect(useOnboarding.getState().done).toBe(true);
  });

  it('setTipoCompanhia aceita casal e amigos', () => {
    useOnboarding.getState().setTipoCompanhia('casal');
    expect(useOnboarding.getState().tipoCompanhia).toBe('casal');
    useOnboarding.getState().setTipoCompanhia('amigos');
    expect(useOnboarding.getState().tipoCompanhia).toBe('amigos');
  });

  it('setSync aceita os tres metodos', () => {
    useOnboarding.getState().setSync('syncthing');
    expect(useOnboarding.getState().syncMethod).toBe('syncthing');
    useOnboarding.getState().setSync('obsidian_sync');
    expect(useOnboarding.getState().syncMethod).toBe('obsidian_sync');
    useOnboarding.getState().setSync('nenhum');
    expect(useOnboarding.getState().syncMethod).toBe('nenhum');
  });

  it('resetar volta tudo ao default', () => {
    useOnboarding.getState().marcarConcluido();
    useOnboarding.getState().setTipoCompanhia('casal');
    useOnboarding.getState().setSync('syncthing');
    useOnboarding.getState().resetar();
    const s = useOnboarding.getState();
    expect(s.done).toBe(false);
    expect(s.tipoCompanhia).toBe('sozinho');
    expect(s.syncMethod).toBe('nenhum');
  });
});
