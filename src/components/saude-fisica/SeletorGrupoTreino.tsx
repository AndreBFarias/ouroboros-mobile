// R-SF-1 (Onda R, 2026-05-16): Conteudo do BottomSheet "Iniciar treino"
// disparado pelo FAB+ verde de Saude Fisica.
//
// Lista os Grupos de Treino existentes do autor (mesmo store das rotas
// /grupos/* e da GruposTab). Tap em grupo navega para /grupos/<slug>;
// na tela de detalhe (Q19.b) o usuario aperta a pill verde "Iniciar"
// que abre o SeletorTreinoDoGrupo se houver >1 rotina, ou pula direto
// para /treinos/executar/<slug> se houver 1.
//
// Optei por delegar para o detalhe (e nao iniciar direto a partir
// daqui) por dois motivos:
//   1) Q19.b ja resolveu a logica de 1-rotina-vs-N (atalho + sheet).
//      Reaproveitamento idempotente sem duplicar codigo.
//   2) O usuario que chega via FAB+ "Iniciar treino" provavelmente
//      quer visualizar o grupo antes de iniciar (qual rotina vai
//      cair, descricao, etc). O detalhe entrega isso.
//
// Empty state aponta para /grupos/novo quando o usuario ainda nao tem
// grupos cadastrados.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { Dumbbell } from '@/lib/icons';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarGrupos } from '@/lib/vault/grupo_treino';
import type { GrupoTreino } from '@/lib/schemas/grupo_treino';

export interface SeletorGrupoTreinoProps {
  onSelect: (grupoSlug: string) => void;
  onCancelar: () => void;
}

export function SeletorGrupoTreino({
  onSelect,
  onCancelar,
}: SeletorGrupoTreinoProps): ReactNode {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const router = useRouter();
  const [grupos, setGrupos] = useState<GrupoTreino[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!vaultRoot) {
        setGrupos([]);
        setCarregando(false);
        return;
      }
      try {
        const lista = await listarGrupos(vaultRoot, pessoaAtiva);
        if (!cancelado) setGrupos(lista);
      } catch {
        if (!cancelado) setGrupos([]);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [vaultRoot, pessoaAtiva]);

  const handleEscolher = (slug: string) => {
    haptics.light();
    onSelect(slug);
  };

  const handleCriarGrupo = () => {
    haptics.light();
    onCancelar();
    router.push('/grupos/novo' as Parameters<typeof router.push>[0]);
  };

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          Iniciar treino
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          Escolha um grupo para abrir o detalhe e iniciar.
        </Text>

        {carregando ? (
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            carregando grupos…
          </Text>
        ) : grupos.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: spacing.lg,
              gap: spacing.sm,
            }}
            accessibilityLabel="nenhum grupo cadastrado"
          >
            <Dumbbell size={28} color={colors.mutedDecor} strokeWidth={1.5} />
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              Nenhum grupo cadastrado ainda. Crie um para começar.
            </Text>
            <Button
              label="Criar grupo"
              onPress={handleCriarGrupo}
              variant="ghost"
            />
          </View>
        ) : (
          grupos.map((g) => (
            <Pressable
              key={g.slug}
              onPress={() => handleEscolher(g.slug)}
              accessibilityRole="button"
              accessibilityLabel={`iniciar grupo ${g.nome}`}
              style={{
                backgroundColor: colors.bgAlt,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.bgElev,
                padding: spacing.base,
                gap: spacing.xs,
              }}
            >
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 14,
                  lineHeight: 22,
                }}
                numberOfLines={1}
              >
                {g.nome}
              </Text>
              <Text
                style={{
                  color: colors.mutedDecor,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 16,
                }}
              >
                {`${g.rotina_slugs.length} ${
                  g.rotina_slugs.length === 1 ? 'rotina' : 'rotinas'
                }`}
              </Text>
            </Pressable>
          ))
        )}

        <View style={{ marginTop: spacing.base }}>
          <Button label="Cancelar" onPress={onCancelar} variant="ghost" />
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
