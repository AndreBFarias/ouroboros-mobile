// Tela 02 - Cadastro de novo exercício. Reusa ExercicioForm em modo
// 'novo'. Ao salvar, chama saveExercicio que copia o GIF (se houver)
// para assets/exercicios/<slug>.gif e grava o .md.
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
        await saveExercicio({
          meta: args.meta,
          vaultRoot,
          gifTemporario: args.gifTemporario,
        });
        haptics.success();
        toast.show('Exercício criado.', 'success');
        router.back();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'falha desconhecida';
        haptics.error();
        toast.show(`Falha ao salvar: ${msg}`, 'error');
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
