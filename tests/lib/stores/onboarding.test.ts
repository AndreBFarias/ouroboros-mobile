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

  it('shape v3 nao expoe syncMethod nem setSync', () => {
    const s = useOnboarding.getState() as unknown as Record<string, unknown>;
    expect(s.syncMethod).toBeUndefined();
    expect(s.setSync).toBeUndefined();
  });

  it('resetar volta tudo ao default', () => {
    useOnboarding.getState().marcarConcluido();
    useOnboarding.getState().setTipoCompanhia('casal');
    useOnboarding.getState().setSexoDeclarado('pessoa_a', 'feminino');
    useOnboarding.getState().setPermissao('camera', true);
    useOnboarding.getState().resetar();
    const s = useOnboarding.getState();
    expect(s.done).toBe(false);
    expect(s.tipoCompanhia).toBe('sozinho');
    expect(s.sexoDeclarado.pessoa_a).toBeNull();
    expect(s.sexoDeclarado.pessoa_b).toBeNull();
    expect(s.permissoes.camera).toBe(false);
  });

  describe('sexoDeclarado (sprint J1)', () => {
    it('default e null para pessoa_a e pessoa_b', () => {
      const s = useOnboarding.getState();
      expect(s.sexoDeclarado.pessoa_a).toBeNull();
      expect(s.sexoDeclarado.pessoa_b).toBeNull();
    });

    it('setSexoDeclarado atualiza so a pessoa pedida', () => {
      useOnboarding.getState().setSexoDeclarado('pessoa_a', 'masculino');
      let s = useOnboarding.getState();
      expect(s.sexoDeclarado.pessoa_a).toBe('masculino');
      expect(s.sexoDeclarado.pessoa_b).toBeNull();
      useOnboarding.getState().setSexoDeclarado('pessoa_b', 'feminino');
      s = useOnboarding.getState();
      expect(s.sexoDeclarado.pessoa_a).toBe('masculino');
      expect(s.sexoDeclarado.pessoa_b).toBe('feminino');
    });

    it('aceita as 4 opcoes canonicas + null', () => {
      const opcoes = [
        'masculino',
        'feminino',
        'nao-binario',
        'prefiro-nao-dizer',
        null,
      ] as const;
      for (const op of opcoes) {
        useOnboarding.getState().setSexoDeclarado('pessoa_a', op);
        expect(useOnboarding.getState().sexoDeclarado.pessoa_a).toBe(op);
      }
    });
  });

  describe('permissoes (sprint J1)', () => {
    it('default tem todas as 5 chaves em false', () => {
      const p = useOnboarding.getState().permissoes;
      expect(p.storage).toBe(false);
      expect(p.camera).toBe(false);
      expect(p.microfone).toBe(false);
      expect(p.notificacoes).toBe(false);
      expect(p.localizacao).toBe(false);
    });

    it('setPermissao atualiza so a chave pedida', () => {
      useOnboarding.getState().setPermissao('camera', true);
      let p = useOnboarding.getState().permissoes;
      expect(p.camera).toBe(true);
      expect(p.microfone).toBe(false);
      expect(p.notificacoes).toBe(false);
      useOnboarding.getState().setPermissao('notificacoes', true);
      p = useOnboarding.getState().permissoes;
      expect(p.camera).toBe(true);
      expect(p.notificacoes).toBe(true);
      expect(p.microfone).toBe(false);
    });

    it('setPermissao funciona para todas as 5 chaves', () => {
      const chaves = [
        'storage',
        'camera',
        'microfone',
        'notificacoes',
        'localizacao',
      ] as const;
      for (const k of chaves) {
        useOnboarding.getState().setPermissao(k, true);
        expect(useOnboarding.getState().permissoes[k]).toBe(true);
      }
    });

    it('reatividade: subscribe dispara quando setPermissao muda', () => {
      const observado: boolean[] = [];
      const unsub = useOnboarding.subscribe((s) => {
        observado.push(s.permissoes.camera);
      });
      useOnboarding.getState().setPermissao('camera', true);
      useOnboarding.getState().setPermissao('camera', false);
      unsub();
      expect(observado).toContain(true);
      expect(observado).toContain(false);
    });
  });
});
