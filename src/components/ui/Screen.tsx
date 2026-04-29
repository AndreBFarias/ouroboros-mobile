// Container raiz de tela. Aplica SafeArea, padding lateral 20dp e
// background bg-page. Usar como wrapper externo de qualquer screen.
import { ReactNode } from 'react';
import { View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  // Quando false, remove o padding lateral (telas full-bleed como heatmap).
  padded?: boolean;
}

export function Screen({ children, padded = true }: ScreenProps) {
  return (
    <SafeAreaView
      className="flex-1 bg-bg-page"
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#14151a" />
      <View
        className={`flex-1 ${padded ? 'px-5 pt-6' : ''}`}
        accessibilityRole="none"
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
