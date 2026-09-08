// P4 (2026-09-08) — store das credenciais que a pessoa cadastra no
// proprio aparelho.
//
// O que esta suite protege, em ordem de custo se regredir:
//
//  1. Nascer VAZIO. Integracao que exige credencial de terceiro comeca
//     desligada; um default preenchido devolveria o problema que a P4
//     resolveu (credencial do dono distribuida no APK, recusa opaca na
//     allowlist do Google e no teto de 5 contas do Spotify).
//  2. O merge do persist ser o codigo REAL cabeado no store, exercitado
//     como funcao (armadilha A47 -- chave nova hidratando undefined).
//  3. Ausencia se comportar como ausencia: espaco em branco, valor nao
//     string e chave faltando resolvem todos para null, para que
//     "tem credencial?" seja uma pergunta so.
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCredenciais,
  mergeCredenciaisPersistido,
  normalizarClientId,
  pareceClientIdCompleto,
  clientIdDe,
  temCredencial,
  ehSemCredencial,
  SemCredencialError,
  type CredenciaisState,
} from '@/lib/stores/credenciais';

const CLIENT_ID_GOOGLE = '123456-abc.apps.googleusercontent.com';
const CLIENT_ID_SPOTIFY = '0123456789abcdef0123456789abcdef';

beforeEach(() => {
  useCredenciais.setState({ google: null, spotify: null });
});

describe('estado inicial', () => {
  it('nasce sem credencial nenhuma', () => {
    expect(clientIdDe('google')).toBeNull();
    expect(clientIdDe('spotify')).toBeNull();
    expect(temCredencial('google')).toBe(false);
    expect(temCredencial('spotify')).toBe(false);
  });
});

describe('definir e remover', () => {
  it('guarda e devolve o valor cadastrado', () => {
    useCredenciais.getState().definir('google', CLIENT_ID_GOOGLE);
    expect(clientIdDe('google')).toBe(CLIENT_ID_GOOGLE);
    expect(temCredencial('google')).toBe(true);
    // Um provedor nao contamina o outro.
    expect(clientIdDe('spotify')).toBeNull();
  });

  it('apara espaco em volta do que foi colado', () => {
    useCredenciais.getState().definir('spotify', `  ${CLIENT_ID_SPOTIFY}\n`);
    expect(clientIdDe('spotify')).toBe(CLIENT_ID_SPOTIFY);
  });

  it('valor em branco equivale a remover', () => {
    useCredenciais.getState().definir('google', CLIENT_ID_GOOGLE);
    useCredenciais.getState().definir('google', '   ');
    expect(clientIdDe('google')).toBeNull();
  });

  it('remover apaga so o provedor pedido', () => {
    useCredenciais.getState().definir('google', CLIENT_ID_GOOGLE);
    useCredenciais.getState().definir('spotify', CLIENT_ID_SPOTIFY);
    useCredenciais.getState().remover('google');
    expect(clientIdDe('google')).toBeNull();
    expect(clientIdDe('spotify')).toBe(CLIENT_ID_SPOTIFY);
  });
});

describe('normalizarClientId', () => {
  it('trata nao-string e vazio como ausencia', () => {
    expect(normalizarClientId(undefined)).toBeNull();
    expect(normalizarClientId(null)).toBeNull();
    expect(normalizarClientId(42)).toBeNull();
    expect(normalizarClientId({})).toBeNull();
    expect(normalizarClientId('')).toBeNull();
    expect(normalizarClientId('  ')).toBeNull();
  });
});

describe('mergeCredenciaisPersistido (A47)', () => {
  // Exercita a funcao REAL cabeada em `merge` no persist do store, e
  // nao uma replica -- replica passaria verde com o store quebrado.
  const atual = (): CredenciaisState => useCredenciais.getState();

  it('preserva as acoes do store', () => {
    const r = mergeCredenciaisPersistido({ google: CLIENT_ID_GOOGLE }, atual());
    expect(typeof r.definir).toBe('function');
    expect(typeof r.remover).toBe('function');
  });

  it('hidrata chave ausente como null, nunca undefined', () => {
    // Instalacao antiga, gravada antes de existir a chave `spotify`.
    const r = mergeCredenciaisPersistido({ google: CLIENT_ID_GOOGLE }, atual());
    expect(r.google).toBe(CLIENT_ID_GOOGLE);
    expect(r.spotify).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(r, 'spotify')).toBe(true);
  });

  it('devolve o estado atual quando o persistido nao e objeto', () => {
    expect(mergeCredenciaisPersistido(null, atual()).google).toBeNull();
    expect(mergeCredenciaisPersistido('lixo', atual()).google).toBeNull();
  });

  it('normaliza lixo vindo do disco', () => {
    const r = mergeCredenciaisPersistido(
      { google: '   ', spotify: 12345 },
      atual()
    );
    expect(r.google).toBeNull();
    expect(r.spotify).toBeNull();
  });
});

describe('pareceClientIdCompleto', () => {
  it('reconhece o formato do Google', () => {
    expect(pareceClientIdCompleto('google', CLIENT_ID_GOOGLE)).toBe(true);
    expect(pareceClientIdCompleto('google', '123456-abc')).toBe(false);
  });

  it('reconhece o formato do Spotify', () => {
    expect(pareceClientIdCompleto('spotify', CLIENT_ID_SPOTIFY)).toBe(true);
    // Curto demais, e com caractere fora da faixa hexadecimal.
    expect(pareceClientIdCompleto('spotify', 'abc')).toBe(false);
    expect(pareceClientIdCompleto('spotify', 'z'.repeat(32))).toBe(false);
  });

  it('vazio nao parece completo', () => {
    expect(pareceClientIdCompleto('google', '  ')).toBe(false);
  });
});

describe('SemCredencialError', () => {
  it('e reconhecido pelo tipo, nao pelo texto da mensagem', () => {
    // Este e o contrato que substituiu o farejamento de substring
    // 'env.json' nos tres stores de OAuth. Se ehSemCredencial deixar de
    // reconhecer o erro, o ramo honesto da interface vira "erro"
    // generico em silencio, e a pessoa perde a explicacao.
    const e = new SemCredencialError('spotify', 'qualquer frase');
    expect(ehSemCredencial(e)).toBe(true);
    expect(e.servico).toBe('spotify');
    expect(ehSemCredencial(new Error('qualquer frase'))).toBe(false);
    expect(ehSemCredencial('qualquer frase')).toBe(false);
    expect(ehSemCredencial(null)).toBe(false);
  });
});
