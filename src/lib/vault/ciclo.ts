// Helpers de leitura, listagem e escrita de registros de ciclo
// menstrual no Vault (M14.5, layout-por-tipo H2 -> markdown/ciclo-
// YYYY-MM-DD.md). Cada registro vive com frontmatter validado pelo
// CicloMenstrualSchema. Sem slug: a chave e a data; salvar duas vezes
// no mesmo dia sobrescreve o registro anterior (mesmo padrao das
// medidas corporais).
//
// Privacidade reforcada (M14.5 spec, ADR-0007):
//  - Dados ficam apenas no Vault local; nao ha cache backend.
//  - Pasta dedicada markdown/ separa por prefixo de feature.
//
// inferirFase e' funcao pura sem I/O, totalmente testavel.
//
// I-CICLO (M-SAVE-CICLO-VALIDA, 2026-05-07): substitui joinUri local
// pelo helper canonico vaultUriJoin de @/lib/vault, eliminando
// trailing space, %20 ofensivo e barras duplas em URIs SAF (causa
// raiz parcial dos saves silenciosos no APK alpha em OEMs MIUI/
// OneUI/HyperOS, vide A29). Auditoria: 100% das concatenacoes ad-hoc
// substituidas; vaultRoot vazio agora propaga erro claro do helper
// em vez de gerar URI invalida silenciosa.
//
// Comentarios sem acento (convencao shell/CI).
import {
  cicloPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import { escreverMenstruacaoEmHC } from '@/lib/health/sync';
import { useSettings } from '@/lib/stores/settings';
import {
  CicloMenstrualSchema,
  type CicloMenstrualMeta,
  type FaseCiclo,
} from '@/lib/schemas/ciclo_menstrual';

// Período de filtro suportado pelo calendario. '28d' = ciclo curto
// canonico, '90d' = visualizacao trimestral, 'tudo' = sem corte.
export type CicloPeriodo = '28d' | '90d' | 'tudo';

export interface ListarRegistrosCicloFiltros {
  periodo?: CicloPeriodo;
  // Data de referência para calcular janela. Default new Date(). Útil
  // para testes deterministicos.
  hoje?: Date;
}

// Calcula data limite (ISO YYYY-MM-DD) baseado em período. Para 'tudo'
// retorna null (sem corte). Mesma logica de paths.formatDateYmd com
// timezone UTC-3 fixo (São Paulo, sem DST).
function dataLimite(periodo: CicloPeriodo, hoje: Date): string | null {
  if (periodo === 'tudo') return null;
  const dias = periodo === '28d' ? 28 : 90;
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - dias);
  const TZ_OFFSET_MIN = -180;
  const local = new Date(limite.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Calcula diferenca em dias entre duas datas YYYY-MM-DD. Retorna
// número de dias completos passados desde dataInicio até dataAlvo.
// Pode ser negativo se dataAlvo for anterior. Operacao puramente
// aritmetica em UTC para evitar drift de timezone na borda da meia
// noite.
function diferencaDias(dataInicio: string, dataAlvo: string): number {
  const inicio = new Date(`${dataInicio}T00:00:00Z`);
  const alvo = new Date(`${dataAlvo}T00:00:00Z`);
  const diffMs = alvo.getTime() - inicio.getTime();
  return Math.floor(diffMs / 86_400_000);
}

// Heuristica simples baseada em diferenca de dias desde o início do
// ultimo ciclo. Ciclo padrao 28 dias:
//   1-5    -> menstrual
//   6-13   -> folicular
//   14-16  -> ovulatoria
//   17-28+ -> lutea
//
// Quando dataInicioUltimoCiclo for null (antes do primeiro registro
// real), a fase de fallback e 'menstrual' por convencao do spec.
//
// Quando a diferenca e negativa (dataAlvo antes do início conhecido)
// caimos também em 'menstrual' como fallback estavel: o usuario não
// registrou ainda o início anterior, entao não da pra inferir.
//
// Função pura, sem I/O. Totalmente testavel.
export function inferirFase(
  data: string,
  dataInicioUltimoCiclo: string | null
): FaseCiclo {
  if (!dataInicioUltimoCiclo) return 'menstrual';
  const dia = diferencaDias(dataInicioUltimoCiclo, data) + 1;
  if (dia < 1) return 'menstrual';
  if (dia <= 5) return 'menstrual';
  if (dia <= 13) return 'folicular';
  if (dia <= 16) return 'ovulatoria';
  return 'lutea';
}

// Lista todos os registros de ciclo do Vault aplicando filtro de
// período opcional. Pasta inexistente => []. Sempre filtra por autor
// (privacidade visual entre as duas pessoas, M14.5 spec): caller
// passa autor; lista so registros desse autor.
export async function listarRegistrosCiclo(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b',
  filtros: ListarRegistrosCicloFiltros = {}
): Promise<CicloMenstrualMeta[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'ciclo-')
  );

  const lidas: CicloMenstrualMeta[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, CicloMenstrualSchema);
      if (result && result.meta.autor === autor) lidas.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  const periodo = filtros.periodo ?? 'tudo';
  const hoje = filtros.hoje ?? new Date();
  const limite = dataLimite(periodo, hoje);

  let filtradas = lidas;
  if (limite) {
    filtradas = filtradas.filter((r) => r.data >= limite);
  }

  // Ordenacao asc por data (calendario consome esquerda -> direita).
  filtradas.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  return filtradas;
}

