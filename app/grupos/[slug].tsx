// Q19.b -- Detalhe + edicao de Grupo de Treino. Carrega via lerGrupo,
// pre-preenche FormGrupo com dados existentes, regrava em onSubmit.
// Botao Apagar remove o .md (rotinas vinculadas permanecem). Right
// slot do Header tem pill "Iniciar treino" -- abre BottomSheet
// SeletorTreinoDoGrupo se houver >1 rotina, ou pula direto pra
// /treinos/executar/<slug> se houver apenas 1.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play } from '@/lib/icons';
import {
  BottomSheet,
  Header,
  Screen,
  SHEET_70,
  useToast,
  type BottomSheetRef,
} from '@/components/ui';
import { FormGrupo, type FormGrupoSubmit } from '@/components/treino/FormGrupo';
import { SeletorTreinoDoGrupo } from '@/components/treino/SeletorTreinoDoGrupo';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  escreverGrupo,
  lerGrupo,
  removerGrupo,
} from '@/lib/vault/grupo_treino';
import {
  GrupoTreinoSchema,
  type GrupoTreino,
} from '@/lib/schemas/grupo_treino';
import { comTimeout } from '@/lib/util/comTimeout';

export default function GrupoDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();
  const sheetRef = useRef<BottomSheetRef>(null);

  const [grupo, setGrupo] = useState<GrupoTreino | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    if (!vaultRoot || !slugParam) {
      setGrupo(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lido = await lerGrupo(vaultRoot, slugParam);
      setGrupo(lido);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, slugParam]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSubmit = useCallback(
    async (dados: FormGrupoSubmit) => {
      if (!vaultRoot || !grupo || salvando) return;
      setSalvando(true);
      try {
        const proposto: GrupoTreino = {
          ...grupo,
          nome: dados.nome,
          descricao: dados.descricao,
          rotina_slugs: dados.rotina_slugs,
        };
        const parsed = GrupoTreinoSchema.safeParse(proposto);
        if (!parsed.success) {
          toast.show('Dados inválidos.', 'error');
          return;
        }
        await comTimeout(escreverGrupo(vaultRoot, parsed.data));
        void haptics.light();
        toast.show('Grupo atualizado.', 'success');
        setGrupo(parsed.data);
      } catch (e) {
        void haptics.error();
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [vaultRoot, grupo, salvando, toast]
  );

  const handleApagar = useCallback(async () => {
    if (!vaultRoot || !grupo) return;
    try {
      await comTimeout(removerGrupo(vaultRoot, grupo.slug));
      void haptics.light();
      toast.show('Grupo removido.', 'success');
      router.back();
    } catch {
      void haptics.error();
      toast.show('Não foi possível remover.', 'error');
    }
  }, [vaultRoot, grupo, toast, router]);

  const handleIniciarTreino = useCallback(() => {
    if (!grupo) return;
    void haptics.light();
    if (grupo.rotina_slugs.length === 1) {
      router.push({
        pathname: '/treinos/executar/[slug]',
        params: { slug: grupo.rotina_slugs[0] },
      });
      return;
    }
    sheetRef.current?.expand();
  }, [grupo, router]);

  const handleSelecionarRotina = useCallback(
    (rotinaSlug: string) => {
      sheetRef.current?.close();
      router.push({
        pathname: '/treinos/executar/[slug]',
        params: { slug: rotinaSlug },
      });
    },
    [router]
  );

  if (carregando) {
    return (
      <Screen>
        <Header title="Grupo" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!grupo) {
    return (
      <Screen>
        <Header title="Grupo" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 64 }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            Grupo não encontrado.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title={grupo.nome}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={handleIniciarTreino}
            accessibilityRole="button"
            accessibilityLabel="iniciar treino"
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: 'rgba(80, 250, 123, 0.16)',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.green,
            }}
          >
            <Play size={14} color={colors.green} strokeWidth={1.75} />
            <Text
              style={{
                color: colors.green,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              Iniciar
            </Text>
          </Pressable>
        }
      />
      <FormGrupo
        inicial={{
          nome: grupo.nome,
          descricao: grupo.descricao ?? '',
          rotina_slugs: grupo.rotina_slugs,
        }}
        onSubmit={handleSubmit}
        onCancelar={() => router.back()}
        onApagar={handleApagar}
        rotuloSalvar="Salvar alterações"
        salvando={salvando}
      />

      <BottomSheet ref={sheetRef} snapPoints={SHEET_70} index={-1}>
        <SeletorTreinoDoGrupo
          grupo={grupo}
          onSelect={handleSelecionarRotina}
          onCancelar={() => sheetRef.current?.close()}
        />
      </BottomSheet>
    </Screen>
  );
}
