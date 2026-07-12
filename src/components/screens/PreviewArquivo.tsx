// Preview do arquivo recebido via share intent (M08, Tela 17). Tres
// modos baseados no mime type:
//   - PDF: placeholder com icone documento + nome amigavel.
//   - imagem: <Image source={{ uri }}> com aspect ratio fixo 4:3.
//   - texto: as 5 primeiras linhas em mono caption (futuro: M08
//     so trata pdf+image; texto fica como variant inerte para
//     extensibilidade).
//
// Não tenta carregar metadado pesado: tamanho em bytes vem do caller
// como prop; aqui so renderizamos o que recebemos.
import { Image, Text, View } from 'react-native';
import { FileText, ImageIcon } from '@/lib/icons';
import { colors, radius, spacing } from '@/theme/tokens';

export interface PreviewArquivoProps {
  // URI completo do arquivo (content:// ou file:// ou web mock).
  uri: string;
  // Mime type informado pelo intent (ex: 'application/pdf').
  mimeType: string;
  // Nome amigavel para exibir (sem extensao).
  nome: string;
  // Tamanho em bytes (quando disponível) para exibir embaixo do nome.
  // 0 = não disponível; não renderiza linha.
  tamanhoBytes?: number;
}

// Formata tamanho em bytes para humano (KB, MB). Resolucao curta
// (sem decimais) para não distrair do flow PIX.
function formatTamanho(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function PreviewArquivo({
  uri,
  mimeType,
  nome,
  tamanhoBytes = 0,
}: PreviewArquivoProps) {
  const isImagem = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  const tamanhoFmt = formatTamanho(tamanhoBytes);

  return (
    <View
      accessibilityLabel="preview arquivo"
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.sm,
      }}
    >
      {isImagem ? (
        <View
          style={{
            aspectRatio: 4 / 3,
            backgroundColor: colors.bg,
            borderRadius: radius.input,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessibilityLabel="preview imagem"
          />
        </View>
      ) : (
        <View
          style={{
            aspectRatio: 4 / 3,
            backgroundColor: colors.bg,
            borderRadius: radius.input,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={isPdf ? 'preview pdf' : 'preview generico'}
        >
          {isPdf ? (
            <FileText size={48} color={colors.cyan} strokeWidth={1.5} />
          ) : (
            <ImageIcon size={48} color={colors.mutedDecor} strokeWidth={1.5} />
          )}
        </View>
      )}

      <View style={{ gap: spacing.xs }}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {nome}
        </Text>
        {tamanhoFmt.length > 0 ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 16,
            }}
            accessibilityLabel="tamanho arquivo"
          >
            {tamanhoFmt}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
