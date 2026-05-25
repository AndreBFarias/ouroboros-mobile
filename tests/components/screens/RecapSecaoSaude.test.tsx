// R-INT-3-HC-RECAP-CARD: testes do RecapSecaoSaude. Valida render
// condicional (sem dado HC -> secao oculta; com dado -> mostra os
// valores formatados em PT-BR) e navegacao por linha clicavel.
//
// Mocka o agregador calcularSaudeRecap (testado a parte em
// tests/lib/recap/saude.test.ts) e a store de vault. O componente
// busca via useEffect; usamos waitFor para aguardar o estado.
//
// Comentarios sem acento.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { SaudeRecap } from '@/lib/recap/saude';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

const mockCalcular = jest.fn();
jest.mock('@/lib/recap/saude', () => ({
  __esModule: true,
  calcularSaudeRecap: (...args: unknown[]) => mockCalcular(...args),
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: (selector: (s: { vaultRoot: string | null }) => unknown) =>
    selector({ vaultRoot: 'content://test/vault' }),
}));

import { RecapSecaoSaude } from '@/components/screens/RecapSecaoSaude';

const ATE = new Date('2026-05-22T12:00:00-03:00');

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
  it('sem dado de saude no periodo, secao fica oculta', async () => {
    mockCalcular.mockResolvedValueOnce(saudeVazia);
    const { queryByLabelText } = render(
      <RecapSecaoSaude periodo="semana" ate={ATE} />
    );
    await waitFor(() => {
      expect(mockCalcular).toHaveBeenCalledTimes(1);
    });
    expect(queryByLabelText('secao saude')).toBeNull();
  });

  it('com dados, mostra o titulo e os valores formatados', async () => {
    mockCalcular.mockResolvedValueOnce(saudeCheia);
    const { getByText, getByLabelText } = render(
      <RecapSecaoSaude periodo="semana" ate={ATE} />
    );
    await waitFor(() => {
      expect(getByLabelText('secao saude')).toBeTruthy();
    });
    expect(getByText('Saúde essa semana')).toBeTruthy();
    expect(getByText('57.300 passos (8.186/dia)')).toBeTruthy();
    expect(getByText('3 treinos (2,5h total)')).toBeTruthy();
    expect(getByText('7,2h de sono em média')).toBeTruthy();
    expect(getByText('72,5 kg (-0,4 kg) 18,2% de gordura')).toBeTruthy();
  });
});

describe('RecapSecaoSaude - parcial e singular', () => {
  it('renderiza so as linhas com dado (passos apenas)', async () => {
    mockCalcular.mockResolvedValueOnce({
      passos: { total: 5000, mediaDia: 5000 },
      treinos: null,
      sono: null,
      medidaUltima: null,
    });
    const { getByText, queryByText } = render(
      <RecapSecaoSaude periodo="semana" ate={ATE} />
    );
    await waitFor(() => {
      expect(getByText('5.000 passos (5.000/dia)')).toBeTruthy();
    });
    expect(queryByText(/de sono/)).toBeNull();
  });

  it('usa singular para 1 treino', async () => {
    mockCalcular.mockResolvedValueOnce({
      passos: null,
      treinos: { total: 1, duracaoMin: 45 },
      sono: null,
      medidaUltima: null,
    });
    const { getByText } = render(
      <RecapSecaoSaude periodo="semana" ate={ATE} />
    );
    await waitFor(() => {
      expect(getByText('1 treino (0,8h total)')).toBeTruthy();
    });
  });
});

describe('RecapSecaoSaude - navegacao', () => {
  it('tap na linha de passos navega para /saude-fisica', async () => {
    mockCalcular.mockResolvedValueOnce(saudeCheia);
    const { getByLabelText } = render(
      <RecapSecaoSaude periodo="semana" ate={ATE} />
    );
    await waitFor(() => {
      expect(getByLabelText('57300 passos no periodo')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('57300 passos no periodo'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/saude-fisica' });
  });

  it('tap na linha de medidas navega para /medidas', async () => {
    mockCalcular.mockResolvedValueOnce(saudeCheia);
    const { getByLabelText } = render(
      <RecapSecaoSaude periodo="semana" ate={ATE} />
    );
    await waitFor(() => {
      expect(
        getByLabelText('ultima medida corporal no periodo')
      ).toBeTruthy();
    });
    fireEvent.press(getByLabelText('ultima medida corporal no periodo'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/medidas' });
  });
});