// Le um registro específico (por data). Retorna null se não existir.
export async function lerRegistroCiclo(
  vaultRoot: string,
  data: string
): Promise<CicloMenstrualMeta | null> {
  const dataDate = new Date(`${data}T12:00:00Z`);
  const rel = cicloPath(dataDate);
  const uri = vaultUriJoin(vaultRoot, rel);
  const result = await readVaultFile(uri, CicloMenstrualSchema);
  return result ? result.meta : null;
}

// Persiste um registro de ciclo. Caller fornece meta já validado (ou
// ao menos com shape correto); revalidamos defensivamente. Escreve em
// inbox/saude/ciclo/YYYY-MM-DD.md derivando o nome da data do meta.
// Mapeia intensidade 1..5 do schema interno pra flow 1..3 (light /
// medium / heavy) do HC. <=2 = light, 3 = medium, >=4 = heavy.
function intensidadeParaFluxoHC(i: number | null): 1 | 2 | 3 {
  if (i === null) return 2;
  if (i <= 2) return 1;
  if (i >= 4) return 3;
  return 2;
}

export async function escreverRegistroCiclo(
  vaultRoot: string,
  meta: CicloMenstrualMeta,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = CicloMenstrualSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`registro de ciclo invalido: ${parsed.error.message}`);
  }
  // YYYY-MM-DD interpretado como UTC midnight pode virar dia anterior
  // em BRT; anexamos T12 antes do parse para preservar o dia exato.
  const dataDate = new Date(`${parsed.data.data}T12:00:00Z`);
  const rel = cicloPath(dataDate);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<CicloMenstrualMeta>(uri, parsed.data, body);

  // Q17.c.c: sync opt-in para Health Connect. Best-effort. So escreve
  // quando fase=menstrual (HC nao tem mapping para folicular/lutea/
  // ovulatoria; sao inferencias locais nossas).
  try {
    const habilitado = useSettings.getState().featureToggles.healthConnectSync;
    if (habilitado && parsed.data.fase === 'menstrual') {
      const fluxo = intensidadeParaFluxoHC(parsed.data.intensidade);
      void escreverMenstruacaoEmHC(dataDate, fluxo);
    }
  } catch {
    // Erros silenciosos por design (path nao-critico).
  }

  return { uri, rel };
}

// Detecta duracao do ultimo ciclo registrado a partir da lista de
// registros (asc por data). Procura dois 'data_inicio' distintos
// consecutivos e retorna a diferenca em dias. Default 28 quando não
// houver dois inicios registrados (calendario adapta para 35 quando
// duracao > 28).
export function duracaoCicloDetectada(registros: CicloMenstrualMeta[]): number {
  const inicios: string[] = [];
  let ultimo: string | null = null;
  for (const r of registros) {
    if (r.data_inicio && r.data_inicio !== ultimo) {
      inicios.push(r.data_inicio);
      ultimo = r.data_inicio;
    }
  }
  if (inicios.length < 2) return 28;
  const ultimo2 = inicios[inicios.length - 1];
  const penultimo = inicios[inicios.length - 2];
  const diff = diferencaDias(penultimo, ultimo2);
  // Limites defensivos: ciclos abaixo de 21 ou acima de 45 são
  // ignorados; cai em default 28.
  if (diff < 21 || diff > 45) return 28;
  return diff;
}

// Recupera o data_inicio do ultimo ciclo conhecido a partir da lista
// asc por data. Útil para inferirFase em dias sem registro de início
// proprio (continua o ciclo vigente).
export function ultimaDataInicio(
  registros: CicloMenstrualMeta[]
): string | null {
  for (let i = registros.length - 1; i >= 0; i--) {
    if (registros[i].data_inicio) return registros[i].data_inicio;
  }
  return null;
}
