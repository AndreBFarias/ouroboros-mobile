// Loader cruzado de conquistas (M11.5, R0 lexical). Le duas pastas do Vault:
//   - eventos/      (modo === 'positivo' + midia.length > 0)
//   - inbox/mente/diario/ (modo === 'conquista' + midia.length > 0)
//
// Compat de leitura: schema DiarioEmocionalSchema normaliza
// 'vitoria' (legacy) -> 'conquista' (canonico) via z.preprocess.
// Origem 'diario_vitoria' do contrato ConquistaOrigem mantida estavel.
//
// Decisao A5 do adendo M11.5: nao filtramos arquivos de midia
// orfaos aqui. Leitura otimista do Vault — a UI degrada graciosamente
// (placeholder ImageOff em foto, mensagem em audio). Filtrar no
// loader atrasaria o boot e violaria o principio de leitura otimista.
//
// Schemas validados via readVaultFile<T>; arquivos malformados sao
// descartados silenciosamente (mesma estrategia de listarMarcos).
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { devLog } from '@/lib/util/devLog';
import { MARKDOWN_FOLDER, matchesFeaturePrefix } from '@/lib/vault/paths';
import type {
  Conquista,
  ConquistaOrigem,
  ConquistasLoadResult,
  MidiaCoverTipo,
} from '@/lib/conquistas/types';

