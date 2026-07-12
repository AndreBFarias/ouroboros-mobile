// R-NAV-1 (Onda R, 2026-05-16): sheet auxiliar da tela /ciclo. Lista
// 3 atalhos de entrada para o registro:
//   - "Registrar hoje" -> /ciclo/registrar (form completo).
//   - "Adicionar sintoma" -> /ciclo/registrar (mesmo form; o usuario
//     decide focar na secao de sintomas).
//   - "Anotacao livre" -> /ciclo/registrar (mesmo form; foca no
//     campo texto).
//
// Todas as 3 opcoes vao para a mesma rota /ciclo/registrar; o atalho
// e' apenas um affordance visual no sheet (Simplicidade primeiro, sem
// query params novos enquanto a UX nao pedir). Diferenciar foco
// ficara para sprint futura caso usuario relate atrito.
//
// Componente exporta a funcao `montarAcaoExtraCiclo` que devolve
// o objeto `AcaoExtraCaptura` esperado pelo MenuCapturaVerde. A tela
// /ciclo (app/ciclo/index.tsx) hospeda o MenuCapturaVerde com essa
// acao injetada e o SheetRegistroCiclo montado em paralelo. Sem botao
// inline; FAB+ verde absorve a tarefa.
//
// Comentarios sem acento (convencao shell/CI).
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { Activity, FileText, Plus } from '@/lib/icons';
import {
  BottomSheet,
  SHEET_60,
  type BottomSheetRef,
} from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import type { AcaoExtraCaptura } from '@/components/chrome/MenuCapturaVerde';

interface ItemProps {
  icone: ReactNode;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}

// Item visual do sheet. Mesmo padrao do AcaoMenuItem do
// MenuCapturaVerde: Pressable + circulo de icone + label.
function ItemRegistro({
  icone,
  label,
  onPress,
  accessibilityLabel,
}: ItemProps): ReactNode {
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.input,
        minHeight: 56,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icone}
      </View>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export interface SheetRegistroCicloProps {
  // Callback opcional para o caller saber quando o sheet abre/fecha
  // (espelha pattern do MenuCapturaVerde). Quando o usuario escolhe
  // uma opcao, o sheet fecha automaticamente antes de navegar.
  onSheetChange?: (idx: number) => void;
}

export interface SheetRegistroCicloRef {
  abrir: () => void;
  fechar: () => void;
}

// Componente do sheet exposto via ref. O caller controla open/close
// programaticamente (ex: ao tap no item do MenuCapturaVerde acoesExtras).
export const SheetRegistroCiclo = forwardRef<
  SheetRegistroCicloRef,
  SheetRegistroCicloProps
>(function SheetRegistroCiclo({ onSheetChange }, ref) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const router = useRouter();

  const abrir = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  const fechar = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  useImperativeHandle(ref, () => ({ abrir, fechar }), [abrir, fechar]);

  const handleRegistrarHoje = useCallback(() => {
    fechar();
    router.push('/ciclo/registrar');
  }, [fechar, router]);

  const handleAdicionarSintoma = useCallback(() => {
    fechar();
    router.push('/ciclo/registrar');
  }, [fechar, router]);

  const handleAnotacaoLivre = useCallback(() => {
    fechar();
    router.push('/ciclo/registrar');
  }, [fechar, router]);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={SHEET_60}
      index={-1}
      onChange={onSheetChange}
    >
      <BottomSheetView style={{ paddingVertical: spacing.base }}>
        <Text
          style={{
            color: colors.purple,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.base,
          }}
        >
          Registrar ciclo
        </Text>
        <ItemRegistro
          icone={<Plus size={20} color={colors.purple} strokeWidth={2} />}
          label="Registrar hoje"
          onPress={handleRegistrarHoje}
          accessibilityLabel="registrar hoje"
        />
        <ItemRegistro
          icone={<Activity size={20} color={colors.purple} strokeWidth={2} />}
          label="Adicionar sintoma"
          onPress={handleAdicionarSintoma}
          accessibilityLabel="adicionar sintoma"
        />
        <ItemRegistro
          icone={<FileText size={20} color={colors.purple} strokeWidth={2} />}
          label="Anotação livre"
          onPress={handleAnotacaoLivre}
          accessibilityLabel="anotacao livre"
        />
      </BottomSheetView>
    </BottomSheet>
  );
});

// Helper canonico para integracao com MenuCapturaVerde. Devolve a
// definicao da acao contextual "Registrar ciclo" que abre o sheet
// quando o usuario toca no item do FAB+. O caller passa abrirSheet
// (callback que aciona o sheet montado em paralelo).
export function montarAcaoExtraCiclo(
  abrirSheet: () => void
): AcaoExtraCaptura {
  return {
    label: 'Registrar ciclo',
    icone: <Plus size={20} color={colors.green} strokeWidth={2} />,
    onPress: abrirSheet,
    accessibilityLabel: 'registrar ciclo',
  };
}
