// Versao animada do Ouroboros. 4 aneis girando em velocidades
// diferentes, mais oscilacao do stroke-dashoffset do anel interno
// para sugerir fluxo. Reproduz o efeito do desktop original (CSS
// keyframes em versao desktop/ouroboros-redesign-v1/style.css):
//
//   .gs-1   { animation: gs-spin   90s linear infinite; }
//   .gs-2   { animation: gs-spin   60s linear infinite reverse; }
//   .gs-3   { animation: gs-spin   30s linear infinite; }
//   .gs-flow{ animation: gs-flow    6s linear infinite; }
//
// Usa Reanimated 4 com useSharedValue + withRepeat + withTiming.
// Decisao M25.1 (revisao do M25 §10 patch 3): em web, react-native-svg
// converte <G rotation={N} originX={160} originY={160}> para o atributo
// transform="rotate(N)" SEM cx/cy, ignorando origin null no DOM. Isso
// fazia a rotacao acontecer em torno de (0,0) e o conteudo "varria"
// para fora do viewBox. Fix: passar transform como string SVG nativo
// "rotate(angle cx cy)" via useAnimatedProps. Esse formato funciona
// 1:1 em web (rn-svg-web nao toca) e em nativo (rn-svg parseia).
//
// Modo compacto (96px sem texto) para overlays e loaders inline.
// Modo cheio (320px com texto) para boot e onboarding.
//
// Cleanup: cancelAnimation no return do useEffect para evitar leak
// de worklet quando o componente desmonta antes de completar a
// rotacao (e.g. boot que vai direto para onboarding apos hidratar).
//
// R-CRIT-4 (2026-05-15): useId() do React pode colidir entre arvores
// independentes (e.g. _layout renderiza loader durante font-load e
// /agenda renderiza outro logo apos OAuth — mesmo slot position retorna
// o mesmo id ":r0:"). Quando dois loaders compartilham data-anim-id,
// document.querySelector pega so o primeiro match e o segundo loader
// fica estatico. Solucao: UUID por instancia via useRef, gerado uma
// vez no mount, garantindo unicidade global. Defense-in-depth: o
// querySelector e escopado ao <Svg> proprio via ref, evitando pegar
// nos de outros loaders mesmo se houver colisao acidental.
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
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';

export interface OuroborosLoaderProps {
  // Tamanho do quadrado em pixels (default 320, igual ao viewBox).
  tamanho?: number;
  // Modo compacto: 96px sem texto. Para overlays inline (M26 sheets,
  // M36 Recap, M37 OAuth Calendar). Default false (boot/onboarding).
  compacto?: boolean;
}

