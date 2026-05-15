// T1B3: testa getBairroAtualDetalhado, versao discriminada que
// distingue causa da falha (permissao negada vs GPS off vs sem
// resultado). Caller usa isso para mostrar toast especifico.
//
// Comentarios sem acento (convencao shell/CI).
const mockRequestPermissions = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockReverseGeocode = jest.fn();

jest.mock('expo-location', () => ({
  __esModule: true,
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: () => mockRequestPermissions(),
  getCurrentPositionAsync: (...args: unknown[]) =>
    mockGetCurrentPosition(...args),
  reverseGeocodeAsync: (...args: unknown[]) => mockReverseGeocode(...args),
}));

import { getBairroAtualDetalhado } from '@/lib/eventos/localizacao';

const COORDS = {
  coords: {
    latitude: -23.5505,
    longitude: -46.6333,
    altitude: null,
    accuracy: 10,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getBairroAtualDetalhado discriminator', () => {
  it('retorna razao=permissao_negada quando permissao e negada', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('permissao_negada');
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('retorna razao=permissao_negada quando requestPermissions lanca', async () => {
    mockRequestPermissions.mockRejectedValue(new Error('indisponivel'));
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('permissao_negada');
  });

  it('retorna razao=gps_indisponivel quando getCurrentPosition lanca', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockRejectedValue(new Error('GPS off'));
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('gps_indisponivel');
  });

  it('retorna razao=gps_indisponivel quando reverseGeocode lanca', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockRejectedValue(new Error('rede'));
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('gps_indisponivel');
  });

  it('retorna razao=sem_resultado quando array vazio', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([]);
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('sem_resultado');
  });

  it('retorna ok=true com bairro quando district presente', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: 'Pinheiros',
        subregion: 'Sao Paulo',
        city: 'Sao Paulo',
      },
    ]);
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.bairro).toBe('Pinheiros');
  });

  it('cai em subregion quando district vazio', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: '',
        subregion: 'Campinas',
        city: 'Campinas',
      },
    ]);
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.bairro).toBe('Campinas');
  });

  it('retorna razao=sem_resultado quando district e subregion vazios', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: '',
        subregion: '',
        city: 'Cidade X',
      },
    ]);
    const out = await getBairroAtualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('sem_resultado');
  });
});
