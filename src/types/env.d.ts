// R-INFRA-ENV-JSON-TSCONFIG (2026-05-17): declaracao de tipo para
// env.json. O arquivo env.json e' gitignored (contem Google OAuth
// client_id) e nao existe em worktrees fresh / executores isolados /
// CI ate ser linkado manualmente. Esta declaracao expoe apenas o
// SHAPE para o tsc; runtime continua dependendo do arquivo fisico
// (resolveJsonModule do tsconfig base do expo).
//
// Shape espelha o JSON OAuth do Google Cloud Console (tipo "Android"
// e fallback "installed" para env.json exportados em versoes
// anteriores -- vide A21 e Q0 da Onda Q).
//
// Comentarios sem acento (convencao shell/CI).

declare module '*/env.json' {
  interface OAuthClient {
    client_id?: string;
    project_id?: string;
    auth_uri?: string;
    token_uri?: string;
    auth_provider_x509_cert_url?: string;
  }

  interface EnvJson {
    android?: OAuthClient;
    installed?: OAuthClient;
  }

  const env: EnvJson;
  export default env;
}
