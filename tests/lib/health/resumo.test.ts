// Cobertura das funcoes puras de resumo HC (Q17.d). Hook usa setting +
// readers que ja tem testes unitarios no escopo Q17.b/c. Aqui exerce
// agregacao temporal e ordenacao de pesos sem mock nativo.
import {
  resumirPassos,
  resumirPeso,
  resumirTreinos,
} from '@/lib/health/resumo';
import type { RegistroExternoHC } from '@/lib/health/sync';

const HOJE = new Date('2026-05-13T12:00:00Z');
const DIA = 24 * 60 * 60 * 1000;

function passos(diasAtras: number, count: number): RegistroExternoHC {
  const ts = new Date(HOJE.getTime() - diasAtras * DIA).toISOString();
  return {
    uuid: `${ts}-steps`,
    tipo: 'steps',
    inicio: ts,
    fim: ts,
    rotulo: `${count} passos`,
    valor: count,
  };
}

function peso(diasAtras: number, kg: number): RegistroExternoHC {
  const ts = new Date(HOJE.getTime() - diasAtras * DIA).toISOString();
  return {
    uuid: `${ts}-weight`,
    tipo: 'weight',
    inicio: ts,
    fim: ts,
    rotulo: `${kg.toFixed(1)} kg`,
    valor: kg,
  };
}

function treino(diasAtras: number, duracaoMin: number, rotulo = 'Treino externo'): RegistroExternoHC {
  const fim = new Date(HOJE.getTime() - diasAtras * DIA);
  const inicio = new Date(fim.getTime() - duracaoMin * 60_000);
  return {
    uuid: `${inicio.toISOString()}-exercise`,
    tipo: 'exercise',
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    rotulo,
  };
}

describe('resumirPassos', () => {
  it('soma os 7 dias atuais e os 7 anteriores separadamente', () => {
    const r = resumirPassos(
      [
        passos(0, 8000),
        passos(3, 6000),
        passos(6.5, 4000),
        passos(8, 5000),
        passos(13, 7000),
        passos(20, 9999), // fora da janela 14d
      ],
      HOJE
    );
    expect(r.totalSemanaAtual).toBe(18000);
    expect(r.totalSemanaAnterior).toBe(12000);
    expect(r.deltaAbsoluto).toBe(6000);
  });

  it('ignora registros nao-steps e sem valor', () => {
    const lixo: RegistroExternoHC = {
      uuid: 'x',
      tipo: 'weight',
      inicio: HOJE.toISOString(),
      fim: HOJE.toISOString(),
      rotulo: '70 kg',
      valor: 70,
    };
    const r = resumirPassos([lixo, passos(1, 5000)], HOJE);
    expect(r.totalSemanaAtual).toBe(5000);
    expect(r.totalSemanaAnterior).toBe(0);
    expect(r.deltaAbsoluto).toBe(5000);
  });

  it('devolve zeros quando lista vazia', () => {
    const r = resumirPassos([], HOJE);
    expect(r.totalSemanaAtual).toBe(0);
    expect(r.totalSemanaAnterior).toBe(0);
    expect(r.deltaAbsoluto).toBe(0);
  });
});

describe('resumirPeso', () => {
  it('devolve a leitura mais recente + delta vs anterior', () => {
    const r = resumirPeso([peso(10, 78.4), peso(3, 76.9), peso(45, 80.1)]);
    expect(r).not.toBeNull();
    expect(r?.ultimoKg).toBeCloseTo(76.9, 5);
    expect(r?.deltaKg).toBe(-1.5);
  });

  it('delta null quando so existe uma leitura', () => {
    const r = resumirPeso([peso(2, 75)]);
    expect(r?.ultimoKg).toBe(75);
    expect(r?.deltaKg).toBeNull();
  });

  it('retorna null quando lista vazia', () => {
    expect(resumirPeso([])).toBeNull();
  });

  it('ignora registros com valor invalido', () => {
    const semValor: RegistroExternoHC = {
      uuid: 'x',
      tipo: 'weight',
      inicio: HOJE.toISOString(),
      fim: HOJE.toISOString(),
      rotulo: 'Peso',
    };
    const r = resumirPeso([semValor, peso(1, 70)]);
    expect(r?.ultimoKg).toBe(70);
  });
});

describe('resumirTreinos', () => {
  it('conta apenas sessions dentro de 30 dias e ordena desc', () => {
    const r = resumirTreinos(
      [treino(2, 45, 'Forca'), treino(35, 60, 'Antigo'), treino(10, 30, 'Cardio')],
      HOJE
    );
    expect(r.ultimos30dias).toBe(2);
    expect(r.lista[0].rotulo).toBe('Forca');
    expect(r.lista[1].rotulo).toBe('Cardio');
  });

  it('arredonda duracao em minutos e garante minimo 1', () => {
    const r = resumirTreinos([treino(1, 0.5, 'Curto'), treino(1, 12, 'Normal')], HOJE);
    const curto = r.lista.find((t) => t.rotulo === 'Curto');
    expect(curto?.duracaoMin).toBeGreaterThanOrEqual(1);
    const normal = r.lista.find((t) => t.rotulo === 'Normal');
    expect(normal?.duracaoMin).toBe(12);
  });

  it('lista vazia quando nenhum exercise dentro da janela', () => {
    expect(resumirTreinos([treino(60, 30)], HOJE).ultimos30dias).toBe(0);
  });
});
