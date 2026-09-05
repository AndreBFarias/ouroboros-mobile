import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, Platform, Text } from 'react-native';
import type { AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BiometriaGate } from '@/lib/boot/biometriaGate';
import { useSettings } from '@/lib/stores/settings';
import { ToastProvider } from '@/components/ui/Toast';

describe('BiometriaGate', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
    jest.clearAllMocks();
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('toggle off renderiza children sem chamar authenticate', async () => {
    const { getByText } = render(
      <ToastProvider>
        <BiometriaGate>
          <Text>conteudo liberado</Text>
        </BiometriaGate>
      </ToastProvider>
    );
    expect(getByText('conteudo liberado')).toBeTruthy();
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it('toggle on com sucesso libera children', async () => {
    useSettings.getState().setPrivacidade('biometriaAbrir', true);
    const { findByText } = render(
      <ToastProvider>
        <BiometriaGate>
          <Text>conteudo protegido</Text>
        </BiometriaGate>
      </ToastProvider>
    );
    await waitFor(() =>
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled()
    );
    expect(await findByText('conteudo protegido')).toBeTruthy();
  });

  it('falha mantem tela de bloqueio com botao tentar novamente', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({
      success: false,
    });
    useSettings.getState().setPrivacidade('biometriaAbrir', true);
    const { findByLabelText, queryByText } = render(
      <ToastProvider>
        <BiometriaGate>
          <Text>conteudo protegido</Text>
        </BiometriaGate>
      </ToastProvider>
    );
    expect(await findByLabelText('bloqueio biometria')).toBeTruthy();
    expect(queryByText('conteudo protegido')).toBeNull();
  });

  it('sem hardware libera children silenciosamente', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
      false
    );
    useSettings.getState().setPrivacidade('biometriaAbrir', true);
    const { findByText } = render(
      <ToastProvider>
        <BiometriaGate>
          <Text>sem leitor mas libera</Text>
        </BiometriaGate>
      </ToastProvider>
    );
    expect(await findByText('sem leitor mas libera')).toBeTruthy();
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it('reativa: ligar toggle em runtime exige nova autenticacao', async () => {
    // Quando o gate liga em runtime, ele dispara authenticate. Travar
    // a promise para conseguir capturar o estado intermediario de
    // bloqueio antes do success liberar.
    let resolverAuth: ((v: { success: boolean }) => void) | null = null;
    (LocalAuthentication.authenticateAsync as jest.Mock).mockImplementation(
      () =>
        new Promise<{ success: boolean }>((resolve) => {
          resolverAuth = resolve;
        })
    );

    const { findByText, findByLabelText } = render(
      <ToastProvider>
        <BiometriaGate>
          <Text>livre</Text>
        </BiometriaGate>
      </ToastProvider>
    );
    expect(await findByText('livre')).toBeTruthy();
    await act(async () => {
      useSettings.getState().setPrivacidade('biometriaAbrir', true);
    });
    expect(await findByLabelText('bloqueio biometria')).toBeTruthy();
    // Libera para o teste limpar handlers async pendentes.
    await act(async () => {
      resolverAuth?.({ success: true });
    });
  });
  // --- AUDIT-P1-6: re-lock ao voltar do background ---
  //
  // O listener e' capturado de AppState.addEventListener para que o teste
  // dispare a transicao sem depender do runtime nativo.
  describe('re-lock ao voltar do background', () => {
    let handler: ((estado: AppStateStatus) => void) | null = null;
    let remove: jest.Mock;
    let spyAppState: jest.SpyInstance;

    beforeEach(() => {
      handler = null;
      remove = jest.fn();
      spyAppState = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_evento, cb) => {
          handler = cb as (e: AppStateStatus) => void;
          return { remove } as unknown as ReturnType<
            typeof AppState.addEventListener
          >;
        });
    });

    afterEach(() => {
      spyAppState.mockRestore();
    });

    async function montarAutenticado() {
      useSettings.getState().setPrivacidade('biometriaAbrir', true);
      const utils = render(
        <ToastProvider>
          <BiometriaGate>
            <Text>conteudo protegido</Text>
          </BiometriaGate>
        </ToastProvider>
      );
      expect(await utils.findByText('conteudo protegido')).toBeTruthy();
      return utils;
    }

    it('volta dentro do timeout nao re-autentica', async () => {
      useSettings.getState().setPrivacidade('biometriaTimeoutSegundos', 60);
      const { findByText } = await montarAutenticado();
      (LocalAuthentication.authenticateAsync as jest.Mock).mockClear();

      const agora = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(agora);
      await act(async () => handler?.('background'));
      // 59s: ainda dentro da janela
      jest.spyOn(Date, 'now').mockReturnValue(agora + 59_000);
      await act(async () => handler?.('active'));

      expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
      expect(await findByText('conteudo protegido')).toBeTruthy();
      (Date.now as jest.Mock).mockRestore();
    });

    it('volta alem do timeout re-tranca e pede biometria de novo', async () => {
      useSettings.getState().setPrivacidade('biometriaTimeoutSegundos', 60);
      const { findByLabelText } = await montarAutenticado();
      (LocalAuthentication.authenticateAsync as jest.Mock).mockClear();
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
      });

      const agora = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(agora);
      await act(async () => handler?.('background'));
      // 61s: fora da janela
      jest.spyOn(Date, 'now').mockReturnValue(agora + 61_000);
      await act(async () => handler?.('active'));

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
      expect(await findByLabelText('bloqueio biometria')).toBeTruthy();
      (Date.now as jest.Mock).mockRestore();
    });

    it('bypass em __DEV__ nunca re-tranca (blindagem do Gauntlet)', async () => {
      useSettings.getState().setPrivacidade('biometriaAbrir', true);
      useSettings.getState().setPrivacidade('biometriaTimeoutSegundos', 0);
      const { findByText } = render(
        <ToastProvider>
          <BiometriaGate bypass>
            <Text>gauntlet livre</Text>
          </BiometriaGate>
        </ToastProvider>
      );
      expect(await findByText('gauntlet livre')).toBeTruthy();
      // Com bypass o listener nem chega a ser registrado.
      expect(handler).toBeNull();
      expect(await findByText('gauntlet livre')).toBeTruthy();
    });

    it('toggle desligado nao registra listener', async () => {
      render(
        <ToastProvider>
          <BiometriaGate>
            <Text>livre</Text>
          </BiometriaGate>
        </ToastProvider>
      );
      expect(handler).toBeNull();
    });

    it('web nao registra listener', async () => {
      const osOriginal = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      useSettings.getState().setPrivacidade('biometriaAbrir', true);
      render(
        <ToastProvider>
          <BiometriaGate>
            <Text>web livre</Text>
          </BiometriaGate>
        </ToastProvider>
      );
      expect(handler).toBeNull();
      Object.defineProperty(Platform, 'OS', {
        value: osOriginal,
        writable: true,
      });
    });

    it('desmontar remove o listener (A26)', async () => {
      const { unmount } = await montarAutenticado();
      expect(remove).not.toHaveBeenCalled();
      unmount();
      expect(remove).toHaveBeenCalled();
    });
  });
});
