import {
  useOnboarding,
  mergeOnboardingPersistido,
} from '@/lib/stores/onboarding';

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

// AUDIT-P1-8 (2026-07-28): back-fill da hidratacao (armadilha A47).
//
// Esta store nao tem version/migrate: TODA hidratacao passa pelo merge.
// Sem o custom, valia o merge SHALLOW do zustand, onde o objeto
// `permissoes` persistido -- sem a permissao nova de uma sprint
// posterior -- SUBSTITUI o default inteiro e a chave hidrata
// `undefined`. Consequencia visivel: o app volta a pedir uma permissao
// que o usuario ja concedeu.
//
// Os testes chamam a funcao REAL `mergeOnboardingPersistido` (a mesma
// cabeada em `merge` no persist config), com persistedState organico ao
// qual falta chave nested.
describe('mergeOnboardingPersistido (back-fill nested - AUDIT-P1-8)', () => {
  beforeEach(() => {
    useOnboarding.getState().resetar();
  });

  // Instalacao organica: onboarding concluido em modo casal, com
  // permissoes concedidas. `localizacao` ausente (simula permissao
  // adicionada por sprint posterior a instalacao) e `sexoDeclarado` so'
  // com pessoa_a (o Frame ainda nao perguntava pela pessoa_b).
  function persistidoAntigo(): Record<string, unknown> {
    return {
      done: true,
      tipoCompanhia: 'casal',
      sexoDeclarado: { pessoa_a: 'feminino' },
      permissoes: {
        storage: true,
        camera: true,
        microfone: true,
        notificacoes: false,
        // localizacao AUSENTE de proposito.
      },
    };
  }

  it('back-filla permissao nova com o default false sem re-pedir as concedidas', () => {
    const persistido = persistidoAntigo();
    expect(
      (persistido.permissoes as Record<string, unknown>).localizacao
    ).toBeUndefined();

    const merged = mergeOnboardingPersistido(
      persistido,
      useOnboarding.getState()
    );

    // O fix: a chave nova recebe o default (false), nao undefined.
    expect(merged.permissoes.localizacao).toBe(false);
    // Escolhas organicas preservadas: concedidas continuam concedidas e
    // a negada continua negada.
    expect(merged.permissoes.storage).toBe(true);
    expect(merged.permissoes.camera).toBe(true);
    expect(merged.permissoes.microfone).toBe(true);
    expect(merged.permissoes.notificacoes).toBe(false);
  });

  it('back-filla sexoDeclarado incompleto com null, preservando o declarado', () => {
    const merged = mergeOnboardingPersistido(
      persistidoAntigo(),
      useOnboarding.getState()
    );

    expect(merged.sexoDeclarado.pessoa_a).toBe('feminino');
    expect(merged.sexoDeclarado.pessoa_b).toBeNull();
  });

  it('preserva chaves planas e as acoes do store apos a hidratacao', () => {
    const merged = mergeOnboardingPersistido(
      persistidoAntigo(),
      useOnboarding.getState()
    );

    expect(merged.done).toBe(true);
    expect(merged.tipoCompanhia).toBe('casal');
    expect(typeof merged.setPermissao).toBe('function');
    expect(typeof merged.marcarConcluido).toBe('function');
    expect(typeof merged.resetar).toBe('function');
  });

  it('back-filla sub-objeto ausente por inteiro (persistido pre-J1)', () => {
    const merged = mergeOnboardingPersistido(
      { done: true, tipoCompanhia: 'sozinho' },
      useOnboarding.getState()
    );

    expect(merged.permissoes.storage).toBe(false);
    expect(merged.permissoes.localizacao).toBe(false);
    expect(merged.sexoDeclarado.pessoa_a).toBeNull();
  });

  it('guard: persistedState null/undefined/nao-objeto retorna o currentState intacto', () => {
    const atual = useOnboarding.getState();
    expect(mergeOnboardingPersistido(null, atual)).toBe(atual);
    expect(mergeOnboardingPersistido(undefined, atual)).toBe(atual);
    expect(mergeOnboardingPersistido('lixo', atual)).toBe(atual);
    expect(typeof mergeOnboardingPersistido(null, atual).setPermissao).toBe(
      'function'
    );
  });
});
