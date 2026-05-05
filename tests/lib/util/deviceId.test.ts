// Testes da funcao getDeviceId e helper applyDeviceIdSuffix (M38).
// Mock SecureStore vem de jest.setup.cjs (in-memory por suite).
import * as SecureStore from 'expo-secure-store';
import {
  DEVICE_ID_KEY,
  _resetDeviceIdCache,
  applyDeviceIdSuffix,
  getDeviceId,
} from '@/lib/util/deviceId';

beforeEach(async () => {
  // Limpa o slot do SecureStore in-memory entre testes para garantir
  // determinismo (mock keep-alive no setup).
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  _resetDeviceIdCache();
});

describe('getDeviceId', () => {
  it('gera novo deviceId com prefix ouro- e 6 chars alfanumericos', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(/^ouro-[a-z0-9]{6}$/);
  });

  it('persiste no SecureStore: segunda chamada devolve o mesmo id', async () => {
    const a = await getDeviceId();
    _resetDeviceIdCache();
    const b = await getDeviceId();
    expect(a).toBe(b);
  });

  it('cache em memoria evita I/O repetido em chamadas consecutivas', async () => {
    const a = await getDeviceId();
    // Sem reset de cache, segunda chamada devolve mesmo id sem
    // tocar SecureStore novamente. A nao-chamada e' garantida pela
    // implementacao (cacheMemoria); validamos pelo retorno identico
    // sem regenerar (que envolveria randomShort).
    const b = await getDeviceId();
    const c = await getDeviceId();
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('id cabe em < 32 bytes (limite SecureStore A20 do BRIEF)', async () => {
    const id = await getDeviceId();
    expect(id.length).toBeLessThan(32);
  });

  it('regenera quando SecureStore foi zerado (uninstall+reinstall)', async () => {
    const a = await getDeviceId();
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    _resetDeviceIdCache();
    const b = await getDeviceId();
    expect(b).toMatch(/^ouro-[a-z0-9]{6}$/);
    // Probabilisticamente diferente; se falhar = colisao 1 em 36^6
    // (2.1 bi). Aceitamos como flake aceitavel se ocorrer.
    expect(b).not.toBe(a);
  });
});

describe('applyDeviceIdSuffix', () => {
  it('aplica suffix antes da extensao .md', () => {
    expect(applyDeviceIdSuffix('daily/2026-05-04.md', 'ouro-abc123')).toBe(
      'daily/2026-05-04-ouro-abc123.md'
    );
  });

  it('aplica suffix em path com slug intermediario', () => {
    expect(
      applyDeviceIdSuffix('tarefas/2026-05-04-comprar-pao.md', 'ouro-xyz999')
    ).toBe('tarefas/2026-05-04-comprar-pao-ouro-xyz999.md');
  });

  it('append no final quando nao ha extensao', () => {
    expect(applyDeviceIdSuffix('daily/2026-05-04', 'ouro-abc')).toBe(
      'daily/2026-05-04-ouro-abc'
    );
  });

  it('preserva extensoes nao .md (defesa)', () => {
    expect(applyDeviceIdSuffix('media/foto.jpg', 'ouro-z')).toBe(
      'media/foto-ouro-z.jpg'
    );
  });
});
