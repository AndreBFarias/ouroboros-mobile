// Helpers de leitura, listagem e escrita de medidas corporais no
// Vault (M12). Cada medida vive em medidas/YYYY-MM-DD.md com
// frontmatter validado pelo MedidasSchema. Diferente de marcos e
// treinos, não ha slug: a chave e a data; salvar duas vezes no mesmo
// dia sobrescreve o registro anterior.
//
// listarMedidas aplica filtro de período opcional (30d / 90d / tudo)
// e devolve array ordenado desc por data. lerUltimaMedida e atalho
// para o caso comum de pre-preencher a Tela 12 com o snapshot mais
// recente. escreverMedida persiste o frontmatter sem cuidado de
// foto: a copia de fotos e responsabilidade do caller (Tela 12),
// porque o picker pode rodar antes ou depois do submit.
//
// Comentarios sem acento (convencao shell/CI).
import {
  medidasPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import { MedidasSchema, type Medida } from '@/lib/schemas/medidas';
import { escreverPesoEmHC, escreverBodyFatEmHC } from '@/lib/health/sync';
import { useSettings } from '@/lib/stores/settings';

// Período de filtro suportado pela Tela 13. '30d' = ultimos 30 dias,
// '90d' = ultimos 90, 'tudo' = sem filtro.
export type MedidasPeriodo = '30d' | '90d' | 'tudo';

export interface ListarMedidasFiltros {
  periodo?: MedidasPeriodo;
  // Data de referência para calcular janela. Default new Date(). Útil
  // para testes deterministicos.
  hoje?: Date;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Calcula data limite (em ISO YYYY-MM-DD) baseado em período. Para
// 'tudo' retorna null (sem corte).
function dataLimite(periodo: MedidasPeriodo, hoje: Date): string | null {
  if (periodo === 'tudo') return null;
  const dias = periodo === '30d' ? 30 : 90;
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - dias);
  // YYYY-MM-DD em UTC-3 (mesma logica de paths.formatDateYmd).
  const TZ_OFFSET_MIN = -180;
  const local = new Date(limite.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Lista todas as medidas do Vault aplicando filtro de período
// opcional. Pasta inexistente => [].
export async function listarMedidas(
  vaultRoot: string,
  filtros: ListarMedidasFiltros = {}
): Promise<Medida[]> {
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  // Filtro por prefixo evita confundir medidas-YYYY-MM-DD.md (registro
  // diario) com medidas-foto-YYYY-MM-DD-<lado>.md (companion da foto).
  const arquivos = todos.filter(
    (u) =>
      !ehSyncConflict(u) &&
      matchesFeaturePrefix(u, 'medidas-') &&
      !matchesFeaturePrefix(u, 'medidas-foto-')
  );

  const lidas: Medida[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, MedidasSchema);
      if (result) lidas.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  const periodo = filtros.periodo ?? 'tudo';
  const hoje = filtros.hoje ?? new Date();
  const limite = dataLimite(periodo, hoje);

  let filtradas = lidas;
  if (limite) {
    filtradas = filtradas.filter((m) => m.data >= limite);
  }

  // Ordenacao desc por data ISO (lexicografica YYYY-MM-DD já respeita
  // ordem cronologica).
  filtradas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return filtradas;
}

// Atalho usado pela Tela 12 para pre-preencher os 10 inputs com o
// ultimo snapshot conhecido. Retorna null se não ha registro algum.
export async function lerUltimaMedida(
  vaultRoot: string
): Promise<Medida | null> {
  const lista = await listarMedidas(vaultRoot, { periodo: 'tudo' });
  return lista.length > 0 ? lista[0] : null;
}

// Persiste um registro de medidas. Caller fornece meta já validado
// (ou ao menos com shape correto); revalidamos defensivamente.
// Escreve em medidas/YYYY-MM-DD.md derivando o nome da data do meta.
export async function escreverMedida(
  vaultRoot: string,
  meta: Medida,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = MedidasSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`medida invalida: ${parsed.error.message}`);
  }
  // A data vem como YYYY-MM-DD; convertemos pra Date sem timezone
  // shift para preservar o dia exato (YYYY-MM-DD interpretado como
  // UTC vira o mesmo dia no fuso BRT desde que a hora seja meio-dia).
  // Usar new Date(YYYY-MM-DD) coloca em UTC midnight, o que pode
  // virar dia anterior em BRT. Por isso anexamos T12 antes de parse.
  const dataDate = new Date(`${parsed.data.data}T12:00:00Z`);
  const rel = medidasPath(dataDate);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<Medida>(uri, parsed.data, body);

  // Q17.c.b / Q17.c.d: sync opt-in para Health Connect. Best-effort —
  // falha aqui nao impacta o caller (medida ja persistiu no Vault).
  // Peso e gordura corporal tem mapping canonico em HC (WeightRecord
  // + BodyFatRecord); demais medidas geometricas ficam locais.
  try {
    const habilitado = useSettings.getState().featureToggles.healthConnectSync;
    if (habilitado && typeof parsed.data.peso === 'number') {
      void escreverPesoEmHC(parsed.data.peso, dataDate);
    }
    if (habilitado && typeof parsed.data.gordura === 'number') {
      void escreverBodyFatEmHC(parsed.data.gordura, dataDate);
    }
  } catch {
    // Erros silenciosos por design (path nao-critico).
  }

  return { uri, rel };
}
