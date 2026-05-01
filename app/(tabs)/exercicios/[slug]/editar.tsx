// Tela 02 reusada em modo edicao. Carrega o exercicio existente
// pelo slug e pre-preenche o ExercicioForm. Ao salvar, regrava o
// .md mantendo slug e historico imutaveis. GIF novo substitui o
// arquivo em assets/exercicios/<slug>.gif.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Screen, EmptyState, useToast } from '@/components/ui';
import { ExercicioForm } from '@/components/exercicios';
import { useVault } from '@/lib/stores/vault';
import { lerExercicio } from '@/lib/vault/exercicios';
import { saveExercicio } from '@/lib/exercicios/saveExercicio';
import { haptics } from '@/lib/haptics';
import type { Exercicio } from '@/lib/schemas/exercicio';

export default function EditarExercicio() {
  const router = useRouter();
  const toast = useToast();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [carregando, setCarregando] = useState(true);
  const [inicial, setInicial] = useState<Exercicio | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      if (!vaultRoot || !slug) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const meta = await lerExercicio(vaultRoot, slug);
        if (!cancelled) setInicial(meta);
      } finally {
        if (!cancelled) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      cancelled = true;
    };
  }, [vaultRoot, slug]);

  const handleSalvar = useCallback(
    async (args: { meta: Exercicio; gifTemporario: string | null }) => {
      if (!vaultRoot || !inicial) {
        haptics.error();
        toast.show('Vault não configurado.', 'error');
        return;
      }
      try {
        await saveExercicio({
          // Slug e historico vem da meta original; o form so altera
          // os campos editaveis e devolve.
          meta: {
            ...args.meta,
            slug: inicial.slug,
            historico: inicial.historico,
          },
          vaultRoot,
          gifTemporario: args.gifTemporario,
        });
        haptics.success();
        toast.show('Alterações salvas.', 'success');
        router.back();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'falha desconhecida';
        haptics.error();
        toast.show(`Falha ao salvar: ${msg}`, 'error');
      }
    },
    [inicial, router, toast, vaultRoot]
  );

  if (carregando) {
    return (
      <Screen>
        <Header title="Editar exercício" onBack={() => router.back()} />
      </Screen>
    );
  }

  if (!inicial) {
    return (
      <Screen>
        <Header title="Editar exercício" onBack={() => router.back()} />
        <EmptyState frase="Exercício não encontrado." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Editar exercício" onBack={() => router.back()} />
      <ExercicioForm
        inicial={inicial}
        modo="editar"
        onSalvar={handleSalvar}
        onCancelar={() => router.back()}
      />
    </Screen>
  );
}
