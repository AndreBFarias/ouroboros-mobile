// Smoke do useSessao (M24). Cobre defaults, mutators (setUltimaRota,
// salvarRascunho, limparRascunho, marcarPermissaoPedida, resetar),
// cap de truncamento de texto livre (RASCUNHO_TEXTO_CAP) e canario
// quando snapshot serializado passa de CANARY_SOFT_LIMIT.
import {
  useSessao,
  RASCUNHO_TEXTO_CAP,
  CANARY_SOFT_LIMIT,
  mergeSessaoPersistido,
} from '@/lib/stores/sessao';

describe('useSessao', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    useSessao.getState().resetar();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('defaults', () => {
    it('ultimaRota comeca null', () => {
      expect(useSessao.getState().ultimaRota).toBeNull();
    });

    it('rascunhos comecam todos null', () => {
      const r = useSessao.getState().rascunhos;
      expect(r.humorRapido).toBeNull();
      expect(r.diarioEmocional).toBeNull();
      expect(r.eventos).toBeNull();
      expect(r.cicloRegistrar).toBeNull();
      expect(r.alarmesNovo).toBeNull();
      expect(r.contadoresNovo).toBeNull();
      expect(r.tarefasNova).toBeNull();
    });

    it('permissoesPedidas comecam todas false', () => {
      const p = useSessao.getState().permissoesPedidas;
      expect(p.storage).toBe(false);
      expect(p.notif).toBe(false);
      expect(p.camera).toBe(false);
      expect(p.mic).toBe(false);
    });

    it('atualizadoEm comeca em epoch', () => {
      const t = useSessao.getState().atualizadoEm;
      // Epoch -> '1970-01-01T00:00:00.000Z'
      expect(t.startsWith('1970')).toBe(true);
    });
  });

  describe('setUltimaRota', () => {
    it('grava a rota e bumpa atualizadoEm', () => {
      // M27: paths migraram de /(tabs)/* para raiz. Sprint L1
      // renomeou /memoria para /saude-fisica.
      const antes = useSessao.getState().atualizadoEm;
      useSessao.getState().setUltimaRota('/saude-fisica');
      const depois = useSessao.getState().ultimaRota;
      expect(depois).toBe('/saude-fisica');
      // atualizadoEm deve ser maior (epoch -> agora).
      expect(useSessao.getState().atualizadoEm > antes).toBe(true);
    });
  });

  describe('salvarRascunho', () => {
    it('humorRapido aceita partial valido', () => {
      useSessao.getState().salvarRascunho('humorRapido', {
        humor: 4,
        energia: 3,
        ansiedade: 2,
        foco: 5,
        tags: ['trabalho_pesado'],
      });
      const r = useSessao.getState().rascunhos.humorRapido;
      expect(r).toMatchObject({
        humor: 4,
        energia: 3,
        ansiedade: 2,
        foco: 5,
      });
      expect(r?.tags).toEqual(['trabalho_pesado']);
    });

    it('cap de RASCUNHO_TEXTO_CAP em texto livre', () => {
      const longo = 'x'.repeat(RASCUNHO_TEXTO_CAP + 500);
      useSessao.getState().salvarRascunho('diarioEmocional', {
        modo: 'gatilho',
        texto: longo,
        emocoes: [],
        intensidade: 3,
        com: [],
        contexto_social: [],
        midia: [],
        audio: null,
      });
      const t = useSessao.getState().rascunhos.diarioEmocional?.texto;
      expect(t?.length).toBe(RASCUNHO_TEXTO_CAP);
    });

    it('cap aplica em frase, estrategia, lugar, titulo, medicacao', () => {
      const longo = 'a'.repeat(RASCUNHO_TEXTO_CAP + 100);
      useSessao.getState().salvarRascunho('humorRapido', {
        humor: 3,
        energia: 3,
        ansiedade: 3,
        foco: 3,
        tags: [],
        frase: longo,
        medicacao: longo,
      });
      const r = useSessao.getState().rascunhos.humorRapido;
      expect(r?.frase?.length).toBe(RASCUNHO_TEXTO_CAP);
      expect(r?.medicacao?.length).toBe(RASCUNHO_TEXTO_CAP);
    });

    it('texto curto passa intacto', () => {
      useSessao.getState().salvarRascunho('diarioEmocional', {
        modo: 'conquista',
        emocoes: [],
        intensidade: 3,
        texto: 'Algo bom hoje',
        com: [],
        contexto_social: [],
        midia: [],
        audio: null,
      });
      const t = useSessao.getState().rascunhos.diarioEmocional?.texto;
      expect(t).toBe('Algo bom hoje');
    });

    it('canario warna quando snapshot passa do soft limit', () => {
      // Texto suficiente para serializacao passar de CANARY_SOFT_LIMIT
      // bytes mas dentro do cap por campo. Combinamos dois rascunhos
      // longos para exceder so quando ambos ja estao gravados.
      const grande = 'A'.repeat(RASCUNHO_TEXTO_CAP);
      useSessao.getState().salvarRascunho('diarioEmocional', {
        modo: 'conquista',
        emocoes: [],
        intensidade: 3,
        texto: grande,
        com: [],
        contexto_social: [],
        midia: [],
        audio: null,
      });
      // Apos primeiro save ja deve passar de 1500B (texto so ja
      // serializa em 2000+ chars com escape).
      expect(warnSpy).toHaveBeenCalled();
      const mensagens = warnSpy.mock.calls.flat().join(' ');
      expect(mensagens).toContain('[sessao]');
      expect(mensagens).toContain(`${CANARY_SOFT_LIMIT}B`);
    });
  });

  describe('limparRascunho', () => {
    it('zera o rascunho alvo, preserva os outros', () => {
      useSessao.getState().salvarRascunho('humorRapido', { humor: 5 });
      useSessao
        .getState()
        .salvarRascunho('contadoresNovo', { titulo: 'Sem cigarro' });
      useSessao.getState().limparRascunho('humorRapido');

      const r = useSessao.getState().rascunhos;
      expect(r.humorRapido).toBeNull();
      expect(r.contadoresNovo?.titulo).toBe('Sem cigarro');
    });
  });

  describe('marcarPermissaoPedida', () => {
    it('marca a chave alvo, preserva as outras', () => {
      useSessao.getState().marcarPermissaoPedida('notif');
      const p = useSessao.getState().permissoesPedidas;
      expect(p.notif).toBe(true);
      expect(p.storage).toBe(false);
      expect(p.camera).toBe(false);
      expect(p.mic).toBe(false);
    });
  });

  describe('resetar', () => {
    it('volta tudo ao default', () => {
      useSessao.getState().setUltimaRota('/exercicios');
      useSessao.getState().salvarRascunho('alarmesNovo', { titulo: 'X' });
      useSessao.getState().marcarPermissaoPedida('camera');

      useSessao.getState().resetar();

      const s = useSessao.getState();
      expect(s.ultimaRota).toBeNull();
      expect(s.rascunhos.alarmesNovo).toBeNull();
      expect(s.permissoesPedidas.camera).toBe(false);
    });
  });
});

