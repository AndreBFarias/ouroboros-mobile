// Migration boot one-shot: escreve cota inicial do estado canonico
// em vault/_estado/ apos cold start.
//
// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): SecureStore continua
// sendo cache rapido + fallback offline. Vault e canonico para o
// sibling Python.
//
// Estrategia:
//   1. Idempotente via flag useSessao.flags.estadoMigradoParaVault.
//      Apos primeiro sucesso, nunca mais roda (mesmo que vault
//      mude de root).
//   2. Le estado atual dos 5 stores (ja hidratados, garantido pelo
//      useAppPronto antes de chamar este hook).
//   3. Dispara 5 writes one-shot via escreverEstadoCanonicoImediato
//      (bypassa debounce porque sao writes deliberados de boot).
//   4. Marca a flag mesmo em caso de falha parcial: writes
//      subsequentes via subscribers de stores corrigem o que faltou.
//      O proposito da flag e "ja tentou pelo menos uma vez", nao
//      "sucesso garantido em todos os 5".
//   5. NAO apaga SecureStore. Continua sendo a verdade efetiva
//      enquanto vault canonico for um espelho.
//
// Falha em vault inacessivel (vaultRoot null ou writeVaultFile
// rejeita) e best-effort: silenciamos em prod, console.warn em
// __DEV__. Migration nao deve bloquear o boot.
//
// Comentarios sem acento (convencao shell/CI).
import { useSettings } from '@/lib/stores/settings';
import { useSessao } from '@/lib/stores/sessao';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';
import { useNavegacao } from '@/lib/stores/navegacao';
import { useVault } from '@/lib/stores/vault';
import { escreverEstadoCanonicoImediato } from '@/lib/vault/escreverEstado';
import type { EstadoKey } from '@/lib/schemas/vault_estado';

// Snapshot serializavel de cada store. Strippa mutators (funcoes
// nao serializam em JSON nem casam com Zod schema).
//
// Cada extrator existe como funcao nominal pra que migrarEstadoParaVault
// fique declarativo (mapa key -> snapshot()).

function snapshotSettings(): Record<string, unknown> {
  const s = useSettings.getState();
  return {
    somVibracao: { ...s.somVibracao },
    pessoa: { ...s.pessoa },
    featureToggles: { ...s.featureToggles },
    privacidade: { ...s.privacidade },
    midia: { ...s.midia },
  };
}

function snapshotSessao(): Record<string, unknown> {
  const s = useSessao.getState();
  return {
    ultimaRota: s.ultimaRota,
    rascunhos: { ...s.rascunhos },
    permissoesPedidas: { ...s.permissoesPedidas },
    // Inclui a flag estadoMigradoParaVault. Como rodamos ANTES de
    // marcarFlagBoot, o snapshot reflete false; o proximo subscriber
    // (que vai disparar quando marcarFlagBoot roda) escreve novamente
    // com true. Isso e proposital pra deixar trilha no vault.
    flags: { ...s.flags },
  };
}

function snapshotOnboarding(): Record<string, unknown> {
  const s = useOnboarding.getState();
  return {
    done: s.done,
    tipoCompanhia: s.tipoCompanhia,
    sexoDeclarado: { ...s.sexoDeclarado },
    permissoes: { ...s.permissoes },
  };
}

function snapshotPessoa(): Record<string, unknown> {
  const s = usePessoa.getState();
  return {
    pessoaAtiva: s.pessoaAtiva,
    filtroPessoa: s.filtroPessoa,
    nomes: { ...s.nomes },
    fotos: { ...s.fotos },
  };
}

function snapshotNavegacao(): Record<string, unknown> {
  const s = useNavegacao.getState();
  return {
    menuAberto: s.menuAberto,
    sheetCapturaAberto: s.sheetCapturaAberto,
    scrollMenuLateralPosition: s.scrollMenuLateralPosition,
  };
}

// Pares (key, snapshot) na ordem canonica de execucao. Ordem
// preserva legibilidade no log de __DEV__ e e estavel; nenhum
// snapshot depende de outro.
const SNAPSHOTS: ReadonlyArray<readonly [EstadoKey, () => Record<string, unknown>]> = [
  ['settings', snapshotSettings],
  ['sessao', snapshotSessao],
  ['onboarding', snapshotOnboarding],
  ['pessoa', snapshotPessoa],
  ['navegacao', snapshotNavegacao],
];

// Migration boot canonico. Idempotente: flag bloqueia repeticao.
//
// Retorna void (Promise<void> pra interop com BOOT_HOOKS). NAO
// rejeita em caso de falha: silencia em prod, console.warn em __DEV__.
export async function migrarEstadoParaVault(): Promise<void> {
  const sessao = useSessao.getState();
  if (sessao.flags.estadoMigradoParaVault) {
    // Ja rodou ao menos uma vez nessa instalacao; subscribers de
    // cada store mantem o vault canonico atualizado dali pra frente.
    return;
  }

  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) {
    // Vault ainda nao autorizado (cold start pre-onboarding). NAO
    // marca a flag: tentaremos novamente no proximo boot quando o
    // vault root estiver populado. Subscribers tambem podem nao ter
    // a quem escrever durante a janela atual.
    return;
  }

  // Dispara 5 writes one-shot em sequencia. NAO usa debounce porque
  // sao writes deliberados de boot (nao agitacao de UI). Loop
  // sequencial pra que erros em um nao previnam os proximos.
  for (const [key, snapshot] of SNAPSHOTS) {
    try {
      await escreverEstadoCanonicoImediato(key, snapshot());
    } catch (e) {
      if (__DEV__) {
        console.warn(
          `migrarEstadoParaVault: falha ao migrar '${key}'. ` +
            `Best-effort, sem rollback. ` +
            `Erro: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      // Continua para as proximas keys.
    }
  }

  // Marca a flag mesmo em caso de falha parcial. Justificativa: o
  // proposito da flag e indicar "ja tentou pelo menos uma vez"; em
  // caso de erro real, subscribers das stores corrigem nas proximas
  // mutacoes. Sem marcar, ficariamos preso em loop de tentativas.
  useSessao.getState().marcarFlagBoot('estadoMigradoParaVault');
}
