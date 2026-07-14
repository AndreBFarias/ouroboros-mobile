// R-BRAND-2-ANIMACOES (2026-07-13): loaders de marca com prop `variant`
// EXTENSIVEL. Peca IRMA do OuroborosLoader (que tem 14 consumidores e
// nao deve ser mexido in-place) — aqui vive o tratamento de "onda
// continua" (C2) e o "anel puro" inline (E2), ambos derivados do glifo
// ouroboros mas simplificados a um anel que gira.
//
// CONTRATO (frente A): a sprint R-BRAND-3-ESTADOS-VIVOS estende este
// componente com variants novos ('progresso' D1, estado de erro C3,
// ritual F2). Por isso `variant` e' union aberta na intencao e o
// mapa VARIANTES centraliza a config de cada uma — adicionar uma
// variante nova e' acrescentar uma entrada no mapa, sem tocar o corpo.
//
// Stack IDENTICA ao OuroborosLoader (JS puro, zero dep nativa nova):
// Reanimated 4 (useSharedValue/withRepeat/withTiming) no nativo +
// rAF/DOM em web. Web precisa do rAF porque o react-native-svg-web nao
// propaga o transform de useAnimatedProps para o <g> (mesma decisao
// M25.2 do loader). Em native o useAnimatedProps.rotation assume.
//
// Reduce-motion (obrigatorio, consome useReduceMotion): quando reduzir,
// os dois effects fazem early-return SEM armar loop nenhum (withRepeat
// native + rAF web) — o anel fica parado (fallback canonico B1: cobra
// parada "respirando" ja e' presenca, principio 01 da marca). O hook e'
// chamado no topo INCONDICIONAL; so o corpo dos effects e' condicional
// (regra dos hooks), igual ao padrao do OuroborosLoader/KenBurns.
//
// Comentarios sem acento (convencao shell/CI).
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme/tokens';
// R-AUDIT-A11Y-MOVIMENTO: fonte unica "posso animar?". A28-safe.
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

// Union aberta na intencao: R-BRAND-3 acrescenta 'progresso' | 'erro' |
// 'ritual' sem quebrar callers. Hoje sao duas.
export type OuroborosLoadingVariant = 'sync' | 'inline';

export interface OuroborosLoadingProps {
  // Qual tratamento visual. Default 'sync' (onda continua / C2).
  variant?: OuroborosLoadingVariant;
  // Tamanho do quadrado em pixels. Cada variante tem um default
  // proprio (sync maior, inline diminuto).
  tamanho?: number;
  // Cor do anel na variante 'inline' (contexto pode pedir red/green;
  // ver abas de midia). Ignorada na 'sync' (usa o degrade da marca).
  cor?: string;
  // Rotulo de leitor de tela (sem acento — convencao screen reader).
  accessibilityLabel?: string;
}

const AnimatedG = Animated.createAnimatedComponent(G);

// Centro do viewBox 100x100, pivot da rotacao.
const PIVOT = 50;

// C2: uma revolucao a cada 2.4s. Ritmo calmo e indeterminado, sem
// aceleracao — respiracao, nao urgencia (spec §3.6 item 1).
const DURACAO_REV_MS = 2400;

// Config por variante. Centraliza raio/traco/degrade/tamanho para que
// adicionar uma variante nova (R-BRAND-3) seja so uma entrada aqui.
interface VarianteConfig {
  raio: number;
  strokeWidth: number;
  // [arco visivel, lacuna] em unidades de perimetro do anel.
  dash: [number, number];
  usaDegrade: boolean;
  tamanhoPadrao: number;
}

const VARIANTES: Record<OuroborosLoadingVariant, VarianteConfig> = {
  // Onda continua: anel grosso com degrade rosa->roxo e um arco longo
  // que varre. Le como "digestao" da cobra.
  sync: {
    raio: 40,
    strokeWidth: 6,
    dash: [170, 82],
    usaDegrade: true,
    tamanhoPadrao: 44,
  },
  // Anel puro minimal: so o contorno, um arco curto girando. Sem
  // cobra/cabeca/wordmark — distinto do OuroborosLoader compacto.
  inline: {
    raio: 42,
    strokeWidth: 12,
    dash: [90, 174],
    usaDegrade: false,
    tamanhoPadrao: 18,
  },
};

