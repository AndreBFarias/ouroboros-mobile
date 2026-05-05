// Wrapper sobre @gorhom/bottom-sheet com tema Dracula aplicado.
// Background bg-alt, handle indicator bg-elev, backdrop fade até
// opacity 0.5. Snap points configuraveis. Gesture nativo de fechar
// arrastando para baixo já esta embutido na lib. Accept ref via
// forwardRef para o consumidor chamar `.expand()` ou `.close()`.
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetProps as GorhomProps,
} from '@gorhom/bottom-sheet';
import { colors, radius } from '@/theme/tokens';
import { SHEET_DEFAULT } from './SHEET_PRESETS';

export interface BottomSheetProps {
  // Aceita readonly (presets de SHEET_PRESETS) e mutable (literais
  // ad-hoc em testes). O wrapper interno copia para um array novo
  // antes de repassar a Gorhom para evitar mutacao involuntaria.
  snapPoints?: ReadonlyArray<string | number>;
  index?: number;
  onChange?: (index: number) => void;
  children: ReactNode;
  enablePanDownToClose?: boolean;
  // M34.1: containerStyle override opcional. Default aplica
  // zIndex 100 para que sheets fiquem acima dos overlays globais
  // FABMenu (z=10) e MenuLateral (z=20). Consumidor pode passar
  // estilo proprio que sera mesclado ao default (override no merge).
  containerStyle?: StyleProp<ViewStyle>;
}

export type BottomSheetRef = GorhomBottomSheet;

// Fallback do snap quando consumidor não passa snapPoints. Vem do
// preset compartilhado SHEET_DEFAULT (['40%', '85%'], M01.4).
const DEFAULT_SNAP_POINTS: Array<string | number> = [...SHEET_DEFAULT];

