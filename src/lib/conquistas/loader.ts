// Loader cruzado de conquistas (M11.5). Le duas pastas do Vault:
//   - eventos/      (modo === 'positivo' + midia.length > 0)
//   - inbox/mente/diario/ (modo === 'vitoria' + midia.length > 0)
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
import { VAULT_FOLDERS } from '@/lib/vault/paths';
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
    return 'Vitória sem descrição.'; // anonimato-allow: substantivo comum sucesso/conquista
  }
  return truncarFrase(meta.texto, 120);
}

function tipoDoCover(tipo: string): MidiaCoverTipo {
  if (tipo === 'foto' || tipo === 'youtube' || tipo === 'spotify' || tipo === 'audio') {
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

async function lerEventosPositivos(
  vaultRoot: string
): Promise<Conquista[]> {
  const folderUri = joinUri(vaultRoot, VAULT_FOLDERS.eventos);
  const arquivos = await listVaultFolder(folderUri, '.md');

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
    } catch {
      // Arquivo malformado — descarta silenciosamente.
    }
  }
  return out;
}

async function lerDiarioVitorias( // anonimato-allow: substantivo comum sucesso/conquista
  vaultRoot: string
): Promise<Conquista[]> {
  const folderUri = joinUri(vaultRoot, VAULT_FOLDERS.inboxMenteDiario);
  const arquivos = await listVaultFolder(folderUri, '.md');

  const out: Conquista[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const lido = await readVaultFile(arquivoUri, DiarioEmocionalSchema);
      if (!lido) continue;
      const meta = lido.meta;
      if (meta.modo !== 'vitoria') continue;
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
    } catch {
      // Arquivo malformado — descarta silenciosamente.
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

  const [eventos, vitorias] = await Promise.all([
    lerEventosPositivos(vaultRoot),
    lerDiarioVitorias(vaultRoot), // anonimato-allow: substantivo comum
  ]);

  const todas: Conquista[] = [...eventos, ...vitorias];
  todas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  return {
    conquistas: todas,
    totaisPorOrigem: {
      evento_positivo: eventos.length,
      diario_vitoria: vitorias.length,
    },
  };
}
