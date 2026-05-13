// Q19.b -- Lista de rotinas com checkbox para multi-selecao. Renderiza
// no body do FormGrupo. Empty state com botao "Criar rotina" quando o
// vault nao tem nenhuma rotina do autor.
//
// Carrega via listarRotinas + filtra por pessoa ativa (autor). Cap 10
// reforcado: tentar marcar a 11a rotina e' ignorado (UI permanece) --
// caller mostra mensagem de erro se quiser.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Dumbbell } from '@/lib/icons';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarRotinas } from '@/lib/vault/rotina';
import type { RotinaMeta } from '@/lib/schemas/rotina';

const CAP_ROTINAS = 10;

export interface SeletorMultiRotinasProps {
  selecionados: string[];
  onChange: (slugs: string[]) => void;
}

export function SeletorMultiRotinas({
  selecionados,
  onChange,
}: SeletorMultiRotinasProps): ReactNode {
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

  const alternar = useCallback(
    (slug: string) => {
      haptics.light();
      const ja = selecionados.includes(slug);
      if (ja) {
        onChange(selecionados.filter((s) => s !== slug));
      } else if (selecionados.length < CAP_ROTINAS) {
        onChange([...selecionados, slug]);
      }
    },
    [selecionados, onChange]
  );

  const irParaCriarRotina = useCallback(() => {
    haptics.light();
    router.push('/rotinas/novo');
  }, [router]);

  if (!carregando && rotinas.length === 0) {
    return (
      <View
        style={{
          alignItems: 'center',
          paddingVertical: spacing.lg,
          gap: spacing.sm,
        }}
        accessibilityLabel="nenhuma rotina disponivel"
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
          Nenhuma rotina cadastrada. Crie uma antes para montar o grupo.
        </Text>
        <Button label="Criar rotina" onPress={irParaCriarRotina} variant="ghost" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ maxHeight: 360 }}
      contentContainerStyle={{ gap: spacing.sm }}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled
    >
      {rotinas.map((rotina) => {
        const ativa = selecionados.includes(rotina.slug);
        const desabilitado = !ativa && selecionados.length >= CAP_ROTINAS;
        return (
          <Pressable
            key={rotina.slug}
            onPress={() => alternar(rotina.slug)}
            disabled={desabilitado}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ativa, disabled: desabilitado }}
            accessibilityLabel={`rotina ${rotina.nome}`}
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: ativa ? colors.green : colors.bgElev,
              padding: spacing.base,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.base,
              opacity: desabilitado ? 0.4 : 1,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: ativa ? colors.green : colors.bgElev,
                backgroundColor: ativa ? colors.green : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ativa ? <Check size={16} color={colors.bg} strokeWidth={3} /> : null}
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 14,
                  lineHeight: 20,
                }}
                numberOfLines={1}
              >
                {rotina.nome}
              </Text>
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
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
