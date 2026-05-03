// Smoke do useAutoSaveRascunho (M24). Cobre debounce (500ms padrao),
// cleanup ao desmontar, e que mudancas em rajada so persistem o
// snapshot final (efeito do debounce).
import { act, render } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import {
  useAutoSaveRascunho,
  DEBOUNCE_PADRAO_MS,
} from '@/lib/hooks/useAutoSaveRascunho';
import { useSessao } from '@/lib/stores/sessao';

// Componente de teste: renderiza um Text que muda quando o estado
// interno muda. useAutoSaveRascunho dispara em cada render.
function TelaSimulada({ titulo }: { titulo: string }) {
  useAutoSaveRascunho('contadoresNovo', { titulo });
  return <Text>{titulo}</Text>;
}

function TelaComMudancaInterna({ inicio }: { inicio: string }) {
  const [valor, setValor] = useState(inicio);
  useEffect(() => {
    setValor(inicio);
  }, [inicio]);
  useAutoSaveRascunho('tarefasNova', { titulo: valor });
  return <Text>{valor}</Text>;
}

beforeEach(() => {
  useSessao.getState().resetar();
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('useAutoSaveRascunho', () => {
  it('debounce: nao salva imediatamente', () => {
    render(<TelaSimulada titulo="Sem cigarro" />);
    // Logo apos render, o store ainda nao gravou.
    expect(useSessao.getState().rascunhos.contadoresNovo).toBeNull();
  });

  it('grava apos DEBOUNCE_PADRAO_MS', () => {
    render(<TelaSimulada titulo="Sem cigarro" />);
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_PADRAO_MS);
    });
    expect(useSessao.getState().rascunhos.contadoresNovo?.titulo).toBe(
      'Sem cigarro'
    );
  });

  it('mudancas em rajada so persistem o snapshot final', () => {
    const { rerender } = render(<TelaSimulada titulo="A" />);
    rerender(<TelaSimulada titulo="AB" />);
    rerender(<TelaSimulada titulo="ABC" />);
    // Antes do timer disparar, nada foi salvo.
    expect(useSessao.getState().rascunhos.contadoresNovo).toBeNull();
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_PADRAO_MS);
    });
    // So o ultimo titulo persiste.
    expect(useSessao.getState().rascunhos.contadoresNovo?.titulo).toBe(
      'ABC'
    );
  });

  it('cleanup ao desmontar cancela o save pendente', () => {
    const { unmount } = render(<TelaSimulada titulo="Pendente" />);
    unmount();
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_PADRAO_MS * 2);
    });
    // Sem persistencia: timer cancelado pelo cleanup.
    expect(useSessao.getState().rascunhos.contadoresNovo).toBeNull();
  });

  it('mudanca interna do componente atualiza rascunho debounced', () => {
    render(<TelaComMudancaInterna inicio="primeiro" />);
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_PADRAO_MS);
    });
    expect(useSessao.getState().rascunhos.tarefasNova?.titulo).toBe(
      'primeiro'
    );
  });
});
