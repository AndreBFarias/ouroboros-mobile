// Player reusavel da midia de execucao de um exercicio. Q18 (Onda Q
// 2026-05-13). Suporta GIF/JPG estatico via <Image> e MP4/MOV/WEBM
// via <Video> de expo-av com autoplay loop sem som (Q18.x).
//
// Caller passa apenas o `path` relativo ao vaultRoot. O componente
// resolve a URI completa via stores/vault e dispatcha o renderer
// adequado por extensao.
//
// UI: card com aspectRatio 16:10 + radius 12. Tamanho controlado por
// caller (`size` prop: 'sm' = 96px / 'lg' = full-width). Empty state
// mostra icone Dumbbell quando path vazio. Em caso de erro de carga
// (URI invalida, arquivo corrompido, formato nao suportado), cai
// para <EmptyStateMidia> com icone ImageOff (R-SF-2).
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo, useState, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Dumbbell } from '@/lib/icons';
import { colors, radius } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { EmptyStateMidia } from './EmptyStateMidia';

export interface MidiaExecucaoPlayerProps {
  path: string | null | undefined;
  size?: 'sm' | 'lg';
  accessibilityLabel?: string;
}

function ehVideo(path: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(path);
}

export function MidiaExecucaoPlayer({
  path,
  size = 'lg',
  accessibilityLabel = 'midia de execucao do exercicio',
}: MidiaExecucaoPlayerProps): ReactNode {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [erroCarga, setErroCarga] = useState(false);

  const dimensoes = useMemo(() => {
    if (size === 'sm') return { width: 96, height: 96 };
    return { width: '100%' as const, aspectRatio: 16 / 10 };
  }, [size]);

  if (!path || path.trim().length === 0) {
    return (
      <View
        style={{
          ...dimensoes,
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={`${accessibilityLabel} ausente`}
      >
        <Dumbbell size={28} color={colors.mutedDecor} strokeWidth={1.5} />
      </View>
    );
  }

  // R-SF-2: onError do <Image>/<Video> seta flag; renderer fallback
  // para EmptyStateMidia em vez de tela branca/vermelha.
  if (erroCarga) {
    return (
      <EmptyStateMidia size={size} accessibilityLabel={accessibilityLabel} />
    );
  }

  const uri = vaultRoot ? `${vaultRoot}/${path}` : path;

  if (ehVideo(path)) {
    // Q18.x: <Video> expo-av com shouldPlay+isLooping+isMuted. Convive
    // com musica em outras telas (isMuted true). resizeMode COVER
    // preserva enquadramento como o GIF.
    return (
      <View
        style={{
          ...dimensoes,
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          overflow: 'hidden',
        }}
        accessibilityLabel={accessibilityLabel}
      >
        <Video
          testID="midia-execucao-video"
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onError={() => setErroCarga(true)}
        />
      </View>
    );
  }

  // GIF/JPG/PNG: Image nativo cuida do GIF animado em Android 9+.
  return (
    <View
      style={{
        ...dimensoes,
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        overflow: 'hidden',
      }}
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        testID="midia-execucao-image"
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => setErroCarga(true)}
      />
    </View>
  );
}
