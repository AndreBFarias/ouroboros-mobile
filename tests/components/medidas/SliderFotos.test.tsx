// Testes do SliderFotos. Cobre default primeira/ultima, dropdown
// abre/fecha, troca de selecao e empty state quando sem fotos.
import { render, fireEvent } from '@testing-library/react-native';
import { SliderFotos } from '@/components/medidas/SliderFotos';
import type { FotoMedida } from '@/components/medidas/SliderFotos';

const fotosBase: FotoMedida[] = [
  {
    data: '2026-03-01',
    uri: 'file:///vault/assets/m-2026-03-01-frente.jpg',
    lado: 'frente',
  },
  {
    data: '2026-04-01',
    uri: 'file:///vault/assets/m-2026-04-01-frente.jpg',
    lado: 'frente',
  },
  {
    data: '2026-04-29',
    uri: 'file:///vault/assets/m-2026-04-29-frente.jpg',
    lado: 'frente',
  },
];

describe('SliderFotos', () => {
  it('mostra empty state quando lista vazia', () => {
    const { getByText, getByLabelText } = render(
      <SliderFotos fotos={[]} largura={320} />
    );
    expect(getByText('Sem fotos para comparar.')).toBeTruthy();
    expect(getByLabelText('sem fotos para comparar')).toBeTruthy();
  });

  it('renderiza dois lados com labels Antes/Depois', () => {
    const { getByText } = render(
      <SliderFotos fotos={fotosBase} largura={320} />
    );
    // textTransform uppercase e CSS visual; o conteudo do <Text>
    // permanece "Antes" / "Depois" no test runner.
    expect(getByText('Antes')).toBeTruthy();
    expect(getByText('Depois')).toBeTruthy();
  });

  it('default seleciona primeira data no Antes e ultima no Depois', () => {
    const { getByText } = render(
      <SliderFotos fotos={fotosBase} largura={320} />
    );
    // Primeira data 2026-03-01 -> 01/03/2026 no lado Antes
    expect(getByText('01/03/2026')).toBeTruthy();
    // Ultima 2026-04-29 -> 29/04/2026 no lado Depois
    expect(getByText('29/04/2026')).toBeTruthy();
  });

  it('expande dropdown ao tocar no lado Antes', () => {
    const { getByLabelText, getAllByText } = render(
      <SliderFotos fotos={fotosBase} largura={320} />
    );
    fireEvent.press(getByLabelText('escolher data Antes'));
    // 3 opcoes na lista expandida + 1 selecao na trigger (so o
    // primeiro 01/03/2026 ja existia visivel; outros sao novos).
    // 2026-04-01 e 2026-04-29 aparecem na lista.
    expect(getAllByText('01/04/2026').length).toBeGreaterThan(0);
  });

  it('troca selecao do Antes ao escolher data na lista', () => {
    const { getByLabelText, queryByText } = render(
      <SliderFotos fotos={fotosBase} largura={320} />
    );
    fireEvent.press(getByLabelText('escolher data Antes'));
    fireEvent.press(getByLabelText('data 2026-04-01'));
    // Apos escolha, o trigger deve mostrar 01/04/2026.
    // 01/03/2026 some do trigger esquerdo (mas ainda esta no
    // dropdown se reaberto). queryByText pode encontrar 01/03/2026
    // apenas no dropdown direito caso ele esteja aberto, mas
    // dropdown nao e reaberto, entao espera que nao apareca.
    expect(queryByText('01/04/2026')).toBeTruthy();
  });

  it('aceita uma so foto (mesma data nos dois lados)', () => {
    const umaSo: FotoMedida[] = [fotosBase[0]];
    const { getAllByText } = render(
      <SliderFotos fotos={umaSo} largura={320} />
    );
    // 01/03/2026 deve aparecer nos dois triggers.
    expect(getAllByText('01/03/2026').length).toBe(2);
  });

  it('ignora fotos duplicadas com mesma data ao gerar dropdown', () => {
    // Tres fotos no mesmo dia (frente, costas, lado).
    const trezNaMesma: FotoMedida[] = [
      {
        data: '2026-04-29',
        uri: 'file:///x/frente.jpg',
        lado: 'frente',
      },
      {
        data: '2026-04-29',
        uri: 'file:///x/costas.jpg',
        lado: 'costas',
      },
      { data: '2026-04-29', uri: 'file:///x/lado.jpg', lado: 'lado' },
    ];
    const { getAllByText } = render(
      <SliderFotos fotos={trezNaMesma} largura={320} />
    );
    // So uma data unica disponivel; ambos os lados mostram 29/04.
    expect(getAllByText('29/04/2026').length).toBe(2);
  });

  it('expoe label de acessibilidade do comparativo', () => {
    const { getByLabelText } = render(
      <SliderFotos fotos={fotosBase} largura={320} />
    );
    expect(getByLabelText('comparativo de fotos')).toBeTruthy();
  });
});
