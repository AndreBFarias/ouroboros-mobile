// Conteudo de bottom sheet para escolher rotina como template ao
// abrir um SheetNovoTreino (Q11.b). Caller envolve em <BottomSheet>
// e controla via ref/state -- mesmo padrao do SheetNovoTreino.
//
// Lista as rotinas do autor + item "Sem rotina (treino livre)" no
// topo. Empty state explicito quando nenhuma rotina cadastrada,
// guiando o usuario para /rotinas.
//
// onSelect(rotina | null): null = treino livre (form em branco);
// rotina = pre-preenche via sessaoFromRotina no caller.
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
import { listarRotinas } from '@/lib/vault/rotina';
import type { RotinaMeta } from '@/lib/schemas/rotina';

export interface SeletorRotinaProps {
  onSelect: (rotina: RotinaMeta | null) => void;
  onCancelar: () => void;
}

export function SeletorRotina({
  onSelect,
  onCancelar,
}: SeletorRotinaProps): ReactNode {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const router = useRouter();
  const [rotinas, setRotinas] = useState<RotinaMeta[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!vaultRoot) {
        setRotinas([]);
        setCarregando(false);
        return;
      }
      try {
        const lista = await listarRotinas(vaultRoot, pessoaAtiva);
        if (!cancelado) setRotinas(lista);
      } catch {
        if (!cancelado) setRotinas([]);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [vaultRoot, pessoaAtiva]);

  const handleEscolher = (rotina: RotinaMeta | null) => {
    haptics.light();
    onSelect(rotina);
  };

  const handleIrParaRotinas = () => {
    haptics.light();
    onCancelar();
    router.push('/rotinas');
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
          Escolher rotina
        </Text>

        <Pressable
          onPress={() => handleEscolher(null)}
          accessibilityRole="button"
          accessibilityLabel="treino livre sem rotina"
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
          >
            Sem rotina (treino livre)
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Form em branco. Você escolhe os exercícios na hora.
          </Text>
        </Pressable>

        {carregando ? null : rotinas.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: spacing.lg,
              gap: spacing.sm,
            }}
            accessibilityLabel="nenhuma rotina cadastrada"
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
              Crie uma rotina em /rotinas para reutilizar como template.
            </Text>
            <Button
              label="Abrir rotinas"
              onPress={handleIrParaRotinas}
              variant="ghost"
            />
          </View>
        ) : (
          rotinas.map((rotina) => (
            <Pressable
              key={rotina.slug}
              onPress={() => handleEscolher(rotina)}
              accessibilityRole="button"
              accessibilityLabel={`escolher rotina ${rotina.nome}`}
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
                {rotina.nome}
              </Text>
              {rotina.descricao && rotina.descricao.trim().length > 0 ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                  numberOfLines={2}
                >
                  {rotina.descricao}
                </Text>
              ) : null}
              <Text
                style={{
                  color: colors.mutedDecor,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 16,
                }}
              >
                {`${rotina.exercicios.length} ${
                  rotina.exercicios.length === 1 ? 'exercício' : 'exercícios'
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
