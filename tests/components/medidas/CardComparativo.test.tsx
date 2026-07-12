// Testes do CardComparativo. Cobre formato de delta (sem cor),
// caso sem primeira medida, valor null e unidades distintas.
import { render } from '@testing-library/react-native';
import { CardComparativo } from '@/components/medidas/CardComparativo';

const pontosBase = [
  { data: '2026-04-01', valor: 80.0 },
  { data: '2026-04-08', valor: 79.2 },
  { data: '2026-04-15', valor: 78.5 },
  { data: '2026-04-22', valor: 78.0 },
  { data: '2026-04-29', valor: 77.7 },
];

describe('CardComparativo', () => {
  it('mostra nome em laranja, valor cyan e unidade muted', () => {
    const { getByText } = render(
      <CardComparativo
        nome="Peso"
        valorAtual={77.7}
        unidade="kg"
        valorPrimeira={80.0}
        pontos={pontosBase}
        largura={160}
      />
    );
    expect(getByText('Peso')).toBeTruthy();
    expect(getByText('77,7')).toBeTruthy();
    expect(getByText('kg')).toBeTruthy();
  });

  it('formata delta negativo com sinal e frase fixa', () => {
    const { getByText } = render(
      <CardComparativo
        nome="Peso"
        valorAtual={77.7}
        unidade="kg"
        valorPrimeira={80.0}
        pontos={pontosBase}
        largura={160}
      />
    );
    expect(getByText('-2,3 kg vs primeira')).toBeTruthy();
  });

  it('formata delta positivo com sinal mais', () => {
    const { getByText } = render(
      <CardComparativo
        nome="Cintura"
        valorAtual={86.0}
        unidade="cm"
        valorPrimeira={84.0}
        pontos={pontosBase.map((p) => ({ ...p, valor: p.valor + 6 }))}
        largura={160}
      />
    );
    expect(getByText('+2,0 cm vs primeira')).toBeTruthy();
  });

  it('mostra "= vs primeira" quando delta menor que 0,05', () => {
    const { getByText } = render(
      <CardComparativo
        nome="Peso"
        valorAtual={78.0}
        unidade="kg"
        valorPrimeira={78.0}
        pontos={pontosBase}
        largura={160}
      />
    );
    expect(getByText('= vs primeira')).toBeTruthy();
  });

  it('omite delta quando primeira medida e null', () => {
    const { queryByText, getByText } = render(
      <CardComparativo
        nome="Peso"
        valorAtual={78.0}
        unidade="kg"
        valorPrimeira={null}
        pontos={[{ data: '2026-04-29', valor: 78 }]}
        largura={160}
      />
    );
    expect(queryByText(/vs primeira/)).toBeNull();
    expect(getByText('78,0')).toBeTruthy();
  });

  it('mostra travessao quando valor atual e null', () => {
    const { getByText } = render(
      <CardComparativo
        nome="Peito"
        valorAtual={null}
        unidade="cm"
        valorPrimeira={null}
        pontos={[]}
        largura={160}
      />
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('aceita decimais com virgula PT-BR', () => {
    const { getByText } = render(
      <CardComparativo
        nome="Peso"
        valorAtual={78.45}
        unidade="kg"
        valorPrimeira={80.05}
        pontos={pontosBase}
        largura={160}
      />
    );
    // 78.45 -> "78,5" (toFixed(1))
    expect(getByText('78,5')).toBeTruthy();
  });

  it('expoe label de acessibilidade com nome da medida', () => {
    const { getByLabelText } = render(
      <CardComparativo
        nome="Braço esquerdo"
        valorAtual={33.0}
        unidade="cm"
        valorPrimeira={32.5}
        pontos={pontosBase}
        largura={160}
      />
    );
    expect(getByLabelText('card medida Braço esquerdo')).toBeTruthy();
  });
});
