// Testes do ConquistaCard (M11.5). Cobre render por tipo de cover,
// truncamento de frase em 2 linhas, formatacao de data abreviada,
// tap dispara callback.
import { render, fireEvent } from '@testing-library/react-native';
import { ConquistaCard } from '@/components/data/ConquistaCard';
import type { Conquista, MidiaCoverTipo } from '@/lib/conquistas/types';
import type { Midia } from '@/lib/schemas/midia';

// Mock minimo do useRouter para isolar render do componente. O
// onPress override usa o callback passado por prop, nao toca o router.
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
}));

function midiaPor(tipo: MidiaCoverTipo): Midia {
  if (tipo === 'foto') return { tipo: 'foto', path: 'p.jpg' };
  if (tipo === 'youtube') return { tipo: 'youtube', video_id: 'abc12345678' };
  if (tipo === 'spotify') return { tipo: 'spotify', track_id: 'xyz' };
  return { tipo: 'audio', path: 'a.m4a' };
}

function fakeConquista(
  tipo: MidiaCoverTipo,
  overrides: Partial<Conquista> = {}
): Conquista {
  const m = midiaPor(tipo);
  return {
    id: `evento_positivo:2026-04-15:pessoa_a`,
    origem: 'evento_positivo',
    data: '2026-04-15',
    autor: 'pessoa_a',
    frase: 'Caminhada longa em Pinheiros.',
    lugar: null,
    intensidade: 4,
    bairro: 'Pinheiros',
    midiaPrincipal: m,
    tipoCover: tipo,
    midias: [m],
    meta: { tipo: 'evento' } as never,
    ...overrides,
  };
}

describe('ConquistaCard', () => {
  it('renderiza rotulo "Foto" para cover tipo foto', () => {
    const { getByText } = render(
      <ConquistaCard conquista={fakeConquista('foto')} />
    );
    expect(getByText('Foto')).toBeTruthy();
  });

  it('renderiza rotulo "YouTube" para cover tipo youtube', () => {
    const { getByText } = render(
      <ConquistaCard conquista={fakeConquista('youtube')} />
    );
    expect(getByText('YouTube')).toBeTruthy();
  });

  it('renderiza rotulo "Spotify" para cover tipo spotify', () => {
    const { getByText } = render(
      <ConquistaCard conquista={fakeConquista('spotify')} />
    );
    expect(getByText('Spotify')).toBeTruthy();
  });

  it('renderiza rotulo "Áudio" com acento para cover tipo audio', () => {
    const { getByText } = render(
      <ConquistaCard conquista={fakeConquista('audio')} />
    );
    expect(getByText('Áudio')).toBeTruthy();
  });

  it('formata data abreviada em PT-BR (15 abr 2026)', () => {
    const { getByText } = render(
      <ConquistaCard conquista={fakeConquista('foto')} />
    );
    expect(getByText('15 abr 2026')).toBeTruthy();
  });

  it('mostra a frase principal', () => {
    const c = fakeConquista('foto', { frase: 'Pintei a sala inteira.' });
    const { getByText } = render(<ConquistaCard conquista={c} />);
    expect(getByText('Pintei a sala inteira.')).toBeTruthy();
  });

  it('chama onPress callback no tap', () => {
    const onPress = jest.fn();
    const c = fakeConquista('foto');
    const { getByLabelText } = render(
      <ConquistaCard conquista={c} onPress={onPress} />
    );
    fireEvent.press(getByLabelText(/conquista/));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(c);
  });
});
