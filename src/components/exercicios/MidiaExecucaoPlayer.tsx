// Player reusavel da midia de execucao de um exercicio. Q18 (Onda Q
// 2026-05-13). Suporta GIF/JPG estatico via <Image> e MP4 via
// <Video> com autoplay loop sem som.
//
// Caller passa apenas o `path` relativo ao vaultRoot. O componente
// resolve a URI completa via stores/vault e dispatcha o renderer
// adequado por extensao.
//
// UI: card com aspectRatio 16:10 + radius 12. Tamanho controlado por
// caller (`size` prop: 'sm' = 96px / 'lg' = full-width). Empty state
// mostra icone Dumbbell quando path vazio.
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import { Dumbbell } from '@/lib/icons';
import { colors, radius } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';

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

  const uri = vaultRoot ? `${vaultRoot}/${path}` : path;

  if (ehVideo(path)) {
    // Q18.x: integrar <Video> de expo-av com shouldPlay+isLooping+isMuted.
    // Por enquanto fallback Image (alguns devices renderizam frame zero).
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
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
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
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </View>
  );
}
