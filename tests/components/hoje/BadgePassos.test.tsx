// Testes do BadgePassos (R-INT-3-HC-NOTIF-META-PASSOS).
//
// Cobre:
//   1. Render "X / Y passos" quando ha leitura (count) e toggle on.
//   2. Oculta (render nulo) quando lerPassosHojeHC retorna null.
//   3. Oculta quando healthConnectSync esta off (nem tenta ler).
//   4. Dispara checarEnotificarMeta com count e meta quando ha leitura.
//
// Mocka lerPassosHojeHC e checarEnotificarMeta; usa o store real
// useSettings para controlar toggle e meta.
//
// Comentarios sem acento.
import { render, waitFor } from '@testing-library/react-native';

const mockLerPassos = jest.fn();
const mockChecar = jest.fn();

jest.mock('@/lib/health/passosHoje', () => ({
  __esModule: true,
  lerPassosHojeHC: (...args: unknown[]) => mockLerPassos(...args),
}));

jest.mock('@/lib/notifications/metaPassos', () => ({
  __esModule: true,
  checarEnotificarMeta: (...args: unknown[]) => mockChecar(...args),
}));

import { BadgePassos } from '@/components/hoje/BadgePassos';
import { useSettings } from '@/lib/stores/settings';

function ligarHC(on: boolean) {
  useSettings.getState().setFeatureToggle('healthConnectSync', on);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChecar.mockResolvedValue({ notificou: false });
  useSettings.getState().setMetaPassosDia(8000);
});

describe('BadgePassos', () => {
  it('renderiza "X / Y passos" quando ha count e toggle on', async () => {
    ligarHC(true);
    mockLerPassos.mockResolvedValueOnce(5230);
    const { getByText } = render(<BadgePassos />);
    await waitFor(() => {
      expect(getByText('5.230 / 8.000 passos')).toBeTruthy();
    });
  });

  it('fica oculto quando lerPassosHojeHC retorna null', async () => {
    ligarHC(true);
    mockLerPassos.mockResolvedValueOnce(null);
    const { queryByText } = render(<BadgePassos />);
    await waitFor(() => {
      expect(mockLerPassos).toHaveBeenCalled();
    });
    expect(queryByText(/passos/)).toBeNull();
  });

  it('fica oculto quando healthConnectSync esta off (nem le o HC)', async () => {
    ligarHC(false);
    const { queryByText } = render(<BadgePassos />);
    // Da uma volta no event loop para confirmar que nao renderizou.
    await waitFor(() => {
      expect(queryByText(/passos/)).toBeNull();
    });
    expect(mockLerPassos).not.toHaveBeenCalled();
  });

  it('dispara checarEnotificarMeta com count e meta quando ha leitura', async () => {
    ligarHC(true);
    mockLerPassos.mockResolvedValueOnce(8100);
    render(<BadgePassos />);
    await waitFor(() => {
      expect(mockChecar).toHaveBeenCalledWith(8100, 8000);
    });
  });

  it('nao dispara notificacao quando leitura e null', async () => {
    ligarHC(true);
    mockLerPassos.mockResolvedValueOnce(null);
    render(<BadgePassos />);
    await waitFor(() => {
      expect(mockLerPassos).toHaveBeenCalled();
    });
    expect(mockChecar).not.toHaveBeenCalled();
  });
});
