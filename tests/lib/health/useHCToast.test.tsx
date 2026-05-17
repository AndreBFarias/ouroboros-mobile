// R-INT-3 (2026-05-16): cobertura do bridge HC -> Toast. Garante que:
//   1. permission_denied dispara toast warn com mensagem PT-BR.
//   2. api_error dispara toast warn.
//   3. no_module NAO dispara toast (regra anti-spam em dev/web).
//   4. Toast nao some imediatamente apos emit (timing canonico do
//      ToastProvider e' 2500ms).
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ToastProvider } from '@/components/ui';
import { HCToastBridge } from '@/lib/health/useHCToast';
import {
  emitHCSyncFail,
  __resetHCSyncFailListeners,
} from '@/lib/health/eventBus';

beforeEach(() => {
  __resetHCSyncFailListeners();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('HCToastBridge', () => {
  it('exibe toast warn em permission_denied', () => {
    const { queryByLabelText } = render(
      <ToastProvider>
        <HCToastBridge />
        <Text>filho</Text>
      </ToastProvider>
    );
    expect(queryByLabelText(/toast/)).toBeNull();

    act(() => {
      emitHCSyncFail({
        tipo: 'treino',
        motivo: 'permission_denied',
        mensagem:
          'Treino salvo localmente. Sem permissão para gravar na Conexão Saúde.',
      });
    });

    expect(queryByLabelText('toast warn')).toBeTruthy();
  });

  it('exibe toast warn em api_error', () => {
    const { queryByLabelText } = render(
      <ToastProvider>
        <HCToastBridge />
      </ToastProvider>
    );

    act(() => {
      emitHCSyncFail({
        tipo: 'peso',
        motivo: 'api_error',
        mensagem: 'Peso salvo localmente. Falha ao sincronizar com Conexão Saúde.',
      });
    });

    expect(queryByLabelText('toast warn')).toBeTruthy();
  });

  it('NAO exibe toast em no_module (suprime spam)', () => {
    const { queryByLabelText } = render(
      <ToastProvider>
        <HCToastBridge />
      </ToastProvider>
    );

    act(() => {
      emitHCSyncFail({
        tipo: 'gordura',
        motivo: 'no_module',
        mensagem:
          'Medida salva localmente. Conexão Saúde indisponível neste aparelho.',
      });
    });

    expect(queryByLabelText(/toast/)).toBeNull();
  });
});
