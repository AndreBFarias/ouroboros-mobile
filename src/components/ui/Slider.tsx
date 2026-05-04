// Slider numerico com split por plataforma. Mantem assinatura
// publica unica (SliderProps) para zero impacto em consumidores.
//
// - Native (Android/iOS): @react-native-community/slider direto.
// - Web: <input type="range"> nativo via createElement, evitando
//   o loop infinito do RTCSliderWebComponent (descoberto em
//   2026-05-04 ao validar /medidas e /exercicios via Gauntlet:
//   "Maximum update depth exceeded ... RTCSliderWebComponent").
//
// Track 4dp bg-elev com fill purple, thumb 24dp purple, altura
// total 44dp para hit area WCAG AA. Cada step dispara haptic
// selection. Valor numerico em cyan ao lado do label. Acessibilidade:
// role adjustable com value range em ambas implementacoes.
import { createElement, useCallback, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  label?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

interface SliderInternoProps extends SliderProps {
  a11y: string;
  onTick: (next: number) => void;
}

// Implementacao native: usa @react-native-community/slider. Nao
// repete accessibilityLabel aqui (a View externa ja expoe role
// adjustable + label). Repetir provoca conflito em queries por
// label e nao traz benefit a screen reader (foco vai na View pai).
function SliderNative({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onTick,
}: SliderInternoProps) {
  return (
    <RNSlider
      minimumValue={min}
      maximumValue={max}
      step={step}
      value={value}
      disabled={disabled}
      onValueChange={onTick}
      minimumTrackTintColor={colors.purple}
      maximumTrackTintColor={colors.bgElev}
      thumbTintColor={colors.purple}
      style={{ width: '100%', height: 32, opacity: disabled ? 0.4 : 1 }}
    />
  );
}

// Implementacao web: <input type="range"> nativo HTML. Evita o
// loop AnimatedProps._callback -> dispatchReducerAction do RNSlider
// web. Estilo Dracula via inline style + CSS injetado uma unica vez
// no document.head para o thumb (pseudo-elementos nao podem ser
// aplicados via style inline).
const CSS_ID = 'ouroboros-slider-web-css';
function ensureCssWeb() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(CSS_ID)) return;
  const css = `
    .ouroboros-slider-web {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 44px;
      background: transparent;
      outline: none;
      cursor: pointer;
      padding: 0;
      margin: 0;
    }
    .ouroboros-slider-web:disabled { cursor: not-allowed; opacity: 0.4; }
    .ouroboros-slider-web::-webkit-slider-runnable-track {
      height: 4px;
      background: ${colors.bgElev};
      border-radius: 2px;
    }
    .ouroboros-slider-web::-moz-range-track {
      height: 4px;
      background: ${colors.bgElev};
      border-radius: 2px;
    }
    .ouroboros-slider-web::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 12px;
      background: ${colors.purple};
      border: none;
      margin-top: -10px;
      cursor: pointer;
    }
    .ouroboros-slider-web::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      background: ${colors.purple};
      border: none;
      cursor: pointer;
    }
    .ouroboros-slider-web:focus-visible::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px ${colors.cyan};
    }
    .ouroboros-slider-web:focus-visible::-moz-range-thumb {
      box-shadow: 0 0 0 3px ${colors.cyan};
    }
  `;
  const node = document.createElement('style');
  node.id = CSS_ID;
  node.textContent = css;
  document.head.appendChild(node);
}

function SliderWeb({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  a11y,
  onTick,
}: SliderInternoProps) {
  ensureCssWeb();
  // Usamos createElement para 'input' porque JSX puro de React Native
  // nao reconhece tag 'input' (RN-Web aceita via createElement).
  // NAO usamos onChange controlado em loop: o input nativo gerencia
  // seu proprio state visual e so emite o callback no input do
  // usuario. Sem dispatchReducerAction infinito.
  return createElement('input', {
    type: 'range',
    min,
    max,
    step,
    value,
    disabled,
    className: 'ouroboros-slider-web',
    'aria-label': a11y,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
    role: 'slider',
    onChange: (event: { target: { value: string } }) => {
      const parsed = Number(event.target.value);
      if (Number.isFinite(parsed)) onTick(parsed);
    },
  });
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  disabled = false,
  accessibilityLabel,
}: SliderProps) {
  const [lastTick, setLastTick] = useState<number>(value);

  const handleTick = useCallback(
    (next: number) => {
      const rounded = step > 0 ? Math.round(next / step) * step : next;
      if (rounded !== lastTick) {
        setLastTick(rounded);
        haptics.selection();
      }
      onChange(rounded);
    },
    [lastTick, onChange, step]
  );

  const display = step >= 1 ? Math.round(value).toString() : value.toFixed(2);
  const a11y =
    accessibilityLabel ?? (label ? `slider ${label}` : 'slider');

  const Impl = Platform.OS === 'web' ? SliderWeb : SliderNative;

  return (
    <View
      style={{ width: '100%', gap: spacing.xs }}
      accessibilityRole="adjustable"
      accessibilityLabel={a11y}
      accessibilityValue={{ min, max, now: value }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {label ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
            }}
          >
            {label}
          </Text>
        ) : (
          <View />
        )}
        <Text
          style={{
            color: colors.cyan,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
          }}
        >
          {display}
        </Text>
      </View>
      <Impl
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={onChange}
        a11y={a11y}
        onTick={handleTick}
      />
    </View>
  );
}
