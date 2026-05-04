// Testes do boot helper M30 migrarLembretesParaAlarmes. Cobre:
//  - migracao basica: 3 lembretes v1 viram 3 alarmes pre-cadastrados
//    (slug 'lembrete-medicacao', 'lembrete-treino', 'lembrete-humor').
//  - preservacao de horario e ativo do shape v1.
//  - tag mapeada: medicacao -> medicacao, treino -> treino, humor -> outro.
//  - idempotencia: rodar 2x nao duplica nem sobrescreve alarmes existentes.
//  - blob v1 ausente: no-op sem erro.
//  - apos migracao bem sucedida, blob v1 e apagado do SecureStore.
//  - vaultRoot vazio: no-op.
//
// Mocka @/lib/vault/alarmes para in-memory map - evita dependencia
// do mock de StorageAccessFramework de baixo nivel.
//
// Comentarios sem acento (convencao shell/CI).
import type { Alarme } from '@/lib/schemas/alarme';

// In-memory store de alarmes mockados, indexado por slug.
const memAlarmes = new Map<string, Alarme>();

const mockLerAlarme = jest.fn(async (_root: string, slug: string) => {
  return memAlarmes.get(slug) ?? null;
});

const mockEscreverAlarme = jest.fn(async (_root: string, meta: Alarme) => {
  memAlarmes.set(meta.slug, meta);
  return { uri: `mock://${meta.slug}`, rel: `alarmes/${meta.slug}.md` };
});

const mockListarAlarmes = jest.fn(async () =>
  Array.from(memAlarmes.values())
);

jest.mock('@/lib/vault/alarmes', () => ({
  __esModule: true,
  lerAlarme: (...args: unknown[]) =>
    mockLerAlarme(args[0] as string, args[1] as string),
  escreverAlarme: (...args: unknown[]) =>
    mockEscreverAlarme(args[0] as string, args[1] as Alarme),
  listarAlarmes: () => mockListarAlarmes(),
  excluirAlarme: jest.fn(),
}));

import { describe, expect, it, beforeEach } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { migrarLembretesParaAlarmes } from '@/lib/boot/migrarLembretes';

const VAULT_ROOT = 'content://mock/vault';

function blobV1(over: Record<string, unknown> = {}): string {
  // Formato canonico do zustand persist: { state, version }.
  return JSON.stringify({
    state: {
      lembretes: {
        medicacao: { ativo: true, horario: '08:00' },
        treino: { ativo: false, horario: '18:00' },
        humor: { ativo: true, horario: '21:00' },
        ...over,
      },
    },
    version: 1,
  });
}

beforeEach(async () => {
  memAlarmes.clear();
  await SecureStore.deleteItemAsync('ouroboros.settings.v1');
  jest.clearAllMocks();
});

describe('migrarLembretesParaAlarmes', () => {
  it('cria 3 alarmes pre-cadastrados a partir do blob v1', async () => {
    await SecureStore.setItemAsync('ouroboros.settings.v1', blobV1());

    await migrarLembretesParaAlarmes(VAULT_ROOT);

    const medicacao = memAlarmes.get('lembrete-medicacao');
    const treino = memAlarmes.get('lembrete-treino');
    const humor = memAlarmes.get('lembrete-humor');

    expect(medicacao).toBeDefined();
    expect(treino).toBeDefined();
    expect(humor).toBeDefined();

    expect(medicacao?.titulo).toBe('Medicação');
    expect(medicacao?.tag).toBe('medicacao');
    expect(medicacao?.recorrencia).toBe('diaria');
    expect(medicacao?.horario).toBe('08:00');
    expect(medicacao?.ativo).toBe(true);

    expect(treino?.tag).toBe('treino');
    expect(treino?.horario).toBe('18:00');
    expect(treino?.ativo).toBe(false);

    // humor mapeia para tag 'outro' (nao ha 'humor' no AlarmeTagSchema).
    expect(humor?.tag).toBe('outro');
    expect(humor?.titulo).toBe('Humor diário');
    expect(humor?.horario).toBe('21:00');
    expect(humor?.ativo).toBe(true);
  });

  it('idempotencia: rodar 2x nao duplica nem sobrescreve', async () => {
    await SecureStore.setItemAsync('ouroboros.settings.v1', blobV1());
    await migrarLembretesParaAlarmes(VAULT_ROOT);
    const primeira = memAlarmes.get('lembrete-medicacao');
    expect(primeira).toBeDefined();
    const criadoEmOriginal = primeira?.criado_em;

    // Re-cria blob v1 com valores diferentes e roda de novo.
    await SecureStore.setItemAsync(
      'ouroboros.settings.v1',
      blobV1({ medicacao: { ativo: false, horario: '23:59' } })
    );
    await migrarLembretesParaAlarmes(VAULT_ROOT);

    const segunda = memAlarmes.get('lembrete-medicacao');
    // Alarme preservado intacto (criado_em + horario originais).
    expect(segunda?.criado_em).toBe(criadoEmOriginal);
    expect(segunda?.horario).toBe('08:00');
    expect(segunda?.ativo).toBe(true);
    // E nao houve duplicacao - o map indexa por slug.
    const lembretes = Array.from(memAlarmes.values()).filter((a) =>
      a.slug.startsWith('lembrete-')
    );
    expect(lembretes).toHaveLength(3);
  });

  it('apos migracao bem sucedida, apaga blob v1 do SecureStore', async () => {
    await SecureStore.setItemAsync('ouroboros.settings.v1', blobV1());
    expect(
      await SecureStore.getItemAsync('ouroboros.settings.v1')
    ).not.toBeNull();

    await migrarLembretesParaAlarmes(VAULT_ROOT);

    expect(
      await SecureStore.getItemAsync('ouroboros.settings.v1')
    ).toBeNull();
  });

  it('blob v1 ausente: no-op sem erro', async () => {
    await expect(
      migrarLembretesParaAlarmes(VAULT_ROOT)
    ).resolves.toBeUndefined();
    expect(memAlarmes.size).toBe(0);
  });

  it('vaultRoot vazio: no-op', async () => {
    await SecureStore.setItemAsync('ouroboros.settings.v1', blobV1());
    await expect(migrarLembretesParaAlarmes('')).resolves.toBeUndefined();
    // Blob v1 preservado (nao houve passada).
    expect(
      await SecureStore.getItemAsync('ouroboros.settings.v1')
    ).not.toBeNull();
    expect(memAlarmes.size).toBe(0);
  });

  it('blob v1 sem chave lembretes: no-op', async () => {
    await SecureStore.setItemAsync(
      'ouroboros.settings.v1',
      JSON.stringify({ state: { somVibracao: { humor: true } }, version: 1 })
    );
    await migrarLembretesParaAlarmes(VAULT_ROOT);
    expect(memAlarmes.size).toBe(0);
  });

  it('blob v1 corrompido (JSON invalido): no-op silencioso', async () => {
    await SecureStore.setItemAsync('ouroboros.settings.v1', 'nao-json');
    await expect(
      migrarLembretesParaAlarmes(VAULT_ROOT)
    ).resolves.toBeUndefined();
  });

  it('preserva horario default 09:00 quando blob omite o campo', async () => {
    await SecureStore.setItemAsync(
      'ouroboros.settings.v1',
      JSON.stringify({
        state: {
          lembretes: { medicacao: { ativo: true } }, // sem horario
        },
        version: 1,
      })
    );
    await migrarLembretesParaAlarmes(VAULT_ROOT);
    const m = memAlarmes.get('lembrete-medicacao');
    expect(m?.horario).toBe('09:00');
  });
});
