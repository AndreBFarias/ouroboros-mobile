// Q9 (Onda Q): galeria unificada / Vault Explorer. Lista TODOS os
// registros .md de markdown/ agrupando por prefixo canonico de feature
// (humor-, diario-, evento-, marco-, foto-, audio-, video-, frase-,
// tarefa-, alarme-, contador-, nota-, ciclo-, exercicio-, scanner-).
//
// Performance: nao carrega binarios. Le apenas o frontmatter de cada
// .md companion / registro para extrair data, slug, autor e titulo
// curto. Arquivo malformado ou que falha schema e' silenciosamente
// ignorado (mesmo padrao de listarRegistrosCiclo §122).
//
// Convencoes:
//  - Ordenacao desc por data (mais recente primeiro), depois slug asc
//    como tie-break deterministico.
//  - Filtros opcionais: tipo (canonico unico ou 'tudo'), mes (YYYY-MM).
//  - Path do .md vai como `uri` do ItemGaleria (string completa,
//    pronta para readVaultFile no detalhe).
//
// Comentarios sem acento (convencao shell/CI).
import {
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { HumorSchema } from '@/lib/schemas/humor';
import { DiarioEmocionalSchema } from '@/lib/schemas/diario_emocional';
import { EventoSchema } from '@/lib/schemas/evento';
import { MarcoSchema } from '@/lib/schemas/marco';
import { MidiaCompanionSchema } from '@/lib/schemas/midia-companion';
import { TarefaSchema } from '@/lib/schemas/tarefa';
import { AlarmeSchema } from '@/lib/schemas/alarme';
import { ContadorSchema } from '@/lib/schemas/contador';
import { CicloMenstrualSchema } from '@/lib/schemas/ciclo_menstrual';
import { ExercicioSchema } from '@/lib/schemas/exercicio';
import { FinanceiroNotaSchema } from '@/lib/schemas/financeiro_nota';
import { z } from 'zod';

// Schema-mae permissivo (passthrough) usado para tipos sem schema
// dedicado importavel; nao falha em campos extras.
const GenericoSchema = z.object({}).passthrough();

// Tipos canonicos suportados pela galeria. Espelha 1:1 a lista de
// prefixos de feature em paths.ts. Aceita 'tudo' como filtro.
export type TipoGaleria =
  | 'humor'
  | 'diario'
  | 'evento'
  | 'marco'
  | 'foto'
  | 'audio'
  | 'video'
  | 'frase'
  | 'tarefa'
  | 'alarme'
  | 'contador'
  | 'nota'
  | 'ciclo'
  | 'exercicio'
  | 'scanner';

export type FiltroTipoGaleria = TipoGaleria | 'tudo';

export interface ItemGaleria {
  tipo: TipoGaleria;
  // YYYY-MM-DD da entrada. Sempre presente: derivado do frontmatter
  // (data) ou inferido do filename quando o frontmatter nao trouxer
  // (ex: humor-2026-05-06.md => 2026-05-06).
  data: string;
  // Slug livre (kebab-case ASCII) ou null para tipos sem slug
  // (humor diario, ciclo, medidas).
  slug: string | null;
  // URI absoluta do .md (pronto para readVaultFile no detalhe).
  uri: string;
  // Titulo curto exibido no card. Heuristica por tipo (descricao,
  // titulo, legenda, slug humanizado, data).
  titulo: string;
  // Linha secundaria opcional (autor, lugar, categoria).
  subtitulo?: string;
}

export interface FiltrosGaleria {
  tipo?: FiltroTipoGaleria;
  // 'YYYY-MM' para filtrar por mes calendar; null = sem filtro.
  mes?: string | null;
}

// Tabela de prefixos por tipo. Ordem importa apenas em logging.
const PREFIX_POR_TIPO: Record<TipoGaleria, string> = {
  humor: 'humor-',
  diario: 'diario-',
  evento: 'evento-',
  marco: 'marco-',
  foto: 'foto-',
  audio: 'audio-',
  video: 'video-',
  frase: 'frase-',
  tarefa: 'tarefa-',
  alarme: 'alarme-',
  contador: 'contador-',
  nota: 'nota-',
  ciclo: 'ciclo-',
  exercicio: 'exercicio-',
  scanner: 'scanner-',
};

// Tabela inversa: dado o filename, descobre o tipo canonico. Itera
// na ordem de PREFIX_POR_TIPO ate achar match. Retorna null para
// arquivos fora do padrao (ex: _devices.md, agenda-..., medidas-...).
function inferirTipoDoFilename(uri: string): TipoGaleria | null {
  for (const tipo of Object.keys(PREFIX_POR_TIPO) as TipoGaleria[]) {
    if (matchesFeaturePrefix(uri, PREFIX_POR_TIPO[tipo])) {
      return tipo;
    }
  }
  return null;
}

// Schema canonico por tipo. Tipos sem schema dedicado caem no
// GenericoSchema permissivo. Tipos 'foto'/'audio'/'video'/'frase'/
// 'scanner' usam MidiaCompanionSchema (companion .md unificado).
function schemaPorTipo(tipo: TipoGaleria): z.ZodTypeAny {
  switch (tipo) {
    case 'humor':
      return HumorSchema;
    case 'diario':
      return DiarioEmocionalSchema;
    case 'evento':
      return EventoSchema;
    case 'marco':
      return MarcoSchema;
    case 'foto':
    case 'audio':
    case 'video':
    case 'frase':
    case 'scanner':
      return MidiaCompanionSchema;
    case 'tarefa':
      return TarefaSchema;
    case 'alarme':
      return AlarmeSchema;
    case 'contador':
      return ContadorSchema;
    case 'ciclo':
      return CicloMenstrualSchema;
    case 'exercicio':
      return ExercicioSchema;
    case 'nota':
      return FinanceiroNotaSchema;
  }
}

// Extrai YYYY-MM-DD do filename via regex. Tolera prefixo + hora +
// slug. Retorna null quando nao bate.
function extrairDataDoFilename(uri: string): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(uri);
    } catch {
      return uri;
    }
  })();
  const m = decoded.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// Extrai slug heuristicamente do filename apos o prefixo e a data.