// Componentes animaveis. Reanimated exige createAnimatedComponent
// para que useAnimatedProps escreva direto na nativeProps do alvo
// sem causar re-render do componente React em cada frame.
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Cores hex literais que nao tem token (escama escura, mandibula
// inferior, texto secundario do wordmark). Bate com canon do desktop.
const COR_ESCAMA = '#0e0f15';
const COR_MANDIBULA_INFERIOR = '#c77ab0';
const COR_TEXTO_SECUNDARIO = '#7c7e8c';

// Centro do viewBox 320x320, usado como pivot de rotacao das groups.
const PIVOT = 160;

// Duracoes em ms espelhando os keyframes do desktop.
const DURACAO_GS1 = 90000;
const DURACAO_GS2 = 60000;
const DURACAO_GS3 = 30000;
const DURACAO_FLOW = 6000;

// Length aproximada do anel interno (raio 78, perimetro ~490).
// Usado para variar strokeDashoffset entre 0 e 490 e simular fluxo.
const PERIMETRO_FLOW = 490;

// R-CRIT-4: contador monotonico em modulo, somado a Math.random,
// garante id unico por mount mesmo se crypto.randomUUID nao existir
// (RN nativo nao expoe global.crypto). Usado dentro de useRef para
// estabilizar o id por instancia entre re-renders. Combinacao
// counter + random + perf.now elimina colisao mesmo sob StrictMode
// duplo mount + multi-loader na mesma rota.
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

export function OuroborosLoader({
  tamanho = 320,
  compacto = false,
}: OuroborosLoaderProps) {
  const tamanhoFinal = compacto ? 96 : tamanho;
  const mostrarTexto = !compacto;

  const rotacaoG1 = useSharedValue(0);
  const rotacaoG2 = useSharedValue(0);
  const rotacaoG3 = useSharedValue(0);
  const offsetFlow = useSharedValue(0);

  // M25.2: animacao via DOM em web. react-native-svg-web nao propaga
  // animatedProps de useAnimatedProps para o atributo transform de
  // <g>, entao a animacao para no frame inicial. Em web, atribuimos
  // data-anim-id em cada grupo e o RAF escreve transform via
  // querySelector + setAttribute. Em native, este bloco e no-op
  // (Platform.OS !== 'web') e Reanimated assume.
  //
  // R-CRIT-4: useRef segura o UUID por instancia, gerado uma vez por
  // mount. useId() colidia entre arvores irmas (e.g. loader em
  // _layout + loader em /agenda) — quando dois data-anim-id eram
  // iguais, document.querySelector pegava so o primeiro e o segundo
  // loader ficava estatico.
  const refUuid = useRef<string | null>(null);
  if (refUuid.current === null) {
    refUuid.current = gerarUuidInstancia();
  }
  const animId = refUuid.current;
  const idG1 = `og-g1-${animId}`;
  const idG2 = `og-g2-${animId}`;
  const idG3 = `og-g3-${animId}`;
  const idFlow = `og-flow-${animId}`;

  // Ref do <Svg> raiz, usada como escopo do querySelector em web.
  // Defense-in-depth: mesmo que dois loaders gerem o mesmo UUID
  // (impossivel na pratica), o querySelector roda dentro do svg
  // proprio e nunca pega o no do outro loader. Tipagem react-native
  // -svg expoe Svg como classe; em web .current vira HTMLElement
  // via react-native-svg-web. Usamos React.ComponentRef do <Svg>
  // para satisfazer o TS.
  const refSvg = useRef<React.ComponentRef<typeof Svg>>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let raf = 0;
    const tick = () => {
      // Usa timestamp absoluto Date.now() para que re-mounts do
      // componente nao reiniciem o angulo do zero. Em 90s o ciclo
      // se fecha mesmo entre re-renders.
      const t = Date.now();
      const a1 = ((t / DURACAO_GS1) * 360) % 360;
      const a2 = -(((t / DURACAO_GS2) * 360) % 360);
      const a3 = ((t / DURACAO_GS3) * 360) % 360;
      const flow = ((t / DURACAO_FLOW) * PERIMETRO_FLOW) % PERIMETRO_FLOW;
      // Escopo de busca: prefere refSvg.current se for Element DOM
      // (web), fallback document. Em web, react-native-svg expoe o
      // ref como instancia da classe, nao DOM Element diretamente —
      // usamos document como fallback seguro. querySelectorAll
      // garante que todos os matches no escopo recebem update
      // (defense-in-depth — o seletor ja e unico via UUID).
      const candidato = refSvg.current as unknown as
        | { querySelectorAll?: (s: string) => NodeListOf<Element> }
        | null;
      const escopo: Document | Element =
        candidato && typeof candidato.querySelectorAll === 'function'
          ? (candidato as unknown as Element)
          : document;
      const escreverPorAttr = (
        seletor: string,
        atributo: string,
        valor: string
      ) => {
        const nos = escopo.querySelectorAll(seletor);
        nos.forEach((no) => no.setAttribute(atributo, valor));
      };
      escreverPorAttr(
        `[data-anim-id="${idG1}"]`,
        'transform',
        `rotate(${a1} ${PIVOT} ${PIVOT})`
      );
      escreverPorAttr(
        `[data-anim-id="${idG2}"]`,
        'transform',
        `rotate(${a2} ${PIVOT} ${PIVOT})`
      );
      escreverPorAttr(
        `[data-anim-id="${idG3}"]`,
        'transform',
        `rotate(${a3} ${PIVOT} ${PIVOT})`
      );
      escreverPorAttr(
        `[data-anim-id="${idFlow}"]`,
        'stroke-dashoffset',
        String(flow)
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idG1, idG2, idG3, idFlow]);

  useEffect(() => {
    // gs-1: 90s linear infinito (sentido horario).
    rotacaoG1.value = withRepeat(
      withTiming(360, { duration: DURACAO_GS1, easing: Easing.linear }),
      -1,
      false
    );
    // gs-2: 60s linear infinito reverso (-360).
    rotacaoG2.value = withRepeat(
      withTiming(-360, { duration: DURACAO_GS2, easing: Easing.linear }),
      -1,
      false
    );
    // gs-3: 30s linear infinito (sentido horario).
    rotacaoG3.value = withRepeat(
      withTiming(360, { duration: DURACAO_GS3, easing: Easing.linear }),
      -1,
      false
    );
    // gs-flow: oscila stroke-dashoffset 0 -> perimetro a cada 6s.
    offsetFlow.value = withRepeat(
      withTiming(PERIMETRO_FLOW, {
        duration: DURACAO_FLOW,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      // Cleanup garante que worklets parem ao desmontar para evitar
      // leak (Reanimated 4 mantem a animacao viva no UI thread mesmo
      // se o componente sair da arvore React).
      cancelAnimation(rotacaoG1);
      cancelAnimation(rotacaoG2);
      cancelAnimation(rotacaoG3);
      cancelAnimation(offsetFlow);
    };
  }, [rotacaoG1, rotacaoG2, rotacaoG3, offsetFlow]);

  // M25.1 + A27 (2026-05-06): em web, useAnimatedProps emite
  // transform string "rotate(angle cx cy)" para o rn-svg-web
  // converter em <g transform="..."> direto. Em native com New
  // Arch (Fabric), passar string em transform de SVG quebra com
  // "java.lang.String cannot be cast to ReadableArray" — Fabric
  // exige array de operacoes ou usar a prop rotation nativa do
  // react-native-svg. Solucao: ramificar por Platform via
  // closure (booleano estatico capturado, fora do worklet).
  // Pivot da rotacao vem do originX/originY estatico no
  // <AnimatedG> (so eficaz em native; web ignora porque a
  // string de transform ja inclui cx/cy).
  // M25.1 + A27 (2026-05-06): em web, useAnimatedProps emite
  // transform string "rotate(angle cx cy)" para o rn-svg-web
  // converter em <g transform="..."> direto. Em native com New
  // Arch (Fabric), passar string em transform de SVG quebra com
  // "java.lang.String cannot be cast to ReadableArray" — Fabric
  // exige array de operacoes ou usar a prop rotation nativa do
  // react-native-svg. Solucao: ramificar por Platform via
  // closure (booleano estatico capturado, fora do worklet).
  const isWeb = Platform.OS === 'web';
  const propsG1 = useAnimatedProps(
    () =>
      (isWeb
        ? { transform: `rotate(${rotacaoG1.value} ${PIVOT} ${PIVOT})` }
        : { rotation: rotacaoG1.value }) as Record<string, unknown>
  );
  const propsG2 = useAnimatedProps(
    () =>
      (isWeb
        ? { transform: `rotate(${rotacaoG2.value} ${PIVOT} ${PIVOT})` }
        : { rotation: rotacaoG2.value }) as Record<string, unknown>
  );
  const propsG3 = useAnimatedProps(
    () =>
      (isWeb
        ? { transform: `rotate(${rotacaoG3.value} ${PIVOT} ${PIVOT})` }
        : { rotation: rotacaoG3.value }) as Record<string, unknown>
  );
  const propsFlow = useAnimatedProps(() => ({
    strokeDashoffset: offsetFlow.value,
  }));

  return (
    <View
      style={{ width: tamanhoFinal, height: tamanhoFinal }}
      accessibilityLabel="loader ouroboros"
      accessibilityRole="progressbar"
    >
      <Svg
        ref={refSvg}
        width={tamanhoFinal}
        height={tamanhoFinal}
        viewBox="0 0 320 320"
      >
        <Defs>
          <LinearGradient id="og1" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0%" stopColor={colors.purple} />
            <Stop offset="100%" stopColor={colors.pink} />
          </LinearGradient>
          <RadialGradient id="og-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.purple} stopOpacity="0.22" />
            <Stop offset="70%" stopColor={colors.purple} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ambient glow estatico (fundo) */}
        <Circle cx={PIVOT} cy={PIVOT} r={150} fill="url(#og-glow)" />

        {/* outer dotted orbit (gs-2: 60s reverso). data-anim-id atravessa
            rn-svg-web e vira atributo no <g>; o RAF de M25.2 usa esse
            seletor para atualizar transform. */}
        <AnimatedG
          animatedProps={propsG2}
          originX={PIVOT}
          originY={PIVOT}
          data-anim-id={idG2}
        >
          <Circle
            cx={PIVOT}
            cy={PIVOT}
            r={142}
            fill="none"
            stroke={colors.purple}
            strokeWidth={0.6}
            strokeDasharray={[1, 8]}
            opacity={0.35}
          />
        </AnimatedG>

        {/* inner flow ring (gs-3: 30s; gs-flow: dashoffset 6s) */}
        <AnimatedG
          animatedProps={propsG3}
          originX={PIVOT}
          originY={PIVOT}
          data-anim-id={idG3}
        >
          <AnimatedCircle
            cx={PIVOT}
            cy={PIVOT}
            r={78}
            fill="none"
            stroke={colors.cyan}
            strokeWidth={1}
            strokeDasharray={[3, 7]}
            opacity={0.35}
            animatedProps={propsFlow}
            data-anim-id={idFlow}
          />
        </AnimatedG>

        {/* main snake (gs-1: 90s) */}
        <AnimatedG
          animatedProps={propsG1}
          originX={PIVOT}
          originY={PIVOT}
          data-anim-id={idG1}
        >
          <Path
            d="M 155 40 A 120 120 0 0 0 40 160 A 120 120 0 0 0 160 280 A 120 120 0 0 0 280 160 A 120 120 0 0 0 175 40"
            fill="none"
            stroke="url(#og1)"
            strokeWidth={11}
            strokeLinecap="round"
          />
          <Path
            d="M 155 40 A 120 120 0 0 0 40 160 A 120 120 0 0 0 160 280 A 120 120 0 0 0 280 160 A 120 120 0 0 0 175 40"
            fill="none"
            stroke={COR_ESCAMA}
            strokeWidth={11}
            strokeLinecap="round"
            strokeDasharray={[1.5, 13]}
            opacity={0.55}
          />
          <Circle cx={155} cy={40} r={6} fill={colors.purple} />
          {/* A27: x/y em vez de transform string para evitar
              ClassCastException em New Arch (Fabric). rn-svg-web
              converte x/y para transform="translate(x,y)" em web. */}
          <G x={175} y={40}>
            <Path
              d="M 0 -2 C -4 -10, -16 -12, -24 -8 C -28 -6, -30 -2, -28 0 L -8 -1 Z"
              fill={colors.pink}
              stroke={colors.purple}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            <Path
              d="M 0 2 C -4 8, -14 10, -22 7 C -26 5, -28 2, -26 0 L -8 1 Z"
              fill={COR_MANDIBULA_INFERIOR}
              stroke={colors.purple}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            <Ellipse
              cx={-4}
              cy={-3}
              rx={9}
              ry={5}
              fill={colors.pink}
              opacity={0.9}
            />
            <Circle cx={-6} cy={-4} r={1.8} fill={COR_ESCAMA} />
            <Circle cx={-5.5} cy={-4.6} r={0.6} fill={colors.fg} />
            <Path
              d="M -28 0 L -34 -2 M -28 0 L -34 2"
              stroke={colors.pink}
              strokeWidth={0.8}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </AnimatedG>

        {/* center wordmark (estatico, nao gira) */}
        {mostrarTexto ? (
          <G>
            <SvgText
              x={PIVOT}
              y={158}
              textAnchor="middle"
              fontFamily="monospace"
              fontSize={18}
              fontWeight="500"
              letterSpacing={6}
              fill={colors.purple}
            >
              OUROBOROS
            </SvgText>
            <SvgText
              x={PIVOT}
              y={176}
              textAnchor="middle"
              fontFamily="monospace"
              fontSize={9}
              letterSpacing={3}
              fill={COR_TEXTO_SECUNDARIO}
            >
              PROTOCOLO
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
