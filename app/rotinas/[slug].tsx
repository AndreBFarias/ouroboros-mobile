// Detalhe + edicao de Rotina de Treino (Q11.a). Carrega via lerRotina,
// pre-preenche FormRotina com dados existentes, regrava em onSubmit
// (sobrescrevendo o .md). Botao "Apagar" remove o arquivo via
// removerRotina (sessoes ja salvas continuam intactas — snapshot
// imutavel, decisao spec §4.5).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Screen, useToast } from '@/components/ui';
import { FormRotina, type FormRotinaSubmit } from '@/components/treino/FormRotina';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  escreverRotina,
  lerRotina,
  removerRotina,
} from '@/lib/vault/rotina';
import { RotinaSchema, type RotinaMeta } from '@/lib/schemas/rotina';
import { comTimeout } from '@/lib/util/comTimeout';

export default function RotinaDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  const [rotina, setRotina] = useState<RotinaMeta | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    if (!vaultRoot || !slugParam) {
      setRotina(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lida = await lerRotina(vaultRoot, slugParam);
      setRotina(lida);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, slugParam]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSubmit = useCallback(
    async (dados: FormRotinaSubmit) => {
      if (!vaultRoot || !rotina || salvando) return;
      setSalvando(true);
      try {
        const proposto: RotinaMeta = {
          ...rotina,
          nome: dados.nome,
          descricao: dados.descricao,
          exercicios: dados.exercicios,
        };
        const parsed = RotinaSchema.safeParse(proposto);
        if (!parsed.success) {
          toast.show('Dados inválidos.', 'error');
          return;
        }
        await comTimeout(escreverRotina(vaultRoot, parsed.data));
        void haptics.light();
        toast.show('Rotina atualizada.', 'success');
        setRotina(parsed.data);
      } catch (e) {
        void haptics.error();
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [vaultRoot, rotina, salvando, toast]
  );

  const handleApagar = useCallback(async () => {
    if (!vaultRoot || !rotina) return;
    try {
      await comTimeout(removerRotina(vaultRoot, rotina.slug));
      void haptics.light();
      toast.show('Rotina removida.', 'success');
      router.back();
    } catch {
      void haptics.error();
      toast.show('Não foi possível remover.', 'error');
    }
  }, [vaultRoot, rotina, toast, router]);

  if (carregando) {
    return (
      <Screen>
        <Header title="Rotina" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!rotina) {
    return (
      <Screen>
        <Header title="Rotina" onBack={() => router.back()} />
        <View style={{ flex: 1, paddingTop: spacing.huge }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            Rotina não encontrada.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={rotina.nome} onBack={() => router.back()} />
      <FormRotina
        inicial={{
          nome: rotina.nome,
          descricao: rotina.descricao ?? '',
          exercicios: rotina.exercicios,
        }}
        onSubmit={handleSubmit}
        onCancelar={() => router.back()}
        onApagar={handleApagar}
        rotuloSalvar="Salvar alterações"
        salvando={salvando}
      />
    </Screen>
  );
}