// Ex: diario-2026-05-04-1430-momento-feliz.md => 'momento-feliz'.
// Retorna null quando filename so tem prefixo + data (humor-..,
// ciclo-..) ou nao bate a estrutura esperada.
function extrairSlugDoFilename(uri: string, tipo: TipoGaleria): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(uri);
    } catch {
      return uri;
    }
  })();
  const base = (decoded.split('/').pop() ?? decoded).replace(/\.md$/i, '');
  const prefix = PREFIX_POR_TIPO[tipo];
  if (!base.startsWith(prefix)) return null;
  const resto = base.slice(prefix.length);
  // Estrutura tipica: YYYY-MM-DD(-HHmm(ss)?)?(-slug)?
  // Remove data inicial e qualquer bloco numerico de hora subsequente.
  const semData = resto.replace(/^\d{4}-\d{2}-\d{2}/, '');
  const semHora = semData.replace(/^-\d{4}(\d{2})?/, '');
  const slug = semHora.replace(/^-/, '').trim();
  if (slug.length === 0) return null;
  return slug;
}

// Humaniza slug kebab-case para titulo legivel. 'momento-feliz' =>
// 'Momento feliz'. Usado quando frontmatter nao traz titulo.
function humanizarSlug(slug: string): string {
  const limpo = slug.replace(/-/g, ' ').trim();
  if (limpo.length === 0) return slug;
  return limpo[0].toUpperCase() + limpo.slice(1);
}

