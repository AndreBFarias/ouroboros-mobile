// Glifo Ouroboros animavel (R-BRAND-3-GLIFO). Renderiza a anatomia
// canonica (43 contas + cabeca + cauda + boca + olho + anel + wordmark)
// a partir da fonte unica geometria.ts e expoe cada elemento a um
// DRIVER de shared values. Sem driver -> estatico, byte-identico ao
// OuroborosLogo. Cada um dos 17 conceitos da marca dirige apenas
// opacidade/transform/cor sobre este glifo.
//
// Padroes reaproveitados do OuroborosLoader (referencia viva):
//   M25.2 -- em web, react-native-svg NAO propaga animatedProps para o
//     DOM; um rAF escreve opacity/transform via data-anim-id +
//     setAttribute, escopado ao <Svg> proprio.
//   R-CRIT-4 -- UUID por instancia (useRef) evita colisao de seletor
//     entre glifos irmaos na mesma pagina. gerarUuidInstancia e'
//     replicado aqui (spec §6.3.4 permite replicar em vez de extrair
//     util novo, para nao inflar o escopo desta sprint).
//   A27 -- em native (Fabric) NUNCA emitir transform string em SVG;
//     usar prop rotation + originX/originY. Ramifica por Platform.OS.
//   Reduce-motion -- useReduceMotion incondicional; com reducao ativa o
//     rAF web nao arma (o glifo reflete o estado de repouso que o
//     consumidor deixou nas shared values).
//
// Comentarios sem acento (convencao shell/CI).
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import {
  ANEL,
  BOCA,
  CABECA,
  CAUDA,
  CONTAS,
  OLHO,
  RAIO_CONTA,
  RING_CENTER,
  VIEWBOX,
  WORDMARK,
} from './geometria';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// R-CRIT-4: id unico por instancia (replicado do OuroborosLoader). Combina
// contador em modulo + random + perf.now, seguro sem crypto global no RN.
let CONTADOR_UUID = 0;
function gerarUuidInstancia(): string {
  CONTADOR_UUID += 1;
  const aleatorio = Math.floor(Math.random() * 1e9).toString(36);
  const tempo =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? Math.floor(performance.now() * 1000).toString(36)
      : Date.now().toString(36);
  return `${CONTADOR_UUID}${aleatorio}${tempo}`;
}

// Driver de shared values por elemento anatomico. Cada campo e' opcional:
// ausente -> elemento estatico no valor de repouso da geometria.
export interface DriverGlifo {
  // opacidade por conta num unico shared value (indice 0..42, alinhado a
  // CONTAS) -- evita 43 useSharedValue (regra dos hooks) e mantem 1 escrita
  // de array por frame no worklet.
  contas?: SharedValue<number[]>;
  cabeca?: SharedValue<number>;
  cauda?: SharedValue<number>;
  boca?: SharedValue<number>;
  olho?: SharedValue<number>;
  // rotacao do anel em graus (origem RING_CENTER, anti-wobble)
  anelRotacao?: SharedValue<number>;
}

// Overrides de cor (semente para o tint por pessoa B3, fora desta sprint).
export interface OverridesCor {
  contas?: string; // fill uniforme das contas
  cabeca?: string;
  cauda?: string;
  boca?: string;
}

export interface OuroborosGlifoProps {
  tamanho?: number;
  mostrarTexto?: boolean;
  hideBeads?: boolean;
  hideRosto?: boolean;
  hideRing?: boolean;
  hideWordmark?: boolean;
  // subset de contas visiveis (ids 'conta-01'..'conta-43'); ausente -> todas
  contasVisiveis?: string[];
  // override do viewBox (recorte, ex: E1); ausente -> viewBox canonico
  viewBox?: string;
  driver?: DriverGlifo;
  cores?: OverridesCor;
}

// Filho: uma conta animavel. useAnimatedProps no topo do componente
// (regra dos hooks satisfeita mesmo renderizando N contas via map).
function ContaAnim({
  cx,
  cy,
  fill,
  svContas,
  idx,
  animId,
}: {
  cx: number;
  cy: number;
  fill: string;
  svContas?: SharedValue<number[]>;
  idx: number;
  animId: string;
}) {
  const props = useAnimatedProps(() => {
    const valor = svContas ? svContas.value[idx] : 1;
    return { opacity: valor == null ? 1 : valor };
  });
  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={RAIO_CONTA}
      fill={fill}
      opacity={1}
      animatedProps={props}
      data-anim-id={animId}
    />
  );
}