function joinUri(root: string, rel: string): string {
  const trimmed = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmed}/${rel}`;
}

// Truncamento simples preservando palavras inteiras quando possivel.
// Frase do diario emocional pode ser longa; cards mostram 2 linhas.
function truncarFrase(texto: string, max: number): string {
  const limpo = texto.trim().replace(/\s+/g, ' ');
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max);
  const espaco = corte.lastIndexOf(' ');
  return espaco > max * 0.5 ? `${corte.slice(0, espaco)}...` : `${corte}...`;
}

function fraseDoEvento(meta: EventoMeta): string {
  const partes: string[] = [];
  if (meta.categoria) partes.push(meta.categoria);
  if (meta.bairro) partes.push(meta.bairro);
  if (meta.lugar) partes.push(meta.lugar);
  if (partes.length === 0) return 'Conquista sem categoria.';
  return truncarFrase(partes.join(' — '), 120);
}

function fraseDoDiario(meta: DiarioEmocionalMeta): string {
  if (!meta.texto || meta.texto.trim().length === 0) {
    return 'Conquista sem descrição.';
  }
  return truncarFrase(meta.texto, 120);
}

function tipoDoCover(tipo: string): MidiaCoverTipo {
  if (
    tipo === 'foto' ||
    tipo === 'youtube' ||
    tipo === 'spotify' ||
    tipo === 'audio'
  ) {
    return tipo;
  }
  // Default seguro: trata como audio (waveform decorativo nao quebra
  // mesmo com path arbitrario).
  return 'audio';
}

function conquistaIdEvento(meta: EventoMeta): string {
  return `evento_positivo:${meta.data}:${meta.autor}`;
}

function conquistaIdDiario(meta: DiarioEmocionalMeta): string {
  return `diario_vitoria:${meta.data}:${meta.autor}`;
}

async function lerEventosPositivos(vaultRoot: string): Promise<Conquista[]> {
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = (await listVaultFolder(folderUri, '.md')).filter(
    (u) => !ehSyncConflict(u)
  );
  const arquivos = todos.filter((u) => matchesFeaturePrefix(u, 'evento-'));

  const out: Conquista[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const lido = await readVaultFile(arquivoUri, EventoSchema);
      if (!lido) continue;
      const meta = lido.meta;
      if (meta.modo !== 'positivo') continue;
      if (meta.midia.length === 0) continue;

      const principal = meta.midia[0];
      out.push({
        id: conquistaIdEvento(meta),
        origem: 'evento_positivo' satisfies ConquistaOrigem,
        data: meta.data,
        autor: meta.autor,
        frase: fraseDoEvento(meta),
        lugar: meta.lugar ?? null,
        intensidade: meta.intensidade,
        bairro: meta.bairro ?? null,
        midiaPrincipal: principal,
        tipoCover: tipoDoCover(principal.tipo),
        midias: meta.midia,
        meta,
      });
    } catch (err) {
      // AUDIT-P2-12: antes era `catch {}` mudo. Um arquivo que falha no
      // schema sumia sem deixar rastro, e a tela mostrava o mesmo empty
      // state de "voce ainda nao tem conquistas" -- o que torna um
      // defeito de leitura indistinguivel do estado normal de quem
      // acabou de instalar. O arquivo continua sendo descartado; o que
      // muda e que agora da para saber qual, e por que.
      devLog('[conquistas] evento descartado', { arquivoUri, err });
    }
  }
  return out;
}

async function lerDiarioConquistas(vaultRoot: string): Promise<Conquista[]> {
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = (await listVaultFolder(folderUri, '.md')).filter(
    (u) => !ehSyncConflict(u)
  );
  const arquivos = todos.filter((u) => matchesFeaturePrefix(u, 'diario-'));

  const out: Conquista[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const lido = await readVaultFile(arquivoUri, DiarioEmocionalSchema);
      if (!lido) continue;
      const meta = lido.meta;
      if (meta.modo !== 'conquista') continue;
      if (meta.midia.length === 0) continue;

      const principal = meta.midia[0];
      out.push({
        id: conquistaIdDiario(meta),
        origem: 'diario_vitoria' satisfies ConquistaOrigem,
        data: meta.data,
        autor: meta.autor,
        frase: fraseDoDiario(meta),
        // Diario emocional nao tem campo lugar/bairro estruturado.
        lugar: null,
        intensidade: meta.intensidade,
        bairro: null,
        midiaPrincipal: principal,
        tipoCover: tipoDoCover(principal.tipo),
        midias: meta.midia,
        meta,
      });
    } catch (err) {
      // AUDIT-P2-12: mesmo motivo do lerEventosPositivos acima.
      devLog('[conquistas] diario descartado', { arquivoUri, err });
    }
  }
  return out;
}

// Funcao publica: le ambas as pastas, unifica e ordena por data desc.
// Retorna tambem totais por origem para diagnostico do empty state.
export async function lerConquistas(
  vaultRoot: string
): Promise<ConquistasLoadResult> {
  if (!vaultRoot || vaultRoot.trim().length === 0) {
    return {
      conquistas: [],
      totaisPorOrigem: { evento_positivo: 0, diario_vitoria: 0 },
    };
  }
  // AUDIT-P2-12 (2026-09-05): aqui havia um early-return para
  // `web://mock-vault/...`, escrito em M28-COLAT-01 porque o mock web
  // "nao tem reader funcional" e a Promise nunca resolveria, prendendo
  // o hook em loading.
  //
  // O reader passou a existir em INFRA-VAULT-WEB-MOCK (V4.0,
  // 2026-05-08): `reader.ts` dispatcha para o `useVaultMock` quando
  // Platform.OS === 'web' && __DEV__, e resolve normalmente. O guard
  // sobreviveu a propria justificativa e virou uma cegueira: o Recap
  // renderizava empty state no Gauntlet com o Vault mock populado, e
  // empty state e indistinguivel de "sem dados". Foi o que deixou a
  // FiltrosBar orfa por dois meses sem ninguem notar (AUDIT-P2-11).
  //
  // Coberto por tests/lib/conquistas/loader-web-mock.test.ts, que roda
  // com Platform.OS forcado para 'web' -- o preset de teste reporta
  // 'ios', entao esse ramo nunca era visitado pela suite.

  const [eventos, diarioConquistas] = await Promise.all([
    lerEventosPositivos(vaultRoot),
    lerDiarioConquistas(vaultRoot),
  ]);

  const todas: Conquista[] = [...eventos, ...diarioConquistas];
  todas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  return {
    conquistas: todas,
    totaisPorOrigem: {
      evento_positivo: eventos.length,
      diario_vitoria: diarioConquistas.length,
    },
  };
}

/**
 * @deprecated Use `lerDiarioConquistas` (R0 lexical). Mantido por 1
 * versao para nao quebrar callers internos que ainda referenciam o
 * nome legado. Sera removido apos validacao live em alpha-12.
 */
export const lerDiarioVitorias = lerDiarioConquistas; // anonimato-allow: substantivo comum (sucesso)
