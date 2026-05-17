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
// R-INFRA-GAUNTLET-AGENDA-MOCK (2026-05-17): setEventos popula
// markdown/agenda-<pessoa>-YYYY-MM-DD-<id>.md em massa para que
// listarEventosAgenda devolva eventos sem precisar de OAuth sync real.
// Usado pelo E2E playwright R-HOME-2 para validar mescla agenda+alarmes.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import type { AgendaEvento } from '@/lib/vault/agenda';
import { agendaEventoPath, vaultUriJoin } from '@/lib/vault/paths';
import { stringifyFrontmatter } from '@/lib/vault/frontmatter';

// Sanitizacao identica ao salvarEventoAgenda em src/lib/vault/agenda.ts.
// Mantida local para nao criar dependencia circular vault/dev.
function sanitizarEventoId(id: string): string {
  return id.replace(/[/\\:*?"<>|.]+/g, '_');
}

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
  // R-INFRA-GAUNTLET-AGENDA-MOCK: popula eventos da agenda de uma
  // pessoa escrevendo cada um como .md em markdown/. Path canonico
  // identico ao salvarEventoAgenda mobile: agenda-<pessoa>-ymd-<id>.md.
  // Sobrescreve qualquer evento existente com mesmo id+inicio. Os
  // eventos passados sao validados contra AgendaEventoSchema pelo
  // caller (gauntlet API). Reset zera todos via limpar().
  setEventos: (
    vaultRoot: string,
    pessoa: 'pessoa_a' | 'pessoa_b',
    eventos: AgendaEvento[]
  ) => void;
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
      filtrado = filtrado.filter((u) =>
        u.toLowerCase().endsWith(norm.toLowerCase())
      );
    }
    filtrado.sort();
    return filtrado;
  },
  setEventos: (vaultRoot, pessoa, eventos) =>
    set((s) => {
      // Defesa: pessoa deve casar com cada evento. Se nao casar,
      // o filtro de listarEventosAgenda (matchesFeaturePrefix
      // 'agenda-<pessoa>-') exclui silenciosamente, entao registrar
      // como warn ajuda diagnostico em E2E. Em produo este store
      // nem existe (dead-code em release).
      const novo = new Map(s.arquivos);
      for (const ev of eventos) {
        if (ev.pessoa !== pessoa) {
          // Pessoa do evento difere do parametro. Persistimos com a
          // pessoa do evento (autoritaria) para que listarEventosAgenda
          // o encontre. Warning apenas em modo dev.
          if (typeof console !== 'undefined') {
            console.warn(
              `[useVaultMock.setEventos] evento ${ev.id} tem pessoa=${ev.pessoa} mas chamada pediu ${pessoa}; persistindo com pessoa do evento`
            );
          }
        }
        const idSeguro = sanitizarEventoId(ev.id);
        const rel = agendaEventoPath(ev.pessoa, ev.inicio, idSeguro);
        const uri = vaultUriJoin(vaultRoot, rel);
        const raw = stringifyFrontmatter(ev, '');
        novo.set(uri, raw);
      }
      return { arquivos: novo };
    }),
  limpar: () => set({ arquivos: new Map() }),
}));
