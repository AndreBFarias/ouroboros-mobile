// Tests do ListaTransacoes (M14). Cobre render de 20 itens, despesa
// vs credito (cor cyan/green via labels), autor pessoa_a/pessoa_b
// (rotulos A/B) e lista vazia que mostra microcopy.
import { render } from '@testing-library/react-native';
import { ListaTransacoes } from '@/components/financas/ListaTransacoes';
import type { FinancasTransacao } from '@/lib/schemas/financas-cache';

function gerar(qtd: number): FinancasTransacao[] {
  const out: FinancasTransacao[] = [];
  for (let i = 0; i < qtd; i++) {
    const dia = String(((i % 28) + 1)).padStart(2, '0');
    out.push({
      data: `2026-04-${dia}`,
      autor: i % 2 === 0 ? 'pessoa_a' : 'pessoa_b',
      tipo: 'despesa',
      valor: 10 + i,
      destino: `destino ${i}`,
      categoria: 'Mercado',
    });
  }
  return out;
}

describe('ListaTransacoes', () => {
  it('renderiza ate 20 itens quando recebe 20', () => {
    const { getAllByLabelText } = render(
      <ListaTransacoes transacoes={gerar(20)} />
    );
    const itens = getAllByLabelText(/transacao /);
    expect(itens.length).toBe(20);
  });

  it('limita a 20 itens mesmo recebendo lista maior', () => {
    const { getAllByLabelText } = render(
      <ListaTransacoes transacoes={gerar(35)} />
    );
    expect(getAllByLabelText(/transacao /).length).toBe(20);
  });

  it('renderiza linha de credito com sinal de mais', () => {
    const credito: FinancasTransacao[] = [
      {
        data: '2026-04-30',
        autor: 'pessoa_b',
        tipo: 'credito',
        valor: 12.5,
        destino: 'estorno cashback',
        categoria: 'Estorno',
      },
    ];
    const { getByLabelText } = render(
      <ListaTransacoes transacoes={credito} />
    );
    expect(
      getByLabelText('transacao estorno cashback credito 12.50')
    ).toBeTruthy();
  });

  it('renderiza linha de despesa com sinal de menos no valor', () => {
    const despesa: FinancasTransacao[] = [
      {
        data: '2026-04-30',
        autor: 'pessoa_a',
        tipo: 'despesa',
        valor: 57.86,
        destino: 'compras online',
        categoria: 'Compras Online',
      },
    ];
    const { getByLabelText } = render(
      <ListaTransacoes transacoes={despesa} />
    );
    expect(
      getByLabelText('transacao compras online despesa 57.86')
    ).toBeTruthy();
  });

  it('mostra microcopy "Sem transações no período." quando lista vazia', () => {
    const { getByText } = render(<ListaTransacoes transacoes={[]} />);
    expect(getByText('Sem transações no período.')).toBeTruthy();
  });
});
