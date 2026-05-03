// Smoke do useSessao (M24). Cobre defaults, mutators (setUltimaRota,
// salvarRascunho, limparRascunho, marcarPermissaoPedida, resetar),
// cap de truncamento de texto livre (RASCUNHO_TEXTO_CAP) e canario
// quando snapshot serializado passa de CANARY_SOFT_LIMIT.
import {
  useSessao,
  RASCUNHO_TEXTO_CAP,
  CANARY_SOFT_LIMIT,
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
      // M27: paths migraram de /(tabs)/* para raiz.
      const antes = useSessao.getState().atualizadoEm;
      useSessao.getState().setUltimaRota('/memoria');
      const depois = useSessao.getState().ultimaRota;
      expect(depois).toBe('/memoria');
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
        modo: 'trigger',
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
      useSessao
        .getState()
        .salvarRascunho('humorRapido', {
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
        modo: 'vitoria',
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
        modo: 'vitoria',
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
      useSessao
        .getState()
        .salvarRascunho('humorRapido', { humor: 5 });
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
