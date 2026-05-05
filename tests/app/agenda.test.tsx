// Smoke da rota app/agenda.tsx (M37.1). Verifica os 5 estados:
//   - nao-conectado (default; sem token, sem invalido)
//   - invalido (banner reconectar)
//   - online (com cache fresco)
//
// "conectando" e "carregando" sao transientes e cobertos via mock
// async; "offline" depende de NetInfo callback que nao testamos
// aqui (gauntlet faz a parte visual).
//
// Comentarios sem acento.
import * as React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import AgendaScreen from '../../app/agenda';
import { ToastProvider } from '@/components/ui';
import { useGoogleAuth } from '@/lib/stores/googleAuth';
import { useVault } from '@/lib/stores/vault';

function renderComToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const CONTA_VAZIA = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  email: null,
  ultimaConexao: 0,
  invalido: false,
};

beforeEach(() => {
  useGoogleAuth.setState({
    contas: {
      pessoa_a: { ...CONTA_VAZIA },
      pessoa_b: { ...CONTA_VAZIA },
    },
  });
  useVault.setState({ vaultRoot: null });
});

describe('AgendaScreen', () => {
  test('estado nao-conectado mostra empty + botao conectar', async () => {
    const { getByLabelText } = renderComToast(<AgendaScreen />);
    await waitFor(() => {
      expect(getByLabelText('conectar conta google')).toBeTruthy();
    });
  });

  test('estado invalido mostra banner reconectar', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'old',
          refreshToken: 'r',
          invalido: true,
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    const { getByLabelText } = renderComToast(<AgendaScreen />);
    await waitFor(() => {
      expect(getByLabelText('banner invalido')).toBeTruthy();
      expect(getByLabelText('reconectar conta google')).toBeTruthy();
    });
  });

  test('estado online com token valido renderiza calendar', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'valid',
          refreshToken: 'r',
          expiraEm: Date.now() + 3600_000,
          email: 'a@example.com',
          ultimaConexao: Date.now(),
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    // mock global fetch para retornar lista vazia (200)
    const fetchOriginal = global.fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = jest.fn(async () => ({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => ({ items: [] }),
      text: async () => '{"items":[]}',
    }));

    const { getByLabelText } = renderComToast(<AgendaScreen />);
    await waitFor(() => {
      expect(getByLabelText('agenda root')).toBeTruthy();
    });

    // restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchOriginal;
  });
});
