// Persiste um registro de diario emocional (Tela 18) em
// markdown/diario-YYYY-MM-DD-HHmm-<slug>-<deviceId>.md no Vault
// (layout H2 por tipo). Funcao pura: recebe meta validado, body livre
// e vaultRoot; devolve URI final.
//
// Slug do nome de arquivo: deriva da primeira emocao da lista (ou
// 'registro' se vazia).
//
// T2-LOCK-VAULT (2026-05-15): substituida a decisao dinamica
// read-then-write (M38 resolvePath) por suffix-de-deviceId
// determinista. Antes: path canonico recebia suffix apenas em colisao
// detectada por leitura previa, abrindo race condition Syncthing
// entre dois devices que registrassem no mesmo minuto com mesmo
// slug. Agora: todo save inclui '-<deviceId>' desde o inicio.
// Listadores agregam por dia ignorando suffix.
//
// I-DIARIO (M-SAVE-DIARIO-VALIDA, 2026-05-07): substitui joinUri local
// pelo helper canonico vaultUriJoin de @/lib/vault, eliminando
// trailing space, %20 ofensivo e barras duplas em URIs SAF (causa
// raiz parcial dos saves silenciosos no APK alpha em OEMs MIUI/
// OneUI/HyperOS, vide A29). Auditoria: 100% das concatenacoes ad-hoc
// substituidas; vaultRoot vazio agora propaga erro claro do helper
// em vez de gerar URI invalida silenciosa.
import {
  diarioPath,
  vaultUriJoin,
  writeVaultFile,
} from '@/lib/vault';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

export interface SaveDiarioResult {
  uri: string;
}

// Monta o slug do nome de arquivo a partir da primeira emocao do
// meta. Slugs são snake_case ASCII; o path canonico aceita
// kebab-case mas o frontmatter usa snake. Mantemos snake aqui para
// alinhar com os slugs e simplificar buscas futuras.
function slugDe(meta: DiarioEmocionalMeta): string {
  const primeira = meta.emocoes[0];
  if (typeof primeira === 'string' && primeira.length > 0) {
    return primeira;
  }
  return 'registro';
}

export async function saveDiario(
  meta: DiarioEmocionalMeta,
  body: string,
  vaultRoot: string
): Promise<SaveDiarioResult> {
  // Defensivo: revalida o meta antes de tocar em I/O.
  const parsed = DiarioEmocionalSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`diario emocional invalido: ${parsed.error.message}`);
  }

  const slug = slugDe(parsed.data);
  // O path canonico usa a hora local de São Paulo formatada por
  // diarioPath (H2 layout-por-tipo). Passamos `new Date()` para
  // refletir o momento real do save; meta.data fica em ISO 8601 dentro
  // do frontmatter para preservar fuso explicito.
  const relCanonico = diarioPath(new Date(), slug);
  // T2-LOCK-VAULT: suffix sempre, mesmo em primeiro save do minuto.
  const deviceId = await getDeviceId();
  const rel = forceDeviceIdSuffix(relCanonico, deviceId);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<DiarioEmocionalMeta>(uri, parsed.data, body);
  return { uri };
}
