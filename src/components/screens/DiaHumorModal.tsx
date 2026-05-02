// Modal do dia (Tela 21). Aparece via tap em um quadrado do heatmap
// que tenha registros. Mostra os 4 sliders readonly (humor, energia,
// ansiedade, foco), tags e frase do dia. Em modo sobreposto, lista
// ambos os registros (pessoa_a + pessoa_b empilhados); em modo
// individual, apenas o do dia/pessoa filtrada.
//
// Comentarios sem acento (convencao shell/CI).
import { type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { PersonAvatar } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { usePessoa } from '@/lib/stores/pessoa';
import type { HumorHeatmapCell } from '@/lib/schemas/humor_heatmap_cache';

interface SliderReadonlyProps {
  rotulo: string;
  valor: number;
  cor: string;
}

function SliderReadonly({
  rotulo,
  valor,
  cor,
}: SliderReadonlyProps): ReactNode {
  // Barra horizontal 1..5: 5 segmentos com valor preenchido em cor
  // de acento; restante em bg-elev. Sentence case no rotulo.
  return (
    <View
      style={{ gap: spacing.xs }}
      accessibilityLabel={`${rotulo} ${valor} de 5`}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {rotulo}
        </Text>
        <Text
          style={{
            color: cor,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {valor} / 5
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: i <= valor ? cor : colors.bgElev,
            }}
          />
        ))}
      </View>
    </View>
  );
}

interface BlocoRegistroProps {
  registro: HumorHeatmapCell;
  nomeExibicao: string;
}

function BlocoRegistro({
  registro,
  nomeExibicao,
}: BlocoRegistroProps): ReactNode {
  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <PersonAvatar pessoa={registro.autor} size="sm" />
        <Text
          style={{
            color:
              registro.autor === 'pessoa_a' ? colors.purple : colors.pink,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {nomeExibicao}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SliderReadonly
          rotulo="Humor"
          valor={registro.humor}
          cor={colors.cyan}
        />
        <SliderReadonly
          rotulo="Energia"
          valor={registro.energia}
          cor={colors.yellow}
        />
        <SliderReadonly
          rotulo="Ansiedade"
          valor={registro.ansiedade}
          cor={colors.orange}
        />
        <SliderReadonly
          rotulo="Foco"
          valor={registro.foco}
          cor={colors.green}
        />
      </View>

      {registro.tags && registro.tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {registro.tags.map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.mutedDecor,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {registro.frase ? (
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 22,
            fontStyle: 'italic',
          }}
        >
          “{registro.frase}”
        </Text>
      ) : null}
    </View>
  );
}

export interface DiaHumorModalProps {
  data: string; // YYYY-MM-DD
  registros: HumorHeatmapCell[]; // 1 ou 2 registros (modo sobreposto)
}

export function DiaHumorModal({
  data,
  registros,
}: DiaHumorModalProps): ReactNode {
  const nomes = usePessoa((s) => s.nomes);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.base,
        paddingBottom: spacing.xl,
        gap: spacing.lg,
      }}
      accessibilityLabel="modal de humor do dia"
    >
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 18,
          lineHeight: 26,
        }}
      >
        Humor de {data}
      </Text>

      {registros.length === 0 ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          Sem registros para este dia.
        </Text>
      ) : null}

      {registros.map((reg, idx) => (
        <View
          key={`${reg.autor}-${idx}`}
          style={{
            gap: spacing.md,
            paddingTop: idx > 0 ? spacing.md : 0,
            borderTopWidth: idx > 0 ? 1 : 0,
            borderTopColor: colors.bgElev,
          }}
        >
          <BlocoRegistro
            registro={reg}
            nomeExibicao={nomes[reg.autor] ?? reg.autor}
          />
        </View>
      ))}
    </ScrollView>
  );
}
