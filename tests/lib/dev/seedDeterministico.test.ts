// M-GAUNTLET-SEED-V2 unit: helpers seedHumores, seedDiarios e
// seedEventos populam stores mock com fixtures determinisicas.
//
// Como GAUNTLET_ATIVO depende de Platform.OS === 'web' && __DEV__, e
// Jest roda com Platform.OS = 'ios' por default, mockamos o modulo
// gauntlet para forcar GAUNTLET_ATIVO = true e testar o caminho real.
//
// Comentarios sem acento.

// Mock do gauntlet: exporta GAUNTLET_ATIVO=true e mantem o restante
// do modulo intacto via requireActual. Tem de vir ANTES do import
// do seedDeterministico.
jest.mock('@/lib/dev/gauntlet', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/dev/gauntlet')>(
      '@/lib/dev/gauntlet'
    );
  return {
    __esModule: true,
    ...actual,
    GAUNTLET_ATIVO: true,
  };
});

import {
  seedHumores,
  seedDiarios,
  seedEventos,
  lerHumoresMock,
  lerDiariosMock,
  lerEventosMock,
} from '@/lib/dev/seedDeterministico';
import { useHumorMock } from '@/lib/dev/humorMock';
import { useDiarioMock } from '@/lib/dev/diarioMock';
import { useEventosMock } from '@/lib/dev/eventosMock';

describe('seedDeterministico (M-GAUNTLET-SEED-V2)', () => {
  beforeEach(() => {
    useHumorMock.getState().limpar();
    useDiarioMock.getState().limpar();
    useEventosMock.getState().limpar();
  });

  describe('seedHumores', () => {
    it('produz 30 dias com pelo menos 30 celulas e schema valido', () => {
      seedHumores(30);
      const cels = lerHumoresMock();
      expect(cels.length).toBeGreaterThanOrEqual(30);
      // Schema: data YYYY-MM-DD, autor, sliders 1-5, tags array.
      for (const c of cels) {
        expect(c.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(['pessoa_a', 'pessoa_b']).toContain(c.autor);
        expect(c.humor).toBeGreaterThanOrEqual(1);
        expect(c.humor).toBeLessThanOrEqual(5);
        expect(c.energia).toBeGreaterThanOrEqual(1);
        expect(c.foco).toBeLessThanOrEqual(5);
        expect(Array.isArray(c.tags)).toBe(true);
      }
    });

    it('produz pelo menos 1 dia com pessoa_a + pessoa_b (sobreposto)', () => {
      seedHumores(30);
      const cels = lerHumoresMock();
      const porDia = new Map<string, Set<string>>();
      for (const c of cels) {
        const set = porDia.get(c.data) ?? new Set<string>();
        set.add(c.autor);
        porDia.set(c.data, set);
      }
      const sobrepostos = Array.from(porDia.values()).filter(
        (s) => s.size === 2
      );
      expect(sobrepostos.length).toBeGreaterThanOrEqual(1);
    });

    it('respeita argumento dias=7 (subset menor que 30)', () => {
      seedHumores(7);
      const cels = lerHumoresMock();
      // 7 dias do fixture filtra todas as celulas com offset >= -6.
      // Pode haver overlap, entao length entre 7 e 14.
      expect(cels.length).toBeGreaterThanOrEqual(7);
      expect(cels.length).toBeLessThanOrEqual(14);
    });

    it('e no-op quando GAUNTLET_ATIVO=false', () => {
      // Reset isolado: importa de novo com mock removido.
      jest.isolateModules(() => {
        // Reseta o modulo gauntlet para usar o real (Platform.OS=ios -> false).
        jest.unmock('@/lib/dev/gauntlet');
        jest.resetModules();
        const seedReal = jest.requireActual<
          typeof import('@/lib/dev/seedDeterministico')
        >('@/lib/dev/seedDeterministico');
        const humorReal = jest.requireActual<
          typeof import('@/lib/dev/humorMock')
        >('@/lib/dev/humorMock');
        humorReal.useHumorMock.getState().limpar();
        seedReal.seedHumores(30);
        expect(humorReal.useHumorMock.getState().celulas).toEqual([]);
      });
    });
  });

  describe('seedDiarios', () => {
    it('produz 3 entradas: 1 trigger, 1 vitoria, 1 reflexao', () => {
      seedDiarios(3);
      const ents = lerDiariosMock();
      expect(ents.length).toBe(3);
      const modos = ents.map((e) => e.modo).sort();
      expect(modos).toEqual(['reflexao', 'trigger', 'vitoria']);
    });

    it('vitoria carrega midia (mock satisfaz contrato visual)', () => {
      seedDiarios(3);
      const vitoria = lerDiariosMock().find((e) => e.modo === 'vitoria');
      expect(vitoria).toBeDefined();
      expect(vitoria?.midia.length).toBeGreaterThanOrEqual(1);
    });

    it('todas entradas tem data ISO 8601 valida', () => {
      seedDiarios(3);
      for (const e of lerDiariosMock()) {
        expect(e.data).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
      }
    });

    it('respeita qtd=1 (subset)', () => {
      seedDiarios(1);
      expect(lerDiariosMock().length).toBe(1);
    });
  });

  describe('seedEventos', () => {
    it('produz 7 eventos distribuidos em -7d a -1d', () => {
      seedEventos(7);
      const evs = lerEventosMock();
      expect(evs.length).toBe(7);
      // Datas distintas (offsetDias -1..-7 vira 7 datas distintas).
      const datas = new Set(evs.map((e) => e.data));
      expect(datas.size).toBe(7);
    });

    it('todos eventos tem lugar e categoria nao-vazios', () => {
      seedEventos(7);
      for (const e of lerEventosMock()) {
        expect(e.lugar.length).toBeGreaterThan(0);
        expect(e.categoria.length).toBeGreaterThan(0);
        expect(['positivo', 'negativo']).toContain(e.modo);
        expect(e.intensidade).toBeGreaterThanOrEqual(1);
        expect(e.intensidade).toBeLessThanOrEqual(5);
      }
    });

    it('eventos modo positivo carregam midia', () => {
      seedEventos(7);
      const positivos = lerEventosMock().filter((e) => e.modo === 'positivo');
      for (const e of positivos) {
        expect(e.midia.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('determinismo', () => {
    it('seedHumores: duas chamadas consecutivas produzem mesmo conteudo', () => {
      const hojeFixo = new Date('2026-05-03T12:00:00Z');
      seedHumores(30, hojeFixo);
      const a = JSON.stringify(lerHumoresMock());
      useHumorMock.getState().limpar();
      seedHumores(30, hojeFixo);
      const b = JSON.stringify(lerHumoresMock());
      expect(a).toEqual(b);
    });

    it('seedDiarios: duas chamadas consecutivas produzem mesmo conteudo', () => {
      const agoraFixo = new Date('2026-05-03T12:00:00Z');
      seedDiarios(3, agoraFixo);
      const a = JSON.stringify(lerDiariosMock());
      useDiarioMock.getState().limpar();
      seedDiarios(3, agoraFixo);
      const b = JSON.stringify(lerDiariosMock());
      expect(a).toEqual(b);
    });

    it('seedEventos: duas chamadas consecutivas produzem mesmo conteudo', () => {
      const hojeFixo = new Date('2026-05-03T12:00:00Z');
      seedEventos(7, hojeFixo);
      const a = JSON.stringify(lerEventosMock());
      useEventosMock.getState().limpar();
      seedEventos(7, hojeFixo);
      const b = JSON.stringify(lerEventosMock());
      expect(a).toEqual(b);
    });
  });
});
