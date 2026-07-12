// Persiste um registro de humor (Tela 15) em
// markdown/humor-YYYY-MM-DD-<deviceId>.md no Vault. Função pura:
// recebe meta validado e vaultRoot, devolve URI final.
//
// T2-LOCK-VAULT (2026-05-15): substituida a decisao dinamica
// read-then-write (M38 resolvePath) por suffix-de-deviceId
// determinista. Antes: arquivo canonico humor-YYYY-MM-DD.md so
// recebia suffix em colisao detectada por leitura previa, abrindo
// race condition Syncthing entre dois devices que capturassem no
// mesmo segundo. Agora: todo save inclui '-<deviceId>' desde o
// inicio. Listadores agregam por dia ignorando suffix. Migration
// boot canonico renomeia legado.
//
// Backward-compat: arquivos legados (sem suffix, com '-pessoa_a/b'
// ou com '-ouro-XXXXXX' de outro device) continuam sendo lidos por
// listarHumor (filtra por prefix 'humor-' sem olhar suffix).
//
// I-HUMOR (M-SAVE-HUMOR-VALIDA, 2026-05-07): substitui joinUri local
// pelo helper canonico vaultUriJoin de @/lib/vault, eliminando
// trailing space, %20 ofensivo e barras duplas em URIs SAF (causa
// raiz parcial dos saves silenciosos no APK alpha em OEMs MIUI/
// OneUI/HyperOS, vide A29). Auditoria: 100% das concatenacoes ad-hoc
// substituidas; vaultRoot vazio agora propaga erro claro do helper
// em vez de gerar URI invalida silenciosa.
import {
  humorPath,
  vaultUriJoin,
  writeVaultFile,
} from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import { useSettings } from '@/lib/stores/settings';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

export interface SaveHumorResult {
  uri: string;
}

// Monta o corpo .md a partir do meta. Hoje colocamos a frase apenas
// no frontmatter (decisão M05 spec seção 9 item 1), entao o corpo
// fica vazio. Mantemos a função isolada para sprint futura migrar a
// frase para o corpo se ficar mais idiomatico no Obsidian.
function buildBody(_meta: HumorMeta): string {
  return '';
}

export async function saveHumor(
  meta: HumorMeta,
  vaultRoot: string
): Promise<SaveHumorResult> {
  // Defensivo: revalida o meta antes de tocar em I/O. Quem chama
  // tipicamente já parseou, mas testes podem injetar payload bruto.
  const parsed = HumorSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`humor invalido: ${parsed.error.message}`);
  }

  const relCanonico = humorPath(new Date());
  // T2-LOCK-VAULT: sempre escreve com suffix do device atual.
  // Elimina race condition Syncthing entre devices que capturem no
  // mesmo segundo (read-then-write antes da T2).
  const deviceId = await getDeviceId();
  const rel = forceDeviceIdSuffix(relCanonico, deviceId);
  const uri = vaultUriJoin(vaultRoot, rel);
  const body = buildBody(parsed.data);
  await writeVaultFile<HumorMeta>(uri, parsed.data, body);

  // M20: widget homescreen event-driven. Refresh após save bem
  // sucedido. Toggle off ou erro do widget nunca propaga; import
  // dinamico evita ciclo entre humor e widget e mantem o saveHumor
  // resiliente em ambientes de teste sem bridge nativa.
  try {
    if (useSettings.getState().featureToggles.widgetHomescreen === true) {
      const { atualizarWidgetHomescreen } =
        await import('@/lib/widget/atualizarWidgetHomescreen');
      await atualizarWidgetHomescreen({ forcar: true });
    }
  } catch {
    // Falha do widget não bloqueia save do humor.
  }

  return { uri };
}