// Deriva titulo curto a partir do meta lido (tolerante a shape
// variavel - usamos any/passthrough). Cai em fallback humanizado
// do slug, depois na data crua.
function tituloDoMeta(
  meta: Record<string, unknown> | null,
  slug: string | null,
  data: string,
  tipo: TipoGaleria
): string {
  if (meta) {
    // Campos que valem como titulo, em ordem de preferencia.
    const candidatos = [
      'titulo',
      'nome',
      'descricao',
      'legenda',
      'frase',
      'texto',
    ];
    for (const k of candidatos) {
      const v = meta[k];
      if (typeof v === 'string' && v.trim().length > 0) {
        const t = v.trim();
        return t.length > 60 ? `${t.slice(0, 57)}...` : t;
      }
    }
  }
  if (slug) return humanizarSlug(slug);
  // Fallback final: rotulo do tipo + data.
  const rotulo: Record<TipoGaleria, string> = {
    humor: 'Humor',
    diario: 'Diário',
    evento: 'Evento',
    marco: 'Marco',
    foto: 'Foto',
    audio: 'Áudio',
    video: 'Vídeo',
    frase: 'Frase',
    tarefa: 'Tarefa',
    alarme: 'Alarme',
    contador: 'Contador',
    nota: 'Nota',
    ciclo: 'Ciclo',
    exercicio: 'Exercício',
    scanner: 'Documento',
  };
  return `${rotulo[tipo]} ${data}`;
}

// Subtitulo opcional: autor / categoria / lugar quando presentes.
function subtituloDoMeta(
  meta: Record<string, unknown> | null,
  tipo: TipoGaleria
): string | undefined {
  if (!meta) return undefined;
  const candidatos = ['categoria', 'lugar', 'autor'];
  for (const k of candidatos) {
    const v = meta[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  // ciclo nao tem categoria/lugar; usa fase quando presente.
  if (tipo === 'ciclo' && typeof meta.fase === 'string') {
    return meta.fase as string;
  }
  return undefined;
}

// Normaliza campo data lido do frontmatter para YYYY-MM-DD. Aceita
// ISO completo (corta primeiros 10) ou ja-YYYY-MM-DD. Retorna null
// quando shape inesperado.
function normalizarData(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return null;
}

// Lista todos os itens da galeria. Le markdown/ uma vez, filtra por
// prefixo de feature, parseia frontmatter de cada arquivo (com
// schema permissivo no fallback) e devolve ItemGaleria[] ordenado
// desc por data.
//
// Pasta inexistente => []. Arquivo malformado => ignorado. Filtro
// tipo='tudo' (default) inclui todos os tipos canonicos.
export async function listarItensGaleria(
  vaultRoot: string,
  filtros: FiltrosGaleria = {}
): Promise<ItemGaleria[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');

  const tipoFiltro = filtros.tipo ?? 'tudo';
  const mesFiltro = filtros.mes ?? null;

  const itens: ItemGaleria[] = [];
  for (const arquivoUri of todos) {
    const tipo = inferirTipoDoFilename(arquivoUri);
    if (!tipo) continue;
    if (tipoFiltro !== 'tudo' && tipo !== tipoFiltro) continue;

    const dataFilename = extrairDataDoFilename(arquivoUri);
    const slug = extrairSlugDoFilename(arquivoUri, tipo);

    let metaRecord: Record<string, unknown> | null = null;
    try {
      const result = await readVaultFile(arquivoUri, schemaPorTipo(tipo));
      if (result && typeof result.meta === 'object' && result.meta !== null) {
        metaRecord = result.meta as Record<string, unknown>;
      }
    } catch {
      // Arquivo malformado / schema falho: tenta cair em parse
      // permissivo para nao perder o item da listagem.
      try {
        const result = await readVaultFile(arquivoUri, GenericoSchema);
        if (result && typeof result.meta === 'object' && result.meta !== null) {
          metaRecord = result.meta as Record<string, unknown>;
        }
      } catch {
        metaRecord = null;
      }
    }

    const dataMeta = metaRecord ? normalizarData(metaRecord.data) : null;
    const data = dataMeta ?? dataFilename;
    if (!data) continue; // Sem data: nao da pra ordenar / mostrar.

    if (mesFiltro && !data.startsWith(mesFiltro)) continue;

    itens.push({
      tipo,
      data,
      slug,
      uri: arquivoUri,
      titulo: tituloDoMeta(metaRecord, slug, data, tipo),
      subtitulo: subtituloDoMeta(metaRecord, tipo),
    });
  }

  // Ordenacao: data desc (mais recente primeiro), depois slug asc
  // como tie-break deterministico (nulls por ultimo).
  itens.sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    const sa = a.slug ?? '￿';
    const sb = b.slug ?? '￿';
    if (sa === sb) return 0;
    return sa < sb ? -1 : 1;
  });

  return itens;
}
