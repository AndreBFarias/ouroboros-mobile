// Testes do wrapper getBairroAtual. Mocka expo-location para isolar
// a logica pura: permission flow, fallback para subregion quando
// district vazio, retorno null em qualquer falha.
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

import { getBairroAtual } from '@/lib/eventos/localizacao';

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

describe('getBairroAtual permission flow', () => {
  it('devolve null quando permission e negada', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    const out = await getBairroAtual();
    expect(out).toBeNull();
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('devolve null quando requestPermissions lanca', async () => {
    mockRequestPermissions.mockRejectedValue(
      new Error('permissao indisponivel')
    );
    const out = await getBairroAtual();
    expect(out).toBeNull();
  });
});

describe('getBairroAtual coords flow', () => {
  it('devolve null quando getCurrentPosition lanca', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockRejectedValue(new Error('GPS off'));
    const out = await getBairroAtual();
    expect(out).toBeNull();
    expect(mockReverseGeocode).not.toHaveBeenCalled();
  });

  it('devolve null quando reverseGeocode lanca', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockRejectedValue(new Error('rede'));
    const out = await getBairroAtual();
    expect(out).toBeNull();
  });

  it('devolve null quando reverseGeocode devolve array vazio', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([]);
    const out = await getBairroAtual();
    expect(out).toBeNull();
  });
});

describe('getBairroAtual extracao do bairro', () => {
  it('usa district quando presente', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: 'Vila Madalena',
        subregion: 'Sao Paulo',
        city: 'Sao Paulo',
      },
    ]);
    const out = await getBairroAtual();
    expect(out).toBe('Vila Madalena');
  });

  it('cai em subregion quando district esta vazio', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: '',
        subregion: 'Campinas',
        city: 'Campinas',
      },
    ]);
    const out = await getBairroAtual();
    expect(out).toBe('Campinas');
  });

  it('devolve null quando district e subregion vazios', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: '',
        subregion: '',
        city: 'Cidade X',
      },
    ]);
    const out = await getBairroAtual();
    expect(out).toBeNull();
  });

  it('trim em district com espacos', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockGetCurrentPosition.mockResolvedValue(COORDS);
    mockReverseGeocode.mockResolvedValue([
      {
        district: '  Pinheiros  ',
        subregion: 'Sao Paulo',
        city: 'Sao Paulo',
      },
    ]);
    const out = await getBairroAtual();
    expect(out).toBe('Pinheiros');
  });
});
