// Testes do MidiaPicker (M07.x). Foca em:
//   - render das 4 abas com Áudio gated por permitirAudio.
//   - troca de aba via Chip.
//   - micro caption red quando obrigatorio && value.length === 0.
//   - adicionar e remover item via interacao com a tab Spotify
//     (mais simples: regex + onAdd; sem mocks de filesystem).
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui';
import { MidiaPicker } from '@/components/midia/MidiaPicker';
import type { Midia } from '@/lib/schemas/midia';

// Mock useSettings: cap 4 e permitirAudio configuravel via funcao
// global mockada por teste. Evita dependencia de SecureStore real.
let mockPermitirAudio = true;
let mockCapPorRegistro = 4;
jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: <T,>(
    sel: (s: { midia: { capPorRegistro: number; permitirAudio: boolean } }) => T
  ): T =>
    sel({
      midia: {
        capPorRegistro: mockCapPorRegistro,
        permitirAudio: mockPermitirAudio,
      },
    }),
}));

// Mock useVault: vaultRoot fixo. Necessario porque MidiaFotoTab
// chama useVault no escopo top-level mesmo sem ser ativado.
jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: <T,>(sel: (s: { vaultRoot: string | null }) => T): T =>
    sel({ vaultRoot: 'content://vault/test' }),
}));

// Mock fetch global para fetchSpotifyOEmbed: retorna sempre 200
// vazio para nao adicionar titulo/artista (mantem teste deterministico).
beforeAll(() => {
  // @ts-expect-error -- jsdom-like global
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  );
});

beforeEach(() => {
  mockPermitirAudio = true;
  mockCapPorRegistro = 4;
});

// Wrapper controlled simples: useState para value.
function Wrapper({
  obrigatorio = false,
  inicial = [],
}: {
  obrigatorio?: boolean;
  inicial?: Midia[];
}) {
  const [value, setValue] = useState<Midia[]>(inicial);
  return (
    <ToastProvider>
      <MidiaPicker
        value={value}
        onChange={setValue}
        obrigatorio={obrigatorio}
      />
    </ToastProvider>
  );
}

describe('MidiaPicker render', () => {
  it('renderiza as 4 abas quando permitirAudio=true', () => {
    const { getByText } = render(<Wrapper />);
    expect(getByText('Spotify')).toBeTruthy();
    expect(getByText('YouTube')).toBeTruthy();
    expect(getByText('Foto')).toBeTruthy();
    expect(getByText('Áudio')).toBeTruthy();
  });

  it('esconde aba Áudio quando permitirAudio=false', () => {
    mockPermitirAudio = false;
    const { queryByText, getByText } = render(<Wrapper />);
    expect(getByText('Spotify')).toBeTruthy();
    expect(queryByText('Áudio')).toBeNull();
  });

  it('mostra micro caption red quando obrigatorio e vazio', () => {
    const { getByLabelText } = render(<Wrapper obrigatorio />);
    expect(getByLabelText('aviso midia obrigatoria')).toBeTruthy();
  });

  it('nao mostra caption red quando obrigatorio mas tem item', () => {
    const inicial: Midia[] = [{ tipo: 'youtube', video_id: 'dQw4w9WgXcQ' }];
    const { queryByLabelText } = render(
      <Wrapper obrigatorio inicial={inicial} />
    );
    expect(queryByLabelText('aviso midia obrigatoria')).toBeNull();
  });

  it('nao mostra caption red quando nao obrigatorio', () => {
    const { queryByLabelText } = render(<Wrapper obrigatorio={false} />);
    expect(queryByLabelText('aviso midia obrigatoria')).toBeNull();
  });
});

describe('MidiaPicker interacao', () => {
  it('troca de aba ao tocar no chip', () => {
    const { getByText, getByLabelText } = render(<Wrapper />);
    fireEvent.press(getByText('YouTube'));
    expect(getByLabelText('aba youtube')).toBeTruthy();
  });

  it('adiciona midia youtube via link valido', async () => {
    const { getByText, getByLabelText, queryByLabelText } = render(<Wrapper />);
    fireEvent.press(getByText('YouTube'));
    const input = getByLabelText('campo link youtube');
    fireEvent.changeText(input, 'https://youtu.be/dQw4w9WgXcQ');
    fireEvent.press(getByText('Adicionar'));
    await waitFor(() => {
      expect(getByLabelText('grid midias adicionadas')).toBeTruthy();
    });
    // Tile de thumbnail aparece no grid.
    expect(queryByLabelText('thumbnail youtube 1')).toBeTruthy();
  });

  it('mostra erro inline para link youtube invalido', () => {
    const { getByText, getByLabelText, queryByLabelText } = render(<Wrapper />);
    fireEvent.press(getByText('YouTube'));
    const input = getByLabelText('campo link youtube');
    fireEvent.changeText(input, 'https://vimeo.com/12345678');
    fireEvent.press(getByText('Adicionar'));
    expect(getByLabelText('erro link youtube')).toBeTruthy();
    expect(queryByLabelText('grid midias adicionadas')).toBeNull();
  });

  it('remove midia ao tocar no botao X', async () => {
    const inicial: Midia[] = [{ tipo: 'youtube', video_id: 'dQw4w9WgXcQ' }];
    const { getByLabelText, queryByLabelText } = render(
      <Wrapper inicial={inicial} />
    );
    expect(getByLabelText('grid midias adicionadas')).toBeTruthy();
    fireEvent.press(getByLabelText('remover midia'));
    await waitFor(() => {
      expect(queryByLabelText('grid midias adicionadas')).toBeNull();
    });
  });
});
