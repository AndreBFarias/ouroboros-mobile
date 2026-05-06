// Logo Ouroboros estatico em SVG nativo. Reproduz fielmente o
// glifo do desktop (versao desktop/ouroboros-redesign-v1/index.html
// linhas 110-194): viewBox 320x320, 4 aneis, cabeca com mandibulas
// e lingua bifida, wordmark central. Usado em onboarding, settings
// e splash de marca. Para versao animada (boot, loaders pesados),
// ver OuroborosLoader.
//
// Sem dependencia nova: react-native-svg ja vem como peer do projeto
// (via lucide-react-native e SparklineMedida). Sem texto fora do
// wordmark "OUROBOROS"/"PROTOCOLO" (Regra -1: nao sao nomes de
// pessoas nem IA, sao a marca do app).
//
// Decisao M25 §10.3: fontFamily="monospace" no SVG <Text>. JetBrains
// Mono carrega via expo-font no boot e nem sempre esta pronta quando
// o logo aparece (e.g. boot screen). Manter monospace literal evita
// pisca de fallback mid-frame.
//
// Comentarios sem acento (convencao shell/CI).
import { View } from 'react-native';
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

export interface OuroborosLogoProps {
  // Tamanho do quadrado em pixels (default 320, igual ao viewBox).
  tamanho?: number;
  // Mostra o wordmark "OUROBOROS" + "PROTOCOLO" centralizado.
  // Em modo compacto (loader 96px) o caller passa false.
  mostrarTexto?: boolean;
}

// Cor mais escura para a sobreposicao de "escamas" do corpo. Bate com
// o hex literal #0e0f15 do desktop original (Dracula bg-page levemente
// escuro). Tokens nao tem essa variante; usamos hex direto so dentro
// do SVG (canon do desktop).
const COR_ESCAMA = '#0e0f15';
// Cor da mandibula inferior — pink escurecido no original (#c77ab0).
const COR_MANDIBULA_INFERIOR = '#c77ab0';
// Cor do texto secundario "PROTOCOLO" no original (#7c7e8c).
const COR_TEXTO_SECUNDARIO = '#7c7e8c';

export function OuroborosLogo({
  tamanho = 320,
  mostrarTexto = true,
}: OuroborosLogoProps) {
  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessibilityLabel="logo ouroboros"
      accessibilityRole="image"
    >
      <Svg
        width={tamanho}
        height={tamanho}
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

        {/* ambient glow */}
        <Circle cx="160" cy="160" r="150" fill="url(#og-glow)" />

        {/* outer dotted orbit (gs-2) */}
        <G>
          <Circle
            cx="160"
            cy="160"
            r="142"
            fill="none"
            stroke={colors.purple}
            strokeWidth={0.6}
            strokeDasharray="1 8"
            opacity={0.35}
          />
        </G>

        {/* inner flow ring (gs-3) */}
        <G>
          <Circle
            cx="160"
            cy="160"
            r="78"
            fill="none"
            stroke={colors.cyan}
            strokeWidth={1}
            strokeDasharray="3 7"
            opacity={0.35}
          />
        </G>

        {/* main snake (gs-1) */}
        <G>
          {/* body: 4 arcos formando quase-circulo, gap ~14deg topo */}
          <Path
            d="M 155 40 A 120 120 0 0 0 40 160 A 120 120 0 0 0 160 280 A 120 120 0 0 0 280 160 A 120 120 0 0 0 175 40"
            fill="none"
            stroke="url(#og1)"
            strokeWidth={11}
            strokeLinecap="round"
          />
          {/* darker scales overlay */}
          <Path
            d="M 155 40 A 120 120 0 0 0 40 160 A 120 120 0 0 0 160 280 A 120 120 0 0 0 280 160 A 120 120 0 0 0 175 40"
            fill="none"
            stroke={COR_ESCAMA}
            strokeWidth={11}
            strokeLinecap="round"
            strokeDasharray="1.5 13"
            opacity={0.55}
          />

          {/* tail tip */}
          <Circle cx="155" cy="40" r="6" fill={colors.purple} />

          {/* HEAD: side-profile, jaw wrapping the tail. */}
          {/* A27: x/y em vez de transform string para evitar
              ClassCastException em New Arch (Fabric). rn-svg-web
              converte x/y para transform="translate(x,y)" em web. */}
          <G x={175} y={40}>
            {/* upper jaw */}
            <Path
              d="M 0 -2 C -4 -10, -16 -12, -24 -8 C -28 -6, -30 -2, -28 0 L -8 -1 Z"
              fill={colors.pink}
              stroke={colors.purple}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            {/* lower jaw */}
            <Path
              d="M 0 2 C -4 8, -14 10, -22 7 C -26 5, -28 2, -26 0 L -8 1 Z"
              fill={COR_MANDIBULA_INFERIOR}
              stroke={colors.purple}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            {/* head dome */}
            <Ellipse
              cx={-4}
              cy={-3}
              rx={9}
              ry={5}
              fill={colors.pink}
              opacity={0.9}
            />
            {/* eye */}
            <Circle cx={-6} cy={-4} r={1.8} fill={COR_ESCAMA} />
            <Circle cx={-5.5} cy={-4.6} r={0.6} fill={colors.fg} />
            {/* forked tongue flicking out toward tail */}
            <Path
              d="M -28 0 L -34 -2 M -28 0 L -34 2"
              stroke={colors.pink}
              strokeWidth={0.8}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </G>

        {/* center wordmark */}
        {mostrarTexto ? (
          <G>
            <SvgText
              x={160}
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
              x={160}
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
