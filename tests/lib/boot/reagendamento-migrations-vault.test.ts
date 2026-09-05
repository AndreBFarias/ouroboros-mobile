// AUDIT-P1-9 -- prova de EXECUCAO dos hooks de boot que migram o Vault.
//
// Antes desta sprint isto era impossivel: os wrappers usam `await
// import()` lazy, babel-preset-expo o preservava verbatim, o VM CJS do
// Jest o rejeitava, e reagendarTodosBootHooks engolia a excecao. Qualquer
// mock de modulo registrava zero chamadas, e a suite passava verde tanto
// com o hook plugado quanto sem ele. babel-plugin-dynamic-import-node em
// env.test (babel.config.js) fechou esse buraco -- ver o canario em
// tests/lib/boot/dynamic-import-canario.test.ts.
//
// O que se prova aqui, para cada uma das tres migrations que reorganizam
// o Vault do usuario: que o hook chama a funcao certa, com o vaultRoot
// corrente, e que sem vaultRoot ele e' no-op.
//
// Estrategia: isolar UM hook por vez no array BOOT_HOOKS e rodar o
// orquestrador. Rodar a fila inteira dispararia os outros 15 hooks e
// seus efeitos colaterais.
//
// Comentarios sem acento.
import { BOOT_HOOKS, reagendarTodosBootHooks } from '@/lib/boot/reagendamento';
import { useVault } from '@/lib/stores/vault';

jest.mock('@/lib/vault/midiaCompanion', () => ({
  ...jest.requireActual('@/lib/vault/midiaCompanion'),
  migrarAssetsLegacyParaMedia: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/boot/migrarVaultLayoutPorTipo', () => ({
  ...jest.requireActual('@/lib/boot/migrarVaultLayoutPorTipo'),
  migrarVaultLayoutPorTipo: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/boot/migrarArquivosCanonicosParaDeviceId', () => ({
  ...jest.requireActual('@/lib/boot/migrarArquivosCanonicosParaDeviceId'),
  migrarArquivosCanonicosParaDeviceId: jest.fn().mockResolvedValue(undefined),
}));

import { migrarAssetsLegacyParaMedia } from '@/lib/vault/midiaCompanion';
import { migrarVaultLayoutPorTipo } from '@/lib/boot/migrarVaultLayoutPorTipo';
import { migrarArquivosCanonicosParaDeviceId } from '@/lib/boot/migrarArquivosCanonicosParaDeviceId';

const ORIGINAL = [...BOOT_HOOKS];
const RAIZ = 'content://com.android.externalstorage/tree/primary%3AOuroboros';

// Roda somente o hook de nome `nome`, preservando o array original.
async function rodarSomente(nome: string): Promise<void> {
  const alvo = ORIGINAL.find((h) => h.name === nome);
  if (!alvo) throw new Error(`hook "${nome}" nao esta em BOOT_HOOKS`);
  BOOT_HOOKS.length = 0;
  BOOT_HOOKS.push(alvo);
  await reagendarTodosBootHooks();
}

describe('BOOT_HOOKS: execucao das migrations de Vault', () => {
  afterEach(() => {
    BOOT_HOOKS.length = 0;
    BOOT_HOOKS.push(...ORIGINAL);
    jest.clearAllMocks();
    useVault.setState({ vaultRoot: null });
  });

  describe.each([
    ['migrarAssetsHook', migrarAssetsLegacyParaMedia, 'assets -> media (M39)'],
    [
      'migrarLayoutVaultHook',
      migrarVaultLayoutPorTipo,
      'layout-por-tipo (H2/ADR-0023)',
    ],
    [
      'migrarT2DeviceIdSuffixHook',
      migrarArquivosCanonicosParaDeviceId,
      'sufixo -<deviceId>.md (AUDIT-T2)',
    ],
  ])('%s — %s', (nomeHook, alvo) => {
    it('chama a migration com o vaultRoot corrente', async () => {
      useVault.setState({ vaultRoot: RAIZ });
      await rodarSomente(nomeHook as string);
      expect(alvo).toHaveBeenCalledTimes(1);
      expect(alvo).toHaveBeenCalledWith(RAIZ);
    });

    it('sem vaultRoot e no-op', async () => {
      useVault.setState({ vaultRoot: null });
      await rodarSomente(nomeHook as string);
      expect(alvo).not.toHaveBeenCalled();
    });
  });

  it('o hook desregistrado nao roda (a suite fica vermelha se alguem remover o push)', async () => {
    // Guarda explicito do que a spec pede verificar a mao: se o
    // BOOT_HOOKS.push some, rodarSomente lanca por nao achar o hook, e
    // os casos acima falham. Este caso documenta o mecanismo.
    useVault.setState({ vaultRoot: RAIZ });
    await expect(rodarSomente('hookQueNaoExiste')).rejects.toThrow(
      'nao esta em BOOT_HOOKS'
    );
  });
});
