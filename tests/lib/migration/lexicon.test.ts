// Testes do mapa lexical R0 (M-LEX-CRISE-CONQUISTA-GATILHO-REFLEXAO).
// Cobre normalizacao bidirecional do modo de diario emocional e os
// limites da compat (entrada invalida lanca erro claro).
import {
  DIARIO_MODO_LEGADO_TO_CANONICO,
  DIARIO_MODO_CANONICO_TO_LEGADO,
  DIARIO_MODO_ACEITO_INPUT,
  normalizarDiarioModo,
} from '@/lib/migration/lexicon';

describe('DIARIO_MODO_LEGADO_TO_CANONICO', () => {
  it('mapeia trigger -> gatilho', () => {
    expect(DIARIO_MODO_LEGADO_TO_CANONICO.trigger).toBe('gatilho');
  });

  it('mapeia vitoria -> conquista', () => {
    expect(DIARIO_MODO_LEGADO_TO_CANONICO.vitoria).toBe('conquista');
  });

  it('preserva reflexao -> reflexao (sem renomeacao)', () => {
    expect(DIARIO_MODO_LEGADO_TO_CANONICO.reflexao).toBe('reflexao');
  });
});

describe('DIARIO_MODO_CANONICO_TO_LEGADO', () => {
  it('inverso: gatilho -> trigger', () => {
    expect(DIARIO_MODO_CANONICO_TO_LEGADO.gatilho).toBe('trigger');
  });

  it('inverso: conquista -> vitoria', () => {
    expect(DIARIO_MODO_CANONICO_TO_LEGADO.conquista).toBe('vitoria');
  });

  it('reflexao e identica nos dois sentidos', () => {
    expect(DIARIO_MODO_CANONICO_TO_LEGADO.reflexao).toBe('reflexao');
  });
});

describe('DIARIO_MODO_ACEITO_INPUT', () => {
  it('contem todos os 5 valores aceitos (legacy + canonico)', () => {
    expect(DIARIO_MODO_ACEITO_INPUT).toContain('trigger');
    expect(DIARIO_MODO_ACEITO_INPUT).toContain('vitoria');
    expect(DIARIO_MODO_ACEITO_INPUT).toContain('reflexao');
    expect(DIARIO_MODO_ACEITO_INPUT).toContain('gatilho');
    expect(DIARIO_MODO_ACEITO_INPUT).toContain('conquista');
    expect(DIARIO_MODO_ACEITO_INPUT.length).toBe(5);
  });
});

describe('normalizarDiarioModo', () => {
  it('normaliza trigger -> gatilho', () => {
    expect(normalizarDiarioModo('trigger')).toBe('gatilho');
  });

  it('normaliza vitoria -> conquista', () => {
    expect(normalizarDiarioModo('vitoria')).toBe('conquista');
  });

  it('idempotente: gatilho -> gatilho', () => {
    expect(normalizarDiarioModo('gatilho')).toBe('gatilho');
  });

  it('idempotente: conquista -> conquista', () => {
    expect(normalizarDiarioModo('conquista')).toBe('conquista');
  });

  it('preserva reflexao -> reflexao', () => {
    expect(normalizarDiarioModo('reflexao')).toBe('reflexao');
  });

  it('lanca erro com valor desconhecido', () => {
    expect(() => normalizarDiarioModo('xpto')).toThrow(/invalido/);
  });

  it('mensagem de erro lista os valores aceitos', () => {
    let mensagem = '';
    try {
      normalizarDiarioModo('outro');
    } catch (e) {
      mensagem = e instanceof Error ? e.message : '';
    }
    expect(mensagem).toContain('trigger');
    expect(mensagem).toContain('gatilho');
    expect(mensagem).toContain('conquista');
  });
});

describe('integridade do mapeamento bi-direcional', () => {
  it('legacy round-trip: trigger -> gatilho -> trigger', () => {
    const canonico = DIARIO_MODO_LEGADO_TO_CANONICO.trigger;
    const voltaLegado = DIARIO_MODO_CANONICO_TO_LEGADO[canonico];
    expect(voltaLegado).toBe('trigger');
  });

  it('legacy round-trip: vitoria -> conquista -> vitoria', () => {
    const canonico = DIARIO_MODO_LEGADO_TO_CANONICO.vitoria;
    const voltaLegado = DIARIO_MODO_CANONICO_TO_LEGADO[canonico];
    expect(voltaLegado).toBe('vitoria');
  });
});
