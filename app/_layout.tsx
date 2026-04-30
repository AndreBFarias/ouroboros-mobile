import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance, LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/ui';
import '../global.css';

// Mantem a splash visivel ate as fontes carregarem.
SplashScreen.preventAutoHideAsync();

// Suprime warning de SafeAreaView vindo de dependencia transitiva.
// Migracao para react-native-safe-area-context ja foi feita no codigo
// proprio (ver Screen.tsx). Warning persiste por terceiros.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

// ADR-008: Dracula e identidade, nao tema selecionavel. Forcamos dark
// sempre em todas as plataformas.
// - tailwind.config.js darkMode='class' alinhado com setFlag.
// - Em RN nativo (Android/iOS), Appearance.setColorScheme('dark').
// - No Web, adicionamos a classe 'dark' no documentElement para o
//   CSS gerado pelo NativeWind aplicar as variantes dark:.
// Em Web o Appearance pode nao expor setColorScheme; usamos try/catch.
try {
  (StyleSheet as unknown as { setFlag?: (k: string, v: string) => void })
    .setFlag?.('darkMode', 'class');
  Appearance.setColorScheme?.('dark');
} catch {
  // Plataforma nao suporta uma das duas APIs (web).
}
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

export default function RootLayout() {
  const [loaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#282a36' },
          }}
        />
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