// M34.1: z-index default acima dos overlays globais. FABMenu = 10,
// MenuLateral = 20. Sheet = 30 garante que botoes do rodape do
// sheet (Cancelar, Salvar) nao fiquem cobertos pelo FAB roxo.
const DEFAULT_CONTAINER_STYLE: ViewStyle = { zIndex: 100 };

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  function BottomSheet(
    {
      snapPoints,
      index = -1,
      onChange,
      children,
      enablePanDownToClose = true,
      containerStyle,
    },
    ref
  ) {
    // Copia para array mutavel: gorhom espera (string | number)[]
    // e ler a ref readonly diretamente quebra typing. spread ainda
    // mantem performance (memoizado por mudanca de referência).
    const points = useMemo<Array<string | number>>(
      () => [...(snapPoints ?? DEFAULT_SNAP_POINTS)],
      [snapPoints]
    );

    // M34.1: merge containerStyle default + override do consumidor.
    // Array de StyleProp permite que props especificas do consumidor
    // sobrescrevam o zIndex 100 quando explicitamente desejado, mas
    // mantem o default para todas as 4 chamadas atuais nao-customizadas.
    const mergedContainerStyle = useMemo<StyleProp<ViewStyle>>(
      () =>
        containerStyle === undefined
          ? DEFAULT_CONTAINER_STYLE
          : [DEFAULT_CONTAINER_STYLE, containerStyle],
      [containerStyle]
    );

    // M-SHEET-MODAL-SNAP (2026-05-05): em Web (Gauntlet/Nivel A+) o
    // gorhom v5 falha ao disparar useAnimatedReaction inicial -- o
    // sheet renderiza no DOM mas fica travado em transform
    // matrix(1, 0, 0, 1, 0, windowH) (fora do viewport, snap "fechado").
    // Confirma a Armadilha A17 (worklet de animacao inicial nao
    // executa em RN-Web). Fallback automatizado: em Platform 'web' e
    // index>=0, apos mount + 250ms (tempo de gorhom fazer onLayout +
    // normalizar detents), localizamos o container hosting (View com
    // matrix translate(0, ty>0) que cobre maior area) e setamos
    // transform direto via DOM para a posicao alvo. Idempotente e
    // controlado por flag de plataforma; em mobile real (Platform
    // 'android'/'ios') vira no-op completo. Replica o "fix manual"
    // documentado em A17 sem precisar de DevTools.
    //
    // NOTA A24: regex de extracao do ty usa RegExp constructor + string
    // (nao literal) por convencao defensiva de NativeWind 4 + Metro.
    // Padrao seguro mesmo sem [...] suspeitos no body.
    useEffect(() => {
      if (Platform.OS !== 'web') return;
      if (index === undefined || index < 0) return;
      const targetSnap = snapPoints?.[index] ?? points[index];
      if (targetSnap === undefined) return;

      let cancelled = false;
      // RegExp constructor + string evita literal /\.../ que poderia
      // ser confundido com seletor Tailwind arbitrario por NativeWind
      // 4 (A24). Captura o ty (translate Y) do matrix 2D do RN-Web.
      const matrixYRegex = new RegExp(
        '^matrix\\(\\s*1,\\s*0,\\s*0,\\s*1,\\s*0,\\s*(-?\\d+\\.?\\d*)\\)$'
      );
      const aplicar = () => {
        if (cancelled) return;
        if (typeof document === 'undefined') return;
        const win = document.defaultView ?? window;
        const winH = win.innerHeight;
        // Resolve snap em pixels: '70%' -> 0.7*winH; numero literal -> px.
        let snapPx: number;
        if (typeof targetSnap === 'number') {
          snapPx = targetSnap;
        } else if (typeof targetSnap === 'string' && targetSnap.endsWith('%')) {
          const pct = Number(targetSnap.slice(0, -1));
          if (!Number.isFinite(pct)) return;
          snapPx = (pct / 100) * winH;
        } else {
          return;
        }
        const targetY = Math.max(0, winH - snapPx);

        // Procura o container hosting do sheet: View absoluteFill
        // dentro da arvore que tem transform matrix translate(0, ty)
        // com ty proximo a winH (snap fechado) e cobre area > 50%
        // do viewport. Em Web o gorhom emite o transform via inline
        // style do RN-Web; nao tem classe identificadora.
        const todos = document.querySelectorAll('div');
        for (const el of Array.from(todos)) {
          const cs = win.getComputedStyle(el);
          const tr = cs.transform;
          if (!tr || tr === 'none' || !tr.startsWith('matrix(')) continue;
          // Extrai o ty (ultimo numero do matrix 2D) via regex acima.
          const m = tr.match(matrixYRegex);
          if (!m) continue;
          const ty = parseFloat(m[1]);
          // Heuristica: ty proximo de winH (sheet fechado) e elemento
          // largo (cobre mais da metade da largura).
          if (Math.abs(ty - winH) > 24) continue;
          const r = el.getBoundingClientRect();
          if (r.width < winH * 0.3) continue;
          // Aplica transform alvo. transition='none' para nao
          // gerar slide visual interrompido.
          (el as HTMLElement).style.transform = `matrix(1, 0, 0, 1, 0, ${targetY})`;
          (el as HTMLElement).style.transition = 'none';
          break;
        }
      };

      // Tenta multiplas vezes para cobrir o caso onde gorhom mede
      // containerHeight tarde (re-aplica transform errado depois do
      // primeiro fix). 250ms cobre o boot tipico em Gauntlet apos
      // navegacao a rota modal.
      const tA = setTimeout(aplicar, 250);
      const tB = setTimeout(aplicar, 750);
      const tC = setTimeout(aplicar, 1500);
      return () => {
        cancelled = true;
        clearTimeout(tA);
        clearTimeout(tB);
        clearTimeout(tC);
      };
    }, [index, snapPoints, points]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleChange = useCallback<NonNullable<GorhomProps['onChange']>>(
      (next) => {
        onChange?.(next);
      },
      [onChange]
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={index}
        snapPoints={points}
        onChange={handleChange}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        containerStyle={mergedContainerStyle}
        backgroundStyle={{
          backgroundColor: colors.bgAlt,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.bgElev,
          width: 40,
          height: 4,
        }}
      >
        {children}
      </GorhomBottomSheet>
    );
  }
);
