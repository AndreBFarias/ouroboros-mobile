// Tela 02 - Cadastro de novo exercício. Reusa ExercicioForm em modo
// 'novo'. Ao salvar, chama saveExercicio que copia o GIF (se houver)
// para gif/exercicio-<slug>.gif (layout-por-tipo H2, ADR-0023) e
// grava o companion .md em markdown/exercicio-<slug>.md.
//
// I-EXERCICIO (M-SAVE-EXERCICIO-VALIDA, 2026-05-07): aplica padrao
// canonico de save resilient (Bloco I do plano golden-zebra):
//   - comTimeout(30s) -- timeout maior que o default 10s porque copy
//     do GIF binario via SAF em OEMs lentos (MIUI/OneUI/HyperOS) leva
//     ate 25s para arquivos perto do limite de 5MB. Sem timeout, save
//     trava em loader infinito quando SAF write empaca silenciosamente
//     (sintoma A29).
//   - try/catch + toast com mensagem PT-BR clara.
//   - Toasts canonicos: 'Exercício salvo.' (success) e
//     'Não foi possível salvar: <msg>' (error).
//   - haptics.success / haptics.error como nos outros saves.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Header, Screen, useToast } from '@/components/ui';
import { ExercicioForm } from '@/components/exercicios';
import { useVault } from '@/lib/stores/vault';
import { saveExercicio } from '@/lib/exercicios/saveExercicio';
import type { Exercicio } from '@/lib/schemas/exercicio';
import { haptics } from '@/lib/haptics';
import { comTimeout } from '@/lib/util/comTimeout';

// I-EXERCICIO: timeout custom de 30s. Copy de GIF ate 5MB via SAF
// em OEMs agressivos pode demorar perto desse limite. Default
// SAVE_TIMEOUT_DEFAULT_MS=10s do helper cobre saves de .md puro;
// exercicio com binario precisa folga.
const SAVE_EXERCICIO_TIMEOUT_MS = 30_000;

export default function NovoExercicio() {
  const router = useRouter();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);

  const handleSalvar = useCallback(
    async (args: { meta: Exercicio; gifTemporario: string | null }) => {
      if (!vaultRoot) {
        haptics.error();
        toast.show('Vault não configurado.', 'error');
        return;
      }
      try {
        await comTimeout(
          saveExercicio({
            meta: args.meta,
            vaultRoot,
            gifTemporario: args.gifTemporario,
          }),
          SAVE_EXERCICIO_TIMEOUT_MS
        );
        haptics.success();
        toast.show('Exercício salvo.', 'success');
        router.back();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'falha desconhecida';
        haptics.error();
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
        // eslint-disable-next-line no-console
        console.error('save exercicio fail', err);
      }
    },
    [router, toast, vaultRoot]
  );

  return (
    <Screen>
      <Header title="Novo exercício" onBack={() => router.back()} />
      <ExercicioForm
        inicial={null}
        modo="novo"
        onSalvar={handleSalvar}
        onCancelar={() => router.back()}
      />
    </Screen>
  );
}
