import { useOnboarding } from '@/lib/stores/onboarding';

describe('useOnboarding', () => {
  beforeEach(() => {
    useOnboarding.getState().resetar();
  });

  it('comeca com done=false e tipoCompanhia=sozinho', () => {
    const s = useOnboarding.getState();
    expect(s.done).toBe(false);
    expect(s.tipoCompanhia).toBe('sozinho');
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

  it('shape v2 nao expoe syncMethod nem setSync', () => {
    const s = useOnboarding.getState() as unknown as Record<string, unknown>;
    expect(s.syncMethod).toBeUndefined();
    expect(s.setSync).toBeUndefined();
  });

  it('resetar volta tudo ao default', () => {
    useOnboarding.getState().marcarConcluido();
    useOnboarding.getState().setTipoCompanhia('casal');
    useOnboarding.getState().resetar();
    const s = useOnboarding.getState();
    expect(s.done).toBe(false);
    expect(s.tipoCompanhia).toBe('sozinho');
  });
});
