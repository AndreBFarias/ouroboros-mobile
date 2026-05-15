import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
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
});
