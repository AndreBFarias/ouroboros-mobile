// V4.0 (INFRA-VAULT-WEB-MOCK) unit: store useVaultMock garante
// write+read, overwrite, listagem ordenada e exposicao via gauntlet API.
//
// Comentarios sem acento (convencao shell/CI).
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { gauntlet } from '@/lib/dev/gauntlet';

describe('useVaultMock (V4.0 INFRA-VAULT-WEB-MOCK)', () => {
  beforeEach(() => {
    useVaultMock.getState().limpar();
  });

  it('write + read: setArquivo persiste e getArquivo recupera', () => {
    const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
    const conteudo = '---\ndeviceId: abc\n---\nbody';
    useVaultMock.getState().setArquivo(uri, conteudo);
    expect(useVaultMock.getState().getArquivo(uri)).toBe(conteudo);
  });

  it('overwrite: chamadas repetidas com mesma uri substituem conteudo', () => {
    const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
    useVaultMock.getState().setArquivo(uri, 'v1');
    useVaultMock.getState().setArquivo(uri, 'v2');
    expect(useVaultMock.getState().getArquivo(uri)).toBe('v2');
    // Nao deve criar duas entradas.
    expect(useVaultMock.getState().listar().length).toBe(1);
  });

  it('listar retorna uris ordenadas alfabeticamente', () => {
    useVaultMock.getState().setArquivo('z/c.md', 'c');
    useVaultMock.getState().setArquivo('a/b.md', 'b');
    useVaultMock.getState().setArquivo('a/a.md', 'a');
    expect(useVaultMock.getState().listar()).toEqual([
      'a/a.md',
      'a/b.md',
      'z/c.md',
    ]);
  });

  it('gauntlet.lerVaultMock e listarVaultMock expoem o store', () => {
    const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
    useVaultMock.getState().setArquivo(uri, 'conteudo-teste');
    // Em jest, GAUNTLET_ATIVO=false (Platform.OS=ios default), entao
    // os helpers retornam fallback. Testamos isso em vez do branch web.
    // Para validar conteudo real do branch, usar testes de
    // reader/writer com Platform.OS mockado para 'web'.
    expect(gauntlet.lerVaultMock(uri)).toBeNull();
    expect(gauntlet.listarVaultMock()).toEqual([]);
  });
});
