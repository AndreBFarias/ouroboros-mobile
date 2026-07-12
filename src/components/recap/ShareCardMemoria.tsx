// R-RECAP-8 (2026-07-10): card estatico para captura do share do
// slideshow Memorias. Renderiza o conteudo de um slide SEM Reanimated,
// SEM Ken Burns, SEM auto-advance -- uma arvore estatica que o
// react-native-view-shot captura sem o NullPointerException de child
// null em ViewGroup.dispatchDraw no Fabric/New Arch (armadilha A46).
//
// Contexto do bug (device Redmi HyperOS, Android 15, dev-client SDK 54):
// capturar o container raiz da tela incluia o Background animado e o
// Ken Burns (Reanimated). Na arvore animada, child Views entram/saem
// durante o draw; captureRef le mViewFlags de um child null -> NPE ->
// PNG 0 bytes. Este card isola a captura de uma view chapada.
//
// Fundo: camadas de cor solida das cores de colorsMemorias.bgGradient
// empilhadas (SEM expo-linear-gradient -- nao instalado no projeto; o
// unico gradient do app vem de react-native-svg no brand). O proprio
// Background do slideshow ao vivo ja e' uma cor solida que oscila
// (backgroundColor, nao LinearGradient), entao a cor chapada aqui e'
// fiel ao enquadramento. Blobs de cor com opacity baixa dao
// profundidade estatica sem animacao.
//
// Comentarios sem acento (convencao shell/CI).
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Slide } from '@/lib/hooks/useRecapMemorias';
import type { FormatoShare } from '@/lib/midia/exportarSlideMemorias';
import { colorsMemorias } from '@/theme/tokens';

export interface ShareCardMemoriaProps {
  // Slide corrente do slideshow (mesmo dado que o SlideRender ao vivo).
  slide: Slide;
  // Formato alvo do share. Define o aspect ratio do card para o layout
  // de texto refletir o enquadramento final da captura.
  formato: FormatoShare;
}

// Aspect ratio por formato. stories = 9:16 (1080x1920);
// quadrado = 1:1 (1080x1080). captureRef forca as dimensoes finais em
// pixels; aqui garantimos que o texto seja diagramado com a proporcao
// correta antes da captura (evita PNG cortado/esticado).
const ASPECT_POR_FORMATO: Record<FormatoShare, number> = {
  stories: 1080 / 1920,
  quadrado: 1,
};

// Card capturavel. `forwardRef` para o caller apontar o slideRef do
// share diretamente na View raiz (captureRef(ref)). `collapsable={false}`
// e' obrigatorio: sem ele o Android colapsa o ViewGroup sem filhos
// diretos proprios e captureRef falha em achar o no nativo.
export const ShareCardMemoria = forwardRef<View, ShareCardMemoriaProps>(
  function ShareCardMemoria({ slide, formato }, ref) {
    return (
      <View
        ref={ref}
        collapsable={false}
        accessibilityLabel={`share card ${slide.id} ${formato}`}
        style={[styles.card, { aspectRatio: ASPECT_POR_FORMATO[formato] }]}
      >
        {/* Fundo estatico em camadas de cor solida (A46-safe: sem
            Reanimated, sem gradient nativo). Base chapada + dois blobs
            de cor com opacity baixa para dar profundidade sem animar. */}
        <View style={styles.fundoBase} />
        <View style={styles.blobTopo} />
        <View style={styles.blobBase} />

        <View style={styles.conteudo}>
          <ShareCardConteudo slide={slide} />
        </View>
      </View>
    );
  }
);

