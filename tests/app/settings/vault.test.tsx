// Cobertura do render do card de status de sync na sub-tela
// /settings/vault (AUDIT-P2-7-SYNCSTATUS-M15, 2026-09-05). A tela nao
// tinha teste nenhum antes desta sprint.
//
// Mocks definidos ANTES dos imports por causa do hoisting com
// nativewind (armadilha A12), mesmo padrao de
// tests/app/settings/index.test.tsx.
//
// Comentarios sem acento (convencao shell/CI).

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
  Redirect: () => null,
}));

jest.mock('@/lib/vault/permissions', () => ({
  __esModule: true,
  inicializarVaultEscolhido: jest.fn(() => Promise.resolve({ ok: true })),
  requestVaultPermission: jest.fn(() => Promise.resolve(null)),
}));

// So verificarSyncStatus e substituida: descreverDelta continua a real
// para o subtitulo ser o texto que o usuario ve de verdade.
const mockVerificar = jest.fn();
jest.mock('@/lib/services/syncStatus', () => {
  const real = jest.requireActual('@/lib/services/syncStatus');
  return {
    __esModule: true,
    ...real,
    verificarSyncStatus: (uri: string | null) => mockVerificar(uri),
  };
});

import { render, waitFor } from '@testing-library/react-native';
import VaultTela from '@/../app/settings/vault';
import { useVault } from '@/lib/stores/vault';
import { ToastProvider } from '@/components/ui/Toast';

const VAULT = 'content://mock/tree/Ouroboros';

function renderTela() {
  return render(
    <ToastProvider>
      <VaultTela />
    </ToastProvider>
  );
}

describe('/settings/vault — card de status de sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerificar.mockResolvedValue({
      cor: 'desconhecido',
      ultimaModificacao: null,
      conflito: false,
      alvo: '',
    });
  });

  it('sem pasta configurada mostra o card de "sem pasta" e nao chama o servico com URI', async () => {
    useVault.setState({ vaultRoot: null });
    const tree = renderTela();
    const card = await tree.findByLabelText('card status sync sem pasta');
    expect(card).toBeTruthy();
    expect(await tree.findByText('Sem pasta para verificar.')).toBeTruthy();
    // O bloco de path da mesma secao continua com a copy propria dele:
    // as duas frases sao distintas de proposito para nao colidirem em
    // query por texto.
    expect(tree.getByText('Nenhuma pasta configurada.')).toBeTruthy();
    expect(mockVerificar).toHaveBeenCalledWith(null);
  });

  it('cor desconhecida com pasta configurada mostra indisponivel na plataforma', async () => {
    useVault.setState({ vaultRoot: VAULT });
    mockVerificar.mockResolvedValue({
      cor: 'desconhecido',
      ultimaModificacao: null,
      conflito: false,
      alvo: VAULT,
    });
    const tree = renderTela();
    expect(
      await tree.findByText('Sincronização indisponível nesta plataforma.')
    ).toBeTruthy();
    expect(mockVerificar).toHaveBeenCalledWith(VAULT);
  });

  it('verde mostra "Vault atualizado." com o delta descrito', async () => {
    useVault.setState({ vaultRoot: VAULT });
    mockVerificar.mockResolvedValue({
      cor: 'verde',
      ultimaModificacao: new Date(Date.now() - 10 * 60 * 1000),
      conflito: false,
      alvo: VAULT,
    });
    const tree = renderTela();
    expect(await tree.findByText('Vault atualizado.')).toBeTruthy();
    expect(tree.getByText('Atualizado há 10 min.')).toBeTruthy();
    expect(tree.getByLabelText('card status sync verde')).toBeTruthy();
  });

  it('amarelo mostra "Vault pode estar atrasado."', async () => {
    useVault.setState({ vaultRoot: VAULT });
    mockVerificar.mockResolvedValue({
      cor: 'amarelo',
      ultimaModificacao: new Date(Date.now() - 3 * 60 * 60 * 1000),
      conflito: false,
      alvo: VAULT,
    });
    const tree = renderTela();
    expect(await tree.findByText('Vault pode estar atrasado.')).toBeTruthy();
    expect(tree.getByLabelText('card status sync amarelo')).toBeTruthy();
  });

  it('conflito troca o subtitulo pelo aviso de .stversions', async () => {
    useVault.setState({ vaultRoot: VAULT });
    mockVerificar.mockResolvedValue({
      cor: 'vermelho',
      ultimaModificacao: new Date(Date.now() - 60 * 1000),
      conflito: true,
      alvo: VAULT,
    });
    const tree = renderTela();
    expect(await tree.findByText('Vault desatualizado.')).toBeTruthy();
    expect(
      tree.getByText('Há arquivos em .stversions. Verifique o Syncthing.')
    ).toBeTruthy();
  });

  // O nome anterior deste caso prometia cobrir a guarda de cleanup, e nao
  // cobria: o unico assert era toHaveBeenCalledTimes(1), verdadeiro com ou
  // sem a guarda. Apagar as linhas do `ativo` em app/settings/vault.tsx
  // deixava o teste verde -- React 18 nao emite mais warning de setState
  // pos-unmount. Renomeado para o que ele de fato mede.
  it('mostra o estado de verificacao enquanto a promise esta pendente', async () => {
    useVault.setState({ vaultRoot: VAULT });
    let resolver: (v: unknown) => void = () => {};
    mockVerificar.mockReturnValue(
      new Promise((res) => {
        resolver = res;
      })
    );
    const tree = renderTela();
    expect(tree.getByLabelText('card status sync verificando')).toBeTruthy();
    tree.unmount();
    resolver({
      cor: 'verde',
      ultimaModificacao: new Date(),
      conflito: false,
      alvo: VAULT,
    });
    await waitFor(() => expect(mockVerificar).toHaveBeenCalledTimes(1));
  });

  // AUDIT-P2-7: pasta inacessivel nao pode ser confundida com Vault
  // desatualizado -- a acao que resolve e outra, e esta nesta tela.
  it('pasta inacessivel tem card proprio, nao o de desatualizado', async () => {
    useVault.setState({ vaultRoot: VAULT });
    mockVerificar.mockResolvedValue({
      cor: 'vermelho',
      ultimaModificacao: null,
      conflito: false,
      alvo: VAULT,
    });
    const tree = renderTela();
    expect(
      await tree.findByLabelText('card status sync inacessivel')
    ).toBeTruthy();
    expect(tree.queryByText('Vault desatualizado.')).toBeNull();
  });

  it('vermelho COM data continua sendo desatualizado', async () => {
    useVault.setState({ vaultRoot: VAULT });
    const antiga = new Date(Date.now() - 7 * 60 * 60 * 1000);
    mockVerificar.mockResolvedValue({
      cor: 'vermelho',
      ultimaModificacao: antiga,
      conflito: false,
      alvo: VAULT,
    });
    const tree = renderTela();
    expect(
      await tree.findByLabelText('card status sync vermelho')
    ).toBeTruthy();
    expect(tree.queryByLabelText('card status sync inacessivel')).toBeNull();
  });
});
