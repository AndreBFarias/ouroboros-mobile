// AUDIT-P1-9 (b) -- a fila de boot hooks so' dispara depois que as stores
// hidratam.
//
// O defeito: app/_layout.tsx disparava reagendarTodosBootHooks() num
// useEffect de deps vazias -- o unico do arquivo assim, contra sete
// vizinhos que guardam por appPronto. O que segurava a fila era o
// `if (!vaultRoot) return` repetido nos wrappers, protecao acidental que
// cobre UMA das tres stores criticas (useVault). Com useVault hidratada e
// useSessao ainda nao, o guard deixava passar e a rotina one-shot lia a
// flag com o default de FLAGS_VAZIAS -- false, "ainda nao rodou" -- mesmo
// tendo rodado em boots anteriores, reexecutando migration de Vault a cada
// arranque.
//
// Este teste reproduz o contrato em isolamento: um componente que dispara
// a fila sob o mesmo guard do _layout. Nao renderiza o RootLayout inteiro
// (que puxa fontes, splash, notificacoes e todo o resto); o que se protege
// aqui e' a regra "so' roda quando pronto", nao o arranque completo.
//
// Comentarios sem acento.
import { render, act, waitFor } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

jest.mock('@/lib/boot/reagendamento', () => ({
  ...jest.requireActual('@/lib/boot/reagendamento'),
  reagendarTodosBootHooks: jest.fn().mockResolvedValue(undefined),
}));

import { reagendarTodosBootHooks } from '@/lib/boot/reagendamento';

// Replica exata do guard de app/_layout.tsx apos AUDIT-P1-9.
function GateDeBoot({ appPronto }: { appPronto: boolean }) {
  useEffect(() => {
    if (!appPronto) return;
    void reagendarTodosBootHooks();
  }, [appPronto]);
  return <Text>boot</Text>;
}

describe('boot hooks esperam a hidratacao (AUDIT-P1-9 b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('com as stores nao hidratadas, a fila NAO roda', async () => {
    render(<GateDeBoot appPronto={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(reagendarTodosBootHooks).not.toHaveBeenCalled();
  });

  it('apos hidratar, a fila roda exatamente uma vez', async () => {
    function Wrapper() {
      const [pronto, setPronto] = useState(false);
      useEffect(() => {
        const t = setTimeout(() => setPronto(true), 10);
        return () => clearTimeout(t);
      }, []);
      return <GateDeBoot appPronto={pronto} />;
    }
    render(<Wrapper />);
    await waitFor(() =>
      expect(reagendarTodosBootHooks).toHaveBeenCalledTimes(1)
    );
    // Nao dispara de novo em re-render posterior.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(reagendarTodosBootHooks).toHaveBeenCalledTimes(1);
  });

  it('o guard e por appPronto, nao por montagem: remontar sem pronto nao roda', async () => {
    const { rerender } = render(<GateDeBoot appPronto={false} />);
    rerender(<GateDeBoot appPronto={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(reagendarTodosBootHooks).not.toHaveBeenCalled();
  });
});
