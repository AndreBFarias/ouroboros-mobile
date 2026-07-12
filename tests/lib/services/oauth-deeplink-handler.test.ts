// R-CRIT-1 (2026-05-15): tests do contrato entre o redirectUri
// calculado por pickClientId() e a rota declarativa registrada
// em app/oauthredirect.tsx.
//
// Sintoma da regressao: o redirectUri tem path `/oauthredirect`
// (parte depois do `:`), mas nao havia `app/oauthredirect.tsx`,
// entao o expo-router caia em "Unmatched Route".
//
// Este test verifica o invariante:
// - O path do redirectUri SEMPRE e' "/oauthredirect".
// - Existe um arquivo `app/oauthredirect.tsx` no workspace para
//   handler declarativo (verificacao filesystem-level).
//
// Sem isso, qualquer mudanca futura que renomeie o redirect path
// (ex: "oauth-callback") sem renomear o arquivo correspondente
// retorna o bug original.
import { pickClientId } from '@/lib/services/googleAuthFlow';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
}));

jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'mock://callback'),
}));

// env.json mockado com client_id realistico para os tests de
// shape do redirectUri (reverso-DNS terminando em /oauthredirect).
jest.mock('../../../env.json', () => ({
  __esModule: true,
  default: {
    android: {
      client_id: '691237256846-tl2edd8uvb6bbn6men478c0agq7ea91p.apps.googleusercontent.com',
    },
  },
  android: {
    client_id: '691237256846-tl2edd8uvb6bbn6men478c0agq7ea91p.apps.googleusercontent.com',
  },
}), { virtual: true });

describe('OAuth deep link handler contract (R-CRIT-1)', () => {
  it('redirectUri termina em ":/oauthredirect" (path canonico)', () => {
    const info = pickClientId();
    // O redirectUri sempre tem path /oauthredirect; mudar exige
    // tambem renomear/atualizar app/oauthredirect.tsx.
    expect(info.redirectUri).toMatch(/:\/oauthredirect$/);
  });

  it('redirectUri usa scheme reverso-DNS com o client_id', () => {
    const info = pickClientId();
    expect(info.redirectUri).toMatch(/^com\.googleusercontent\.apps\./);
  });

  it('redirectUri NAO usa scheme ouroboros (path-only para reverso-DNS)', () => {
    // O scheme `ouroboros://` e' reservado para share intent e
    // navegacao interna; o callback OAuth canonico Q22.B usa o
    // reverso-DNS do clientId. Se essa premissa quebrar, oauth
    // volta a falhar (Q22.B documenta isso).
    const info = pickClientId();
    expect(info.redirectUri).not.toMatch(/^ouroboros:\/\//);
  });

  it('existe handler declarativo em app/oauthredirect.tsx', () => {
    // Arquivo precisa existir para que o expo-router NAO caia em
    // +not-found quando o Custom Tab redireciona de volta.
    const handlerPath = path.resolve(
      __dirname,
      '../../../app/oauthredirect.tsx'
    );
    expect(fs.existsSync(handlerPath)).toBe(true);
  });

  it('existe fallback declarativo em app/+not-found.tsx', () => {
    // Garantia de sub-sprint R-CRIT-1.a: qualquer deep link nao
    // reconhecido cai num handler sobrio (que NAO imprime URL).
    const notFoundPath = path.resolve(
      __dirname,
      '../../../app/+not-found.tsx'
    );
    expect(fs.existsSync(notFoundPath)).toBe(true);
  });

  it('app/+not-found.tsx NAO importa useLocalSearchParams nem usePathname', () => {
    // Defensive: se algum dev futuro tentar exibir a URL na tela
    // de erro, este test quebra. A leitura de query string vazaria
    // o `code` OAuth de novo.
    //
    // Verifica imports reais (nao comentarios) via match de
    // declaracao `import { ... } from 'expo-router'`. Comentarios
    // que mencionam os identificadores ficam livres.
    const notFoundPath = path.resolve(
      __dirname,
      '../../../app/+not-found.tsx'
    );
    const contents = fs.readFileSync(notFoundPath, 'utf-8');
    // Pega cada import line e checa se algum traz os hooks
    // proibidos no escopo do componente.
    const importLines = contents
      .split('\n')
      .filter((linha) => /^\s*import\b/.test(linha));
    const importsCombinados = importLines.join('\n');
    expect(importsCombinados).not.toMatch(/\buseLocalSearchParams\b/);
    expect(importsCombinados).not.toMatch(/\busePathname\b/);
  });
});
