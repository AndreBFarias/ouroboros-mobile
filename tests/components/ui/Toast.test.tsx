import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ToastProvider, useToast, useOptionalToast } from '@/components/ui';

function Caller({ onApi }: { onApi: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast();
  onApi(api);
  return null;
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('Provider renderiza filhos sem toast inicial', () => {
    const { getByText, queryByLabelText } = render(
      <ToastProvider>
        <Text>filho</Text>
      </ToastProvider>
    );
    expect(getByText('filho')).toBeTruthy();
    expect(queryByLabelText(/toast/)).toBeNull();
  });

  it('useToast lanca quando fora do Provider', () => {
    const orig = console.error;
    console.error = jest.fn();
    expect(() => {
      render(<Caller onApi={() => undefined} />);
    }).toThrow(/ToastProvider/);
    console.error = orig;
  });

  it('show insere toast com label semantico e some apos timeout', () => {
    let api: ReturnType<typeof useToast> | null = null;
    const { queryByLabelText } = render(
      <ToastProvider>
        <Caller onApi={(a) => (api = a)} />
      </ToastProvider>
    );
    expect(api).not.toBeNull();
    act(() => {
      api!.show('feito.', 'success');
    });
    expect(queryByLabelText('toast success')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2600);
    });
    expect(queryByLabelText('toast success')).toBeNull();
  });

  it('useOptionalToast retorna api no-op fora do provider', () => {
    let captured: ReturnType<typeof useOptionalToast> | null = null;
    function Probe() {
      captured = useOptionalToast();
      return null;
    }
    render(<Probe />);
    expect(captured).not.toBeNull();
    expect(typeof captured!.show).toBe('function');
    expect(() => captured!.show('x')).not.toThrow();
  });
});
