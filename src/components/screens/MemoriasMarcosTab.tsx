// Tela 11 - Aba Marcos. Timeline vertical com linha bg-elev 1px a
// esquerda, dot 12dp green em cada item, card a direita com data
// muted + descricao fg + tags (chips minimos). Mais recente primeiro.
//
// Sem hierarquia visual de niveis ou ranking (ADR-0005). Marcos auto-
// gerados marcam um indicador discreto "auto" muted.
//
// FAB + cria marco manual.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import {
  BottomSheet,
  EmptyState,
  FAB,
  SHEET_70,
  type BottomSheetRef,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useMarcos } from '@/lib/hooks/useMarcos';
import { SheetNovoMarco } from './SheetNovoMarco';
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
        {marco.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
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

export function MemoriasMarcosTab(): ReactNode {
  const { marcos, recarregar } = useMarcos();
  const novoRef = useRef<BottomSheetRef>(null);

  const handleNovo = useCallback(() => {
    novoRef.current?.expand();
  }, []);

  const handleSalvo = useCallback(() => {
    novoRef.current?.close();
    void recarregar();
  }, [recarregar]);

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
        {marcos.length === 0 ? (
          <EmptyState frase="Marcos vão aparecer com o tempo." />
        ) : (
          marcos.map((m) => (
            <ItemTimeline key={`${m.data}-${m.descricao}`} marco={m} />
          ))
        )}
      </ScrollView>

      <FAB
        icon={<Plus size={24} color={colors.bg} strokeWidth={2} />}
        onPress={handleNovo}
        accessibilityLabel="adicionar marco"
      />

      <BottomSheet ref={novoRef} snapPoints={SHEET_70} index={-1}>
        <SheetNovoMarco
          onSalvo={handleSalvo}
          onCancelar={() => novoRef.current?.close()}
        />
      </BottomSheet>
    </View>
  );
}
