// Tela de listagem de Contadores (M18). Render:
//   - Header "Contadores".
//   - Empty state "Comece quando quiser." quando lista vazia.
//   - Cards grandes (1 por linha, gap base) com número gigante cyan,
//     titulo orange, recorde muted e botao Resetei red text.
//   - FAB '+' canto inferior direito abre /contadores/novo.
//   - Modal de confirmacao destrutivo no reset; pos-confirmacao
//     atualiza a lista local e mostra toast "Reset registrado.".
//
// Toggle contadorDiasSem (já em useSettings, M00.5) controla a
// presenca da aba na bottom bar via _layout dos tabs. Esta tela e
// renderizada apenas quando o toggle esta on (deep link continua
// caindo aqui, mas e fluxo opt-in consciente).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Sigma } from '@/lib/icons';
import {
  EmptyState,
  FAB,
  Header,
  Screen,
  useToast,
} from '@/components/ui';
import { CardContador } from '@/components/contadores/CardContador';
import { ModalConfirmaReset } from '@/components/contadores/ModalConfirmaReset';
import { spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  listarContadores,
  registrarReset,
} from '@/lib/vault/contadores';
import type { Contador } from '@/lib/schemas/contador';

export default function ContadoresIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  const [contadores, setContadores] = useState<Contador[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [alvoReset, setAlvoReset] = useState<Contador | null>(null);
  const [enviandoReset, setEnviandoReset] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setContadores([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarContadores(vaultRoot);
      setContadores(lista);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const handleNovo = useCallback(() => {
    router.push('/contadores/novo');
  }, [router]);

  const handleAbrirCard = useCallback(
    (slug: string) => {
      router.push({
        pathname: '/contadores/[slug]',
        params: { slug },
      });
    },
    [router]
  );

  const handleAbrirReset = useCallback((contador: Contador) => {
    setAlvoReset(contador);
  }, []);

  const handleCancelarReset = useCallback(() => {
    setAlvoReset(null);
  }, []);

  const handleConfirmarReset = useCallback(async () => {
    if (!vaultRoot || !alvoReset || enviandoReset) return;
    setEnviandoReset(true);
    try {
      const atualizado = await registrarReset(vaultRoot, alvoReset.slug);
      void haptics.medium();
      toast.show('Reset registrado.', 'info');
      setContadores((cur) =>
        cur.map((c) => (c.slug === atualizado.slug ? atualizado : c))
      );
      setAlvoReset(null);
    } catch {
      void haptics.error();
      toast.show('Não foi possível registrar o reset.', 'error');
    } finally {
      setEnviandoReset(false);
    }
  }, [vaultRoot, alvoReset, enviandoReset, toast]);

  const semDados = !carregando && contadores.length === 0;

  return (
    <Screen>
      <Header title="Contadores" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        {semDados ? (
          <EmptyState frase="Comece quando quiser." Icon={Sigma} />
        ) : (
          contadores.map((contador) => (
            <CardContador
              key={contador.slug}
              contador={contador}
              onPressResetei={() => handleAbrirReset(contador)}
              onPressCard={() => handleAbrirCard(contador.slug)}
            />
          ))
        )}
      </ScrollView>

      <FAB onPress={handleNovo} accessibilityLabel="novo contador" />

      <ModalConfirmaReset
        visible={alvoReset !== null}
        onConfirmar={() => void handleConfirmarReset()}
        onCancelar={handleCancelarReset}
        enviando={enviandoReset}
      />
    </Screen>
  );
}
