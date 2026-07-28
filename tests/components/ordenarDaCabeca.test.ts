// Teste unitario puro do ordenador de contas (R-BRAND-3-GLIFO). Roda em
// Node/Jest sem render nem Reanimated: valida que o porte de orderFromHead
// reproduz a ordenacao canonica da anatomia da serpente.
import {
  ordenarDaCabeca,
  type Direcao,
} from '@/components/brand/glifo/ordenarDaCabeca';
import { contasComId, type ContaComId } from '@/components/brand/glifo/geometria';

describe('ordenarDaCabeca', () => {
  const base = contasComId();

  it('produz as 43 contas com ids conta-01 ... conta-43', () => {
    expect(base).toHaveLength(43);
    expect(base[0].id).toBe('conta-01');
    expect(base[42].id).toBe('conta-43');
  });

  it('ccw: conta-01 (pescoco) em [0] e conta-43 (perto da boca) em [42]', () => {
    const ordem = ordenarDaCabeca(base, 'ccw');
    expect(ordem).toHaveLength(43);
    expect(ordem[0].id).toBe('conta-01');
    expect(ordem[42].id).toBe('conta-43');
  });

  it('cw: comeca na conta mais proxima da ancora da cabeca e nao inverte o resto do ccw', () => {
    const cw = ordenarDaCabeca(base, 'cw');
    const ccw = ordenarDaCabeca(base, 'ccw');
    expect(cw).toHaveLength(43);
    // a primeira conta e' a mesma nos dois sentidos (ancora da cabeca)
    expect(cw[0].id).toBe(ccw[0].id);
    // o restante do ccw e' o restante do cw invertido
    const restoCw = cw.slice(1).map((c) => c.id);
    const restoCcwInvertido = ccw
      .slice(1)
      .map((c) => c.id)
      .reverse();
    expect(restoCw).toEqual(restoCcwInvertido);
  });

  it('e determinista: independe da ordem de entrada', () => {
    const embaralhado: ContaComId[] = [...base].reverse();
    const a = ordenarDaCabeca(base, 'ccw').map((c) => c.id);
    const b = ordenarDaCabeca(embaralhado, 'ccw').map((c) => c.id);
    expect(b).toEqual(a);
  });

  it('preserva o conjunto de contas (nenhuma perdida nem duplicada)', () => {
    (['ccw', 'cw'] as Direcao[]).forEach((dir) => {
      const ids = ordenarDaCabeca(base, dir).map((c) => c.id);
      expect(new Set(ids).size).toBe(43);
    });
  });
});
