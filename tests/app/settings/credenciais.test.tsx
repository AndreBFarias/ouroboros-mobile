// P4 (2026-09-08) — tela /settings/credenciais.
//
// O TEXTO desta tela importa mais que o codigo dela, e por isso metade
// desta suite mede texto. A tela existe porque, ate agora, quem
// instalava o APK fora da allowlist do dono via tres itens do menu
// falharem sem explicacao. Trocar aquela recusa opaca por uma tela que
// culpa a pessoa ("configuracao invalida", "erro de credencial") teria
// piorado o problema, nao resolvido.
//
// Mocks antes dos imports por causa do hoisting com nativewind (A12),
// mesmo padrao de tests/app/settings/vault.test.tsx.
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

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CredenciaisTela from '@/../app/settings/credenciais';
import { ToastProvider } from '@/components/ui/Toast';
import { useCredenciais } from '@/lib/stores/credenciais';

const CLIENT_ID_GOOGLE = '123456-abc.apps.googleusercontent.com';

function renderTela() {
  return render(
    <ToastProvider>
      <CredenciaisTela />
    </ToastProvider>
  );
}

beforeEach(() => {
  useCredenciais.setState({ google: null, spotify: null });
});

describe('/settings/credenciais — cadastro', () => {
  it('mostra os dois blocos, ambos sem codigo guardado', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('bloco credencial google')).toBeTruthy();
    expect(getByLabelText('bloco credencial spotify')).toBeTruthy();
    expect(getByLabelText('estado credencial google ausente')).toBeTruthy();
    expect(getByLabelText('estado credencial spotify ausente')).toBeTruthy();
  });

  it('guardar grava no store e o estado da linha muda', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(
      getByLabelText('campo credencial google'),
      CLIENT_ID_GOOGLE
    );
    fireEvent.press(getByLabelText('guardar credencial google'));

    expect(useCredenciais.getState().google).toBe(CLIENT_ID_GOOGLE);
    await waitFor(() => {
      expect(getByLabelText('estado credencial google salva')).toBeTruthy();
    });
  });

  it('apagar so aparece quando ha codigo guardado, e remove de fato', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    // Sem codigo, nao ha o que apagar: o botao nem existe.
    expect(queryByLabelText('apagar credencial spotify')).toBeNull();

    fireEvent.changeText(
      getByLabelText('campo credencial spotify'),
      '0123456789abcdef0123456789abcdef'
    );
    fireEvent.press(getByLabelText('guardar credencial spotify'));

    await waitFor(() => {
      expect(getByLabelText('apagar credencial spotify')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('apagar credencial spotify'));
    expect(useCredenciais.getState().spotify).toBeNull();
  });

  it('um provedor nao mexe no outro', () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(
      getByLabelText('campo credencial google'),
      CLIENT_ID_GOOGLE
    );
    fireEvent.press(getByLabelText('guardar credencial google'));
    expect(useCredenciais.getState().spotify).toBeNull();
  });

  it('avisa sobre formato incompleto sem impedir o salvamento', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    // Ainda sem texto: nao ha o que conferir, o aviso nao aparece.
    expect(queryByLabelText('aviso forma credencial google')).toBeNull();

    fireEvent.changeText(getByLabelText('campo credencial google'), '123456');
    await waitFor(() => {
      expect(getByLabelText('aviso forma credencial google')).toBeTruthy();
    });

    // O aviso e' conferencia, nao bloqueio: quem quiser salva assim.
    fireEvent.press(getByLabelText('guardar credencial google'));
    expect(useCredenciais.getState().google).toBe('123456');
  });

  it('o aviso some quando o codigo tem a forma esperada', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo credencial google'), '123456');
    await waitFor(() => {
      expect(getByLabelText('aviso forma credencial google')).toBeTruthy();
    });
    fireEvent.changeText(
      getByLabelText('campo credencial google'),
      CLIENT_ID_GOOGLE
    );
    await waitFor(() => {
      expect(queryByLabelText('aviso forma credencial google')).toBeNull();
    });
  });
});

describe('/settings/credenciais — tom do texto', () => {
  // Regra de tom do projeto (ADR-0005) e a instrucao explicita da P4:
  // nada de "erro", "falha" ou "nao configurado" em tom de defeito, e
  // zero exclamacao. A ausencia de credencial e' uma escolha que a
  // pessoa ainda nao fez.
  it('nao usa vocabulario de defeito nem exclamacao', () => {
    const { queryByText } = renderTela();
    const proibidos: RegExp[] = [
      /\berro\b/i,
      /\bfalha\b/i,
      /\bfalhou\b/i,
      /\binválid/i,
      /não configurad/i,
      /!/,
      /parabéns/i,
    ];
    for (const padrao of proibidos) {
      expect(queryByText(padrao)).toBeNull();
    }
  });

  it('diz que o restante do aplicativo funciona sem codigo nenhum', () => {
    // Esta e a frase que impede a tela de assustar: sem ela, a pessoa
    // conclui que precisa de cadastro para usar o que ja e' dela.
    const { getByText } = renderTela();
    expect(
      getByText(/o restante do aplicativo continua inteiro/i)
    ).toBeTruthy();
    expect(getByText(/Nada disso\s+depende de código nenhum/i)).toBeTruthy();
  });

  it('aponta os dois passo a passo que ja existem no repositorio', () => {
    const { getByText } = renderTela();
    expect(getByText(/docs\/OAUTH-SETUP\.md/)).toBeTruthy();
    expect(getByText(/docs\/SETUP-SPOTIFY\.md/)).toBeTruthy();
  });

  it('avisa que o Client Secret do Spotify nao e usado aqui', () => {
    // Guardar secret em aplicativo distribuido seria expo-lo; o fluxo e
    // PKCE e nao tem onde recebe-lo. Dizer isso na tela evita que a
    // pessoa cole o campo errado por analogia.
    const { getByText } = renderTela();
    expect(getByText(/Client Secret/)).toBeTruthy();
    expect(getByText(/não é usado aqui/)).toBeTruthy();
  });

  it('diz onde o codigo fica guardado', () => {
    const { getByText } = renderTela();
    expect(getByText(/fica neste aparelho/i)).toBeTruthy();
  });
});
