// Testes do saneamento one-shot AUDIT-P1-2-DIASENTRE-FUSO (2026-07-28):
// desfaz o +1 dia que o truncamento UTC antigo de diasEntre gravou em
// `recorde` de contador.
//
// Duas camadas:
//  1. recomputarRecordeSaneado -- funcao pura, sem I/O. Cobre a
//     aritmetica: intervalo exatamente recomputavel, intervalo da
//     primeira sequencia (inicio original perdido), recorde legitimo
//     preservado.
//  2. sanearRecordesContadores -- rotina de boot. Mocka reader/writer e
//     valida flag one-shot, preservacao do body e recusa de escrever em
//     arquivo de outro device (T2-LOCK-VAULT).
//
// Comentarios sem acento (convencao shell/CI).
import * as SecureStore from 'expo-secure-store';
import type { Contador } from '@/lib/schemas/contador';
import { useSessao } from '@/lib/stores/sessao';
import { _resetDeviceIdCache, DEVICE_ID_KEY } from '@/lib/util/deviceId';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import {
  recomputarRecordeSaneado,
  sanearRecordesContadores,
} from '@/lib/boot/sanearRecordesContadores';

const VAULT_ROOT = 'file:///mock/vault';
const DEVICE_ID_FIXO = 'ouro-tst001';

function fixture(over: Partial<Contador> = {}): Contador {
  return {
    tipo: 'contador',
    slug: 'sem-cigarro',
    titulo: 'Sem cigarro',
    inicio: '2026-07-27',
    recorde: 0,
    resets: [],
    criado_em: '2026-07-01T14:00:00-03:00',
    para: { tipo: 'mim' },
    ...over,
  };
}

// Instantes de referencia (BRT = UTC-3):
//   NOITE  -> 2026-07-27 22:30 BRT (dia UTC ja e 28): janela do defeito.
//   DIA    -> 2026-07-27 12:30 BRT (dia UTC e 27): fora da janela.
const RESET_NOITE = '2026-07-28T01:30:00.000Z';
const RESET_DIA = '2026-07-27T15:30:00.000Z';

describe('recomputarRecordeSaneado', () => {
  it('desconta 1 quando o unico reset caiu na janela 21:00-23:59 BRT', () => {
    // Contador criado em 20/07, resetado as 22:30 BRT de 27/07. A conta
    // antiga gravou 8; o valor correto em dia civil local e 7.
    const c = fixture({ recorde: 8, resets: [RESET_NOITE] });
    expect(recomputarRecordeSaneado(c)).toBe(7);
  });

  it('preserva o recorde quando o reset ficou fora da janela', () => {
    const c = fixture({ recorde: 8, resets: [RESET_DIA] });
    expect(recomputarRecordeSaneado(c)).toBe(8);
  });

  it('nao desce abaixo de um intervalo exatamente recomputado', () => {
    // resets[0] -> resets[1] = 27/07 22:30 BRT ate 06/08 12:00 BRT = 10
    // dias, recomputaveis com exatidao (o inicio daquela sequencia era
    // formatDateYmd(resets[0]) = 2026-07-27). O primeiro reset caiu na
    // janela, mas descontar levaria a 9 -- abaixo do que sabemos ser
    // verdade. A regra mantem 10.
    const c = fixture({
      recorde: 10,
      resets: [RESET_NOITE, '2026-08-06T15:00:00.000Z'],
    });
    expect(recomputarRecordeSaneado(c)).toBe(10);
  });

  it('corrige recorde vindo de intervalo pos-primeiro-reset inflado', () => {
    // Sequencia 27/07 -> 06/08 22:30 BRT: 10 dias reais, mas a conta
    // antiga gravou 11 porque o reset que a encerrou caiu na janela. Com
    // o primeiro reset TAMBEM na janela, a primeira sequencia vale no
    // maximo 10 -- entao 10 e o recorde verdadeiro, sem ambiguidade.
    const c = fixture({
      recorde: 11,
      resets: [RESET_NOITE, '2026-08-07T01:30:00.000Z'],
    });
    expect(recomputarRecordeSaneado(c)).toBe(10);
  });

  // Ponto cego assumido e documentado: o `inicio` original da PRIMEIRA
  // sequencia foi sobrescrito pelo primeiro reset e o date picker de
  // novo.tsx aceita data retroativa, entao essa sequencia pode ser
  // arbitrariamente longa. Se o primeiro reset ficou fora da janela, o
  // recorde gravado pode ter vindo dela de forma legitima -- e nao ha
  // como provar inflacao. A regra prefere manter (nunca destruir
  // conquista real) a corrigir por suposicao.
  it('mantem o recorde quando a primeira sequencia pode explica-lo', () => {
    const c = fixture({
      recorde: 11,
      resets: [RESET_DIA, '2026-08-07T01:30:00.000Z'],
    });
    expect(recomputarRecordeSaneado(c)).toBe(11);
  });

  it('nao mexe em recorde 0', () => {
    expect(recomputarRecordeSaneado(fixture({ recorde: 0 }))).toBe(0);
  });

  it('nao mexe quando ha recorde mas nenhum reset registrado', () => {
    // registrarReset e o unico produtor de recorde > 0 e ele sempre
    // acrescenta um reset. Sem evidencia, nao tocamos.
    const c = fixture({ recorde: 15, resets: [] });
    expect(recomputarRecordeSaneado(c)).toBe(15);
  });

  it('nunca aumenta o recorde gravado', () => {
    // Arquivo com recorde menor que o intervalo recomputado (edicao
    // manual / merge de Syncthing): mantemos o valor do arquivo.
    const c = fixture({
      recorde: 2,
      resets: [RESET_DIA, '2026-08-06T15:00:00.000Z'],
    });
    expect(recomputarRecordeSaneado(c)).toBe(2);
  });

  it('preserva recorde legitimo de contador criado com data retroativa', () => {
    // Primeiro reset fora da janela: nao ha o que descontar, mesmo que
    // o inicio original (retroativo, escolhido no date picker) tenha
    // sido perdido pelo proprio reset.
    const c = fixture({ recorde: 200, resets: [RESET_DIA] });
    expect(recomputarRecordeSaneado(c)).toBe(200);
  });
});

