// Q17.d -- Bloco "Importados de Conexao Saude" exibido no topo da
// aba Evolucao. Tres cards horizontais com agregados dos ultimos N
// dias do Health Connect: passos da semana, ultimo peso, treinos
// externos. Tap no card de treinos abre sheet com a lista detalhada.
//
// Render zero quando o hook ainda nao carregou, quando o toggle esta
// off, ou quando nenhuma permission foi concedida. Empty state por
// card individual quando o reader correspondente nao trouxe dados
// (provavelmente o usuario nao tem fonte para aquele tipo no HC).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Activity, Footprints, Scale } from '@/lib/icons';
import {
  BottomSheet,
  SHEET_70,
  type BottomSheetRef,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { textPropsDecor } from '@/lib/a11y/textPropsDecor';
import { useHealthConnectResumo } from '@/lib/hooks/useHealthConnectResumo';
import type {
  ResumoPassos,
  ResumoPeso,
  ResumoTreinos,
} from '@/lib/health/resumo';

const MESES_PT_CURTO: Record<number, string> = {
  0: 'jan',
  1: 'fev',
  2: 'mar',
  3: 'abr',
  4: 'mai',
  5: 'jun',
  6: 'jul',
  7: 'ago',
  8: 'set',
  9: 'out',
  10: 'nov',
  11: 'dez',
};

function formatarDataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES_PT_CURTO[d.getMonth()] ?? ''}`;
}

function formatarMilhar(n: number): string {
  return n.toLocaleString('pt-BR');
}

function formatarDeltaInt(delta: number): string {
  if (delta === 0) return '=';
  const sinal = delta > 0 ? '+' : '-';
  return `${sinal}${formatarMilhar(Math.abs(delta))}`;
}

function formatarKg(kg: number): string {
  return kg.toFixed(1).replace('.', ',');
}

function formatarDeltaKg(delta: number | null): string {
  if (delta === null) return '';
  if (Math.abs(delta) < 0.05) return '=';
  const sinal = delta > 0 ? '+' : '-';
  return `${sinal}${Math.abs(delta).toFixed(1).replace('.', ',')} kg`;
}

interface CardProps {
  icone: ReactNode;
  label: string;
  valor: string;
  detalhe?: string;
  onPress?: () => void;
  accessibilityLabel: string;
}

function MiniCard({ icone, label, valor, detalhe, onPress, accessibilityLabel }: CardProps): ReactNode {
  const conteudo = (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icone}
        <Text
          {...textPropsDecor()}
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 14,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          lineHeight: 24,
        }}
      >
        {valor}
      </Text>
      {detalhe ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 14,
          }}
        >
          {detalhe}
        </Text>
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{ flex: 1 }}
      >
        {conteudo}
      </Pressable>
    );
  }
  return conteudo;
}

function CardPassos({ resumo }: { resumo: ResumoPassos | null }): ReactNode {
  const total = resumo?.totalSemanaAtual ?? 0;
  const delta = resumo?.deltaAbsoluto ?? 0;
  return (
    <MiniCard
      icone={<Footprints size={14} color={colors.cyan} strokeWidth={2} />}
      label="passos 7d"
      valor={resumo ? formatarMilhar(total) : '—'}
      detalhe={resumo ? `${formatarDeltaInt(delta)} vs semana anterior` : 'Sem dados'}
      accessibilityLabel="passos da semana"
    />
  );
}

function CardPeso({ resumo }: { resumo: ResumoPeso | null }): ReactNode {
  return (
    <MiniCard
      icone={<Scale size={14} color={colors.purple} strokeWidth={2} />}
      label="peso"
      valor={resumo ? `${formatarKg(resumo.ultimoKg)} kg` : '—'}
      detalhe={
        resumo
          ? resumo.deltaKg !== null
            ? `${formatarDeltaKg(resumo.deltaKg)} em ${formatarDataCurta(resumo.ultimaData)}`
            : formatarDataCurta(resumo.ultimaData)
          : 'Sem dados'
      }
      accessibilityLabel="ultimo peso registrado"
    />
  );
}

function CardTreinos({
  resumo,
  onPress,
}: {
  resumo: ResumoTreinos | null;
  onPress: () => void;
}): ReactNode {
  const tem = resumo && resumo.ultimos30dias > 0;
  return (
    <MiniCard
      icone={<Activity size={14} color={colors.green} strokeWidth={2} />}
      label="treinos 30d"
      valor={resumo ? String(resumo.ultimos30dias) : '—'}
      detalhe={tem ? 'toque para ver lista' : 'Sem dados'}
      onPress={tem ? onPress : undefined}
      accessibilityLabel={`${resumo?.ultimos30dias ?? 0} treinos externos nos ultimos 30 dias`}
    />
  );
}

export function CardHCResumo(): ReactNode {
  const { habilitado, loading, passos, peso, treinos } = useHealthConnectResumo();
  const sheetRef = useRef<BottomSheetRef>(null);

  const abrirLista = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  if (!habilitado) {
    return null;
  }

  return (
    <View
      style={{
        gap: spacing.xs,
        marginBottom: spacing.lg,
      }}
    >
      <Text
        {...textPropsDecor()}
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          lineHeight: 14,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: spacing.xs,
        }}
      >
        importados de Conexao Saude
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <CardPassos resumo={passos} />
        <CardPeso resumo={peso} />
        <CardTreinos resumo={treinos} onPress={abrirLista} />
      </View>
      {loading ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 14,
            marginTop: spacing.xs,
          }}
        >
          atualizando…
        </Text>
      ) : null}

      <BottomSheet ref={sheetRef} snapPoints={SHEET_70} index={-1}>
        <ListaTreinosHC treinos={treinos} />
      </BottomSheet>
    </View>
  );
}

function ListaTreinosHC({ treinos }: { treinos: ResumoTreinos | null }): ReactNode {
  if (!treinos || treinos.lista.length === 0) {
    return (
      <View style={{ padding: spacing.lg }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          Nenhum treino externo registrado nos últimos 30 dias.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
        gap: spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 16,
          lineHeight: 24,
          marginBottom: spacing.sm,
        }}
      >
        Treinos externos
      </Text>
      {treinos.lista.map((t) => (
        <View
          key={t.uuid}
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: 12,
            padding: spacing.base,
            gap: spacing.xs,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {t.rotulo}
            </Text>
            <Text
              {...textPropsDecor()}
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 14,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {formatarDataCurta(t.inicio)}
            </Text>
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            {t.duracaoMin} min
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
