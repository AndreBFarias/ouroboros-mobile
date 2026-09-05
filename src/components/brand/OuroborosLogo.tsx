// Logo Ouroboros estatico em SVG nativo, portado FIELMENTE do SVG
// canonico da marca (viewBox 0 0 512 512).
// Fonte-de-verdade unica: o mesmo glifo que o icone do launcher e o
// splash (rasterizados por scripts/gen-brand-assets.sh a partir do
// mesmo SVG), evitando divergencia entre a marca in-app e o icone.
//
// Anatomia (ordem de desenho igual ao canonico):
//   1. disco de fundo
//   2. anel pontilhado externo
//   3. contas em degrade rosa->roxo (a serpente que morde a cauda)
//   4. cauda mordida (roxo) e cabeca (rosa)
//   5. boca (lingua), focinho e olho, detalhes escuros
//   6. wordmark central "PROTOCOLO" (cima) + "OUROBOROS" (baixo) —
//      mesma hierarquia do lockup canonico.
//
// Sem dependencia nova: react-native-svg ja e' peer do projeto. Sem
// texto fora do wordmark (Regra -1: e' o nome do PRODUTO, nao de
// pessoa nem atribuicao a ferramenta).
//
// O wordmark e' VETORIAL (paths), o que supera a decisao M25 §10.3: ela
// mandava <Text fontFamily="monospace"> porque a fonte de marca carrega
// via expo-font e nem sempre esta pronta no boot, causando pisca de
// fallback mid-frame. Path nao depende de fonte alguma -- sem pisca, e
// fiel ao canonico.
//
// R-BRAND-3-GLIFO: os dados geometricos (contas + paths do rosto + disco
// + anel + wordmark) vivem em glifo/geometria.ts (fonte unica), gerado
// por scripts/extrair-glifo.py. Este Logo so consome esses dados.
// Comentarios sem acento (convencao CI).
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import {
  ANEL,
  BOCA,
  CABECA,
  CAUDA,
  CONTAS,
  DISCO,
  FOCINHO,
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
        {/* disco de fundo */}
        <Circle cx={DISCO.cx} cy={DISCO.cy} r={DISCO.r} fill={DISCO.fill} />

        {/* anel pontilhado externo */}
        <Circle
          cx={ANEL.cx}
          cy={ANEL.cy}
          r={ANEL.r}
          fill="none"
          stroke={ANEL.stroke}
          strokeWidth={ANEL.strokeWidth}
          strokeDasharray={ANEL.dash}
          strokeLinecap={ANEL.cap}
          opacity={ANEL.opacity}
        />

        {/* contas em degrade rosa->roxo */}
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
        {/* focinho */}
        <Path
          d={FOCINHO.d}
          fill={FOCINHO.fill}
          fillOpacity={FOCINHO.fillOpacity}
        />

        {/* wordmark central vetorial: PROTOCOLO (cima) + OUROBOROS (baixo) */}
        {mostrarTexto ? (
          <G>
            <Path d={WORDMARK.secundaria.d} fill={WORDMARK.secundaria.fill} />
            <Path d={WORDMARK.primaria.d} fill={WORDMARK.primaria.fill} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