// Conteudo por tipo de slide. Espelha fielmente os textos do
// SlideRender ao vivo (app/recap-memorias.tsx), com estilos proprios
// do card (margens seguras para o quadrado). Tom ADR-0005: sobrio, sem
// exclamacao, sem emoji.
function ShareCardConteudo({ slide }: { slide: Slide }) {
  switch (slide.id) {
    case 'abertura':
      return (
        <View style={styles.centro}>
          <Text style={styles.tituloGrande}>Olhe o que ficou.</Text>
          <Text style={styles.subTexto}>Dessa semana.</Text>
        </View>
      );
    case 'numeros':
      return (
        <View style={styles.centro}>
          <Text style={styles.numeroEnorme}>{slide.registros}</Text>
          <Text style={styles.rotulo}>Registros</Text>
          <View style={styles.divider} />
          <Text style={styles.subTexto}>
            {slide.treinos > 0
              ? `${slide.treinos} treino${slide.treinos > 1 ? 's' : ''}.`
              : 'Nenhum treino.'}
          </Text>
          <Text style={styles.subTexto}>
            {slide.tarefas > 0
              ? `${slide.tarefas} tarefa${slide.tarefas > 1 ? 's' : ''} concluída${slide.tarefas > 1 ? 's' : ''}.`
              : 'Nenhuma tarefa concluída.'}
          </Text>
          <Text style={[styles.fraseInferior, styles.espacoTopo]}>
            Você esteve presente.
          </Text>
        </View>
      );
    case 'vitorias':
      return (
        <View style={styles.centro}>
          <Text style={styles.numeroEnorme}>{slide.contagem}</Text>
          <Text style={styles.rotulo}>
            {
              slide.contagem === 1
                ? 'Vitória' /* anonimato-allow: tipo de conquista do diario */
                : 'Vitórias' /* anonimato-allow: tipo de conquista do diario */
            }
          </Text>
          {slide.frasePrincipal ? (
            <Text style={styles.citacao} numberOfLines={3}>
              {slide.frasePrincipal}
            </Text>
          ) : null}
          <Text style={[styles.fraseInferior, styles.espacoTopo]}>
            Passaram por aqui.
          </Text>
        </View>
      );
    case 'midias': {
      const total = slide.fotos + slide.audios + slide.videos;
      return (
        <View style={styles.centro}>
          <Text style={styles.numeroEnorme}>{total}</Text>
          <Text style={styles.rotulo}>{total === 1 ? 'Mídia' : 'Mídias'}</Text>
          <View style={styles.divider} />
          {slide.fotos > 0 ? (
            <Text style={styles.subTexto}>
              {`${slide.fotos} foto${slide.fotos > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          {slide.audios > 0 ? (
            <Text style={styles.subTexto}>
              {`${slide.audios} áudio${slide.audios > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          {slide.videos > 0 ? (
            <Text style={styles.subTexto}>
              {`${slide.videos} vídeo${slide.videos > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          <Text style={[styles.fraseInferior, styles.espacoTopo]}>
            Ficou registrado.
          </Text>
        </View>
      );
    }
    case 'crises':
      return (
        <View style={styles.centro}>
          <Text style={styles.numeroEnorme}>{slide.contagem}</Text>
          <Text style={styles.rotulo}>
            {slide.contagem === 1 ? 'Trigger' : 'Triggers'}
          </Text>
          <Text style={[styles.fraseInferior, styles.espacoTopo]}>
            Você seguiu.
          </Text>
        </View>
      );
    case 'encerramento':
      return (
        <View style={styles.centro}>
          <Text style={styles.tituloGrande}>Continue.</Text>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colorsMemorias.bgGradient[0],
  },
  fundoBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colorsMemorias.bgGradient[0],
  },
  // Blob superior: cor magenta (bgGradient[1]) com opacity baixa,
  // ancorado no topo-esquerdo, raio grande = mancha suave estatica.
  blobTopo: {
    position: 'absolute',
    top: '-20%',
    left: '-25%',
    width: '90%',
    height: '55%',
    borderRadius: 9999,
    backgroundColor: colorsMemorias.bgGradient[1],
    opacity: 0.5,
  },
  // Blob inferior: cor cyan (bgGradient[2]) com opacity menor,
  // ancorado no rodape-direito. Da contraste de temperatura no fundo.
  blobBase: {
    position: 'absolute',
    bottom: '-20%',
    right: '-25%',
    width: '90%',
    height: '55%',
    borderRadius: 9999,
    backgroundColor: colorsMemorias.bgGradient[2],
    opacity: 0.35,
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Margens seguras generosas (respiracao ADR-010). No quadrado o
    // texto nao encosta nas bordas do post.
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  centro: {
    alignItems: 'center',
    gap: 6,
  },
  tituloGrande: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 32,
    lineHeight: 44,
    textAlign: 'center',
  },
  numeroEnorme: {
    color: colorsMemorias.accent,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 96,
    lineHeight: 110,
  },
  rotulo: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  subTexto: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 16,
    lineHeight: 26,
    opacity: 0.85,
    textAlign: 'center',
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: colorsMemorias.accent,
    marginVertical: 16,
    opacity: 0.6,
  },
  citacao: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
    paddingHorizontal: 24,
    opacity: 0.9,
  },
  fraseInferior: {
    color: colorsMemorias.accent,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 1,
  },
  espacoTopo: {
    marginTop: 24,
  },
});