export function OuroborosGlifo({
  tamanho = 320,
  mostrarTexto = true,
  hideBeads = false,
  hideRosto = false,
  hideRing = false,
  hideWordmark = false,
  contasVisiveis,
  viewBox,
  driver,
  cores,
}: OuroborosGlifoProps) {
  const reduzir = useReduceMotion();
  const isWeb = Platform.OS === 'web';

  // R-CRIT-4: UUID por instancia, estavel entre re-renders.
  const refUuid = useRef<string | null>(null);
  if (refUuid.current === null) {
    refUuid.current = gerarUuidInstancia();
  }
  const animId = refUuid.current;
  const idConta = (id: string) => `ob-${animId}-${id}`;
  const idCabeca = `ob-${animId}-cabeca`;
  const idCauda = `ob-${animId}-cauda`;
  const idBoca = `ob-${animId}-boca`;
  const idOlho = `ob-${animId}-olho`;
  const idAnel = `ob-${animId}-anel`;

  // Ref do <Svg> raiz, escopo do querySelector em web (defense-in-depth).
  const refSvg = useRef<React.ComponentRef<typeof Svg>>(null);

  // useAnimatedProps do rosto e do anel no topo (contagem estavel).
  const svCabeca = driver?.cabeca;
  const svCauda = driver?.cauda;
  const svBoca = driver?.boca;
  const svOlho = driver?.olho;
  const svAnel = driver?.anelRotacao;

  const propsCabeca = useAnimatedProps(() => ({
    opacity: svCabeca ? svCabeca.value : 1,
  }));
  const propsCauda = useAnimatedProps(() => ({
    opacity: svCauda ? svCauda.value : 1,
  }));
  const propsBoca = useAnimatedProps(() => ({
    opacity: svBoca ? svBoca.value : 1,
  }));
  const propsOlho = useAnimatedProps(() => ({
    opacity: svOlho ? svOlho.value : OLHO.opacity,
  }));
  // A27: web usa transform string; native usa prop rotation numerica.
  const propsAnel = useAnimatedProps(() => {
    const deg = svAnel ? svAnel.value : 0;
    return (
      isWeb
        ? { transform: `rotate(${deg} ${RING_CENTER.x} ${RING_CENTER.y})` }
        : { rotation: deg }
    ) as Record<string, unknown>;
  });

  // Existe alguma coreografia por frame? (contas, rosto ou rotacao do anel)
  const temDriverAnimado = !!(
    driver &&
    (driver.contas ||
      driver.cabeca ||
      driver.cauda ||
      driver.boca ||
      driver.olho ||
      driver.anelRotacao)
  );

  // M25.2: em web o rAF le as shared values do driver e escreve no DOM via
  // data-anim-id. Em native este bloco e' no-op (Reanimated assume).
  useEffect(() => {
    if (!isWeb) return;
    if (reduzir) return; // reduce-motion: nao arma o rAF (estado de repouso)
    if (!temDriverAnimado) return;

    let raf = 0;
    const tick = () => {
      const candidato = refSvg.current as unknown as
        | { querySelectorAll?: (s: string) => NodeListOf<Element> }
        | null;
      const escopo: Document | Element =
        candidato && typeof candidato.querySelectorAll === 'function'
          ? (candidato as unknown as Element)
          : document;
      const escreverAttr = (seletor: string, attr: string, valor: string) => {
        escopo.querySelectorAll(seletor).forEach((no) => {
          no.setAttribute(attr, valor);
        });
      };

      if (driver?.contas) {
        const valores = driver.contas.value;
        CONTAS.forEach((_, i) => {
          const valor = valores[i];
          if (valor == null) return;
          const id = `conta-${String(i + 1).padStart(2, '0')}`;
          escreverAttr(
            `[data-anim-id="${idConta(id)}"]`,
            'opacity',
            valor.toFixed(3)
          );
        });
      }
      if (svCabeca)
        escreverAttr(`[data-anim-id="${idCabeca}"]`, 'opacity', svCabeca.value.toFixed(3));
      if (svCauda)
        escreverAttr(`[data-anim-id="${idCauda}"]`, 'opacity', svCauda.value.toFixed(3));
      if (svBoca)
        escreverAttr(`[data-anim-id="${idBoca}"]`, 'opacity', svBoca.value.toFixed(3));
      if (svOlho)
        escreverAttr(`[data-anim-id="${idOlho}"]`, 'opacity', svOlho.value.toFixed(3));
      if (svAnel)
        escreverAttr(
          `[data-anim-id="${idAnel}"]`,
          'transform',
          `rotate(${svAnel.value} ${RING_CENTER.x} ${RING_CENTER.y})`
        );

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isWeb, reduzir, temDriverAnimado, animId]);

  // Filtra as contas visiveis (subset para E1).
  const contasParaRender = CONTAS.map((c, i) => ({
    cx: c[0],
    cy: c[1],
    fill: cores?.contas ?? c[2],
    id: `conta-${String(i + 1).padStart(2, '0')}`,
    idx: i,
  })).filter((c) => !contasVisiveis || contasVisiveis.includes(c.id));

  const exibeWordmark = mostrarTexto && !hideWordmark;

  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessibilityLabel="glifo ouroboros"
      accessibilityRole="image"
    >
      <Svg
        ref={refSvg}
        width={tamanho}
        height={tamanho}
        viewBox={viewBox ?? VIEWBOX}
      >
        {/* anel pontilhado interno (rotacao em RING_CENTER, anti-wobble) */}
        {!hideRing ? (
          <AnimatedG
            animatedProps={propsAnel}
            originX={RING_CENTER.x}
            originY={RING_CENTER.y}
            data-anim-id={idAnel}
          >
            <Path
              d={ANEL.d}
              fill="none"
              stroke={ANEL.stroke}
              strokeWidth={ANEL.strokeWidth}
              strokeDasharray={ANEL.dash}
              strokeLinecap={ANEL.cap}
              opacity={ANEL.opacity}
            />
          </AnimatedG>
        ) : null}

        {/* 43 contas em degrade rosa->roxo */}
        {!hideBeads
          ? contasParaRender.map((c) => (
              <ContaAnim
                key={c.id}
                cx={c.cx}
                cy={c.cy}
                fill={c.fill}
                svContas={driver?.contas}
                idx={c.idx}
                animId={idConta(c.id)}
              />
            ))
          : null}

        {/* rosto: cauda (sob a cabeca), cabeca, olho, boca */}
        {!hideRosto ? (
          <>
            <AnimatedPath
              d={CAUDA.d}
              fill={cores?.cauda ?? CAUDA.fill}
              opacity={1}
              animatedProps={propsCauda}
              data-anim-id={idCauda}
            />
            <AnimatedPath
              d={CABECA.d}
              fill={cores?.cabeca ?? CABECA.fill}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={1}
              animatedProps={propsCabeca}
              data-anim-id={idCabeca}
            />
            <AnimatedCircle
              cx={OLHO.cx}
              cy={OLHO.cy}
              r={OLHO.r}
              fill={OLHO.fill}
              opacity={OLHO.opacity}
              animatedProps={propsOlho}
              data-anim-id={idOlho}
            />
            <AnimatedPath
              d={BOCA.d}
              fill={cores?.boca ?? BOCA.fill}
              fillOpacity={BOCA.fillOpacity}
              opacity={1}
              animatedProps={propsBoca}
              data-anim-id={idBoca}
            />
          </>
        ) : null}

        {/* wordmark central (estatico, nao dirigido) */}
        {exibeWordmark ? (
          <G>
            <SvgText
              x={WORDMARK.centroTexto.x}
              y={WORDMARK.centroTexto.y + WORDMARK.secundariaOffsetY}
              textAnchor="middle"
              fontFamily={WORDMARK.fontFamily}
              fontSize={WORDMARK.secundariaFontSize}
              letterSpacing={WORDMARK.secundariaLetterSpacing}
              fill={WORDMARK.secundariaCor}
            >
              {WORDMARK.secundaria}
            </SvgText>
            <SvgText
              x={WORDMARK.centroTexto.x}
              y={WORDMARK.centroTexto.y + WORDMARK.primariaOffsetY}
              textAnchor="middle"
              fontFamily={WORDMARK.fontFamily}
              fontSize={WORDMARK.primariaFontSize}
              fontWeight={WORDMARK.primariaFontWeight}
              letterSpacing={WORDMARK.primariaLetterSpacing}
              fill={WORDMARK.primariaCor}
            >
              {WORDMARK.primaria}
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