// R-CRIT-4 (herdado do OuroborosLoader): id unico por instancia para o
// seletor do rAF em web nao colidir entre multiplos loaders na mesma
// arvore (ex.: varios anels inline numa lista). Sem isso, o
// querySelector pegaria o primeiro match e os demais ficariam estaticos.
let CONTADOR_ID = 0;
function gerarIdInstancia(): string {
  CONTADOR_ID += 1;
  const aleatorio = Math.floor(Math.random() * 1e9).toString(36);
  const tempo =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? Math.floor(performance.now() * 1000).toString(36)
      : Date.now().toString(36);
  return `${CONTADOR_ID}${aleatorio}${tempo}`;
}

export function OuroborosLoading({
  variant = 'sync',
  tamanho,
  cor,
  accessibilityLabel = 'carregando',
}: OuroborosLoadingProps) {
  const cfg = VARIANTES[variant];
  const lado = tamanho ?? cfg.tamanhoPadrao;

  const rotacao = useSharedValue(0);
  // R-AUDIT-A11Y-MOVIMENTO: reduce-motion (sistema OU toggle) para o
  // anel. Os effects abaixo fazem early-return sem armar loop; o
  // useAnimatedProps segue declarado (regra dos hooks) e com a shared
  // value em 0 emite rotacao 0 (estatico).
  const reduzir = useReduceMotion();

  // Id estavel por instancia (uma vez por mount) para o seletor web.
  const refId = useRef<string | null>(null);
  if (refId.current === null) {
    refId.current = gerarIdInstancia();
  }
  const idAnel = `ol-anel-${refId.current}`;

  // Ref do <Svg> raiz: escopo do querySelector em web (defense-in-depth,
  // mesmo racional do OuroborosLoader).
  const refSvg = useRef<React.ComponentRef<typeof Svg>>(null);

  // Web: rAF escreve o transform no <g> via data-anim-id. Em native
  // este bloco e no-op (Platform.OS !== 'web') e o Reanimated assume.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Reduce-motion nao arma o rAF: o anel fica sem transform (angulo 0).
    if (reduzir) return;
    let raf = 0;
    const tick = () => {
      // Timestamp absoluto para que re-mounts nao reiniciem o angulo.
      const t = Date.now();
      const ang = ((t / DURACAO_REV_MS) * 360) % 360;
      const candidato = refSvg.current as unknown as
        | { querySelectorAll?: (s: string) => NodeListOf<Element> }
        | null;
      const escopo: Document | Element =
        candidato && typeof candidato.querySelectorAll === 'function'
          ? (candidato as unknown as Element)
          : document;
      escopo
        .querySelectorAll(`[data-anim-id="${idAnel}"]`)
        .forEach((no) =>
          no.setAttribute('transform', `rotate(${ang} ${PIVOT} ${PIVOT})`)
        );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idAnel, reduzir]);

  // Native: withRepeat gira o anel 0 -> 360 em loop. Reduce-motion nao
  // arma (early-return); a shared value fica em 0 (anel parado).
  useEffect(() => {
    if (reduzir) return;
    rotacao.value = withRepeat(
      withTiming(360, { duration: DURACAO_REV_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(rotacao);
    };
  }, [rotacao, reduzir]);

  // Web emite transform string ("rotate(a cx cy)"); native emite
  // rotation numerica (Fabric quebra com string em transform de SVG).
  // Mesma ramificacao do OuroborosLoader (M25.1 + A27).
  const isWeb = Platform.OS === 'web';
  const propsAnel = useAnimatedProps(
    () =>
      (isWeb
        ? { transform: `rotate(${rotacao.value} ${PIVOT} ${PIVOT})` }
        : { rotation: rotacao.value }) as Record<string, unknown>
  );

  // Cor do arco. Degrade da marca na 'sync'; cor unica (default roxo)
  // na 'inline'.
  const corAnel = cfg.usaDegrade ? `url(#${idAnel}-grad)` : cor ?? colors.purple;

  return (
    <View
      style={{ width: lado, height: lado }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
    >
      <Svg ref={refSvg} width={lado} height={lado} viewBox="0 0 100 100">
        {cfg.usaDegrade ? (
          <Defs>
            <LinearGradient id={`${idAnel}-grad`} x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0%" stopColor={colors.purple} />
              <Stop offset="100%" stopColor={colors.pink} />
            </LinearGradient>
          </Defs>
        ) : null}
        <AnimatedG
          animatedProps={propsAnel}
          originX={PIVOT}
          originY={PIVOT}
          data-anim-id={idAnel}
        >
          <Circle
            cx={PIVOT}
            cy={PIVOT}
            r={cfg.raio}
            fill="none"
            stroke={corAnel}
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={cfg.dash}
          />
        </AnimatedG>
      </Svg>
    </View>
  );
}
