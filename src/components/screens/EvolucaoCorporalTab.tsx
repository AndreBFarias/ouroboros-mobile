// Tela 11 - Aba Evolucao Corporal (sprint L1 renomeou de "Marcos").
// Timeline vertical com linha bg-elev 1px a esquerda, dot 12dp green
// em cada item, card a direita com data muted + descricao fg + tags
// (chips minimos). Mais recente primeiro.
//
// O nome interno "Marcos" no schema (Marco, useMarcos, SheetNovoMarco)
// foi PRESERVADO para evitar regressao em vault/storage existente; a
// label da aba e o conceito UX viraram "Evolucao Corporal" porque o
// usuario percebe o conjunto como evolucao do corpo (treinos +
// medidas + fotos formam o trajeto, nao apenas anota momentos).
// Subsecao SecaoEvolucaoCorporal (M11.4) continua sendo o destaque
// visual: faixa horizontal de cards mensais com foto frontal + peso.
//
// Sem hierarquia visual de níveis ou ranking (ADR-0005). Marcos auto-
// gerados marcam um indicador discreto "auto" muted.
//
// M34.3: o FAB proprio "adicionar marco" foi REMOVIDO porque colidia
// com o FAB verde do MenuCapturaVerde (mesmas coordenadas 769,900).
// Em vez disso a tab registra sua acao contextual via prop
// onRegistrarAcaoExtra; o MenuCapturaVerde unificado renderiza
// "Adicionar marco" como primeiro item do sheet. Sheet interno
// SheetNovoMarco preservado para que a tab continue funcionando
// isoladamente caso seja reusada fora de SaudeFisicaScreen.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Plus } from '@/lib/icons';
import {
  BottomSheet,
  EmptyState,
  SHEET_70,
  type BottomSheetRef,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { textPropsDecor } from '@/lib/a11y/textPropsDecor';
import { useMarcos } from '@/lib/hooks/useMarcos';
import { SheetNovoMarco } from './SheetNovoMarco';
import { CardHCResumo } from './EvolucaoCorporalTab/CardHCResumo';
import { SecaoEvolucaoCorporal } from './EvolucaoCorporalTab/SecaoEvolucaoCorporal';
import type { AcaoExtraCaptura } from '@/components/chrome/MenuCapturaVerde';
import type { Marco } from '@/lib/schemas/marco';

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
  return `${d.getDate()} ${MESES_PT_CURTO[d.getMonth()] ?? ''}`;
}

function ItemTimeline({ marco }: { marco: Marco }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.base,
      }}
    >
      <View style={{ alignItems: 'center', width: 24 }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.green,
            marginTop: 4,
          }}
        />
        <View
          style={{
            width: 1,
            flex: 1,
            backgroundColor: colors.bgElev,
            marginTop: 4,
            minHeight: 32,
          }}
        />
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgAlt,
          borderRadius: 12,
          padding: spacing.base,
          gap: spacing.xs,
          marginBottom: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {formatarDataCurta(marco.data)}
          </Text>
          {marco.auto ? (
            <Text
              {...textPropsDecor()}
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 10,
                lineHeight: 14,
              }}
            >
              auto
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {marco.descricao}
        </Text>
        {marco.medidaRef ? (
          <Text
            style={{
              color: colors.purple,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 16,
            }}
          >
            {`Vinculado a medida ${formatarDataCurta(`${marco.medidaRef}T12:00:00-03:00`)}.`}
          </Text>
        ) : null}
        {marco.tags.length > 0 ? (
          <View
            style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}
          >
            {marco.tags.map((tag) => (
              <Text
                key={tag}
                style={{
                  color: colors.cyan,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                }}
              >
                #{tag}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// M34.3: prop opcional usada pela SaudeFisicaScreen para coletar a
// acao contextual da tab e injetar no MenuCapturaVerde. Quando
// undefined a tab funciona isoladamente (sem FAB visivel — em runtime
// fora da SaudeFisicaScreen o consumidor deve providenciar outro
// disparador).
export interface EvolucaoCorporalTabProps {
  onRegistrarAcaoExtra?: (acao: AcaoExtraCaptura | null) => void;
}

export function EvolucaoCorporalTab({
  onRegistrarAcaoExtra,
}: EvolucaoCorporalTabProps = {}): ReactNode {
  const { marcos, recarregar } = useMarcos();
  const novoRef = useRef<BottomSheetRef>(null);

  const handleNovo = useCallback(() => {
    novoRef.current?.expand();
  }, []);

  const handleSalvo = useCallback(() => {
    novoRef.current?.close();
    void recarregar();
  }, [recarregar]);

  // M34.3: registra a acao "Adicionar marco" no MenuCapturaVerde da
  // screen pai. Limpa no unmount para evitar leak da acao em outras
  // tabs.
  useEffect(() => {
    if (!onRegistrarAcaoExtra) return;
    onRegistrarAcaoExtra({
      label: 'Adicionar marco',
      icone: <Plus size={20} color={colors.green} strokeWidth={2} />,
      onPress: handleNovo,
      accessibilityLabel: 'adicionar marco',
    });
    return () => {
      onRegistrarAcaoExtra(null);
    };
  }, [onRegistrarAcaoExtra, handleNovo]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Q17.d: bloco "Importados de Conexao Saude" com passos,
            peso e treinos externos. Render zero quando toggle off
            ou sem permissions concedidas. */}
        <CardHCResumo />

        {/* M11.4: subsecao "Evolucao corporal" antes do timeline de
            marcos textuais. Faixa horizontal de cards mensais com
            foto frontal + peso + delta. Tap abre /medidas. Botao
            "Registrar evolucao" no header da secao aponta para
            /medidas/novo. */}
        <SecaoEvolucaoCorporal />

        {marcos.length === 0 ? (
          <EmptyState frase="Marcos vão aparecer com o tempo." />
        ) : (
          marcos.map((m) => (
            <ItemTimeline key={`${m.data}-${m.descricao}`} marco={m} />
          ))
        )}
      </ScrollView>

      <BottomSheet ref={novoRef} snapPoints={SHEET_70} index={-1}>
        <SheetNovoMarco
          onSalvo={handleSalvo}
          onCancelar={() => novoRef.current?.close()}
        />
      </BottomSheet>
    </View>
  );
}
