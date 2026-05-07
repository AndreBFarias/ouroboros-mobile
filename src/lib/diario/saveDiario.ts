// Persiste um registro de diario emocional (Tela 18) em
// markdown/diario-YYYY-MM-DD-HHmm-<slug>.md no Vault (layout H2 por
// tipo). Funcao pura: recebe meta validado, body livre e vaultRoot;
// devolve URI final.
//
// Slug do nome de arquivo: deriva da primeira emocao da lista (ou
// 'registro' se vazia). Em colisao improvavel (mesmo arquivo no
// mesmo minuto e mesmo slug), aplica sufixo de deviceId.
//
// Diferenca para saveHumor: o path já contem hora e minuto, dificultando
// colisao real entre devices. Quando ha colisao, M38 troca o sufixo
// numerico antigo ('-1', '-2', ...) por '-<deviceId>' para alinhar
// com o padrao de conflict resolution do Syncthing (4 nos).
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
  readVaultFile,
  vaultUriJoin,
  writeVaultFile,
} from '@/lib/vault';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { applyDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

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

// Tenta gravar no path canonico. Se já existir um arquivo no mesmo
// URI (colisao real entre devices via Syncthing), aplica suffix
// '-<deviceId>' para garantir slot unico por instalacao. M38: padrao
// alinhado com saveHumor, cobre 4 nos.
//
// Se ate o suffix de deviceId colidir (mesmo deviceId regravando
// mesmo minuto, mesmo slug -- improvavel mas teoricamente possivel
// quando user clica salvar duas vezes no mesmo segundo), aplica
// fallback de timestamp ms para garantir unicidade absoluta.
async function resolvePath(
  vaultRoot: string,
  relCanonico: string
): Promise<string> {
  const uriCanonico = vaultUriJoin(vaultRoot, relCanonico);
  const existente = await readVaultFile(
    uriCanonico,
    DiarioEmocionalSchema
  );
  if (!existente) return relCanonico;

  const deviceId = await getDeviceId();
  const relComDevice = applyDeviceIdSuffix(relCanonico, deviceId);
  const uriComDevice = vaultUriJoin(vaultRoot, relComDevice);
  const jaComDevice = await readVaultFile(uriComDevice, DiarioEmocionalSchema);
  if (!jaComDevice) return relComDevice;

  // Fallback: deviceId + timestamp ms para garantir unicidade.
  const dotIdx = relComDevice.lastIndexOf('.');
  const ts = Date.now();
  if (dotIdx === -1) return `${relComDevice}-${ts}`;
  return `${relComDevice.slice(0, dotIdx)}-${ts}${relComDevice.slice(dotIdx)}`;
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
  const rel = await resolvePath(vaultRoot, relCanonico);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<DiarioEmocionalMeta>(uri, parsed.data, body);
  return { uri };
}