// AUDIT-P1-8 (2026-07-28): back-fill da hidratacao (armadilha A47).
//
// Contexto: o persist config tem `migrate` (so' roda quando a versao
// persistida e' menor que a atual). Uma instalacao ja na versao corrente
// hidrata pelo `merge`; sem o custom, vale o merge SHALLOW do zustand, e
// o objeto `flags` persistido -- sem a flag nova de uma sprint posterior
// -- SUBSTITUI o default inteiro, deixando a flag `undefined`.
//
// Estes testes chamam a funcao REAL `mergeSessaoPersistido` (a mesma
// cabeada em `merge` no persist config), com um persistedState organico
// ao qual falta chave nested. Evita a tautologia de replicar o algoritmo
// dentro do teste.
describe('mergeSessaoPersistido (back-fill nested - AUDIT-P1-8)', () => {
  beforeEach(() => {
    useSessao.getState().resetar();
  });

  // Shape organico de uma instalacao anterior as sprints de 2026-07-28:
  // flags tem as chaves antigas (varias ja true, trabalho one-shot feito)
  // mas NAO tem recordesContadoresSaneados nem duplicatasAgendaLimpas.
  // permissoesPedidas tambem esta sem `mic` (adicionada depois).
  function persistidoAntigo(): Record<string, unknown> {
    return {
      ultimaRota: '/saude-fisica',
      rascunhos: {
        // Rascunho organico em construcao; as demais chaves ausentes.
        humorRapido: { nota: 4 },
      },
      permissoesPedidas: {
        storage: true,
        notif: true,
        camera: false,
        // mic AUSENTE de proposito.
      },
      flags: {
        canalV1Deletado: true,
        cacheAgendaMigrado: true,
        vaultLayoutMigrado: true,
        t2DeviceIdSuffixMigrado: true,
        estadoMigradoParaVault: true,
        vaultLayoutOrfaosVarridos: true,
        // recordesContadoresSaneados e duplicatasAgendaLimpas AUSENTES
        // de proposito (flags novas de AUDIT-P1-2 e AUDIT-P1-4).
      },
      atualizadoEm: '2026-07-01T10:00:00.000Z',
    };
  }

  it('back-filla flag de boot nova com o default false em instalacao antiga', () => {
    const persistido = persistidoAntigo();
    // Premissa do teste: a chave realmente nao esta no persistido.
    expect(
      (persistido.flags as Record<string, unknown>).duplicatasAgendaLimpas
    ).toBeUndefined();

    const merged = mergeSessaoPersistido(persistido, useSessao.getState());

    // O fix: recebe o default false (o boot roda a rotina one-shot uma
    // vez), nao `undefined`.
    expect(merged.flags.duplicatasAgendaLimpas).toBe(false);
    expect(merged.flags.recordesContadoresSaneados).toBe(false);
  });

  it('preserva o trabalho one-shot ja feito nas flags presentes', () => {
    const merged = mergeSessaoPersistido(
      persistidoAntigo(),
      useSessao.getState()
    );

    // Se estas voltassem ao default false, as migrations pesadas
    // rodariam de novo em cada boot.
    expect(merged.flags.vaultLayoutMigrado).toBe(true);
    expect(merged.flags.estadoMigradoParaVault).toBe(true);
    expect(merged.flags.t2DeviceIdSuffixMigrado).toBe(true);
  });

  it('back-filla permissoesPedidas e rascunhos sem apagar o que existe', () => {
    const merged = mergeSessaoPersistido(
      persistidoAntigo(),
      useSessao.getState()
    );

    expect(merged.permissoesPedidas.mic).toBe(false);
    expect(merged.permissoesPedidas.storage).toBe(true);
    expect(merged.permissoesPedidas.camera).toBe(false);
    // Rascunho em construcao sobrevive; os ausentes viram null (default).
    expect(merged.rascunhos.humorRapido).toEqual({ nota: 4 });
    expect(merged.rascunhos.tarefasNova).toBeNull();
  });

  it('preserva as chaves planas e as acoes do store apos a hidratacao', () => {
    const merged = mergeSessaoPersistido(
      persistidoAntigo(),
      useSessao.getState()
    );

    expect(merged.ultimaRota).toBe('/saude-fisica');
    expect(merged.atualizadoEm).toBe('2026-07-01T10:00:00.000Z');
    expect(typeof merged.marcarFlagBoot).toBe('function');
    expect(typeof merged.salvarRascunho).toBe('function');
    expect(typeof merged.resetar).toBe('function');
  });

  it('back-filla sub-objeto ausente por inteiro (persistido pre-M30 sem flags)', () => {
    const merged = mergeSessaoPersistido(
      { ultimaRota: '/', atualizadoEm: '2026-01-01T00:00:00.000Z' },
      useSessao.getState()
    );

    expect(merged.flags.canalV1Deletado).toBe(false);
    expect(merged.flags.duplicatasAgendaLimpas).toBe(false);
    expect(merged.permissoesPedidas.storage).toBe(false);
    expect(merged.rascunhos.humorRapido).toBeNull();
  });

  it('guard: persistedState null/undefined/nao-objeto retorna o currentState intacto', () => {
    const atual = useSessao.getState();
    expect(mergeSessaoPersistido(null, atual)).toBe(atual);
    expect(mergeSessaoPersistido(undefined, atual)).toBe(atual);
    expect(mergeSessaoPersistido('lixo', atual)).toBe(atual);
    expect(typeof mergeSessaoPersistido(null, atual).marcarFlagBoot).toBe(
      'function'
    );
  });
});
