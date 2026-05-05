// Persiste um registro de humor (Tela 15) em daily/YYYY-MM-DD.md no
// Vault. Função pura: recebe meta validado e vaultRoot, devolve URI
// final e flag de conflito A5.
//
// A5 (Armadilha do BRIEF seção 4): Syncthing entre N celulares pode
// gerar colisao quando dois ou mais registram humor no mesmo dia.
// Estrategia M38: se já existe arquivo no path canonico escrito por
// outra instalacao (mesmo autor ou nao), gravamos em
// daily/YYYY-MM-DD-<deviceId>.md. Cobre 4 nos (2 desktops + 2 celulares)
// sem perder dado em sync.
//
// Backward-compat: arquivos legados '-pessoa_a.md'/'-pessoa_b.md'
// continuam sendo lidos por listarHumor (filtra por basename data sem
// olhar suffix). M38 so altera o futuro padrao de naming.
//
// Importante: esta função não decide o que mostrar na UI quando ha
// conflito; apenas grava na variante segura e devolve o flag para o
// caller logar/avisar se desejar.
import { dailyPath, readVaultFile, writeVaultFile } from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import { useSettings } from '@/lib/stores/settings';
import { applyDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

export interface SaveHumorResult {
  uri: string;
  conflito: boolean;
}

// Concatena root SAF e path relativo. Detalhe: o root pode terminar
// ou não com '/', e o path e sempre 'daily/...'. Normalizamos para
// um unico '/'.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Monta o corpo .md a partir do meta. Hoje colocamos a frase apenas
// no frontmatter (decisão M05 spec seção 9 item 1), entao o corpo
// fica vazio. Mantemos a função isolada para sprint futura migrar a
// frase para o corpo se ficar mais idiomatico no Obsidian.
function buildBody(_meta: HumorMeta): string {
  return '';
}

// Decide qual path usar: canonico ou com sufixo de deviceId. M38:
// trocamos o suffix '-pessoa_<a|b>' (cobria so 2 devices) por
// '-<deviceId>' (cobre 4+ devices). Caminho feliz mantem nome
// canonico (daily/YYYY-MM-DD.md) tanto em escrita inicial quanto em
// reescrita pelo mesmo deviceId (mesmo autor, mesma instalacao).
async function resolvePath(
  vaultRoot: string,
  relCanonico: string,
  autor: HumorMeta['autor']
): Promise<{ rel: string; conflito: boolean }> {
  const uriCanonico = joinUri(vaultRoot, relCanonico);
  const existente = await readVaultFile<HumorMeta>(uriCanonico, HumorSchema);
  if (!existente) {
    return { rel: relCanonico, conflito: false };
  }
  if (existente.meta.autor === autor) {
    // Mesmo autor regravando o dia: sobrescreve no canonico.
    return { rel: relCanonico, conflito: false };
  }
  // Outra instalacao ja escreveu: usamos suffix de deviceId para
  // evitar colisao. Cobre 4 nos sem perder dado.
  const deviceId = await getDeviceId();
  return {
    rel: applyDeviceIdSuffix(relCanonico, deviceId),
    conflito: true,
  };
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

  const relCanonico = dailyPath(new Date());
  const { rel, conflito } = await resolvePath(
    vaultRoot,
    relCanonico,
    parsed.data.autor
  );
  const uri = joinUri(vaultRoot, rel);
  const body = buildBody(parsed.data);
  await writeVaultFile<HumorMeta>(uri, parsed.data, body);

  // M20: widget homescreen event-driven. Refresh após save bem
  // sucedido. Toggle off ou erro do widget nunca propaga; import
  // dinamico evita ciclo entre humor e widget e mantem o saveHumor
  // resiliente em ambientes de teste sem bridge nativa.
  try {
    if (useSettings.getState().featureToggles.widgetHomescreen === true) {
      const { atualizarWidgetHomescreen } = await import(
        '@/lib/widget/atualizarWidgetHomescreen'
      );
      await atualizarWidgetHomescreen({ forcar: true });
    }
  } catch {
    // Falha do widget não bloqueia save do humor.
  }

  return { uri, conflito };
}
