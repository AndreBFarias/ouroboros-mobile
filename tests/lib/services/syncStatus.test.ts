import { classificar, descreverDelta } from '@/lib/services/syncStatus';

describe('syncStatus', () => {
  describe('classificar', () => {
    it('< 30min => verde', () => {
      expect(classificar(0)).toBe('verde');
      expect(classificar(5 * 60 * 1000)).toBe('verde');
      expect(classificar(29 * 60 * 1000)).toBe('verde');
    });

    it('30min ate 6h => amarelo', () => {
      expect(classificar(30 * 60 * 1000)).toBe('amarelo');
      expect(classificar(60 * 60 * 1000)).toBe('amarelo');
      expect(classificar(5 * 60 * 60 * 1000)).toBe('amarelo');
    });

    it('>= 6h => vermelho', () => {
      expect(classificar(6 * 60 * 60 * 1000)).toBe('vermelho');
      expect(classificar(24 * 60 * 60 * 1000)).toBe('vermelho');
    });
  });

  describe('descreverDelta', () => {
    it('null => sem registro', () => {
      expect(descreverDelta(null)).toMatch(/sem registro/i);
    });

    it('< 1min => agora mesmo', () => {
      const date = new Date(Date.now() - 30 * 1000);
      expect(descreverDelta(date)).toMatch(/agora mesmo/);
    });

    it('< 30min => em minutos', () => {
      const date = new Date(Date.now() - 10 * 60 * 1000);
      expect(descreverDelta(date)).toMatch(/há 10 min/);
    });

    it('30min-6h => em horas', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(descreverDelta(date)).toMatch(/há 2h/);
    });

    it('>= 6h => "ultima atualizacao ha"', () => {
      const date = new Date(Date.now() - 12 * 60 * 60 * 1000);
      expect(descreverDelta(date)).toMatch(/Última atualização há 12h/);
    });
  });
});