describe('sanearRecordesContadores', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useSessao.setState((s) => ({
      flags: { ...s.flags, recordesContadoresSaneados: false },
    }));
    _resetDeviceIdCache();
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    await SecureStore.setItemAsync(DEVICE_ID_KEY, DEVICE_ID_FIXO);
    mockWriteVaultFile.mockResolvedValue(undefined);
  });

  it('reescreve o recorde inflado preservando o body e a uri', async () => {
    const uri = `${VAULT_ROOT}/markdown/contador-sem-cigarro-${DEVICE_ID_FIXO}.md`;
    mockListVaultFolder.mockResolvedValueOnce([uri]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: fixture({ recorde: 8, resets: [RESET_NOITE] }),
      body: 'Anotação livre do usuário.',
    });

    await sanearRecordesContadores(VAULT_ROOT);

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uriEscrita, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uriEscrita).toBe(uri);
    expect(meta).toMatchObject({ recorde: 7, slug: 'sem-cigarro' });
    expect(body).toBe('Anotação livre do usuário.');
    expect(useSessao.getState().flags.recordesContadoresSaneados).toBe(true);
  });

  it('nao escreve quando nao ha nada a corrigir, mas sobe a flag', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/contador-sem-cigarro-${DEVICE_ID_FIXO}.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: fixture({ recorde: 8, resets: [RESET_DIA] }),
      body: '',
    });

    await sanearRecordesContadores(VAULT_ROOT);

    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    expect(useSessao.getState().flags.recordesContadoresSaneados).toBe(true);
  });

  it('e one-shot: com a flag ja marcada nao le nem escreve nada', async () => {
    useSessao.setState((s) => ({
      flags: { ...s.flags, recordesContadoresSaneados: true },
    }));

    await sanearRecordesContadores(VAULT_ROOT);

    expect(mockListVaultFolder).not.toHaveBeenCalled();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('ignora arquivo de outro device (T2-LOCK-VAULT)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/contador-sem-cigarro-ouro-aaaaaa.md`,
    ]);

    await sanearRecordesContadores(VAULT_ROOT);

    expect(mockReadVaultFile).not.toHaveBeenCalled();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    expect(useSessao.getState().flags.recordesContadoresSaneados).toBe(true);
  });

  it('ignora .md que nao sao de contador', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/humor-2026-07-27-${DEVICE_ID_FIXO}.md`,
    ]);

    await sanearRecordesContadores(VAULT_ROOT);

    expect(mockReadVaultFile).not.toHaveBeenCalled();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('falha de escrita em um arquivo nao impede os demais', async () => {
    const uriA = `${VAULT_ROOT}/markdown/contador-a-${DEVICE_ID_FIXO}.md`;
    const uriB = `${VAULT_ROOT}/markdown/contador-b-${DEVICE_ID_FIXO}.md`;
    mockListVaultFolder.mockResolvedValueOnce([uriA, uriB]);
    mockReadVaultFile.mockImplementation((uri: string) =>
      Promise.resolve({
        meta: fixture({
          slug: uri === uriA ? 'a' : 'b',
          recorde: 8,
          resets: [RESET_NOITE],
        }),
        body: '',
      })
    );
    mockWriteVaultFile
      .mockRejectedValueOnce(new Error('SAF indisponivel'))
      .mockResolvedValueOnce(undefined);

    await sanearRecordesContadores(VAULT_ROOT);

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(2);
    expect(useSessao.getState().flags.recordesContadoresSaneados).toBe(true);
  });

  it('sem vaultRoot e no-op e nao marca a flag', async () => {
    await sanearRecordesContadores('');
    expect(mockListVaultFolder).not.toHaveBeenCalled();
    expect(useSessao.getState().flags.recordesContadoresSaneados).toBe(false);
  });
});
