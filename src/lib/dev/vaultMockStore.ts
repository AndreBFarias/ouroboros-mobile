// V4.0 (INFRA-VAULT-WEB-MOCK, 2026-05-08): store auxiliar do Gauntlet
// (web/dev only) para simular o SAF nativo. Em web,
// StorageAccessFramework.{read,write,readDirectory}AsStringAsync lanca
// UnavailabilityError pois o SAF nao existe no DOM. Antes desta sprint,
// reader.ts/writer.ts engoliam o erro silenciosamente e nenhum arquivo
// .md era escrito em web/dev -- E2Es de save so podiam validar "nao
// crashou", nao conteudo.
//
// Esta store mantem um Map<uri, string> em memoria, intercepatado por
// reader.ts/writer.ts quando Platform.OS === 'web' && __DEV__. Mobile
// real continua usando SAF nativo.
//
// Limpeza determiniscica: aplicarReset() em gauntlet.ts chama limpar()
// para isolar casos E2E. Reload da pagina perde o estado -- por design,
// igual aos outros mocks (frasesMock, galeriaMock, etc).
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';

interface VaultMockState {
  // Mapa uri canonica -> conteudo serializado (.md completo).
  // URIs sao as mesmas que o SAF retornaria em mobile; o mock nao
  // saneia nem normaliza alem do que o caller ja faz.
  arquivos: Map<string, string>;
  // Le conteudo. Retorna undefined se nao existe (caller decide se
  // trata como null como readVaultFile faz).
  getArquivo: (uri: string) => string | undefined;
  // Escreve/sobrescreve conteudo. Idempotente: chamadas repetidas
  // com mesmo uri substituem o conteudo anterior.
  setArquivo: (uri: string, conteudo: string) => void;
  // Lista uris ordenadas alfabeticamente. Determinismo importante
  // para asserts E2E.
  listar: () => string[];
  // Lista uris dentro de uma pasta (prefix match). Equivalente ao
  // readDirectoryAsync do SAF. Filtra por ext quando fornecida.
  listarPasta: (prefixo: string, ext?: string) => string[];
  // Zera o mapa. Chamado por aplicarReset do gauntlet.
  limpar: () => void;
}

export const useVaultMock = create<VaultMockState>((set, get) => ({
  arquivos: new Map(),
  getArquivo: (uri) => get().arquivos.get(uri),
  setArquivo: (uri, conteudo) =>
    set((s) => {
      const novo = new Map(s.arquivos);
      novo.set(uri, conteudo);
      return { arquivos: novo };
    }),
  listar: () => {
    const uris = Array.from(get().arquivos.keys());
    uris.sort();
    return uris;
  },
  listarPasta: (prefixo, ext) => {
    const uris = Array.from(get().arquivos.keys());
    let filtrado = uris.filter((u) => u.startsWith(prefixo));
    if (ext) {
      const norm = ext.startsWith('.') ? ext : `.${ext}`;
      filtrado = filtrado.filter((u) => u.toLowerCase().endsWith(norm.toLowerCase()));
    }
    filtrado.sort();
    return filtrado;
  },
  limpar: () => set({ arquivos: new Map() }),
}));
