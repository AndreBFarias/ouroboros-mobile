// Constantes globais do app. URL do repositorio e licenca vem de
// app.json (expo.extra) para nao hardcodar identificadores no codigo
// fonte de src/. Wrapper aqui resolve via Constants.expoConfig.extra
// e cai em fallback generico se a config nao estiver presente
// (ambiente de teste sem expo runtime). Versao e lida pela tela 23
// diretamente via Constants.expoConfig.version.
import Constants from 'expo-constants';

interface ExtraConfig {
  repoUrl?: string;
  license?: string;
}

const extra =
  ((Constants.expoConfig?.extra as ExtraConfig | undefined) ?? {}) as ExtraConfig;

// URL do repositorio. Se ausente, devolve string vazia para evitar
// abrir Linking com URL invalida.
export const APP_REPO_URL = extra.repoUrl ?? '';

// Licenca canonica do projeto. Default GPL-3.0 (concordancia com
// docs/CONTEXTO.md secao 1).
export const APP_LICENSE = extra.license ?? 'GPL-3.0';

// Texto curto do botao "Ver no GitHub". Sentence case PT-BR.
export const APP_GITHUB_LABEL = 'Ver no GitHub';
