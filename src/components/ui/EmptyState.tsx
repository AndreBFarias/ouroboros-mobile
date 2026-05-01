// Estado vazio sereno. Icone 48dp na cor muted-decor (lucide), frase
// muted body, espaco generoso (terco superior). Sem CTA grande, sem
// ilustracao colorida. A frase chega via prop; se não houver icone
// custom, cai num icone neutro (Inbox).
import { ComponentType } from 'react';
import { Text, View } from 'react-native';
import { Inbox, type LucideProps } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

export type EmptyStateIcon = ComponentType<LucideProps>;

interface EmptyStateProps {
  frase: string;
  Icon?: EmptyStateIcon;
}

export function EmptyState({ frase, Icon = Inbox }: EmptyStateProps) {
  return (
    <View
      className="items-center justify-start w-full"
      style={{ paddingTop: 48, gap: 16 }}
      accessibilityRole="text"
      accessibilityLabel={`vazio: ${frase}`}
    >
      <Icon size={48} color={colors.mutedDecor} strokeWidth={1.5} />
      <Text
        className="font-mono text-muted text-base text-center"
        style={{ lineHeight: 22 }}
      >
        {frase}
      </Text>
    </View>
  );
}
