// Cobre o wrap defensivo pickClientIdSafe (B2 da sprint AUDIT-T1-BUGS).
// Cenarios:
//  - credencial cadastrada: devolve ClientIdInfo (clientId + redirectUri
//    + ambiente)
//  - sem credencial: devolve { erro: '<mensagem>' }
//  - credencial em branco: devolve { erro }
//
// P4 (2026-09-08): a fonte do client_id deixou de ser o import estatico
// de env.json e passou a ser o store de credenciais (SecureStore),
// alimentado pela tela /settings/credenciais. Duas consequencias para
// este arquivo:
//
//  1. Nao ha mais o que mockar: o teste semeia o store, que e' o mesmo
//     caminho que a pessoa exercita ao colar o codigo na tela. Some com
//     ele o risco de cache contamination via jest.doMock + symlink que
//     o cabecalho anterior descrevia (armadilhas A39 e A43).
//  2. O caso "fallback legado installed.client_id" foi removido junto
//     com o shape de env.json que o justificava. Nao ha fallback: ou a
//     pessoa cadastrou a credencial neste aparelho, ou nao ha
//     credencial.
//
// Comentarios sem acento (convencao shell/CI).
import { useCredenciais } from '@/lib/stores/credenciais';
import { pickClientIdSafe } from '@/lib/services/googleAuthFlow';

describe('pickClientIdSafe', () => {
  beforeEach(() => {
    useCredenciais.setState({ google: null, spotify: null });
  });

  it('devolve ClientIdInfo quando ha credencial cadastrada', () => {
    useCredenciais
      .getState()
      .definir('google', '1234567890-abcdef.apps.googleusercontent.com');
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(false);
    if (!('erro' in r)) {
      expect(r.clientId).toBe('1234567890-abcdef.apps.googleusercontent.com');
      expect(typeof r.redirectUri).toBe('string');
    }
  });

  it('devolve { erro } quando nao ha credencial neste aparelho', () => {
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(true);
    if ('erro' in r) {
      expect(r.erro).toMatch(/credencial do Google/);
    }
  });

  it('devolve { erro } quando a credencial e string vazia', () => {
    // Campo apagado e confirmado equivale a remover: a store normaliza
    // para null, e o resultado precisa ser o mesmo da ausencia.
    useCredenciais.getState().definir('google', '   ');
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(true);
  });

  it('a mensagem de ausencia nao trata a escolha pendente como defeito', () => {
    // Regra de tom (ADR-0005 e decisao P4): a frase que pode chegar a
    // interface descreve o que falta e onde resolver. Nao usa "erro",
    // "falha" nem exclamacao, porque nao ha defeito -- ha uma escolha
    // que a pessoa ainda nao fez.
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(true);
    if ('erro' in r) {
      expect(r.erro).not.toMatch(/\bfalha|\bfalhou|\berro\b/i);
      expect(r.erro).not.toContain('!');
      expect(r.erro).toMatch(/Credenciais próprias/);
    }
  });
});
