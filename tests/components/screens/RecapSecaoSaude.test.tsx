// R-INT-3-HC-RECAP-CARD: testes do RecapSecaoSaude. Valida render
// condicional (sem dado HC -> secao oculta; com dado -> mostra os
// valores formatados em PT-BR) e navegacao por linha clicavel.
//
// R-INT-3-HC-RECAP-CARD-FOLLOWUP: o agregado de saude agora e calculado
// no RecapScreen (container) e injetado via prop `saude`. A secao virou
// componente puro de apresentacao; os testes passam o SaudeRecap direto
// (sem mock de calcularSaudeRecap nem useEffect). O calculo continua
// coberto em tests/lib/recap/saude.test.ts e a integracao container +
// predicado de vazio em tests/components/screens/RecapScreen.test.tsx.
//
// Comentarios sem acento.
import { fireEvent, render } from '@testing-library/react-native';
import type { SaudeRecap } from '@/lib/recap/saude';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { RecapSecaoSaude } from '@/components/screens/RecapSecaoSaude';

const saudeCheia: SaudeRecap = {
  passos: { total: 57300, mediaDia: 8186 },
  treinos: { total: 3, duracaoMin: 150 },
  sono: { mediaHoras: 7.2, noites: 6 },
  medidaUltima: { peso: 72.5, deltaPeso: -0.4, gordura: 18.2 },
};

const saudeVazia: SaudeRecap = {
  passos: null,
  treinos: null,
  sono: null,
  medidaUltima: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RecapSecaoSaude - render condicional', () => {
  it('saude null (carregando ou sem vault), secao fica oculta', () => {
    const { queryByLabelText } = render(<RecapSecaoSaude saude={null} />);
    expect(queryByLabelText('secao saude')).toBeNull();
  });

  it('sem nenhuma metrica no periodo, secao fica oculta', () => {
    const { queryByLabelText } = render(
      <RecapSecaoSaude saude={saudeVazia} />
    );
    expect(queryByLabelText('secao saude')).toBeNull();
  });

  it('com dados, mostra o titulo e os valores formatados', () => {
    const { getByText, getByLabelText } = render(
      <RecapSecaoSaude saude={saudeCheia} />
    );
    expect(getByLabelText('secao saude')).toBeTruthy();
    expect(getByText('Saúde essa semana')).toBeTruthy();
    expect(getByText('57.300 passos (8.186/dia)')).toBeTruthy();
    expect(getByText('3 treinos (2,5h total)')).toBeTruthy();
    expect(getByText('7,2h de sono em média')).toBeTruthy();
    expect(getByText('72,5 kg (-0,4 kg) 18,2% de gordura')).toBeTruthy();
  });
});

describe('RecapSecaoSaude - parcial e singular', () => {
  it('renderiza so as linhas com dado (passos apenas)', () => {
    const { getByText, queryByText } = render(
      <RecapSecaoSaude
        saude={{
          passos: { total: 5000, mediaDia: 5000 },
          treinos: null,
          sono: null,
          medidaUltima: null,
        }}
      />
    );
    expect(getByText('5.000 passos (5.000/dia)')).toBeTruthy();
    expect(queryByText(/de sono/)).toBeNull();
  });

  it('usa singular para 1 treino', () => {
    const { getByText } = render(
      <RecapSecaoSaude
        saude={{
          passos: null,
          treinos: { total: 1, duracaoMin: 45 },
          sono: null,
          medidaUltima: null,
        }}
      />
    );
    expect(getByText('1 treino (0,8h total)')).toBeTruthy();
  });
});

describe('RecapSecaoSaude - navegacao', () => {
  it('tap na linha de passos navega para /saude-fisica', () => {
    const { getByLabelText } = render(<RecapSecaoSaude saude={saudeCheia} />);
    fireEvent.press(getByLabelText('57300 passos no periodo'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/saude-fisica' });
  });

  it('tap na linha de medidas navega para /medidas', () => {
    const { getByLabelText } = render(<RecapSecaoSaude saude={saudeCheia} />);
    fireEvent.press(getByLabelText('ultima medida corporal no periodo'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/medidas' });
  });
});
