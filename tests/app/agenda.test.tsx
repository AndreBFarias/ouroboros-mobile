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
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

// OuroborosLoader em web toca document.querySelector (animacao SVG
// declarativa). No teste node, stub leve; o branch dead-code em
// release Android continua valido (Platform.OS != 'web').
jest.mock('@/components/brand', () => {
  const ReactInner = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    OuroborosLoader: () =>
      ReactInner.createElement(View, {
        accessibilityLabel: 'ouroboros loader stub',
      }),
  };
});

import AgendaScreen from '../../app/agenda';
import { ToastProvider } from '@/components/ui';
import { useGoogleAuth } from '@/lib/stores/googleAuth';
import { useCredenciais } from '@/lib/stores/credenciais';
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
  // P4 (2026-09-08): o convite "Conectar conta Google" so aparece quando
  // ha um codigo do Google cadastrado neste aparelho. Os casos abaixo
  // medem o fluxo de conexao, entao semeiam a credencial; o describe
  // proprio da ausencia zera o store.
  useCredenciais.setState({
    google: '123-abc.apps.googleusercontent.com',
    spotify: null,
  });
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

  test('fluxo conectar em web __DEV__ vai para online sem chamar fetch', async () => {
    // M37.1.3: token mock injetado por autenticar() em web __DEV__
    // dispara branch isMockToken em listarEventos -> eventos sinteticos
    // sem rede real. Estado final = online, banner offline ausente.
    const platformOriginal = Platform.OS;
    (Platform as any).OS = 'web';
    const fetchOriginal = global.fetch;
    const fetchMock = jest.fn(async () => {
      throw new Error(
        'fetch nao deveria ser chamado em web __DEV__ com token mock'
      );
    });
    (global as any).fetch = fetchMock;

    try {
      const { getByLabelText, queryByLabelText } = renderComToast(
        <AgendaScreen />
      );
      const botao = await waitFor(() =>
        getByLabelText('conectar conta google')
      );
      await act(async () => {
        fireEvent.press(botao);
      });
      await waitFor(() => {
        expect(getByLabelText('agenda root')).toBeTruthy();
        expect(queryByLabelText('banner offline')).toBeNull();
      });
      expect(fetchMock).not.toHaveBeenCalled();
      // token sintetico ficou no store
      const tokenFinal =
        useGoogleAuth.getState().contas.pessoa_a.accessToken ?? '';
      expect(tokenFinal.startsWith('mock-access-token')).toBe(true);
    } finally {
      (Platform as any).OS = platformOriginal;
      (global as any).fetch = fetchOriginal;
    }
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
    (global as any).fetch = fetchOriginal;
  });
});

// P4 (2026-09-08): sem credencial propria, a Agenda nao convida a uma
// conexao que o Google recusaria. O convite muda de lugar -- vai para a
// tela onde a pessoa resolve --, e o texto explica o motivo sem tratar
// a ausencia como defeito dela.
describe('AgendaScreen sem credencial do Google (P4)', () => {
  beforeEach(() => {
    useCredenciais.setState({ google: null, spotify: null });
  });

  test('nao oferece conectar, e sim o caminho para criar o codigo', async () => {
    const { getByLabelText, queryByLabelText } = renderComToast(
      <AgendaScreen />
    );
    await waitFor(() => {
      expect(getByLabelText('ver como criar o codigo do google')).toBeTruthy();
    });
    // O botao antigo some: apertar ele levaria a uma recusa opaca.
    expect(queryByLabelText('conectar conta google')).toBeNull();
  });

  test('a frase explica o motivo sem vocabulario de defeito', async () => {
    const { getByText, queryByText } = renderComToast(<AgendaScreen />);
    await waitFor(() => {
      expect(
        getByText(/o Google pede que cada aplicativo se identifique/)
      ).toBeTruthy();
    });
    expect(queryByText(/\berro\b/i)).toBeNull();
    expect(queryByText(/\bfalha\b/i)).toBeNull();
    expect(queryByText(/!/)).toBeNull();
  });
});
