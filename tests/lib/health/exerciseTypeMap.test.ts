// Testes do mapa exerciseType -> PT-BR e da humanizacao de origem.
// R-INT-3-HC-AUTOPULL-EXERCICIO.
//
// Cobre os 10 tipos mais comuns + fallback "Atividade fisica", alem da
// resolucao de origem (packageName conhecido, desconhecido, ausente).
//
// Comentarios sem acento.
import {
  EXERCICIO_PTBR_FALLBACK,
  EXERCISE_TYPES_PTBR,
  ORIGEM_HC_FALLBACK,
  exerciseTypePtbr,
  origemHcHumanizada,
} from '@/lib/health/exerciseTypeMap';

describe('exerciseTypePtbr', () => {
  it('mapeia os tipos comuns para PT-BR acentuado', () => {
    expect(exerciseTypePtbr(56)).toBe('Corrida');
    expect(exerciseTypePtbr(77)).toBe('Caminhada');
    expect(exerciseTypePtbr(8)).toBe('Ciclismo');
    expect(exerciseTypePtbr(68)).toBe('Musculação');
    expect(exerciseTypePtbr(81)).toBe('Yoga');
    expect(exerciseTypePtbr(72)).toBe('Natação em piscina');
    expect(exerciseTypePtbr(5)).toBe('Basquete');
    expect(exerciseTypePtbr(29)).toBe('Futebol');
    expect(exerciseTypePtbr(74)).toBe('Tênis');
    expect(exerciseTypePtbr(16)).toBe('Dança');
  });

  it('usa fallback "Atividade fisica" para tipo desconhecido', () => {
    expect(exerciseTypePtbr(9999)).toBe(EXERCICIO_PTBR_FALLBACK);
    expect(EXERCICIO_PTBR_FALLBACK).toBe('Atividade física');
  });

  it('usa fallback para codigo 0 (OTHER_WORKOUT, fora do mapa)', () => {
    expect(exerciseTypePtbr(0)).toBe(EXERCICIO_PTBR_FALLBACK);
  });

  it('usa fallback para null, undefined e NaN', () => {
    expect(exerciseTypePtbr(null)).toBe(EXERCICIO_PTBR_FALLBACK);
    expect(exerciseTypePtbr(undefined)).toBe(EXERCICIO_PTBR_FALLBACK);
    expect(exerciseTypePtbr(Number.NaN)).toBe(EXERCICIO_PTBR_FALLBACK);
  });

  it('todos os rotulos do mapa sao strings nao vazias', () => {
    for (const [codigo, rotulo] of Object.entries(EXERCISE_TYPES_PTBR)) {
      expect(typeof rotulo).toBe('string');
      expect(rotulo.length).toBeGreaterThan(0);
      expect(Number.isInteger(Number(codigo))).toBe(true);
    }
  });
});

describe('origemHcHumanizada', () => {
  it('humaniza packageNames conhecidos', () => {
    expect(origemHcHumanizada('com.strava')).toBe('Strava');
    expect(origemHcHumanizada('com.google.android.apps.healthdata')).toBe(
      'Conexão Saúde'
    );
    expect(origemHcHumanizada('com.sec.android.app.shealth')).toBe(
      'Samsung Health'
    );
  });

  it('retorna o proprio packageName quando desconhecido', () => {
    expect(origemHcHumanizada('com.acme.fitness')).toBe('com.acme.fitness');
  });

  it('usa fallback quando packageName ausente ou vazio', () => {
    expect(origemHcHumanizada(null)).toBe(ORIGEM_HC_FALLBACK);
    expect(origemHcHumanizada(undefined)).toBe(ORIGEM_HC_FALLBACK);
    expect(origemHcHumanizada('   ')).toBe(ORIGEM_HC_FALLBACK);
    expect(ORIGEM_HC_FALLBACK).toBe('Health Connect');
  });
});
