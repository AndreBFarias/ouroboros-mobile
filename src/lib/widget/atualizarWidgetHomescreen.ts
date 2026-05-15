// Helper canonico do widget homescreen (M20). Plugado em dois pontos:
//   1. saveHumor (event-driven): humor salvo -> widget atualiza.
//   2. BOOT_HOOKS (boot): app aberto sem novo humor mostra valor do
//      dia. Idempotente: rate-limit em memória (1 update por minuto).
//
// Estrategia de privacidade (CONTRACT 1.5 + spec M20 seção 4):
//   - widgetHomescreen toggle off  -> chama desativarWidget(), sai.
//   - toggle on, widgetMostraNome off (default) -> avatarLetra = inicial.
//   - toggle on, widgetMostraNome on            -> avatarLetra = inicial,
//     mas com nome de exibicao reservado para layouts futuros.
//
// Heatmap mini (7 dias): le cache JSON em cacheDirectory/humor-heatmap.json
// quando existir (cache escrito por M10). Ausente -> array vazio. Provider
// Kotlin trata array vazio renderizando blocos neutros.
//
// Comentarios sem acentuacao (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import {
  atualizarWidget,
  desativarWidget,
} from '../../../modules/widget-homescreen/src';
import type { WidgetData } from '../../../modules/widget-homescreen/src';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import { readVaultFile, humorPath } from '@/lib/vault';
import { HumorSchema } from '@/lib/schemas/humor';
import { inicialDe, corDe } from '@/config/pessoas.config';

const RATE_LIMIT_MS = 60 * 1000;

interface RateState {
  lastUpdateTimestamp: number | null;
}

const _state: RateState = {
  lastUpdateTimestamp: null,
};

// Reset útil para testes. Não deve ser chamado em runtime.
export function _resetRateLimit(): void {
  _state.lastUpdateTimestamp = null;
}

function withinRateLimit(now: number): boolean {
  if (_state.lastUpdateTimestamp == null) return false;
  return now - _state.lastUpdateTimestamp < RATE_LIMIT_MS;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

async function lerHumorDoDia(
  vaultRoot: string | null,
  pessoaAtiva: 'pessoa_a' | 'pessoa_b'
): Promise<{ humor: number | null; frase: string | null }> {
  if (!vaultRoot) return { humor: null, frase: null };
  const rel = humorPath(new Date());
  const uri = joinUri(vaultRoot, rel);
  const parsed = await readVaultFile(uri, HumorSchema);
  if (!parsed) return { humor: null, frase: null };
  // Quando o autor diverge, o widget mostra o humor da pessoa ativa
  // apenas se for ela quem escreveu. Outros casos: vazio (privacidade).
  if (parsed.meta.autor !== pessoaAtiva) {
    return { humor: null, frase: null };
  }
  return {
    humor: parsed.meta.humor,
    frase: parsed.meta.frase ?? null,
  };
}

async function lerHeatmapCache(): Promise<number[]> {
  // Cache opcional escrito por M10 (heatmap home). Antes de M10 rodar,
  // o arquivo não existe e devolvemos []. O provider Kotlin trata []
  // como blocos neutros.
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return [];
  const path = `${cacheDir}humor-heatmap.json`;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-7).map((v: unknown) => {
      const n = typeof v === 'number' ? Math.round(v) : 0;
      return Math.max(0, Math.min(5, n));
    });
  } catch {
    return [];
  }
}

interface MontarOptions {
  pessoaAtiva: 'pessoa_a' | 'pessoa_b';
  inicial: string;
  cor: string;
  humor: number | null;
  frase: string | null;
  heatmap: number[];
}

export function montarWidgetData(opts: MontarOptions): WidgetData {
  return {
    ativo: true,
    avatarLetra: opts.inicial,
    avatarCor: opts.cor,
    humor: opts.humor,
    frase: opts.frase,
    heatmap: opts.heatmap,
  };
}

interface AtualizarOptions {
  forcar?: boolean;
}

// Função publica. Le settings + pessoa + humor + heatmap, monta o
// payload e chama o bridge nativo. Resiliente: erros internos viram
// no-op para não quebrar saveHumor ou boot.
export async function atualizarWidgetHomescreen(
  options: AtualizarOptions = {}
): Promise<void> {
  try {
    const settings = useSettings.getState();
    const ativo = settings.featureToggles.widgetHomescreen === true;

    if (!ativo) {
      _state.lastUpdateTimestamp = Date.now();
      await desativarWidget();
      return;
    }

    const now = Date.now();
    if (!options.forcar && withinRateLimit(now)) {
      return;
    }

    const pessoa = usePessoa.getState();
    const pessoaAtiva = pessoa.pessoaAtiva;
    const inicial = inicialDe(pessoaAtiva);
    const cor = corDe(pessoaAtiva);

    const vaultRoot = useVault.getState().vaultRoot;
    const humorDoDia = await lerHumorDoDia(vaultRoot, pessoaAtiva);
    const heatmap = await lerHeatmapCache();

    const data = montarWidgetData({
      pessoaAtiva,
      inicial,
      cor,
      humor: humorDoDia.humor,
      frase: humorDoDia.frase,
      heatmap,
    });

    _state.lastUpdateTimestamp = now;
    await atualizarWidget(data);
  } catch {
    // Falha do widget nunca propaga.
  }
}

// Hook idempotente para BOOT_HOOKS. Wrapper fino que respeita
// rate-limit e tolera ausencia de toggle.
export async function atualizarWidgetHomescreenBootHook(): Promise<void> {
  await atualizarWidgetHomescreen();
}
