// Logo Ouroboros estatico em SVG nativo, portado FIELMENTE do SVG
// canonico da marca (ouroboros.svg, viewBox 20.77 21.49 276.17 276.17).
// Fonte-de-verdade unica: o mesmo glifo que o icone do launcher e o
// splash (rasterizados por scripts/gen-brand-assets.sh a partir do
// mesmo SVG), evitando divergencia entre a marca in-app e o icone.
//
// Anatomia (ordem de desenho igual ao canonico):
//   1. anel pontilhado interno (bolinhas-internas)
//   2. 43 contas em degrade rosa->roxo (a serpente que morde a cauda)
//   3. cauda mordida (roxo #bd93f9) e cabeca (rosa #fc7ac8)
//   4. boca (lingua) e olho, detalhes escuros
//   5. wordmark central "PROTOCOLO" (cima, cinza) + "OUROBOROS"
//      (baixo, roxo) — mesma hierarquia do lockup canonico.
//
// Sem dependencia nova: react-native-svg ja e' peer do projeto. Sem
// texto fora do wordmark (Regra -1: e' o nome do PRODUTO, nao de
// pessoa nem atribuicao a ferramenta).
//
// Decisao M25 §10.3: fontFamily="monospace" no <Text> — a fonte de
// marca carrega via expo-font e nem sempre esta pronta no boot;
// monospace literal evita pisca de fallback mid-frame. Por isso o
// wordmark permanece <Text> (nitido, acessivel) em vez dos paths
// vetorizados do SVG.
//
// R-BRAND-3-GLIFO: os dados geometricos (43 contas + paths do rosto +
// anel + wordmark) vivem agora em glifo/geometria.ts (fonte unica). Este
// Logo consome esses dados; o render estatico permanece byte-identico.
// Comentarios sem acento (convencao CI).
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import {
  ANEL,
  BOCA,
  CABECA,
  CAUDA,
  CONTAS,
  OLHO,
  RAIO_CONTA,
  VIEWBOX,
  WORDMARK,
} from './glifo/geometria';

export interface OuroborosLogoProps {
  // Tamanho do quadrado em pixels (default 320).
  tamanho?: number;
  // Mostra o wordmark "PROTOCOLO" + "OUROBOROS" centralizado.
  // Em modo compacto (header/loader) o caller passa false.
  mostrarTexto?: boolean;
}

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
      <Svg width={tamanho} height={tamanho} viewBox={VIEWBOX}>
        {/* anel pontilhado interno */}
        <Path
          d={ANEL.d}
          fill="none"
          stroke={ANEL.stroke}
          strokeWidth={ANEL.strokeWidth}
          strokeDasharray={ANEL.dash}
          strokeLinecap={ANEL.cap}
          opacity={ANEL.opacity}
        />

        {/* 43 contas em degrade rosa->roxo */}
        {CONTAS.map(([cx, cy, fill], i) => (
          <Circle key={i} cx={cx} cy={cy} r={RAIO_CONTA} fill={fill} />
        ))}

        {/* cauda mordida (roxo), sob a cabeca */}
        <Path d={CAUDA.d} fill={CAUDA.fill} />
        {/* cabeca da serpente (rosa) */}
        <Path
          d={CABECA.d}
          fill={CABECA.fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* olho */}
        <Circle
          cx={OLHO.cx}
          cy={OLHO.cy}
          r={OLHO.r}
          fill={OLHO.fill}
          opacity={OLHO.opacity}
        />
        {/* boca (detalhe escuro sutil) */}
        <Path d={BOCA.d} fill={BOCA.fill} fillOpacity={BOCA.fillOpacity} />

        {/* wordmark central: PROTOCOLO (cima, cinza) + OUROBOROS (baixo, roxo) */}
        {mostrarTexto ? (
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
